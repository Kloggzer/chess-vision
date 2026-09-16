"""Do Kotlin and Python cut the SAME pixels? Same video, same frames, same quad — compare.

`mesh_crop_parity.json` pins the mesh MAP across Python, Kotlin and TS to 1e-9, but a map is not an
image. Nothing had ever compared a rendered crop, so a divergence in the warp, the crop
construction or the resize would stay invisible until a model trained on one and ran on the other.

Both sides cut a RAW warp here — the production path straightens the board once when it is stored
and then cuts plain rectangles, so this proves the crop CONSTRUCTION agrees, not the whole path.

Kotlin's `crops` verb exists for exactly this and writes a receipt — quad, board size, pads, output
size — so both sides can be run with the SAME corners. That isolates the crop construction from the
corner detection; mixing the two would leave a disagreement unattributable.

    android/desktop/build/install/desktop/bin/desktop.bat crops <video> <dir> frames=<f> out=128x128
    uv run python scripts/crop_parity.py <dir> <video> [--worst 12]

Kotlin writes `<stem>_<square>.png` per crop; this reads its receipt, cuts the same squares out of
the same frames, and reports the distribution plus side-by-side pictures of the worst cases.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from chesslab import config, labeling  # noqa: E402
from chesslab.calibration import CalibrationProfile, CropParams, compute_homography  # noqa: E402
from chesslab.ioutil import read_jsonl  # noqa: E402
from chesslab.recording import Recording  # noqa: E402

STEM_DIGITS = 6


def profile_from(receipt: dict, margin: float = config.DEFAULT_MARKER_MARGIN) -> CalibrationProfile:
    """A profile that reproduces Kotlin's geometry exactly — its quad, its size, its pads.

    The receipt does NOT carry the margin, and it is the one number that must not be guessed: the
    ArUco corners are not the playing field's corners, the printed rank/file border sits between
    them. At 0.0 the warp keeps that border inside the 8x8 and every crop lands a third of a cell
    off — visible as the row numbers appearing in the rectified board.
    """
    bs = int(receipt["boardSize"])
    quad = [[float(receipt["quad"][i]), float(receipt["quad"][i + 1])] for i in range(0, 8, 2)]
    return CalibrationProfile(
        profile="__parity__", camera_index=-1, frame_size=(0, 0), board_size=bs,
        image_corners=quad, homography=compute_homography(quad, bs, margin), white_pov=True,
        crop=CropParams(cell=bs / 8.0, pad_side=float(receipt["padSide"]),
                        out_size=(int(receipt["outW"]), int(receipt["outH"]))),
        margin=margin,
    )


def side_by_side(kt, py, label: str, scale: int = 3):
    """Kotlin | Python | 8x difference, upscaled so a human can see what moved."""
    diff = np.clip(cv2.absdiff(kt, py).astype(np.int16) * 8, 0, 255).astype(np.uint8)
    tiles = [cv2.resize(x, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
             for x in (kt, py, diff)]
    strip = np.hstack(tiles)
    bar = np.zeros((20, strip.shape[1], 3), np.uint8)
    cv2.putText(bar, label, (4, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1)
    return np.vstack([bar, strip])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("kotlin_dir", type=Path, help="the `crops` output directory (holds crops.jsonl)")
    ap.add_argument("video", type=Path, help="the SAME video Kotlin was given")
    ap.add_argument("--worst", type=int, default=12, help="side-by-side pictures to write")
    ap.add_argument("--rotate", choices=["cw", "ccw", "180"], default=None,
                    help="rotate each decoded frame first. A phone recording decodes PORTRAIT in "
                         "OpenCV while Kotlin reads it landscape; without this every crop is a "
                         "picture of somewhere else. Check the receipt's quad range against the "
                         "video's own width to see which way.")
    ap.add_argument("--out", type=Path, default=None, help="where the pictures go (default: <kotlin_dir>/../vs)")
    args = ap.parse_args()

    receipts = {int(r["frame"]): r for r in read_jsonl(args.kotlin_dir / "crops.jsonl")}
    wanted = set(receipts)
    print(f"{args.video.name}: {len(wanted)} frames from Kotlin's receipt")

    frames = {}
    with __import__("contextlib").closing(Recording(args.video).frames()) as stream:
        for i, frame in stream:
            if i in wanted:
                rot = {"cw": cv2.ROTATE_90_CLOCKWISE, "ccw": cv2.ROTATE_90_COUNTERCLOCKWISE,
                       "180": cv2.ROTATE_180}.get(args.rotate)
                # cv2 reuses its buffer; without the copy every frame ends up the same picture.
                frames[i] = frame.copy() if rot is None else cv2.rotate(frame, rot)
            if i >= max(wanted):
                break

    results = []
    for idx in sorted(wanted & set(frames)):
        r = receipts[idx]
        prof = profile_from(r)
        board = labeling.warp_board_for_crops(frames[idx], prof, prof.image_corners)
        out = (int(r["outW"]), int(r["outH"]))
        for square in labeling.all_squares():
            f = args.kotlin_dir / f"{idx:0{STEM_DIGITS}d}_{square}.png"
            if not f.is_file():
                continue
            kt = cv2.imread(str(f))
            py = labeling.crop_square(board, square, prof, out)
            if kt is None or py is None or kt.shape != py.shape:
                continue
            d = cv2.absdiff(kt, py)
            results.append((float(d.mean()), float(d.max()), idx, square, kt, py))

    if not results:
        print("[FAIL] nothing comparable — check that the video and the receipt belong together.")
        return 1
    means = np.array([r[0] for r in results])
    print(f"  compared {len(results)} crops")
    print(f"  byte-identical: {int((means == 0).sum())}/{len(results)}")
    print(f"  mean abs diff : median {np.median(means):.3f}  p90 {np.percentile(means, 90):.3f}  "
          f"max {means.max():.3f}")
    print(f"  worst pixel   : {max(r[1] for r in results):.0f}")

    out_dir = args.out or args.kotlin_dir.parent / f"{args.kotlin_dir.name}-vs"
    out_dir.mkdir(parents=True, exist_ok=True)
    for mean, mx, idx, square, kt, py in sorted(results, key=lambda r: -r[0])[:args.worst]:
        pic = side_by_side(kt, py, f"{idx} {square}  mean {mean:.2f} max {mx:.0f}  [Kotlin | Python | 8x]")
        cv2.imwrite(str(out_dir / f"{idx:06d}_{square}.png"), pic)
    print(f"  wrote {min(args.worst, len(results))} pictures to {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
