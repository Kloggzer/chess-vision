"""Grad-CAM for a trained chesslab square classifier (CLI).

Shows which pixels drove the model's decision for a square crop. Works with both
backbones and any head — see ``chesslab.training.gradcam`` for the shared logic
(also used by the web Training page).

Usage:
    uv run python scripts/gradcam.py RUN_DIR IMG [IMG ...] [--out montage.png] [--class wP]

Output is a montage: original crop | heatmap | overlay, one row per image.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

from chesslab.training.evaluate import load_run
from chesslab.training.gradcam import compute_cam, jet, last_conv
from chesslab.training.torch_data import build_transform


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("run", type=Path)
    ap.add_argument("images", type=Path, nargs="+")
    ap.add_argument("--out", type=Path, default=Path("gradcam.png"))
    ap.add_argument("--class", dest="cls", default=None, help="force a target class (default: predicted)")
    args = ap.parse_args()

    model, cfg = load_run(args.run)
    model.eval()
    classes = cfg["classes"]
    out_size = tuple(cfg["out_size"])                  # (w, h)
    tf = build_transform(out_size, train=False)
    layer = last_conv(model)
    forced = classes.index(args.cls) if args.cls else None

    rows = []
    for p in args.images:
        img = Image.open(p).convert("RGB").resize(out_size)
        x = tf(img).unsqueeze(0)
        cam, idx, prob = compute_cam(model, x, layer, forced, len(classes))
        cam_up = np.array(Image.fromarray((cam * 255).astype(np.uint8)).resize(out_size, Image.BILINEAR)) / 255.0
        base = np.asarray(img).astype(np.float32)
        heat = jet(cam_up).astype(np.float32)
        overlay = (0.45 * heat + 0.55 * base).clip(0, 255).astype(np.uint8)
        row = np.concatenate([np.asarray(img), jet(cam_up), overlay], axis=1)
        rows.append(row)
        print(f"{p.name}: {classes[idx]} (p={prob:.3f})")

    w = max(r.shape[1] for r in rows)
    canvas = []
    for r in rows:
        canvas.append(r)
        canvas.append(np.full((6, w, 3), 255, np.uint8))
    montage = np.concatenate(canvas[:-1], axis=0)
    Image.fromarray(montage).save(args.out)
    print(f"\n[OK] {args.out}  (columns: original | heatmap | overlay)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
