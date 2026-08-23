"""The rectified BOARD, Kotlin against Python — before any crop is cut.

Splits the parity question in two. If the boards already differ, the warp is where they part; if
they match and only the crops differ, it is the crop box. Kotlin's `rectify` writes the straightened
playing field per frame and `crops` writes the quad it used, so both sides can be run on the same
corners.

    desktop.bat rectify <video> <rectDir> frames=<f> size=928
    desktop.bat crops   <video> <cropDir> frames=<f> out=128x128     # only for its receipt
    uv run python scripts/board_parity.py <rectDir> <cropDir> <video>
"""

from __future__ import annotations

import argparse
import contextlib
import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from chesslab.calibration import warp_board  # noqa: E402
from chesslab.recording import Recording  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
from crop_parity import profile_from  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("rect_dir", type=Path)
    ap.add_argument("crop_dir", type=Path, help="for crops.jsonl — the quad Kotlin actually used")
    ap.add_argument("video", type=Path)
    ap.add_argument("--out", type=Path, default=Path("data/reports/parity/boards"))
    args = ap.parse_args()

    receipts = {int(json.loads(x)["frame"]): json.loads(x)
                for x in (args.crop_dir / "crops.jsonl").read_text(encoding="utf-8").splitlines() if x.strip()}
    frames = {}
    with contextlib.closing(Recording(args.video).frames()) as stream:
        for i, f in stream:
            if i in receipts:
                frames[i] = f.copy()
            if i >= max(receipts):
                break

    args.out.mkdir(parents=True, exist_ok=True)
    for idx in sorted(receipts):
        kt = cv2.imread(str(args.rect_dir / f"{idx:06d}.png"))
        if kt is None or idx not in frames:
            continue
        prof = profile_from(receipts[idx])
        # The rectified field WITHOUT the crop border — that is what `rectify` emits.
        py = warp_board(frames[idx], prof)
        if py.shape != kt.shape:
            py = cv2.resize(py, (kt.shape[1], kt.shape[0]), interpolation=cv2.INTER_AREA)
        d = cv2.absdiff(kt, py)
        s = 0.42
        tiles = [cv2.resize(x, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
                 for x in (kt, py, np.clip(d.astype(np.int16) * 6, 0, 255).astype(np.uint8))]
        strip = np.hstack(tiles)
        bar = np.zeros((22, strip.shape[1], 3), np.uint8)
        cv2.putText(bar, f"frame {idx}   mean {d.mean():.2f}  max {d.max():.0f}   "
                        f"[Kotlin rectify | Python warp | 6x diff]",
                    (6, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        cv2.imwrite(str(args.out / f"{idx:06d}.png"), np.vstack([bar, strip]))
        print(f"  frame {idx}: mean {d.mean():6.2f}  max {d.max():3.0f}")
    print(f"  -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
