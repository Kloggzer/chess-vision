"""Stage 5 — Training loop. Aborts clearly without usable ROCm GPU (no silent CPU fallback)."""

from __future__ import annotations

import atexit
import json
import os
import time
from datetime import datetime
from pathlib import Path

from .. import config, doctor, locks
from ..work_audit import current as current_work_audit
from .data import (
    checkpoint_metrics,
    crop_of_rows,
    filter_rows_by_split,
    load_manifest,
    load_split,
)


def _train_lock_path() -> Path:
    """The SAME file the web app's Autopilot serializes on (`platform/app/lib/autopilot-state.ts`).

    Two locks that do not know each other are no lock: the Autopilot started a replay onto the GPU
    while a training held it, and the only remedy was pausing it by hand (2026-08-16).
    """
    return config.DATA.heavy_lock


def _load_training_pack(dataset: str | None, manifest_rows: list[dict]):
    """Resolve a dataset's pack once, reusing the manifest already held by training."""
    if dataset is None:
        return None
    from .pack import load_packed

    return load_packed(dataset, manifest_rows=manifest_rows)


def _occlusion_diagnostics(val: dict, val_rows: list[dict], classes: list[str],
                           visible_max: float) -> dict[str, float | int]:
    """Derive every coverage/visibility metric from the regular validation's predictions."""
    import numpy as np

    cov_true = val["coverage_trues"]
    cov_pred = val["coverage_probs"]
    true_cls = val["trues"]
    pred_cls = val["preds"]
    want, hit = cov_true > 0.5, cov_pred > 0.5
    visible = cov_true <= visible_max
    true_occ = true_cls != classes.index("empty")
    pred_occ = pred_cls != classes.index("empty")
    visible_boards: dict[tuple[str, str], bool] = {}
    for row, is_visible, square_ok in zip(
            val_rows, visible.tolist(), (true_occ == pred_occ).tolist(), strict=True):
        if is_visible:
            key = (row["session_id"], str(row["frame"]))
            visible_boards[key] = visible_boards.get(key, True) and square_ok

    occ_tp = int((want & hit).sum())
    occ_want, occ_hit = int(want.sum()), int(hit.sum())
    vis_n = int(visible.sum())
    return {
        "val_occ_mae": float(np.abs(cov_pred - cov_true).mean()),
        "val_occ_recall": occ_tp / occ_want if occ_want else 0.0,
        "val_occ_precision": occ_tp / occ_hit if occ_hit else 0.0,
        "val_visible_acc": float((pred_cls[visible] == true_cls[visible]).mean())
        if vis_n else float("nan"),
        "val_visible_occ_acc": float((pred_occ[visible] == true_occ[visible]).mean())
        if vis_n else float("nan"),
        "val_visible_occ_board_acc": (
            sum(visible_boards.values()) / len(visible_boards)
            if visible_boards else float("nan")),
        "val_visible_n": vis_n,
    }


def _acquire_train_lock(desc: str) -> bool:
    """False if another LIVE training holds the GPU. A stale lock is reclaimed automatically."""
    holder = locks.acquire(_train_lock_path(), "train", desc)
    if holder is None:
        return True
    print(f"[FAIL] {locks.describe(holder)} is already running. The GPU takes one at a time - "
          "stop it first (Training tab 'Stop', Autopilot pause, or kill the process).")
    return False


def _release_train_lock() -> None:
    locks.release(_train_lock_path())


