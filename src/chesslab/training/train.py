"""Stage 5 — Training loop. Aborts clearly without usable ROCm GPU (no silent CPU fallback)."""

from __future__ import annotations

import atexit
import json
import os
import random
import time
from collections import deque
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


def _require_pack(dataset: str | None, n_rows: int, allow_unpacked: bool) -> None:
    """Ohne Memmap gar nicht erst starten, sobald der Datensatz gross genug zum Packen ist.

    Ein verworfener Pack fiel bisher still auf den Datei-Loader zurueck: die Folds und der
    SWA-Lauf liefen dreifach langsam an einem veralteten Pack vorbei, ohne dass es jemand sah.
    """
    from ..dataset_build import _PACK_MIN_CROPS

    if allow_unpacked or dataset is None or n_rows < _PACK_MIN_CROPS:
        return
    raise ValueError(
        f"'{dataset}' hat keine nutzbare Memmap ({n_rows} Crops) - das Training bricht ab "
        f"statt still auf den Datei-Loader zu fallen. Grund steht in der WARNING darueber. "
        f"Repack: chesslab dataset pack {dataset} - absichtlich ohne Pack: --allow-unpacked.")


def _conf_mean(vis_conf, wrong: bool) -> float | None:
    """Mittlere Konfidenz auf falschen bzw. richtigen Vorhersagen."""
    trues, preds, conf = vis_conf
    if not conf:
        return None
    sel = [c for t, p, c in zip(trues, preds, conf, strict=False) if (t != p) is wrong]
    return float(sum(sel) / len(sel)) if sel else None


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
    vis_occ = visible & true_occ
    vis_occ_n = int(vis_occ.sum())
    return {
        "val_coverage_mae": float(np.abs(cov_pred - cov_true).mean()),
        "val_coverage_recall": occ_tp / occ_want if occ_want else 0.0,
        "val_coverage_precision": occ_tp / occ_hit if occ_hit else 0.0,
        "val_visible_acc": float((pred_cls[visible] == true_cls[visible]).mean())
        if vis_n else float("nan"),
        "val_visible_occupied_acc": float((pred_occ[visible] == true_occ[visible]).mean())
        if vis_n else float("nan"),
        # Die Figurenachse, die `CHECKPOINT_WEIGHTS` benotet. `val_piece_acc` daneben zaehlt
        # verdeckte Zellen mit und haengt damit am Verdeckungsanteil des Splits, nicht am Modell.
        "val_visible_piece_acc": float((pred_cls[vis_occ] == true_cls[vis_occ]).mean())
        if vis_occ_n else float("nan"),
        "val_visible_occupied_n": vis_occ_n,
        "val_visible_occupied_board_acc": (
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
              split: str | None = None,
              swa: bool = False, swa_lr: float = 5e-4,
              swa_start: float = 0.75, allow_unpacked: bool = False,
              visible_max: float | None = None, weight_cap: float | None = None,
              weight_decay: float | None = None,
              label_smoothing: float = 0.0,
              hflip_p: float | None = None,
              balance_situations: bool = False) -> int:
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
    # Die Augmentierung zieht aus `random`, nicht aus torch oder numpy. In Workern seedet PyTorch
    # das selbst; bei `--num-workers 0` niemand — gemessen 2026-08-25, dort waren zwei Laeufe mit
    # gleichem Seed pixelverschieden bei identischer Batch-Reihenfolge.
    random.seed(seed)

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
    if erase_p is not None or jitter_translate is not None or hflip_p is not None:
        from dataclasses import replace
        policy = replace(policy, **({"erase_p": erase_p} if erase_p is not None else {}),
                         **({"jitter_translate": jitter_translate}
                            if jitter_translate is not None else {}),
                         **({"hflip_p": hflip_p} if hflip_p is not None else {}))
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
        _require_pack(dataset, len(train_rows) + len(val_rows), allow_unpacked)
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
    # Die Gewichte in split.json zaehlen ALLE Zellen, der Occlusion-Verlust sieht nur die
    # sichtbaren. Verdeckung ist nicht gleich verteilt — weiss 11-15 %, schwarz 2-6 %, weil die
    # Hand immer von der weissen Seite kommt —, also stimmt die angenommene Haeufigkeit nicht.
    # Hier statt im Split, damit split.json unangetastet bleibt (es ist die Reproduzierbarkeit).
    if occluding:
        from ..dataset import compute_class_weights
        from .occlusion import PIECE_VISIBLE_MAX

        vis_counts: dict[str, int] = {}
        for r in train_rows:
            if r.get("coverage", 0.0) <= PIECE_VISIBLE_MAX:
                vis_counts[r["label"]] = vis_counts.get(r["label"], 0) + 1
        split = {**split, "class_weights": compute_class_weights(vis_counts, classes, weight_cap)}
        if weight_cap is not None:
            print(f"[loss] Gewichte auf {weight_cap:g}x gekappt"
                  + (" — das ist UNGEWICHTET." if weight_cap == 1 else " (geglaettet, nicht beschnitten)."))
    weights = class_weights_tensor(split, classes).to(device)
    if occluding:
        from .occlusion import PIECE_VISIBLE_MAX, OcclusionLoss

        # Nur die TRAININGS-Maske. Die Metriken bleiben auf PIECE_VISIBLE_MAX, sonst wuerden
        # zwei Laeufe auf verschiedenen Zellmengen benotet und waeren nicht vergleichbar.
        vmax = PIECE_VISIBLE_MAX if visible_max is None else visible_max
        criterion = OcclusionLoss(weights, visible_max=vmax,
                                  label_smoothing=label_smoothing).to(device)
        if visible_max is not None:
            print(f"[occ] Trainingsmaske bei coverage <= {vmax:g} "
                  f"(Bewertung weiterhin bei {PIECE_VISIBLE_MAX:g})")
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
    # AdamW = Adam with decoupled weight decay (docs/references.md#loshchilov-2017). Bis 2026-08-26
    # lief jeder Lauf auf PyTorchs Default 0,01 — bei train_loss 0,03 gegen val_loss 1,33
    # (`docs/measurement-floor.md`) ist das der erste Knopf, nicht der letzte.
    wd = 0.01 if weight_decay is None else weight_decay
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=wd)
    if weight_decay is not None or label_smoothing:
        print(f"[reg] weight_decay={wd} label_smoothing={label_smoothing}")
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
    loader_kw = {"batch_size": batch_size, **config.loader_kwargs(nw)}
    sampler = None
    # Eine SITUATION ist (Session, Feld, Klasse) — dieselbe Figur auf demselben Feld, ueber die
    # Frames hinweg. Der Korpus traegt 1 643 davon auf 184 735 Crops, und die Gruppen sind 13,6x
    # ungleich (p10 18, p90 245): die groessten 10 % holen 30 % aller Ziehungen. `wK` kennt 22
    # Platzierungen, jede 131-fach je Epoche. Gleiche Ziehungsmasse je Situation laesst die
    # Lichtvariation der Frames drin und nimmt nur die Schieflage raus.
    situation_w = None
    if balance_situations:
        import collections

        groups = collections.Counter(
            (r["session_id"], r["square"], r["label"]) for r in train_rows)
        situation_w = [1.0 / groups[(r["session_id"], r["square"], r["label"])]
                       for r in train_rows]
        print(f"[sampler] {len(groups)} Situationen gleichgewichtet "
              f"(Gruppen {min(groups.values())}-{max(groups.values())} Crops)")
    if hard_negative_multiplier != 1.0:
        if hard_negative_multiplier < 1.0:
            print("[FAIL] --hard-negative-multiplier must be at least 1.")
            return 1
        if not priority_paths:
            print("[FAIL] --hard-negative-multiplier needs data/reports/hard_empty.jsonl.")
            return 1
        base_w = [hard_negative_multiplier if row.get("path") in priority_paths else 1.0
                  for row in train_rows]
        if situation_w is not None:
            base_w = [a * b for a, b in zip(base_w, situation_w, strict=True)]
        sample_weights = torch.tensor(base_w, dtype=torch.double)
        hard_count = sum(row.get("path") in priority_paths for row in train_rows)
        print(f"[hard-negative] {hard_count} protected crops sampled at {hard_negative_multiplier:g}x weight")
    elif situation_w is not None:
        sample_weights = torch.tensor(situation_w, dtype=torch.double)
    if hard_negative_multiplier != 1.0 or situation_w is not None:
        generator = torch.Generator().manual_seed(seed)
        sampler = WeightedRandomSampler(sample_weights, len(train_rows), replacement=True,
                                        generator=generator)
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
        "aug_hflip_p": getattr(policy, "hflip_p", 0.0),
        "weight_decay": wd,
        "label_smoothing": label_smoothing,
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
        "balance_situations": balance_situations,
        "visible_max": vmax if occluding else None,
        "effective_class_weights": dict(zip(classes, [float(w) for w in weights.tolist()],
                                            strict=True)),
    }, indent=2), encoding="utf-8")
    metrics_path = run_dir / "metrics.jsonl"

        # Checkpoint und Early Stopping am GEWICHTETEN Score (`data.CHECKPOINT_WEIGHTS`), nicht
    # mehr am Brett-Mass allein: das schwankt um 19,4 % und liess `patience` gegen einen
    # fruehen Ausreisser zaehlen. Brett-Mass und macro_recall bleiben als Stichentscheid.
    best_score = (-1.0, -1.0, -1.0)   # (gewichteter Score, occupied_board_acc, macro_recall)
    best_piece = (-1.0, -1)           # (val_piece_acc, Epoche) — eigener Checkpoint
    # Die Validierung schwankt hier um den Faktor 1,2-1,3 je Epoche, bei 57 000 Crops also
    # nicht als Stichprobenrauschen erklaerbar. Ein Einzelwert waehlt darum den gluecklichsten
    # Ausreisser und laesst `patience` gegen ihn zaehlen. Entschieden wird ueber das Mittel
    # der letzten drei Epochen; gespeichert wird trotzdem der aktuelle Stand.
    recent: deque = deque(maxlen=3)
    # SWA mittelt die Gewichte ueber die Epochen statt eine einzelne auszuwaehlen. Es findet
    # flache Minima, und die trennen die Konfidenz richtiger von falschen Vorhersagen besser
    # (FMFP, ECCV 2022 — `docs/references.md`). Nebeneffekt: das Springen der Validierung
    # verschwindet, weil kein Einzelstand mehr die Auswahl traegt.
    swa_model = swa_sched = None
    swa_from = int(epochs * swa_start) if swa else -1
    if swa:
        from torch.optim.swa_utils import SWALR, AveragedModel

        swa_model = AveragedModel(model)
        swa_sched = SWALR(optimizer, swa_lr=swa_lr)
        print(f"[OK] SWA ab Epoche {swa_from}, davor unveraenderter {sched}-Plan; "
              f"danach konstant {swa_lr}")
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
        # Sobald SWA uebernimmt, haelt SWALR die Rate — der Cosine-Plan darf dann nicht
        # weiterlaufen, sonst treten zwei Scheduler gegen denselben Optimizer an.
        if swa_from < 0 or epoch < swa_from:
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
        from .data import confidence_auroc, visible_confidence

        # Auf denselben Zellen wie die Genauigkeits-Terme: verdeckte Zellen irren zu 55-63 %,
        # dabei aber unsicher — sie druecken conf_wrong um acht Punkte und schoenen damit
        # genau das Mass, das ueberzeugte Fehler aufdecken soll (gemessen 2026-08-24).
        vis_conf = visible_confidence(val_rows, true_labels, pred_labels, val.get("conf") or [])
        auroc = confidence_auroc(*vis_conf)
        score, bd = checkpoint_metrics(val_rows, classes, true_labels, pred_labels,
                                       auroc=auroc)
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
            "val_occupied_acc": bd["occupied_acc"],
            "val_occupied_board_acc": bd["occupied_board_acc"],
            "val_piece_acc": bd["piece_acc"],
            # Die Zahl, die zwei gleich genaue Modelle trennt: ueberzeugte Fehler brechen
            # die Dekodierung, unsichere lassen sich korrigieren.
            "val_conf_wrong": _conf_mean(vis_conf, wrong=True),
            "val_conf_auroc": auroc,
            "val_conf_right": _conf_mean(vis_conf, wrong=False),
            "val_checkpoint_score": score[0],
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
              f"| macro_recall {rec['val_macro_recall']:.4f} | score {score[0]:.4f}")

        if occ_diag:
            print(
                f"          coverage_mae {occ_diag['val_coverage_mae']:.4f} "
                f"| cov_recall@0.5 {occ_diag['val_coverage_recall']:.4f} "
                f"| cov_precision@0.5 {occ_diag['val_coverage_precision']:.4f} "
                f"| visible_acc {occ_diag['val_visible_acc']:.4f} "
                f"| visible_occupied_acc {occ_diag['val_visible_occupied_acc']:.4f} "
                f"| visible_piece_acc {occ_diag['val_visible_piece_acc']:.4f} "
                f"| visible_occupied_board_acc {occ_diag['val_visible_occupied_board_acc']:.4f}"
            )

        torch.save(model.state_dict(), run_dir / "last.pt")
        # Ein ZWEITER Checkpoint auf die reine Figurengenauigkeit. Der gewichtete Score
        # sieht Kalibrierung nicht: ein spaeterer, ueberkonfidenter Lauf kann ihn gewinnen
        # und den frueheren verdraengen, der besser dekodiert. Beide bleiben messbar.
        if bd["piece_acc"] > best_piece[0]:
            best_piece = (bd["piece_acc"], epoch)
            torch.save(model.state_dict(), run_dir / "best_piece.pt")
        # Bis `swa_from` laeuft das Rezept unveraendert; erst danach wird gemittelt und die
        # Rate konstant gehalten. Sonst waere es ein anderes Rezept, kein A/B.
        if swa_model is not None and epoch >= swa_from:
            swa_model.update_parameters(model)
            swa_sched.step()
        recent.append(score)
        smooth = tuple(sum(v[i] for v in recent) / len(recent) for i in range(3))
        if smooth > best_score:
            best_score = smooth
            epochs_no_improve = 0
            torch.save(model.state_dict(), run_dir / "best.pt")
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                print(f"[OK] Early stopping (no improvement in the weighted score for {patience} epochs). "
                      "Increase patience with `--patience N`.")
                break

    print(f"[OK] done. best by score={best_score[0]:.4f} (occupied_board_acc={best_score[1]:.4f}, "
          f"macro_recall={best_score[2]:.4f}); best.pt in {run_dir}")
    print(f"[OK] best_piece.pt: piece_acc={best_piece[0]:.4f} bei Epoche {best_piece[1]} "
          "— gegen best.pt messen, bevor eine Stufe darauf aufbaut.")

    # SWA abschliessen: die gemittelten Gewichte haben NIE einen Batch gesehen, ihre
    # BatchNorm-Statistiken sind daher die des letzten Einzelstands. Ohne diesen Durchlauf
    # ueber die Trainingsdaten ist ein SWA-Modell unbrauchbar.
    if swa_model is not None:
        from torch.optim.swa_utils import update_bn

        print("[i] SWA: BatchNorm-Statistiken werden neu geschaetzt ...", flush=True)
        update_bn(train_loader, swa_model, device=device)
        inner = swa_model.module
        torch.save(inner.state_dict(), run_dir / "swa.pt")
        sv = evaluate_dataset(inner, val_ds, device, criterion=criterion,
                              batch_size=batch_size, num_workers=nw, keep_workers=False)
        st, sbd = checkpoint_metrics(
            val_rows, classes, list(sv["trues"]), list(sv["preds"]),
            auroc=confidence_auroc(sv["trues"], sv["preds"], sv.get("conf") or []))
        print(f"[OK] swa.pt: score {st[0]:.4f} piece {sbd['piece_acc']:.4f} "
              f"auroc {sbd['calibration']:.4f} — gegen best.pt {best_score[0]:.4f} messen")

    # Temperatur auf val anpassen und mitschreiben: der Dekoder soll keine handgesetzte
    # Konstante brauchen, jedes Modell bringt seine eigene mit. Argmax und Genauigkeit
    # aendern sich dabei nicht, nur die Wahrscheinlichkeiten werden ehrlich.
    try:
        from .data import fit_temperature

        model.load_state_dict(torch.load(run_dir / "best.pt", map_location=device))
        cal = evaluate_dataset(model, val_ds, device, batch_size=batch_size,
                               num_workers=nw, keep_workers=False)
        temp = fit_temperature(cal.get("logits"), cal["trues"])
        cfg_path = run_dir / "config.json"
        cfg_now = json.loads(cfg_path.read_text(encoding="utf-8"))
        cfg_now["temperature"] = round(temp, 4)
        cfg_path.write_text(json.dumps(cfg_now, indent=2), encoding="utf-8")
        print(f"[OK] Temperatur {temp:.3f} auf val angepasst -> config.json "
              f"(conf auf Fehlern {cal['conf_wrong']:.3f})")
    except Exception as e:  # noqa: BLE001 — Kalibrierung darf keinen Lauf kippen
        print(f"[WARN] Temperatur nicht angepasst: {e}")
    return 0
