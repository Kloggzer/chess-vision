"""Stage 5 — Training loop. Aborts clearly without usable ROCm GPU (no silent CPU fallback)."""

from __future__ import annotations

import atexit
import os
import random
from datetime import datetime
from pathlib import Path

from .. import config, doctor
from ..ioutil import write_json
from .data import crop_of_rows
from .temperature import calibrate_run
from .train_feed import (
    build_datasets,
    check_fused,
    data_files,
    read_data,
    rotations,
    train_feed,
    train_size,
    training_rows,
)
from .train_lock import _acquire_train_lock, _release_train_lock
from .train_loop import TrainRun, finish_swa, resume_progress, run_epochs, start_swa
from .train_recipe import (
    AUG_KNOBS,
    Refused,
    aug_policy,
    batch_photometric,
    build_criterion,
    build_optimizer,
    build_run_model,
    check_balance,
    loss_weights,
    run_config,
    warm_start,
)


def run_train(backbone: str, epochs: int, batch_size: int, lr: float,
              no_amp: bool, seed: int, out: str | None, patience: int,
              num_workers: int | None = None, norm: str | None = None,
              eval_workers: int = 2, prefetch_factor: int = 2,
              low_memory: bool = True, ram_reserve_gb: float = 0.0,
              per_crop: bool = False, input_repr: str = "rgb",
              dataset: str | None = None, resume: str | None = None,
              continue_run: bool = False, dark_min: float | None = None,
              head: str = "occlusion", scales: list[int] | None = None,
              board_width: int = 128, board_layers: int = 2,
              clahe_clip: float = 0.0, clahe_tile: int = 8,
              clahe_min_mean: float = 0.0, clahe_max_mean: float = 255.0,
              clahe_denoise: str = "off",
              input_size: str | None = None,
              erase_p: float | None = None,
              erase_scale: tuple[float, float] | None = None,
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
              coverage_weight: str = "hard",
              hflip_p: float | None = None,
              vflip_p: float | None = None,
              rot180_p: float | None = None,
              flip_xor_p: float | None = None,
              invert_p: float | None = None,
              grayscale_p: float | None = None,
              brightness: float | None = None,
              contrast: float | None = None,
              color_jitter: float | None = None,
              blur_sigma_max: float | None = None,
              gamma: tuple[float, float] | None = None,
              balance: str = "none",
              epoch_frac: float = 1.0,
              rot90: bool | None = None,
              batch_aug: bool = False,
              channels_last: bool = False,
              compile_model: bool = False,
              compile_mode: str | None = None,
              compile_batch_aug: bool = False,
              fused_adamw: bool = False,
              aug_scale: float | None = None,
              pretrained: bool | None = None,
              no_empty_cap: bool = False,
              neighbour_p: float | None = None,
              strict_verdicts: bool = False) -> int:
    """`scales`: every batch is resized to one of these sizes (YOLOv2 multi-scale), so the
    size-agnostic model learns them all in one run; the deployment resolution must be among them
    (FixRes).
    """
    recipe = dict(locals())             # the arguments as given; `run_config` writes them
    # GPU precondition before any torch import: a broken build is reported clearly, not as an
    # ImportError.
    check_balance(balance)
    if compile_batch_aug and not batch_aug:
        raise ValueError('--compile-batch-aug requires --batch-aug')
    if compile_mode and not compile_model:
        raise ValueError('--compile-mode requires --compile-model')
    ok, checks = doctor.validate_gpu()
    if not ok:
        print(doctor.render(checks))
        print("[FAIL] No usable ROCm GPU — training aborted (no CPU fallback). "
              "Run `chesslab doctor --gpu` for diagnosis.")
        return 1

    # One training on the GPU at a time: concurrent runs crashed on memory.
    from .memory import check_ram

    if ram_reserve_gb < 0:
        raise ValueError("ram_reserve_gb must be non-negative")
    check_ram(ram_reserve_gb)
    if low_memory:
        # Den Speicher rettet der Datei-Lesepfad (109 statt 1 482 MB je Worker) und das fehlende
        # Pinning, NICHT das Abschalten der Worker — die kosten 20,5 von 27,2 s je Epoche.
        eval_workers = 0
        prefetch_factor = 1
        if num_workers is None:
            num_workers = 0
        print(f"[memory] low-memory mode: direct file reads, {num_workers or 0} loader workers, "
              f"no pinned RAM; reserve {ram_reserve_gb:g} GiB")
    if not _acquire_train_lock(f"{backbone} bs={batch_size} ep={epochs} head={head}"):
        return 1
    if os.environ.get("CHESSLAB_TRAIN_SLOT"):
        print(f"[WARN] Slot {os.environ['CHESSLAB_TRAIN_SLOT']}: eigener Lock, laeuft NEBEN "
              "anderen Trainings und neben dem Autopilot. Speicher im Auge behalten.")
    atexit.register(_release_train_lock)
    # Against allocator fragmentation OOM with plenty of VRAM free; must precede the first CUDA
    # allocation.
    os.environ.setdefault("PYTORCH_ALLOC_CONF", "expandable_segments:True")
    # VOR dem Import: danach hat OpenBLAS seine Arenen schon reserviert (Hauptprozess 2,9 GB Commit
    # gegen 0,6 der Worker).
    config.cap_blas_threads()

    import numpy as np
    import torch

    from .torch_data import INPUT_REPRS

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
    # Die Augmentierung zieht aus `random`; bei `--num-workers 0` seedet das sonst niemand, und zwei
    # Laeufe mit gleichem Seed waren pixelverschieden.
    random.seed(seed)

    # Held apart from the local `split`, which is rebound to the policy dict below.
    split_file = split
    try:
        manifest, split, verdicts = read_data(*data_files(dataset, split_file), strict_verdicts)
        classes = split["classes"]
        # `occlusion` reads the LAST unit of the shared linear layer as coverage: one output tensor,
        # so the exported graph keeps its shape.
        occluding = head == "occlusion"
        out_size, packed = train_size(input_size, dataset, manifest)
        train_rows, val_rows, priority_paths, board_mode = training_rows(
            manifest, split, seed, dataset, backbone, scales, head, no_empty_cap, neighbour_p)
        policy = aug_policy(aug_scale, **{k: recipe[k] for k in AUG_KNOBS})
        check_fused(train_rows, packed, dataset)
        rot90 = rotations(dataset, rot90)
        photometric, policy = batch_photometric(policy, batch_aug, compile_batch_aug, per_crop,
                                                input_repr)
        train_ds, val_ds = build_datasets(
            recipe, packed=packed, out_size=out_size, policy=policy, photometric=photometric,
            rot90=rot90, board_mode=board_mode, train_rows=train_rows, val_rows=val_rows,
            classes=classes, occluding=occluding)
        model, device, norm_eff, want_pre = build_run_model(recipe, len(classes) + occluding,
                                                            in_chans)
        resumed_from = warm_start(model, resume, backbone, device)
        split, weights = loss_weights(split, classes, class_weight, occluding, train_rows,
                                      weight_cap, device)
        criterion, vmax, dmin = build_criterion(recipe, occluding, weights, classes, train_rows,
                                                device)
        optimizer, scheduler, scaler, wd, amp = build_optimizer(recipe, model)
        feed = train_feed(
            recipe, train_ds=train_ds, val_ds=val_ds, train_rows=train_rows, val_rows=val_rows,
            num_workers=num_workers, eval_workers=eval_workers, prefetch_factor=prefetch_factor,
            photometric=photometric, board_mode=board_mode, priority_paths=priority_paths)
    except Refused:
        return 1

    # The crop's composition, from ALL rows (specs/45); absent means legacy, never a guess.
    crop = crop_of_rows(manifest)
    if crop is None:
        print(f"[crop] dataset {dataset!r} does not record pad_side on every row — the "
              "run will declare no crop and every consumer keeps its own profile's pad.")
    else:
        print(f"[crop] pad_side={crop:g} — declared by this run")

    run_dir = Path(out) if out else config.DATA.models / f"run-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    if (run_dir / "metrics.jsonl").exists() and not continue_run:
        raise ValueError(f"{run_dir} already contains metrics; choose a new --out or use --continue.")
    run_dir.mkdir(parents=True, exist_ok=True)
    cfg_written = run_config(
        recipe, nw=feed.num_workers, eval_workers=eval_workers, prefetch_factor=prefetch_factor,
        policy=policy, photometric=photometric, rot90=rot90, wd=wd, amp=amp, norm_eff=norm_eff,
        classes=classes, out_size=out_size, split_file=split_file, split=split,
        resumed_from=resumed_from, board_mode=board_mode, crop=crop, in_chans=in_chans,
        occluding=occluding, want_pre=want_pre, vmax=vmax, dmin=dmin, weights=weights,
        verdicts=verdicts)

    run = TrainRun(model=model, optimizer=optimizer, scheduler=scheduler, scaler=scaler,
                   criterion=criterion, device=device, feed=feed, val_ds=val_ds,
                   photometric=photometric, scales=scales, amp=amp, channels_last=channels_last,
                   eval_workers=eval_workers, prefetch_factor=prefetch_factor, run_dir=run_dir,
                   cfg_written=cfg_written, classes=classes, occluding=occluding, epochs=epochs,
                   patience=patience)
    start_swa(run, swa, swa_lr, swa_start, sched)
    progress = resume_progress(run, continue_run)
    write_json(run_dir / "config.json", cfg_written)
    print(f"[OK] GPU ready ({device}); run directory: {run_dir}")
    run_epochs(run, progress)
    finish_swa(run, progress.best_score)
    calibrate_run(run_dir, model, val_ds, device, feed.eval_batch, classes)
    return 0
