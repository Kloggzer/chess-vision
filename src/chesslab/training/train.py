"""Stufe 5 — Trainingsloop. Bricht ohne nutzbare ROCm-GPU klar ab (kein stiller CPU-Fallback)."""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

from .. import config, doctor
from .data import filter_rows_by_split, load_manifest, load_split


def run_train(backbone: str, epochs: int, batch_size: int, lr: float,
              no_amp: bool, seed: int, out: str | None, patience: int,
              num_workers: int | None = None, norm: str | None = None,
              dataset: str | None = None, resume: str | None = None,
              head: str = "combined") -> int:
    # GPU-Vorbedingung (Stufe 0 Validierungspfad) — Pflicht, sonst Abbruch. Dieser Check
    # ist torch-frei sicher und läuft VOR jedem torch-Import, damit ein fehlender/kaputter
    # Build hier klar gemeldet wird statt als ImportError-Stacktrace.
    ok, checks = doctor.validate_gpu()
    if not ok:
        print(doctor.render(checks))
        print("[FAIL] Keine nutzbare ROCm-GPU — Training abgebrochen (kein CPU-Fallback). "
              "`chesslab doctor --gpu` zur Diagnose.")
        return 1

    import numpy as np
    from .engine import evaluate_dataset, get_device
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader

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
            print(f"[FAIL] Datensatz '{dataset}' nicht gebaut ({dd}). Erst im Datensätze-Tab "
                  "bauen (`chesslab dataset build`), dann trainieren.")
            return 1
    else:
        manifest_path = config.DATA.manifests / "squares.jsonl"
        split_path = config.DATA.manifests / "split.json"
        if not manifest_path.exists():
            print(f"[FAIL] Kein Manifest ({manifest_path}). Erst Daten sammeln und slicen "
                  "(`chesslab slice`), bevor du trainierst.")
            return 1
        if not split_path.exists():
            print(f"[FAIL] Kein Split ({split_path}). Führe zuerst `chesslab split` aus "
                  "(Train/Val/Test pro Session + Klassen-Balancing), dann trainiere.")
            return 1

    manifest = load_manifest(manifest_path)
    split = load_split(split_path)
    classes = split["classes"]
    out_size = None
    for r in manifest:
        out_size = tuple(r["out_size"])
        break
    if out_size is None:
        print("[FAIL] leeres Manifest.")
        return 1

    # Balancing NUR auf train anwenden (Policy steht in split.json); val/test bleiben voll.
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
        hint = ("baue den Datensatz mit mehr Sessions neu" if dataset
                else "slice neu und führe `chesslab split` erneut aus")
        print("[FAIL] train-Split ist leer — zu wenige Sessions. Train/Val/Test werden pro "
              f"Session getrennt (gegen Data Leakage); nimm mind. 2-3 Sessions auf und {hint}.")
        return 1
    from collections import Counter as _Counter

    print(f"[OK] train balanciert: {len(train_rows)} Crops, Verteilung: "
          + ", ".join(f"{k}={v}" for k, v in sorted(_Counter(r['label'] for r in train_rows).items())))

    train_ds = SquareDataset(train_rows, classes, build_transform(out_size, train=True))
    val_ds = SquareDataset(val_rows, classes, build_transform(out_size, train=False))

    # BatchNorm ist auf ROCm-Windows (MIOpen/HIPRTC) defekt -> dort default GroupNorm.
    norm_eff = norm or ("groupnorm" if sys.platform.startswith("win") else "batchnorm")
    device = get_device(require_gpu=True)
    model = build_model(backbone, len(classes), pretrained=(backbone != "smallcnn"), norm=norm_eff,
                        head=head, classes=classes).to(device)
    print(f"[OK] Backbone {backbone}, norm={norm_eff}, head={head}")

    # Weiter-Trainieren (Warm-Start): Gewichte aus einem früheren Run laden. Passende Tensoren
    # werden übernommen, nicht-passende (z.B. der Klassifizierungs-Kopf bei geänderter Klassenzahl,
    # etwa nach Hinzunahme von `occluded`) übersprungen -> der Rumpf transferiert, der Kopf lernt neu.
    resumed_from = None
    if resume:
        rd = config.DATA.models / resume
        ckpt = rd / "best.pt"
        if not ckpt.exists():
            ckpt = rd / "last.pt"
        if not (rd / "config.json").exists() or not ckpt.exists():
            print(f"[FAIL] Resume-Run '{resume}' unvollständig oder nicht gefunden ({rd}).")
            return 1
        rcfg = json.loads((rd / "config.json").read_text(encoding="utf-8"))
        if rcfg.get("backbone") != backbone:
            print(f"[FAIL] Resume-Backbone {rcfg.get('backbone')!r} != {backbone!r} — gleiches Backbone wählen.")
            return 1
        sd = torch.load(ckpt, map_location=device)
        msd = model.state_dict()
        keep = {k: v for k, v in sd.items() if k in msd and msd[k].shape == v.shape}
        model.load_state_dict(keep, strict=False)
        resumed_from = resume
        skipped = len(sd) - len(keep)
        print(f"[OK] Weiter ab '{resume}': {len(keep)} Tensoren übernommen"
              + (f", {skipped} übersprungen (Kopf bei geänderter Klassenzahl)" if skipped else ""))

    weights = class_weights_tensor(split, classes).to(device)
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    amp = not no_amp
    scaler = torch.amp.GradScaler("cuda", enabled=amp)

    # Windows-DataLoader: num_workers>0 nutzt spawn und macht oft Ärger -> Default 0 auf Windows.
    nw = num_workers if num_workers is not None else (0 if sys.platform.startswith("win") else 4)
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True,
                              num_workers=nw, pin_memory=True, drop_last=False)

    # Runs werden self-describing: Geometrie/Photometrie/Extrusionshöhe aus der ersten
    # Manifest-Zeile (gleiche Herleitung wie `labeling.variant_of_run`, das Alt-Runs ohne
    # dieses Feld über einen Manifest-Scan versorgt). So kennt `serving.run_spec` die
    # Preprocessing-Variante ohne Manifest-Zugriff.
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
        "variant": variant,
    }, indent=2), encoding="utf-8")
    metrics_path = run_dir / "metrics.jsonl"

    # Checkpoint/Early-Stopping nach (macro_recall, board_acc): macro_recall ist das glatte,
    # klassenbalancierte Signal. board_acc (alle 64 Felder korrekt) ist v.a. bei wenig Daten
    # extrem verrauscht — als Primärmetrik würde ein früher board_acc-Peak das Training stoppen,
    # obwohl es noch lernt (loss runter, recall hoch). board_acc dient nur als Tiebreak.
    best_score = (-1.0, -1.0)   # (macro_recall, board_acc)
    epochs_no_improve = 0
    print(f"[OK] GPU bereit ({device}); Run-Verzeichnis: {run_dir}")
    for epoch in range(epochs):
        model.train()
        running = 0.0
        seen = 0
        for x, y in train_loader:
            x = x.to(device, non_blocking=True)
            y = y.to(device, non_blocking=True)
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
        rec = {
            "epoch": epoch,
            "train_loss": running / max(seen, 1),
            "val_loss": val["loss"],
            "val_acc": val["square_acc"],
            "val_macro_recall": val["macro_recall"],
            "val_board_acc": val["board_acc"],
            "lr": scheduler.get_last_lr()[0],
        }
        with metrics_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(rec) + "\n")
        print(f"epoch {epoch:>3} | train_loss {rec['train_loss']:.4f} | val_acc {rec['val_acc']:.4f} "
              f"| macro_recall {rec['val_macro_recall']:.4f} | board_acc {rec['val_board_acc']:.4f}")

        torch.save(model.state_dict(), run_dir / "last.pt")
        score = (val["macro_recall"], val["board_acc"])   # macro_recall primär, board_acc Tiebreak
        if score > best_score:
            best_score = score
            epochs_no_improve = 0
            torch.save(model.state_dict(), run_dir / "best.pt")
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                print(f"[OK] Early stopping (kein Fortschritt in macro_recall seit {patience} Epochen). "
                      "Mehr Geduld: `--patience N` erhöhen.")
                break

    print(f"[OK] fertig. beste (macro_recall, board_acc)={best_score[0]:.4f}/{best_score[1]:.4f}; best.pt in {run_dir}")
    return 0
