"""Evaluate a 13-class ONNX square classifier directly against a packed memmap."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image

from chesslab.ioutil import read_jsonl


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--pack", type=Path, required=True)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()

    import onnxruntime as ort

    cfg = json.loads(args.config.read_text(encoding="utf-8"))
    meta = json.loads((args.pack / "packed_meta.json").read_text(encoding="utf-8"))
    rows = read_jsonl(args.pack / "manifest.jsonl")
    classes = list(cfg["classes"])
    class_idx = {name: i for i, name in enumerate(classes)}
    shape = (int(meta["n"]), int(meta["h"]), int(meta["w"]), 3)
    images = np.memmap(args.pack / "packed_images.u8", dtype=np.uint8, mode="r", shape=shape)

    session = ort.InferenceSession(str(args.model), providers=["CPUExecutionProvider"])
    inp = session.get_inputs()[0]
    out_name = session.get_outputs()[0].name
    fixed_batch = int(inp.shape[0]) if isinstance(inp.shape[0], int) else 64
    target_h, target_w = int(inp.shape[2]), int(inp.shape[3])
    mean = np.asarray(cfg.get("normalize", {}).get("mean", [0.485, 0.456, 0.406]), np.float32)
    std = np.asarray(cfg.get("normalize", {}).get("std", [0.229, 0.224, 0.225]), np.float32)

    true: list[int] = []
    pred: list[int] = []
    for start in range(0, len(rows), fixed_batch):
        stop = min(start + fixed_batch, len(rows))
        batch = np.empty((fixed_batch, 3, target_h, target_w), np.float32)
        for j, image in enumerate(images[start:stop]):
            resized = np.asarray(Image.fromarray(image).resize((target_w, target_h), Image.Resampling.BILINEAR),
                                 dtype=np.float32) / 255.0
            batch[j] = ((resized - mean) / std).transpose(2, 0, 1)
        if stop - start < fixed_batch:
            batch[stop - start:] = batch[stop - start - 1]
        logits = session.run([out_name], {inp.name: batch})[0][:stop - start]
        pred.extend(np.argmax(logits, axis=1).tolist())
        true.extend(class_idx[row["label"]] for row in rows[start:stop])

    true_a = np.asarray(true)
    pred_a = np.asarray(pred)
    occupied_true = true_a != class_idx["empty"]
    occupied_pred = pred_a != class_idx["empty"]
    frames: dict[tuple[str, str], list[int]] = {}
    for i, row in enumerate(rows):
        frames.setdefault((row["session_id"], str(row["frame"])), []).append(i)
    exact_boards = sum(bool(np.all(true_a[idx] == pred_a[idx])) for idx in frames.values())
    exact_occupancy_boards = sum(
        bool(np.all(occupied_true[idx] == occupied_pred[idx])) for idx in frames.values()
    )
    wrong = Counter((classes[t], classes[p]) for t, p in zip(true, pred, strict=True) if t != p)
    report = {
        "model": str(args.model.resolve()),
        "pack": str(args.pack.resolve()),
        "crops": len(rows),
        "boards": len(frames),
        "crop_accuracy": float(np.mean(true_a == pred_a)),
        "board_exact_accuracy": exact_boards / len(frames),
        "exact_boards": exact_boards,
        "occupancy_accuracy": float(np.mean(occupied_true == occupied_pred)),
        "occupancy_board_accuracy": exact_occupancy_boards / len(frames),
        "exact_occupancy_boards": exact_occupancy_boards,
        "occupied_piece_accuracy": float(np.mean(true_a[occupied_true] == pred_a[occupied_true])),
        "phantoms": int(np.sum(~occupied_true & occupied_pred)),
        "misses": int(np.sum(occupied_true & ~occupied_pred)),
        "top_confusions": [
            {"true": t, "pred": p, "count": n} for (t, p), n in wrong.most_common(12)
        ],
    }
    rendered = json.dumps(report, indent=2)
    print(rendered)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(rendered + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
