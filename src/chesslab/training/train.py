"""Stage 5 — Training loop. Aborts clearly without usable ROCm GPU (no silent CPU fallback)."""

from __future__ import annotations

import atexit
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from .. import config, doctor
from .data import (
    checkpoint_score,
    crop_of_rows,
    filter_rows_by_split,
    load_manifest,
    load_split,
    occupancy_piece_breakdown,
)


def _train_lock_path() -> Path:
    return config.DATA.models / ".train.lock"


def _pid_alive(pid: int) -> bool:
    """True if a process with `pid` currently exists (cross-platform, no psutil)."""
    if pid <= 0:
        return False
    if os.name == "nt":
        import ctypes

        # OpenProcess alone answers the WRONG question. Windows keeps a process OBJECT alive as
        # long as anyone holds a handle to it, so a terminated process whose parent shell has not
        # let go still opens fine — and the training lock then reports a run that has been dead for
        # minutes as live, refusing every new run until someone deletes the file by hand. Ask for
        # the exit code instead: STILL_ACTIVE means running, anything else means it has exited.
        #
        # `restype` is not optional here either: a HANDLE is 64-bit on x64 and ctypes defaults to
        # c_int, which truncates it.
        k = ctypes.windll.kernel32
        k.OpenProcess.restype = ctypes.c_void_p
        k.OpenProcess.argtypes = (ctypes.c_uint32, ctypes.c_int, ctypes.c_uint32)
        k.GetExitCodeProcess.argtypes = (ctypes.c_void_p, ctypes.POINTER(ctypes.c_uint32))
        k.CloseHandle.argtypes = (ctypes.c_void_p,)
        h = k.OpenProcess(0x1000, False, pid)   # PROCESS_QUERY_LIMITED_INFORMATION
        if not h:
            return False
        code = ctypes.c_uint32()
        ok = k.GetExitCodeProcess(h, ctypes.byref(code))
        k.CloseHandle(h)
        # 259 = STILL_ACTIVE. A process that deliberately exits WITH 259 reads as alive; that is
        # the documented ambiguity of this API and it is the safe direction for a lock.
        return bool(ok) and code.value == 259
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def _acquire_train_lock(desc: str) -> bool:
    """Only ONE training may use the (single) GPU at a time. Returns True if the lock was
    acquired, False if another LIVE training already holds it. Survives web restarts and covers
    both CLI and web launches (the root cause of the earlier concurrent-run OOM). A stale lock
    from a dead PID is reclaimed automatically."""
    lock = _train_lock_path()
    if lock.exists():
        try:
            info = json.loads(lock.read_text(encoding="utf-8"))
            pid = int(info.get("pid", -1))
        except Exception:  # noqa: BLE001 — corrupt lock: treat as stale
            pid, info = -1, {}
        if pid > 0 and pid != os.getpid() and _pid_alive(pid):
            print(f"[FAIL] Another training is already running (PID {pid}, started "
                  f"{info.get('ts', '?')}): {info.get('desc', '')}. Only one training can use the "
                  "GPU at a time - stop it first (Training tab 'Stop', or kill the process) or wait.")
            return False
        # else: dead/stale PID → reclaim below
    lock.parent.mkdir(parents=True, exist_ok=True)
    lock.write_text(json.dumps({"pid": os.getpid(), "desc": desc,
                                "ts": datetime.now().isoformat()}), encoding="utf-8")
    return True


def _release_train_lock() -> None:
    lock = _train_lock_path()
    try:
        if lock.exists():
            info = json.loads(lock.read_text(encoding="utf-8"))
            if int(info.get("pid", -1)) == os.getpid():
                lock.unlink()
    except Exception:  # noqa: BLE001 — best-effort cleanup
        pass


