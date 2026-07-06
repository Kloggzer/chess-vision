"""Stage 5 — Training loop. Aborts clearly without usable ROCm GPU (no silent CPU fallback)."""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

from .. import config, doctor
from .data import (
    checkpoint_score,
    filter_rows_by_split,
    load_manifest,
    load_split,
    occupancy_piece_breakdown,
)


def run_train(backbone: str, epochs: int, batch_size: int, lr: float,
              no_amp: bool, seed: int, out: str | None, patience: int,
              num_workers: int | None = None, norm: str | None = None,
              dataset: str | None = None, resume: str | None = None,
              head: str = "combined", scales: list[int] | None = None,
              erase_p: float | None = None, bg_p: float | None = None) -> int:
    """`scales`: Multi-Scale-Training (YOLO-Stil). Ist eine Liste wie [64,96,128] gesetzt, wird
    JEDER Batch zufällig auf eine dieser Eingabegrößen skaliert → das size-agnostische Modell
    (AdaptiveAvgPool) lernt alle Auflösungen in EINEM Lauf. So deckt das Training die
    Deployment-Auflösung ab (FixRes) und man kann danach bei beliebiger Größe inferieren."""
    # GPU precondition (Stage 0 validation path) — mandatory, otherwise abort. This check
    # is torch-free safe and runs BEFORE any torch import, so a missing/broken
    # build is reported clearly here instead of as an ImportError stacktrace.
    ok, checks = doctor.validate_gpu()
    if not ok:
        print(doctor.render(checks))
        print("[FAIL] No usable ROCm GPU — training aborted (no CPU fallback). "
              "Run `chesslab doctor --gpu` for diagnosis.")
        return 1

    import numpy as np
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader

    from .engine import evaluate_dataset, get_device
    from .model import build_model
    from .torch_data import SquareDataset, build_transform, class_weights_tensor

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
    from ..dataset import subsample_classes

    ts = split.get("train_subsample") or {}
    train_rows = subsample_classes(
        filter_rows_by_split(manifest, split, "train"),
        max_empty_ratio=ts.get("max_empty_ratio"),
        max_class_ratio=ts.get("max_class_ratio"),
        seed=ts.get("seed", seed),
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
    if erase_p is not None or bg_p is not None:
        from dataclasses import replace
        policy = replace(policy, **({"erase_p": erase_p} if erase_p is not None else {}),
                         **({"bg_p": bg_p} if bg_p is not None else {}))
        print(f"[aug] override erase_p={policy.erase_p} bg_p={policy.bg_p}")
    train_ds = SquareDataset(train_rows, classes, build_transform(out_size, train=True, policy=policy),
                             bg_randomize=True, policy=policy)
    val_ds = SquareDataset(val_rows, classes, build_transform(out_size, train=False, policy=policy))

    # BatchNorm is broken on ROCm-Windows (MIOpen/HIPRTC) -> default GroupNorm there.
    norm_eff = norm or ("groupnorm" if sys.platform.startswith("win") else "batchnorm")
    device = get_device(require_gpu=True)
    model = build_model(backbone, len(classes), pretrained=(backbone != "smallcnn"), norm=norm_eff,
                        head=head, classes=classes).to(device)
    print(f"[OK] Backbone {backbone}, norm={norm_eff}, head={head}")

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
        keep = {k: v for k, v in sd.items() if k in msd and msd[k].shape == v.shape}
        model.load_state_dict(keep, strict=False)
        resumed_from = resume
        skipped = len(sd) - len(keep)
        print(f"[OK] Resumed from '{resume}': {len(keep)} tensors adopted"
              + (f", {skipped} skipped (head with changed class count)" if skipped else ""))

    weights = class_weights_tensor(split, classes).to(device)
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    amp = not no_amp
    scaler = torch.amp.GradScaler("cuda", enabled=amp)

    # DataLoader-Tuning: der Crop-Datensatz ist I/O-gebunden (Mio. kleine PNGs). Parallele Worker
    # sind der größte Hebel; auf Windows empirisch bis 8 stabil verifiziert (kein Deadlock) → Default
    # 6 statt 0. persistent_workers spart das Neu-Spawnen je Epoche (teuer bei Windows-spawn),
    # prefetch_factor hält Batches vor. Mit --num-workers 0 überschreibbar, falls doch Probleme.
    nw = num_workers if num_workers is not None else (6 if sys.platform.startswith("win") else 8)
    loader_kw = dict(batch_size=batch_size, pin_memory=True, num_workers=nw)
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

    run_dir = Path(out) if out else config.DATA.models / f"run-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "config.json").write_text(json.dumps({
        "backbone": backbone, "epochs": epochs, "batch_size": batch_size, "lr": lr,
        "seed": seed, "amp": amp, "norm": norm_eff, "classes": classes, "out_size": list(out_size),
        "dataset": dataset, "resumed_from": resumed_from, "head": head,
        "normalize": {"mean": list(config.NORMALIZE_MEAN), "std": list(config.NORMALIZE_STD)},
        "variant": variant, "scales": scales,
        "aug": {"erase_p": policy.erase_p, "bg_p": policy.bg_p},
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
