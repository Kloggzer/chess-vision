"""Stufe 5 — Evaluation. Board-Accuracy als Hauptmetrik, plus Per-Klassen-Recall + Confusion."""

from __future__ import annotations

import json
from pathlib import Path

from .. import config
from .data import filter_rows_by_split, load_manifest, load_split


def _load_run(run_dir: Path):
    import torch

    from .model import build_model

    cfg = json.loads((run_dir / "config.json").read_text(encoding="utf-8"))
    model = build_model(cfg["backbone"], len(cfg["classes"]), norm=cfg.get("norm", "batchnorm"))
    ckpt = run_dir / "best.pt"
    if not ckpt.exists():
        ckpt = run_dir / "last.pt"
    model.load_state_dict(torch.load(ckpt, map_location="cpu"))
    return model, cfg


def run_eval(run: str, split_name: str = "test") -> int:
    import numpy as np

    from .engine import (
        confusion_matrix,
        evaluate_dataset,
        get_device,
        per_class_recall,
        render_confusion_text,
        save_confusion_png,
    )
    from .torch_data import SquareDataset, build_transform

    run_dir = Path(run)
    if not (run_dir / "config.json").exists():
        print(f"[FAIL] kein config.json in {run_dir} — erst `chesslab train`.")
        return 1
    model, cfg = _load_run(run_dir)
    classes = cfg["classes"]
    out_size = tuple(cfg["out_size"])

    ds_name = cfg.get("dataset")          # selber Datensatz wie beim Training (im run-config)
    if ds_name:
        from ..dataset_build import dataset_dir
        dd = dataset_dir(ds_name)
        manifest_path, split_path = dd / "manifest.jsonl", dd / "split.json"
    else:
        manifest_path = config.DATA.manifests / "squares.jsonl"
        split_path = config.DATA.manifests / "split.json"
    if not manifest_path.exists() or not split_path.exists():
        print(f"[FAIL] Manifest/Split fehlen ({manifest_path}). Datensatz erst bauen/splitten.")
        return 1
    manifest = load_manifest(manifest_path)
    split = load_split(split_path)
    rows = filter_rows_by_split(manifest, split, split_name)
    if not rows:
        print(f"[FAIL] {split_name}-Split ist leer.")
        return 1

    device = get_device(require_gpu=False)
    model.to(device)
    ds = SquareDataset(rows, classes, build_transform(out_size, train=False))
    res = evaluate_dataset(model, ds, device, batch_size=256)

    # 1. Board-Accuracy (Hauptmetrik)
    print(f"Board-Accuracy ({split_name}): {res['board_acc']:.4f}")
    # 2. Per-Klassen-Recall
    cm = confusion_matrix(res["trues"], res["preds"], len(classes))
    recall = per_class_recall(cm)
    print("Per-Klassen-Recall:")
    for c, r in zip(classes, recall):
        print(f"  {c:<6} {r:.3f}")
    # 3. Confusion (Text + PNG), Blick auf König<->Dame und Figur<->empty
    txt = render_confusion_text(cm, classes)
    (run_dir / f"confusion_{split_name}.txt").write_text(txt, encoding="utf-8")
    save_confusion_png(cm, classes, run_dir / f"confusion_{split_name}.png")
    # 4. Square-Accuracy (nur Kontext)
    print(f"Square-Accuracy ({split_name}): {res['square_acc']:.4f}  (nur Kontext)")
    print(f"[OK] Confusion gespeichert: {run_dir / ('confusion_' + split_name + '.txt')} (+ .png)")

    summary = {"split": split_name, "board_acc": res["board_acc"], "square_acc": res["square_acc"],
               "recall": {c: float(r) for c, r in zip(classes, recall)}}
    (run_dir / f"eval_{split_name}.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return 0


def run_export(run: str, fmt: str = "torchscript") -> int:
    import torch

    from .data import build_model_card

    run_dir = Path(run)
    if not (run_dir / "config.json").exists():
        print(f"[FAIL] kein config.json in {run_dir}.")
        return 1
    model, cfg = _load_run(run_dir)
    model.eval()
    classes = cfg["classes"]
    out_w, out_h = cfg["out_size"]
    example = torch.randn(1, 3, out_h, out_w)

    formats = [fmt] if fmt != "all" else ["torchscript", "onnx"]
    written: list[str] = []
    for f in formats:
        if f == "torchscript":
            ts = torch.jit.trace(model, example)
            ts.save(str(run_dir / "model.torchscript.pt"))
            written.append("torchscript")
        elif f == "onnx":
            torch.onnx.export(model, example, str(run_dir / "model.onnx"),
                              input_names=["input"], output_names=["logits"],
                              dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
                              opset_version=17)
            written.append("onnx")
        else:
            print(f"[FAIL] unbekanntes Format {f!r} (torchscript | onnx | all).")
            return 1

    metrics = {}
    eval_test = run_dir / "eval_test.json"
    if eval_test.exists():
        metrics = json.loads(eval_test.read_text(encoding="utf-8"))
    card = build_model_card(
        classes=classes, out_size=(out_w, out_h), backbone=cfg["backbone"], metrics=metrics,
        torch_version=torch.__version__, hip_version=getattr(torch.version, "hip", None),
        exported_formats=written,
    )
    (run_dir / "model_card.json").write_text(json.dumps(card, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] exportiert: {', '.join(written)} + model_card.json -> {run_dir}")
    return 0