def run_train(backbone: str, epochs: int, batch_size: int, lr: float,
              no_amp: bool, seed: int, out: str | None, patience: int,
              num_workers: int | None = None, norm: str | None = None,
              per_crop: bool = False, input_repr: str = "rgb",
              dataset: str | None = None, resume: str | None = None,
              head: str = "occlusion", scales: list[int] | None = None,
              input_size: str | None = None,
              erase_p: float | None = None,
              loss: str = "ce", focal_gamma: float = 2.0,
              class_weight: dict[str, float] | None = None,
              sched: str = "cosine",
              jitter_translate: float | None = None,
              hard_negative_multiplier: float = 1.0,
              split: str | None = None) -> int:
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
    from torch.utils.data import DataLoader, WeightedRandomSampler

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

    # Held apart from the local `split`, which is REBOUND to the loaded policy dict further down —
    # the collision wrote that dict into config.json and left the guard reading a dict as a path.
    split_file = split
    if dataset:
        from ..dataset_build import dataset_dir
        dd = dataset_dir(dataset)
        manifest_path = dd / "manifest.jsonl"
        # One packed corpus, several splits over it (cross-validation folds): the memmap is
        # 9 GB and packing it per fold copies the same crops four times. `occluded_model.
        # trained_on` reads the name back out of config.json, so the circularity guard follows.
        split_path = dd / (split_file or "split.json")
        if not manifest_path.exists() or not split_path.exists():
            print(f"[FAIL] Dataset '{dataset}' not built ({dd}). First build it in the Datasets tab "
                  "(`chesslab dataset build`), then train.")
            return 1
    else:
        manifest_path = config.DATA.crop_pool / "manifest.jsonl"
        split_path = config.DATA.reports / "split.json"
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
    # `occlusion` shares the final linear layer and reads its LAST unit as the coverage logit —
    # one output tensor, so the exported graph keeps its shape (`evaluate.ONNX_BATCH`).
    occluding = head == "occlusion"
    # The FILE's size and the MODEL's size stopped being the same thing when the crop store went
    # to 128 px for the label view (2026-08-17). Reading the manifest silently made the store
    # decide the recipe; `input_size` says it out loud, and `build_transform` does the scaling in
    # memory, so one store serves every deployment resolution.
    from ..labeling import parse_out_size

    out_size = parse_out_size(input_size) if input_size else None
    # A pack built with `--pack-size` already holds the model's resolution, and it is what the
    # loader will actually serve — reading the manifest instead would scale 80 px pixels back up
    # to the 128 px the FILES are, which is worse than either.
    src = "--input-size"
    packed = _load_training_pack(dataset, manifest)
    if out_size is None:
        if packed is not None:
            out_size, src = (packed[1][2], packed[1][1]), "the pack"
    for r in manifest:
        out_size, src = (out_size, src) if out_size else (tuple(r["out_size"]), "the manifest")
        print(f"[size] training at {out_size[0]}x{out_size[1]} from {r['out_size'][0]}x"
              f"{r['out_size'][1]} crops (from {src})")
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
    if erase_p is not None or jitter_translate is not None:
        from dataclasses import replace
        policy = replace(policy, **({"erase_p": erase_p} if erase_p is not None else {}),
                         **({"jitter_translate": jitter_translate}
                            if jitter_translate is not None else {}))
        print(f"[aug] override erase_p={policy.erase_p} "
              f"jitter_translate={policy.jitter_translate}")
    # Packed memmap loader (training.pack): if the dataset was `chesslab dataset pack`ed, read
    # crops from ONE memmap instead of 1M per-item Image.open (the I/O bottleneck).
    # Fused datasets (dataset build-synth) have NO crop files at all — manifest paths are virtual
    # mm:// keys into the memmap. The per-PNG loader would crash on the first batch there.
    fused = bool(train_rows) and str(train_rows[0].get("path", "")).startswith("mm://")
    if fused and packed is None:
        print(f"[FAIL] dataset '{dataset}' is a fused synth build (mm:// paths) but its "
              "packed memmap is missing/stale — re-run `chesslab dataset build-synth`.")
        return 1
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
        train_ds = PackedSquareDataset(train_rows, classes, train_tf, packed,
                                       with_coverage=occluding)
        val_ds = PackedSquareDataset(val_rows, classes, val_tf, packed,
                                     with_coverage=occluding)
    else:
        train_ds = SquareDataset(train_rows, classes, train_tf, with_coverage=occluding,
                                 augment=True, policy=policy)
        val_ds = SquareDataset(val_rows, classes, val_tf, with_coverage=occluding)

    # BatchNorm is broken on ROCm-Windows (MIOpen/HIPRTC) -> default GroupNorm there.
    # batchnorm everywhere, Windows included. The groupnorm-on-Windows default was a workaround
    # for a MIOpen crash on MobileNet batch-norm; all 10 shipped runs are MobileNet + batchnorm on
    # this machine, so the workaround outlived the bug it dodged.
    norm_eff = norm or "batchnorm"
    device = get_device(require_gpu=True)
    model = build_model(backbone, len(classes) + occluding, pretrained=(backbone != "smallcnn"),
                        norm=norm_eff, head="combined", in_chans=in_chans).to(device)
    print(f"[OK] Backbone {backbone}, norm={norm_eff}, head={head}, "
          f"input_repr={input_repr} ({in_chans}ch)")

        # Continue training (warm start): load weights from a previous run. Matching tensors
    # are adopted, non-matching ones (e.g. the classification head with changed class count,
    # such as after adding `occluded`) are skipped -> the body transfers, the head learns anew.
    resumed_from = None
    if resume:
        from .model import adopt_weights, checkpoint_of

        rd = config.DATA.models / resume
        ckpt = checkpoint_of(rd)
        if not (rd / "config.json").exists() or ckpt is None:
            print(f"[FAIL] Resume run '{resume}' incomplete or not found ({rd}).")
            return 1
        rcfg = json.loads((rd / "config.json").read_text(encoding="utf-8"))
        if rcfg.get("backbone") != backbone:
            print(f"[FAIL] Resume backbone {rcfg.get('backbone')!r} != {backbone!r} — choose the same backbone.")
            return 1
        keep, skipped = adopt_weights(model, ckpt, device)
        resumed_from = resume
        print(f"[OK] Resumed from '{resume}': {keep} tensors adopted"
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
    if occluding:
        from .occlusion import OcclusionLoss
        criterion = OcclusionLoss(weights).to(device)
    elif loss == "ce":
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
    # 8 statt 0. persistent_workers spart das Neu-Spawnen je Epoche (teuer bei Windows-spawn),
    # prefetch_factor hält Batches vor. Mit --num-workers 0 überschreibbar, falls doch Probleme.
    nw = num_workers if num_workers is not None else config.DEFAULT_NUM_WORKERS
    loader_kw = {"batch_size": batch_size, "pin_memory": True, "num_workers": nw}
    if nw > 0:
        loader_kw.update(persistent_workers=True, prefetch_factor=4)
    sampler = None
    if hard_negative_multiplier != 1.0:
        if hard_negative_multiplier < 1.0:
            print("[FAIL] --hard-negative-multiplier must be at least 1.")
            return 1
        if not priority_paths:
            print("[FAIL] --hard-negative-multiplier needs data/reports/hard_empty.jsonl.")
            return 1
        sample_weights = torch.tensor(
            [hard_negative_multiplier if row.get("path") in priority_paths else 1.0 for row in train_rows],
            dtype=torch.double,
        )
        generator = torch.Generator().manual_seed(seed)
        sampler = WeightedRandomSampler(sample_weights, len(train_rows), replacement=True, generator=generator)
        hard_count = sum(row.get("path") in priority_paths for row in train_rows)
        print(f"[hard-negative] {hard_count} protected crops sampled at {hard_negative_multiplier:g}x weight")
    train_loader = DataLoader(train_ds, shuffle=sampler is None, sampler=sampler, drop_last=False, **loader_kw)

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
        "dataset": dataset, "split_file": split_file, "split": split, "resumed_from": resumed_from, "head": head,
        **({} if crop is None else {"pad_side": crop[0], "pad_up": crop[1]}),
        # What SERVING must reproduce. `normalize.mode` "per_crop" ignores mean/std entirely, and
        # `input_repr` decides both the channel stack AND the stem's fan-in — a consumer that gets
        # either wrong feeds the model something it has never seen, silently.
        "normalize": {"mean": list(config.NORMALIZE_MEAN), "std": list(config.NORMALIZE_STD),
                      "mode": "per_crop" if per_crop else "fixed"},
        "input_repr": input_repr, "in_chans": in_chans,
        "scales": scales,
        "aug": {"erase_p": policy.erase_p},
        "loss": loss, "focal_gamma": focal_gamma if loss == "focal" else None,
        "class_weight_override": dict(class_weight or {}),
        "hard_negative_multiplier": hard_negative_multiplier,
        "effective_class_weights": dict(zip(classes, [float(w) for w in weights.tolist()],
                                            strict=True)),
    }, indent=2), encoding="utf-8")
    metrics_path = run_dir / "metrics.jsonl"

        # Checkpoint/early-stopping via occupancy-first score: occ_board_acc (all 64 squares
    # empty/occupied correct) is the signal the tracker primarily needs — more robust
    # than full board accuracy with little val data. occ_acc + macro_recall as tiebreaker.
    best_score = (-1.0, -1.0, -1.0)   # (occ_board_acc, occ_acc, macro_recall)
    epochs_no_improve = 0
    print(f"[OK] GPU ready ({device}); run directory: {run_dir}")
    for epoch in range(epochs):
        t_epoch = time.perf_counter()
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
        t_train = time.perf_counter() - t_epoch

        t0 = time.perf_counter()
        val = evaluate_dataset(model, val_ds, device, criterion=criterion, batch_size=batch_size, num_workers=nw)
        t_val = time.perf_counter() - t0
        work_audit = current_work_audit()
        validation_key = (id(model), id(val_ds), epoch)
        if work_audit is not None:
            work_audit.record_work("validation inference passes", validation_key, seconds=t_val)
        t0 = time.perf_counter()
        true_labels = val["trues"].tolist()
        pred_labels = val["preds"].tolist()
        score, bd = checkpoint_metrics(val_rows, classes, true_labels, pred_labels)
        t_score = time.perf_counter() - t0
        # --- occlusion validation diagnostics ---
        # The regular class metrics intentionally still score every crop for backwards
        # compatibility.  For an occlusion-head run we additionally measure:
        #   * continuous coverage quality
        #   * class/occupancy quality only where the piece is actually visible
        #
        occ_diag = {}
        if occluding:
            from .occlusion import PIECE_VISIBLE_MAX

            occ_diag = _occlusion_diagnostics(val, val_rows, classes, PIECE_VISIBLE_MAX)

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
            # Where the wall clock went. Without it "the GPU idles between epochs" is a guess:
            # the eval loader, the metric block and the checkpoint are three different suspects.
            "t_train_s": round(t_train, 2), "t_val_s": round(t_val, 2), "t_score_s": round(t_score, 2),
        }
        if occ_diag:
            rec.update(occ_diag)

        with metrics_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(rec) + "\n")
        print(f"epoch {epoch:>3} | train_loss {rec['train_loss']:.4f} | val_acc {rec['val_acc']:.4f} "
              f"| macro_recall {rec['val_macro_recall']:.4f} | occ_board_acc {score[0]:.4f}")

        if occ_diag:
            print(
                f"          coverage_mae {occ_diag['val_occ_mae']:.4f} "
                f"| cov_recall@0.5 {occ_diag['val_occ_recall']:.4f} "
                f"| cov_precision@0.5 {occ_diag['val_occ_precision']:.4f} "
                f"| visible_acc {occ_diag['val_visible_acc']:.4f} "
                f"| visible_occ_acc {occ_diag['val_visible_occ_acc']:.4f} "
                f"| visible_occ_board_acc {occ_diag['val_visible_occ_board_acc']:.4f}"
            )

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
