"""Cut occluders out of the RAW clips with SAM 3 — no stage, no chroma, no Otsu.

`occluders.extract` separates hand from background by CHROMA distance to the clip's temporal
median. That is why the clips were shot against a flat, evenly lit cloth in the first place: the
background had to be made cooperative for the algorithm. Every trap in `docs/occluder-plates.md`
follows from that — a dark sleeve against a dark fold, a shadow band morphology re-annexes, a lamp
sweeping the cloth, "shadow is background but a sleeve is not".

SAM 3 needs none of it. It is asked for `person`/`hand`/`arm`/`sleeve`/`wristwatch` and unions what
it finds, so it reads the FRAME, not the frame's distance from a median. This therefore starts at
the video, not at the plates the chroma pipeline already chose and cropped — running it on those
would inherit every selection the old cut made.

    uv run python scripts/occluders_sam3.py --sample 12     # a sheet, nothing is written
    uv run python scripts/occluders_sam3.py --extract       # the full run

`MAX_ZONE_FRAC` is deliberately not applied: it refuses an arm that covers most of a BOARD, and
here the hand is supposed to fill the frame.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from chesslab import config  # noqa: E402

#: Neutral grey behind a cut-out, so a hole in the alpha shows and a soft edge does not read as one.
BACKDROP = 128
#: Below this share of the frame there is no pose worth keeping — the hand is leaving or entering.
MIN_COVER = 0.02
#: The mat's own edge, not `stage_of`'s default 61 px inset: that inset exists to keep the chroma
#: read off the border and would take 30 px off an arm lying across it.
STAGE_ERODE = 1


def clips(root: Path) -> list[Path]:
    return sorted(root.glob("*.mp4"))


def frames_of(video: Path, picks: list[int]):
    """(index, frame) for the asked-for indices. Seeks, because the picks are far apart."""
    cap = cv2.VideoCapture(str(video))
    try:
        for p in picks:
            cap.set(cv2.CAP_PROP_POS_FRAMES, p)
            ok, frame = cap.read()
            if ok:
                yield p, frame
    finally:
        cap.release()


def frame_count(video: Path) -> int:
    cap = cv2.VideoCapture(str(video))
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()
    return n


def stage_of_clip(video: Path):
    """The blue field, as a mask over the WORK-size frame — where the board would be."""
    from chesslab.occluders import read_plate, stage_of, work_size

    cap = cv2.VideoCapture(str(video))
    try:
        n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        size = work_size(cap)
        return stage_of(read_plate(cap, n, size), erode=STAGE_ERODE), size
    finally:
        cap.release()


def touching(alpha, stage):
    """SAM 3's mask minus what never touches the mat — the legs and the chair behind it.

    Kept WHOLE where it does touch: an arm that lies across the mat edge is one object, and cutting
    it at the edge is the amputation the old chroma pipeline made (456 of 456 tiles on 230602).
    """
    n, lab, _stats, _c = cv2.connectedComponentsWithStats((alpha > 127).astype(np.uint8), 8)
    on = stage > 127
    keep = {i for i in range(1, n) if (lab == i)[on].any()}
    return np.where(np.isin(lab, list(keep)), alpha, 0).astype(np.uint8)


def over(bgr, alpha) -> np.ndarray:
    a = (alpha.astype(np.float32) / 255.0)[..., None]
    return (bgr.astype(np.float32) * a + BACKDROP * (1.0 - a)).astype(np.uint8)


def bbox(alpha) -> tuple[int, int, int, int] | None:
    ys, xs = np.nonzero(alpha > 127)
    if not len(ys):
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def row_of(video: Path, idx: int, frame, cuts: dict, width: int) -> np.ndarray:
    """RAW | SAM 3 | on the mat | touching the mat — one row of the review sheet."""
    tiles = [frame] + [over(frame, a) for a in cuts.values()]
    scale = width / (len(tiles) * frame.shape[1])
    strip = np.hstack([cv2.resize(t, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
                       for t in tiles])
    bar = np.zeros((22, strip.shape[1], 3), np.uint8)
    areas = "  ".join(f"{k} {(a > 127).mean():.3f}" for k, a in cuts.items())
    cv2.putText(bar, f"{video.stem} {idx}   ROH | {' | '.join(cuts)}      {areas}", (6, 16),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
    return np.vstack([bar, strip])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sample", type=int, default=12, help="frames per clip on the sheet")
    ap.add_argument("--frames", type=str, default=None,
                    help="force these source indices instead of a spread, e.g. 988,593")
    ap.add_argument("--extract", action="store_true", help="the full run (not implemented yet)")
    ap.add_argument("--footage", type=Path, default=None, help="the clip directory")
    ap.add_argument("--out", type=Path, default=Path("data/reports/occluders-sam3"))
    args = ap.parse_args()

    root = args.footage or config.DATA.footage / "occluders"
    found = clips(root)
    if not found:
        print(f"[FAIL] no clips under {root}")
        return 1
    if args.extract:
        print("[FAIL] --extract kommt erst, wenn das Blatt ueberzeugt hat.")
        return 1
    from chesslab.matte import alpha_sam3, solid

    args.out.mkdir(parents=True, exist_ok=True)
    rows, areas = [], []
    for video in found:
        n = frame_count(video)
        stage, size = stage_of_clip(video)
        # Spread over the whole clip: the tail of `230602` is where the old cut lost 147 of 152
        # tiles to a lamp, so a sample that stops at the middle would miss the interesting part.
        picks = ([int(x) for x in args.frames.split(",") if int(x) < n] if args.frames
                 else [round(n * (i + 0.5) / args.sample) for i in range(args.sample)])
        if not picks:
            continue
        print(f"{video.name}: {n} frames @ {size[0]}x{size[1]}, mat {(stage > 127).mean():.1%} "
              f"of the frame, sampling {len(picks)}", flush=True)
        for idx, raw in frames_of(video, picks):
            frame = cv2.resize(raw, size)
            # `fill=False`: this sheet exists to show what the filling does, so it needs the union
            # before it. Production never asks for that.
            alpha = (np.clip(alpha_sam3(frame, fill=False)[0], 0.0, 1.0) * 255.0).astype(np.uint8)
            reach = touching(alpha, stage)
            cuts = {"SAM3 roh": alpha,
                    "beruehrt die Matte": reach,
                    "+ gefuellt": solid(reach),
                    "auf der Matte, gefuellt": np.where(stage > 127, solid(reach), 0).astype(np.uint8)}
            areas.append(float((cuts["+ gefuellt"] > 127).mean()))
            rows.append(row_of(video, idx, frame, cuts, 2000))
            print(f"  {idx}: " + "  ".join(f"{k} {(a > 127).mean():.3f}"
                                           for k, a in cuts.items()), flush=True)

    sheet = args.out / "roh-vs-sam3.png"
    cv2.imwrite(str(sheet), np.vstack(rows))
    a = np.array(areas)
    print(f"sheet -> {sheet}")
    print(f"covered area: median {np.median(a):.3f}, p10 {np.percentile(a, 10):.3f}, "
          f"p90 {np.percentile(a, 90):.3f}, empty {(a < MIN_COVER).sum()}/{len(a)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
