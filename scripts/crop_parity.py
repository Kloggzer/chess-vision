"""Do Kotlin and Python cut the SAME pixels? Compare crop for crop, and show the differences.

`mesh_crop_parity.json` pins the box COORDINATES across Python, Kotlin and TS to 1e-9 — but a box
is not an image. Nothing has ever compared a rendered crop, so a divergence in the warp, the mesh
cut, the resize or the webp encoder would be invisible until a model trained on one and ran on the
other.

Both sides go video -> board -> crop. Kotlin's `training-video-pack` writes
`training-pack/accepted/` (a packed memmap plus a manifest); Python cuts from the stored board of
the same frame. Where both produced the same (frame, square), the bytes should match.

    uv run python scripts/crop_parity.py <recording> [--sample 200] [--out data/reports/parity]

Writes a side-by-side PNG per worst case and prints the distribution. A recording needs a
`training-pack/accepted/` (11 of 43 have one) and a `log.jsonl` with stored boards.

**What it found on 2026-08-15-22-48-04 (2026-08-21), 0 of 200 byte-identical:**

* **Channel order.** Kotlin packs RGB, OpenCV hands Python BGR — swapping halves the error
  (19.5 -> 9.1 mean abs). Corrected here; it is a real difference between the producers.
* **Board raster.** The candidate records `cell 128` (a 1024 px board) while the stored board is
  928 (cell 116). Both then resize to 80, so the same square is sampled at two scales. That is
  most of the remaining 3.9.
* **Rotation.** The video is portrait 1440x2560, the candidate measured 2560x1440; the export
  rotates 90 deg counter-clockwise (`detect_rotation`). Both sides handle it — a comparison that
  forgets it reads pure black.
* **NOT settled: frame identity.** Kotlin's frame 2016 shows a clean board where Python's carries
  a hand (`hand_squares` lists `d1`), so the indices may not name the same moment. It could not be
  pinned: on a static board neighbouring frames differ by 0.2-1.2 while the parity gap is 3.9, so
  the metric cannot localise an offset. A moving stretch is needed to answer it.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from chesslab import config, labeling  # noqa: E402
from chesslab.calibration import CropParams  # noqa: E402


def kotlin_crops(pack: Path) -> tuple[dict[tuple[str, str], int], np.ndarray, list[dict]]:
    """`{(frame, square): row index}`, the memmap, and the manifest rows."""
    meta = json.loads((pack / "packed_meta.json").read_text(encoding="utf-8"))
    rows = [json.loads(x) for x in (pack / "manifest.jsonl").read_text(encoding="utf-8").splitlines() if x.strip()]
    mm = np.memmap(pack / "packed_images.u8", dtype=np.uint8, mode="r",
                   shape=(meta["n"], meta["h"], meta["w"], 3))
    # Keyed by INT: Kotlin pads the frame to 8 digits, the Python log to 6, and both count over
    # the whole recording. Comparing the strings finds nothing at all.
    return {(int(r["frame"]), r["square"]): i for i, r in enumerate(rows)}, mm, rows


def python_crop(board, square: str, profile, out: int):
    """The same square, cut the way `slice` cuts it — from the stored board, at [out] px."""
    return labeling.crop_square(board, square, profile, (out, out))


def side_by_side(a, b, label: str):
    """Kotlin | Python | 8x difference, upscaled so a human can see what moved."""
    diff = cv2.absdiff(a, b)
    scale = 4
    tiles = [cv2.resize(x, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
             for x in (a, b, np.clip(diff.astype(np.int16) * 8, 0, 255).astype(np.uint8))]
    strip = np.hstack(tiles)
    bar = np.zeros((22, strip.shape[1], 3), np.uint8)
    cv2.putText(bar, label, (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
    return np.vstack([bar, strip])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("recording")
    ap.add_argument("--sample", type=int, default=200, help="crops to compare (0 = all)")
    ap.add_argument("--out", type=Path, default=Path("data/reports/parity"))
    ap.add_argument("--worst", type=int, default=12, help="how many side-by-side pictures to write")
    ap.add_argument("--out-px", type=int, default=0,
                    help="crop size for BOTH sides (0 = whatever the Kotlin pack used). The "
                         "production 128 is for the reviewer's eyes while labelling, not for this "
                         "comparison — say so explicitly rather than inheriting it.")
    ap.add_argument("--seed", type=int, default=config.SEED)
    args = ap.parse_args()

    rec = config.DATA.recordings / args.recording
    pack = rec / "training-pack" / "accepted"
    if not (pack / "packed_meta.json").is_file():
        print(f"[FAIL] {args.recording}: no training-pack/accepted — nothing to compare against.")
        return 1

    index, mm, krows = kotlin_crops(pack)
    log = {int(Path(json.loads(x)["frame"]).stem): json.loads(x)
           for x in (rec / "log.jsonl").read_text(encoding="utf-8").splitlines() if x.strip()}
    out_px = args.out_px or mm.shape[1]
    print(f"{args.recording}: Kotlin {len(krows)} crops at {out_px}px, log has {len(log)} frames")

    shared = [(f, s) for (f, s) in index if f in log and log[f].get("board")]
    if not shared:
        print("[FAIL] no (frame, square) that both sides produced.")
        return 1
    rng = random.Random(args.seed)
    pick = shared if args.sample <= 0 else rng.sample(shared, min(args.sample, len(shared)))
    print(f"  {len(shared)} shared crops, comparing {len(pick)}")

    meta = labeling.read_session_meta(rec)
    boards: dict[str, object] = {}
    results = []
    for frame, square in pick:
        row = log[frame]
        if frame not in boards:
            boards[frame] = cv2.imread(str(rec / row["board"]))
        board = boards[frame]
        if board is None:
            continue
        prof = labeling._profile_for_session(meta, None)
        # Kotlin's own pads and size, so only the PIXELS can differ — not the box.
        krow = krows[index[(frame, square)]]
        prof.crop = CropParams(cell=row["board_size"] / 8.0, pad_up=krow["pad_up"],
                               pad_side=krow["pad_side"], out_size=(out_px, out_px))
        prof.board_size = row["board_size"]
        py = python_crop(board, square, prof, out_px)
        # Kotlin packs RGB, OpenCV hands Python BGR. Measured on this recording: comparing them
        # as-is reads 19.5 mean abs diff, swapped 9.1 — so the channel order is a REAL difference
        # between the two producers, and the rest of the gap is what remains after it.
        kt = np.asarray(mm[index[(frame, square)]])[:, :, ::-1]
        if out_px != kt.shape[0]:      # only ever DOWN from the pack, and said out loud
            kt = cv2.resize(kt, (out_px, out_px), interpolation=cv2.INTER_AREA)
        if py is None or py.shape != kt.shape:
            continue
        d = cv2.absdiff(kt, py)
        results.append((float(d.mean()), float(d.max()), frame, square, kt, py))

    if not results:
        print("[FAIL] nothing comparable (shapes differed everywhere).")
        return 1
    means = np.array([r[0] for r in results])
    exact = int((means == 0).sum())
    print(f"\n  byte-identical: {exact}/{len(results)}")
    print(f"  mean abs diff : median {np.median(means):.2f}  p90 {np.percentile(means, 90):.2f}  "
          f"max {means.max():.2f}")
    print(f"  worst single pixel: {max(r[1] for r in results):.0f}")

    args.out.mkdir(parents=True, exist_ok=True)
    for mean, mx, frame, square, kt, py in sorted(results, reverse=True)[:args.worst]:
        pic = side_by_side(kt, py, f"{frame} {square}  mean {mean:.1f} max {mx:.0f}  [Kotlin | Python | 8x diff]")
        cv2.imwrite(str(args.out / f"{args.recording}_{frame}_{square}.png"), pic)
    print(f"  wrote {min(args.worst, len(results))} pictures to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