def run_train(backbone: str, epochs: int, batch_size: int, lr: float,
              no_amp: bool, seed: int, out: str | None, patience: int,
              num_workers: int | None = None, norm: str | None = None,
              per_crop: bool = False, input_repr: str = "rgb",
              dataset: str | None = None, resume: str | None = None,
              head: str = "combined", scales: list[int] | None = None,
              erase_p: float | None = None, bg_p: float | None = None,
              loss: str = "ce", focal_gamma: float = 2.0,
              class_weight: dict[str, float] | None = None,
              sched: str = "cosine",
              jitter_translate: float | None = None) -> int:
    """`scales`: Multi-Scale-Training (YOLO-Stil). Ist eine Liste wie [64,96,128] gesetzt, wird
    JEDER Batch zufällig auf eine dieser Eingabegrößen skaliert → das size-agnostische Modell
    (AdaptiveAvgPool) lernt alle Auflösungen in EINEM Lauf. So deckt das Training die
    Deployment-Auflösung ab (FixRes) und man kann danach bei beliebiger Größe inferieren.

    Both halves are published: drawing a fresh input size per batch is YOLOv2's multi-scale
    training (docs/references.md#redmon-2016), and the rule that the deployment resolution must
    occur during training is FixRes (docs/references.md#touvron-2019). `lr` is not: see
    docs/references.md §11.
    """
    # GPU precondition (Stage 0 validation path) — mandatory, otherwise abort. This check
    # is torch-free safe and runs BEFORE any torch import, so a missing/broken
    # build is reported clearly here instead of as an ImportError stacktrace.
    ok, checks = doctor.validate_gpu()
    if not ok:
        print(doctor.render(checks))
        print("[FAIL] No usable ROCm GPU — training aborted (no CPU fallback). "
              "Run `chesslab doctor --gpu` for diagnosis.")
        return 1

    # Single-training GPU guard: refuse to start if another training is live (prevents the
    # concurrent-run out-of-memory crash). Released on exit (normal, exception, or clean stop).
    if not _acquire_train_lock(f"{backbone} bs={batch_size} ep={epochs} head={head}"):
        return 1
    atexit.register(_release_train_lock)
    # Reduce ROCm/CUDA allocator fragmentation OOM (the allocator can otherwise fail to find a
    # large contiguous block even when plenty of VRAM is free — the earlier crash). Must be set
    # before the first CUDA allocation, i.e. before torch initializes the device.
    os.environ.setdefault("PYTORCH_ALLOC_CONF", "expandable_segments:True")

    import numpy as np
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader

    from .engine import evaluate_dataset, get_device
    from .model import build_model
    from .torch_data import (
        INPUT_REPRS,
        PackedSquareDataset,
        SquareDataset,
        build_transform,
        class_weights_tensor,
    )

    if input_repr not in INPUT_REPRS:
        print(f"[FAIL] unknown --input-repr {input_repr!r} (one of {sorted(INPUT_REPRS)}).")
        return 1
    if per_crop and input_repr != "rgb":
        print("[FAIL] --crop-norm per-crop and --input-repr are two different answers to the same "
              "question (how to make a dark square legible) — pick one.")
        return 1
    in_chans = INPUT_REPRS[input_repr]

    torch.manual_seed(seed)
    np.random.seed(seed)

    if dataset:
        from ..dataset_build import dataset_dir
        dd = dataset_dir(dataset)
        manifest_path = dd / "manifest.jsonl"
        split_path = dd / "split.json"
        if not manifest_path.exists() or not split_path.exists():
            print(f"[FAIL] Dataset '{dataset}' not built ({dd}). First build it in the Datasets tab "
                  "(`chesslab dataset build`), then train.")
            return 1
    else:
        manifest_path = config.DATA.manifests / "squares.jsonl"
        split_path = config.DATA.manifests / "split.json"
        if not manifest_path.exists():
            print(f"[FAIL] No manifest ({manifest_path}). First collect data and slice "
                  "(`chesslab slice`), then train.")
            return 1
        if not split_path.exists():
            print(f"[FAIL] No split ({split_path}). First run `chesslab split` "
                  "(train/val/test per session + class balancing), then train.")
            return 1

    manifest = load_manifest(manifest_path)
    split = load_split(split_path)
    classes = split["classes"]
    out_size = None
    for r in manifest:
        out_size = tuple(r["out_size"])
        break
    if out_size is None:
        print("[FAIL] empty manifest.")
        return 1

    # Balancing ONLY applied to train (policy is in split.json); val/test stay full.
    from ..dataset import load_priority_paths, subsample_classes

    ts = split.get("train_subsample") or {}
    # The mined hard negatives have to be protected HERE too, not only in the build: the
    # dataset's manifest holds the uncapped rows, so this re-draw is what actually decides
    # which `empty` crops a batch ever sees.
    priority_paths = load_priority_paths()
    if priority_paths:
        print(f"[i] hard-empty keep list: {len(priority_paths)} crops protected from the empty cap")
    train_rows = subsample_classes(
        filter_rows_by_split(manifest, split, "train"),
        max_empty_ratio=ts.get("max_empty_ratio"),
        max_class_ratio=ts.get("max_class_ratio"),
        seed=ts.get("seed", seed),
        priority_paths=priority_paths,
    )
    val_rows = filter_rows_by_split(manifest, split, "val")
    if not train_rows:
        hint = ("rebuild the dataset with more sessions" if dataset
                else "re-slice and run `chesslab split` again")
        print("[FAIL] train split is empty — too few sessions. Train/val/test are separated per "
              f"session (to prevent data leakage); record at least 2-3 sessions and {hint}.")
        return 1
    from collections import Counter as _Counter

    print(f"[OK] train balanced: {len(train_rows)} crops, distribution: "
          + ", ".join(f"{k}={v}" for k, v in sorted(_Counter(r['label'] for r in train_rows).items())))

    # Augmentation policy — optionally override the anti-shortcut knobs per run (ablation/tuning).
    policy = config.AUGMENT
    if erase_p is not None or bg_p is not None or jitter_translate is not None:
        from dataclasses import replace
        policy = replace(policy, **({"erase_p": erase_p} if erase_p is not None else {}),
                         **({"bg_p": bg_p} if bg_p is not None else {}),
                         **({"jitter_translate": jitter_translate}
                            if jitter_translate is not None else {}))
        print(f"[aug] override erase_p={policy.erase_p} bg_p={policy.bg_p} "
              f"jitter_translate={policy.jitter_translate}")
    # Packed memmap loader (training.pack): if the dataset was `chesslab dataset pack`ed, read
    # crops from ONE memmap instead of 1M per-item Image.open (the I/O bottleneck). Not used for
    # bg-randomization (packed is for the big synth pretrain, bg_p=0); the finetune stays per-PNG.
    packed = None
    # Fused datasets (dataset build-synth) have NO crop files at all — manifest paths are virtual
    # mm:// keys into the memmap. The per-PNG loader would crash on the first batch there.
    fused = bool(train_rows) and str(train_rows[0].get("path", "")).startswith("mm://")
    if dataset:
        from .pack import load_packed
        packed = load_packed(dataset)
        if fused and packed is None:
            print(f"[FAIL] dataset '{dataset}' is a fused synth build (mm:// paths) but its "
                  "packed memmap is missing/stale — re-run `chesslab dataset build-synth`.")
            return 1
        if packed is not None and (policy.bg_p or 0) > 0:
            if fused:
                print(f"[pack] fused dataset: bg_p={policy.bg_p} ignored — bg-randomization needs "
                      "crop files, which a fused build does not have. Training from the memmap.")
            else:
                print(f"[pack] packed memmap present but bg_p={policy.bg_p}>0 — using per-PNG loader "
                      "(bg-randomization needs the files); pack is ignored for this run.")
                packed = None
    # Rotation aug runs on-the-fly (torch_data._RandomRot90) when the dataset was built with
    # non-trivial `rotations` — the build no longer materializes rotated copies (4x disk/memmap).
    rot90 = False
    if dataset:
        from ..dataset_build import _read_yaml, dataset_dir
        ds_rot = _read_yaml(dataset_dir(dataset) / "dataset.yaml").get("rotations") or []
        rot90 = any(int(d) % 360 for d in ds_rot)
        if rot90:
            print("[aug] on-the-fly 90-degree rotations (dataset built with rotations="
                  f"{list(ds_rot)})")
    tf_kw = {"policy": policy, "per_crop": per_crop, "input_repr": input_repr}
    train_tf = build_transform(out_size, train=True, rot90=rot90, **tf_kw)
    val_tf = build_transform(out_size, train=False, **tf_kw)
    if packed is not None:
        n, h, w = packed[1]
        print(f"[pack] fast memmap loader: {n} crops, {n * h * w * 3 / 1e9:.1f} GB")
        train_ds = PackedSquareDataset(train_rows, classes, train_tf, packed)
        val_ds = PackedSquareDataset(val_rows, classes, val_tf, packed)
    else:
        train_ds = SquareDataset(train_rows, classes, train_tf,
                                 bg_randomize=True, policy=policy)
        val_ds = SquareDataset(val_rows, classes, val_tf)

    # BatchNorm is broken on ROCm-Windows (MIOpen/HIPRTC) -> default GroupNorm there.
    norm_eff = norm or ("groupnorm" if sys.platform.startswith("win") else "batchnorm")
    device = get_device(require_gpu=True)
    model = build_model(backbone, len(classes), pretrained=(backbone != "smallcnn"), norm=norm_eff,
                        head=head, classes=classes, in_chans=in_chans).to(device)
    print(f"[OK] Backbone {backbone}, norm={norm_eff}, head={head}, "
          f"input_repr={input_repr} ({in_chans}ch)")

        # Continue training (warm start): load weights from a previous run. Matching tensors
    # are adopted, non-matching ones (e.g. the classification head with changed class count,
    # such as after adding `occluded`) are skipped -> the body transfers, the head learns anew.
    resumed_from = None
    if resume:
        rd = config.DATA.models / resume
        ckpt = rd / "best.pt"
        if not ckpt.exists():
            ckpt = rd / "last.pt"
        if not (rd / "config.json").exists() or not ckpt.exists():
            print(f"[FAIL] Resume run '{resume}' incomplete or not found ({rd}).")
            return 1
        rcfg = json.loads((rd / "config.json").read_text(encoding="utf-8"))
        if rcfg.get("backbone") != backbone:
            print(f"[FAIL] Resume backbone {rcfg.get('backbone')!r} != {backbone!r} — choose the same backbone.")
            return 1
        sd = torch.load(ckpt, map_location=device)
        msd = model.state_dict()
        # `--head factored/twostage` wraps the timm backbone inside `DecoupledModel._mobile`,
        # `--head combined` IS the timm model. Matching keys verbatim across that boundary
        # adopts ZERO tensors and silently warm-starts from nothing, which looks like a bad
        # result rather than a bug. Try the un/prefixed name too — the head keys still miss
        # (different module names AND a changed class count), which is what we want.
        def _candidates(k: str) -> list[str]:
            return [k, k[len("_mobile."):]] if k.startswith("_mobile.") else [k, "_mobile." + k]

        keep: dict[str, torch.Tensor] = {}
        for k, v in sd.items():
            for cand in _candidates(k):
                if cand in msd and msd[cand].shape == v.shape:
                    keep[cand] = v
                    break
        model.load_state_dict(keep, strict=False)
        resumed_from = resume
        skipped = len(sd) - len(keep)
        print(f"[OK] Resumed from '{resume}': {len(keep)} tensors adopted"
              + (f", {skipped} skipped (head with changed class count)" if skipped else ""))
        if not keep:
            print("[FAIL] warm start adopted 0 tensors — the checkpoint does not fit this model. "
                  "Train without --resume, or fix the backbone/head combination.")
            return 1

    # Per-class weight override on top of split.json's inverse-frequency weights. The
    # occupancy sweep (specs/18) nudges `occupied` by 2-3x — a COST correction on a mild
    # frequency imbalance, deliberately NOT the observed 39x miss/phantom error ratio,
    # which would only teach the model to always guess occupied.
    if class_weight:
        unknown = [c for c in class_weight if c not in classes]
        if unknown:
            print(f"[FAIL] --class-weight names classes not in this dataset: {unknown} "
                  f"(dataset classes: {classes}).")
            return 1
        cw = dict(split.get("class_weights", {}))
        for c, v in class_weight.items():
            cw[c] = float(v)
        split = {**split, "class_weights": cw}
        print("[loss] class-weight override: "
              + ", ".join(f"{c}={class_weight[c]}" for c in sorted(class_weight)))
    weights = class_weights_tensor(split, classes).to(device)
    if loss == "ce":
        criterion = nn.CrossEntropyLoss(weight=weights)
    elif loss == "focal":
        from .losses import FocalLoss
        if head != "combined":
            print(f"[FAIL] --loss focal needs --head combined (logits); head={head!r} returns "
                  "log-probs and would be soft-maxed twice.")
            return 1
        criterion = FocalLoss(weight=weights, gamma=focal_gamma).to(device)
    else:
        print(f"[FAIL] unknown --loss {loss!r} (ce | focal).")
        return 1
    print(f"[loss] {loss}" + (f" gamma={focal_gamma}" if loss == "focal" else "")
          + f", effective weights: {dict(zip(classes, [round(float(w), 4) for w in weights.tolist()], strict=True))}")
    # AdamW = Adam with decoupled weight decay (docs/references.md#loshchilov-2017). Note that no
    # `weight_decay` is passed, so the run uses PyTorch's default — the one parameter that paper is
    # about is a parameter this project has never chosen.
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr)
    # Cosine annealing without restarts; the schedule comes from SGDR
    # (docs/references.md#loshchilov-2016), where the cosine runs over the period T_i.
    #
    # `T_max=epochs` COUPLES THE SCHEDULE TO THE RUN LENGTH. "The same run but longer" is not the
    # same run: a 60-epoch and a 200-epoch run follow different learning-rate trajectories from
    # their first batch, and a plateau in the last epochs may be the cosine floor rather than
    # convergence. Two consequences worth stating: runs of different lengths are not directly
    # comparable, and `--patience` interacts with this, because early stopping cuts a schedule
    # that was planned for `epochs`.
    # `--sched none` pins the rate instead, which is the only way to ask "does LONGER training
    # help?" with one variable. Under a cosine tied to `epochs`, a 200-epoch run is not a
    # 60-epoch run continued: the period stretches with it, so more steps and more time at a high
    # rate move together and neither can be attributed. Default is unchanged.
    if sched == "none":
        scheduler = torch.optim.lr_scheduler.ConstantLR(optimizer, factor=1.0, total_iters=0)
        print(f"[sched] constant lr {lr:g} — no annealing, so epoch count is the only variable")
    else:
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    amp = not no_amp
    # Loss scaling for half-precision gradients (docs/references.md#micikevicius-2017).
    scaler = torch.amp.GradScaler("cuda", enabled=amp)

    # DataLoader-Tuning: der Crop-Datensatz ist I/O-gebunden (Mio. kleine PNGs). Parallele Worker
    # sind der größte Hebel; auf Windows empirisch bis 8 stabil verifiziert (kein Deadlock) → Default
    # 6 statt 0. persistent_workers spart das Neu-Spawnen je Epoche (teuer bei Windows-spawn),
    # prefetch_factor hält Batches vor. Mit --num-workers 0 überschreibbar, falls doch Probleme.
    nw = num_workers if num_workers is not None else (6 if sys.platform.startswith("win") else 8)
    loader_kw = {"batch_size": batch_size, "pin_memory": True, "num_workers": nw}
    if nw > 0:
        loader_kw.update(persistent_workers=True, prefetch_factor=4)
    train_loader = DataLoader(train_ds, shuffle=True, drop_last=False, **loader_kw)

        # Runs are self-describing: geometry/photometry/extrusion height from the first
    # manifest line (same derivation as `labeling.variant_of_run`, which supplies old runs without
    # this field via a manifest scan). This way `serving.run_spec` knows the
    # preprocessing variant without manifest access.
    first_row = manifest[0] if manifest else {}
    variant = {
        "geometry": first_row.get("geometry", "warp"),
        "photometry": first_row.get("photometry", "none"),
        "piece_height_cells": float(first_row.get("piece_height_cells", config.EXP_PIECE_HEIGHT_CELLS)),
    }
    # The crop's COMPOSITION, from ALL rows and not just the first: the pads decide what the
    # examples contain, and serving has to reproduce them (specs/45). Absent = this dataset
    # cannot say, which every consumer must then treat as legacy rather than guess at.
    crop = crop_of_rows(manifest)
    if crop is None:
        print(f"[crop] dataset {dataset!r} does not record pad_side/pad_up on every row — the "
              "run will declare no crop and every consumer keeps its own profile's pads.")
    else:
        print(f"[crop] pad_side={crop[0]:g} pad_up={crop[1]:g} — declared by this run")

    run_dir = Path(out) if out else config.DATA.models / f"run-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "config.json").write_text(json.dumps({
        "backbone": backbone, "epochs": epochs, "batch_size": batch_size, "lr": lr,
        # The schedule, not just its peak. Without it a run's trajectory cannot be reconstructed
        # from its config: `lr` is where the cosine STARTS and `epochs` is its period, so two runs
        # with identical `lr` and different `epochs` never saw the same rate at the same step.
        "sched": sched, "sched_t_max": epochs if sched != "none" else None,
        # The augmentation the run actually used, not the config default it started from.
        "aug_jitter_translate": policy.jitter_translate,
        "seed": seed, "amp": amp, "norm": norm_eff, "classes": classes, "out_size": list(out_size),
        "dataset": dataset, "resumed_from": resumed_from, "head": head,
        **({} if crop is None else {"pad_side": crop[0], "pad_up": crop[1]}),
        # What SERVING must reproduce. `normalize.mode` "per_crop" ignores mean/std entirely, and
        # `input_repr` decides both the channel stack AND the stem's fan-in — a consumer that gets
        # either wrong feeds the model something it has never seen, silently.
        "normalize": {"mean": list(config.NORMALIZE_MEAN), "std": list(config.NORMALIZE_STD),
                      "mode": "per_crop" if per_crop else "fixed"},
        "input_repr": input_repr, "in_chans": in_chans,
        "variant": variant, "scales": scales,
        "aug": {"erase_p": policy.erase_p, "bg_p": policy.bg_p},
        "loss": loss, "focal_gamma": focal_gamma if loss == "focal" else None,
        "class_weight_override": dict(class_weight or {}),
        "effective_class_weights": dict(zip(classes, [float(w) for w in weights.tolist()],
                                            strict=True)),
    }, indent=2), encoding="utf-8")
    metrics_path = run_dir / "metrics.jsonl"

        # Checkpoint/early-stopping via occupancy-first score: occ_board_acc (all 64 squares
    # empty/occupied correct) is the signal the move_tracker primarily needs — more robust
    # than full board accuracy with little val data. occ_acc + macro_recall as tiebreaker.
    best_score = (-1.0, -1.0, -1.0)   # (occ_board_acc, occ_acc, macro_recall)
    epochs_no_improve = 0
    print(f"[OK] GPU ready ({device}); run directory: {run_dir}")
    for epoch in range(epochs):
        model.train()
        running = 0.0
        seen = 0
        for x, y in train_loader:
            x = x.to(device, non_blocking=True)
            y = y.to(device, non_blocking=True)
            if scales:
                # Multi-Scale: gesamten Batch auf eine zufällige Eingabegröße bringen (uniform je
                # Batch, damit stapelbar). Modell ist size-agnostisch → lernt alle Auflösungen.
                s = int(np.random.choice(scales))
                if s != x.shape[-1]:
                    x = torch.nn.functional.interpolate(x, size=(s, s), mode="bilinear", align_corners=False)
            optimizer.zero_grad(set_to_none=True)
            with torch.autocast(device_type="cuda", enabled=amp):
                loss = criterion(model(x), y)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            running += loss.item() * x.size(0)
            seen += x.size(0)
        scheduler.step()

        val = evaluate_dataset(model, val_ds, device, criterion=criterion, batch_size=batch_size, num_workers=nw)
        score = checkpoint_score(val_rows, classes, val["trues"].tolist(), val["preds"].tolist())
        bd = occupancy_piece_breakdown(classes, val["trues"].tolist(), val["preds"].tolist())
        rec = {
            "epoch": epoch,
            "train_loss": running / max(seen, 1),
            "val_loss": val["loss"],
            "val_acc": val["square_acc"],
            "val_macro_recall": val["macro_recall"],
            "val_board_acc": val["board_acc"],
            "val_occ_acc": bd["occ_acc"],
            "val_occ_board_acc": score[0],
            "val_piece_acc": bd["piece_acc"],
            "lr": scheduler.get_last_lr()[0],
        }
        with metrics_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(rec) + "\n")
        print(f"epoch {epoch:>3} | train_loss {rec['train_loss']:.4f} | val_acc {rec['val_acc']:.4f} "
              f"| macro_recall {rec['val_macro_recall']:.4f} | occ_board_acc {score[0]:.4f}")

        torch.save(model.state_dict(), run_dir / "last.pt")
        if score > best_score:
            best_score = score
            epochs_no_improve = 0
            torch.save(model.state_dict(), run_dir / "best.pt")
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                print(f"[OK] Early stopping (no improvement in occ_board_acc for {patience} epochs). "
                      "Increase patience with `--patience N`.")
                break

    print(f"[OK] done. best by occ_board_acc={best_score[0]:.4f} (occ_acc={best_score[1]:.4f}, "
          f"macro_recall={best_score[2]:.4f}); best.pt in {run_dir}")
    return 0
