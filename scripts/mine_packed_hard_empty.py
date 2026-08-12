"""Mine near-phantom empty crops from a packed dataset with an ONNX classifier."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--split", default="train")
    parser.add_argument("--occ-thr", type=float, default=0.1)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    cfg = json.loads(args.config.read_text(encoding="utf-8"))
    meta = json.loads((args.dataset / "packed_meta.json").read_text(encoding="utf-8"))
    split = json.loads((args.dataset / "split.json").read_text(encoding="utf-8"))
    sessions = set(split["splits"][args.split])
    rows = [
        json.loads(line)
        for line in (args.dataset / "manifest.jsonl").read_text(encoding="utf-8").splitlines()
        if line
    ]
    indices = [i for i, row in enumerate(rows) if row["session_id"] in sessions and row["label"] == "empty"]
    shape = (int(meta["n"]), int(meta["h"]), int(meta["w"]), 3)
    images = np.memmap(args.dataset / "packed_images.u8", dtype=np.uint8, mode="r", shape=shape)
    classes = list(cfg["classes"])
    empty_idx = classes.index("empty")
    mean = np.asarray(cfg["normalize"]["mean"], np.float32)
    std = np.asarray(cfg["normalize"]["std"], np.float32)
    session = ort.InferenceSession(str(args.model), providers=["CPUExecutionProvider"])
    inp = session.get_inputs()[0]
    out_name = session.get_outputs()[0].name
    batch_size = int(inp.shape[0])
    hard: list[dict] = []
    phantoms = 0
    for start in range(0, len(indices), batch_size):
        selected = indices[start : start + batch_size]
        batch = np.empty((batch_size, 3, shape[1], shape[2]), np.float32)
        for j, index in enumerate(selected):
            batch[j] = ((images[index].astype(np.float32) / 255.0 - mean) / std).transpose(2, 0, 1)
        if len(selected) < batch_size:
            batch[len(selected) :] = batch[len(selected) - 1]
        logits = session.run([out_name], {inp.name: batch})[0][: len(selected)]
        logits -= logits.max(axis=1, keepdims=True)
        probs = np.exp(logits)
        probs /= probs.sum(axis=1, keepdims=True)
        for index, prob in zip(selected, probs, strict=True):
            p_empty = float(prob[empty_idx])
            p_occ = 1.0 - p_empty
            if p_occ > p_empty:
                phantoms += 1
            if p_occ < args.occ_thr:
                continue
            row = rows[index]
            pred = int(np.argmax(prob))
            hard.append(
                {
                    "path": row["path"],
                    "label": "empty",
                    "pred": classes[pred],
                    "conf": round(float(prob[pred]), 6),
                    "p_occ": round(p_occ, 6),
                    "p_empty": round(p_empty, 6),
                    "session_id": row["session_id"],
                    "frame": row["frame"],
                    "square": row["square"],
                    "run": args.model.parent.name,
                }
            )
    hard.sort(key=lambda row: -row["p_occ"])
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("".join(json.dumps(row) + "\n" for row in hard), encoding="utf-8")
    print(f"scanned {len(indices)} train empties; phantoms={phantoms}; p_occ>={args.occ_thr}: {len(hard)}")
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
