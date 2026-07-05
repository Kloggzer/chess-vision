"""Stage 5 — Evaluation. Board accuracy as main metric, plus per-class recall + confusion."""

from __future__ import annotations

import json
from pathlib import Path

from .. import config
from .data import filter_rows_by_split, load_manifest, load_split


def load_run(run_dir: Path):
    """Load model + run config from a run directory (best.pt, otherwise last.pt).

    Public because `chesslab.serving.load_run` (the canonical inference facade,
    see specs/rework/01-serving-facade.md) calls this function with a cache in front.
    """
    import torch

    from .model import build_model

    cfg = json.loads((run_dir / "config.json").read_text(encoding="utf-8"))
    model = build_model(cfg["backbone"], len(cfg["classes"]), norm=cfg.get("norm", "batchnorm"),
                        head=cfg.get("head", "combined"), classes=cfg["classes"])
    ckpt = run_dir / "best.pt"
    if not ckpt.exists():
        ckpt = run_dir / "last.pt"
    model.load_state_dict(torch.load(ckpt, map_location="cpu"))
    return model, cfg


# Transition alias: previous private name, in case still referenced somewhere.
_load_run = load_run


def run_eval(run: str, split_name: str = "test") -> int:

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
        print(f"[FAIL] no config.json in {run_dir} — first run `chesslab train`.")
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
        print(f"[FAIL] Manifest/split missing ({manifest_path}). Build/split dataset first.")
        return 1
    manifest = load_manifest(manifest_path)
    split = load_split(split_path)
    rows = filter_rows_by_split(manifest, split, split_name)
    if not rows:
        print(f"[FAIL] {split_name} split is empty.")
        return 1

    device = get_device(require_gpu=False)
    model.to(device)
    ds = SquareDataset(rows, classes, build_transform(out_size, train=False))
    res = evaluate_dataset(model, ds, device, batch_size=256)

    # 1. Board-Accuracy (Hauptmetrik)
    print(f"Board accuracy ({split_name}): {res['board_acc']:.4f}")
    # 1b. Occupancy/piece diagnosis: WHERE are the errors (occupancy vs. type vs. color)?
    from .data import occupancy_board_acc, occupancy_piece_breakdown

    bd = occupancy_piece_breakdown(classes, list(res["trues"]), list(res["preds"]))
    occ_bacc = occupancy_board_acc(rows, classes, list(res["trues"]), list(res["preds"]))
    print(f"Occupancy: square {bd['occ_acc']:.4f} | board {occ_bacc:.4f}   "
          f"Figur (auf besetzt): {bd['piece_acc']:.4f}   "
          f"Fehler: Typ {bd['type_err']:.3f} / Farbe {bd['color_err']:.3f}")
    # 2. Per-Klassen-Recall
    cm = confusion_matrix(res["trues"], res["preds"], len(classes))
    recall = per_class_recall(cm)
    print("Per-class recall:")
    for c, r in zip(classes, recall, strict=False):
        print(f"  {c:<6} {r:.3f}")
    # 3. Confusion (Text + PNG), Blick auf König<->Dame und Figur<->empty
    txt = render_confusion_text(cm, classes)
    (run_dir / f"confusion_{split_name}.txt").write_text(txt, encoding="utf-8")
    save_confusion_png(cm, classes, run_dir / f"confusion_{split_name}.png")
    # 4. Square-Accuracy (nur Kontext)
    print(f"Square-Accuracy ({split_name}): {res['square_acc']:.4f}  (nur Kontext)")
    print(f"[OK] Confusion gespeichert: {run_dir / ('confusion_' + split_name + '.txt')} (+ .png)")

    summary = {"split": split_name, "board_acc": res["board_acc"], "square_acc": res["square_acc"],
               "occ_acc": bd["occ_acc"], "occ_board_acc": occ_bacc, "piece_acc": bd["piece_acc"],
               "type_err": bd["type_err"], "color_err": bd["color_err"],
               "recall": {c: float(r) for c, r in zip(classes, recall, strict=False)}}
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
            print(f"[FAIL] unknown format {f!r} (torchscript | onnx | all).")
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
