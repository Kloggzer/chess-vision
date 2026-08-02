"""Turn a filmed game into a reviewable CANDIDATE — never into ground truth.

    uv run python scripts/label_real_game.py VIDEO --profile phone --name game-2026-08-02

writes `data/realgames/<name>/candidate.json` plus `frames/`, both gitignored, and asserts
nothing. The move list in it is the TRACKER's proposal. In the first fully tracked live game
(83 plies, 2026-08-02) 55 of 91 committed moves came through `cnn_recovery` — which
`Commit.kt` defines as "position was LOST — rebuilt by the CNN, not detected" — and the user
corrected three by hand. So the artefact carries `confirmed: false` and only a human, through
the review page (`web/routers/realgames.py`), can flip it. A tracker whose own output could
become a fixture would freeze its mistakes and then assert forever that it keeps making them.

Why this is not `ingest_video_session.py`. That script samples one frame per second into a
session directory, re-detecting a quad per frame and silently skipping the ones that fail. A
regression clip is the opposite artefact: consumed as a VIDEO, at full rate, through ONE fixed
quad. Per-frame detection here is therefore not an input, it is a quality MEASUREMENT — how
well a single static quad can stand for this footage.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent))   # sibling scripts

from ingest_video_session import raw_corners  # noqa: E402

from chesslab import config  # noqa: E402
from chesslab.calibration import compute_homography, load_profile, margins4  # noqa: E402


def realgames_root() -> Path:
    """Where candidates live. Under `data/`, so gitignored — the pack commits none of it."""
    return config.DATA.root / "realgames"


# --- the geometry, measured -----------------------------------------------------------------

def scan_geometry(video: Path, profile, progress_every: int = 300) -> dict:
    """Decode once and record, per frame, the ArUco quad and the presentation timestamp.

    `raw_corners` and not `board_corners_for_frame`: the latter goes through a `MarkerTracker`
    whose dead zone, EMA and seed fallback all assume a static board, and a game filmed over
    minutes is one where the board gets nudged. The tracker then lags by a different amount per
    marker — they sit at different distances from the centre of rotation — and shears the quad by
    a few degrees. Measured on the 2026-07-31 rotation video; the reasoning is written out in
    `ingest_video_session.raw_corners`.
    """
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise SystemExit(f"cannot open video: {video}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    size = (int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
    quads: list[list[list[float]] | None] = []
    stamps: list[float] = []
    while True:
        stamps.append(cap.get(cv2.CAP_PROP_POS_MSEC))
        ok, frame = cap.read()
        if not ok:
            stamps.pop()
            break
        quad = raw_corners(frame, profile)
        quads.append(None if quad is None else [[float(x), float(y)] for x, y in quad])
        if progress_every and len(quads) % progress_every == 0:
            print(f"  ...{len(quads)} frames, {sum(q is not None for q in quads)} with a quad",
                  flush=True)
    cap.release()
    return {"fps": float(fps), "frame_size": size, "quads": quads, "stamps": stamps}


def median_quad(quads) -> list[list[float]] | None:
    """The per-corner median over every frame that detected.

    Median and not mean: one mis-resolved marker throws a corner by hundreds of pixels, and there
    is no reading of "the board sat here" under which such a frame should move the answer at all.
    The four corners are taken independently — the result is not required to be one of the
    observed quads, only to be the central one.
    """
    seen = [q for q in quads if q is not None]
    if not seen:
        return None
    arr = np.asarray(seen, dtype=np.float64)          # (n, 4, 2)
    return [[float(v) for v in pt] for pt in np.median(arr, axis=0)]


def quad_spread(quads, reference, board_size: int, margin) -> np.ndarray:
    """Per-frame corner error against `reference`, in RECTIFIED pixels.

    Rectified and not image pixels, because rectified is the unit the failure is measured in: a
    crop box is `board_size / 8` across, and what matters is how far a frame's real square edge
    sits from where the fixed quad says it is. An image-pixel number cannot be compared to that
    without knowing how much of the frame the board fills.

    Computed through the homography rather than through `alignment`: `alignment` locates the
    board's real GROOVES in a warped frame, which answers a different question (is this quad right
    at all) and needs the pixels. Here both quads are already known, so the deviation is exact —
    map the frame's corners with the reference's homography and see how far they land from the
    corners the reference puts there by construction.

    Returns one worst-corner value per detecting frame.
    """
    h = np.asarray(compute_homography(reference, board_size, margin), dtype=np.float64)
    bs = float(board_size)
    m0, m1, m2, m3 = (v * bs for v in margins4(margin))
    dst = np.array([[-m0, -m0], [bs + m1, -m1], [bs + m2, bs + m2], [-m3, bs + m3]],
                   dtype=np.float64)
    out = []
    for quad in quads:
        if quad is None:
            continue
        pts = cv2.perspectiveTransform(
            np.asarray(quad, dtype=np.float64).reshape(-1, 1, 2), h).reshape(-1, 2)
        out.append(float(np.max(np.linalg.norm(pts - dst, axis=1))))
    return np.asarray(out, dtype=np.float64)


def clock_error(stamps: list[float], fps: float) -> np.ndarray:
    """Per-frame |realised interval - nominal interval| in ms.

    The frame rate is not metadata, it is the CLOCK: `replay_clip_cnn` advances a virtual clock by
    exactly `1.0 / fps` per decoded frame, and every wall-clock knob the tracker owns —
    `motionHoldS`, `motionRecencyS`, `nudgeTimeoutS`, `verifyTimeoutS`, `cnnCooldownS`,
    `observerIntervalS` — is measured against it. A variable-rate source therefore does not make a
    replay slightly wrong; it makes `motionHoldS` mean a different number of seconds in every
    second of the video.
    """
    if len(stamps) < 2:
        return np.zeros(0)
    d = np.diff(np.asarray(stamps, dtype=np.float64))
    return np.abs(d - 1000.0 / fps)


def _dist(v: np.ndarray) -> dict:
    if v.size == 0:
        return {"median": None, "p90": None, "max": None}
    return {"median": round(float(np.median(v)), 3),
            "p90": round(float(np.percentile(v, 90)), 3),
            "max": round(float(v.max()), 3)}


def _histogram(v: np.ndarray, edges, unit: str, indent: str = "    ") -> None:
    for lo, hi in edges:
        n = int(((v >= lo) & (v < hi)).sum())
        label = f">{lo:g}" if hi > 1e8 else f"{lo:g}-{hi:g}"
        bar = "#" * int(40 * n / len(v))
        print(f"{indent}{label:>9} {unit}: {n:5} ({100 * n / len(v):5.1f} %) {bar}")


def report_geometry(scan: dict, spread: np.ndarray, board_size: int) -> dict:
    """Print the distributions and return them. **Nothing here gates anything yet.**

    No real game footage existed in this repository when the pack was written, and the nearest
    numbers on record — the 3.2-6.5 px median square-edge offsets of `docs/data-pipeline.md` 12 —
    measure per-frame quads that were each FITTED, not one static quad's error across a clip. So
    the first runs print the distribution and refuse nothing; a threshold goes in afterwards,
    naming the run it came from. A plausible constant here is how this project ended up with a
    corpus that was 3-6 px mis-aligned for its entire life.
    """
    quads, stamps, fps = scan["quads"], scan["stamps"], scan["fps"]
    detected = sum(q is not None for q in quads)
    rate = detected / len(quads) if quads else 0.0
    cell = board_size / 8.0
    clock = clock_error(stamps, fps)
    print(f"  frames {len(quads)}   quad detected {detected} ({100 * rate:.1f} %)")
    print(f"  quad spread about the median quad (rectified px, one square = {cell:.0f} px):")
    if spread.size:
        d = _dist(spread)
        print(f"    median {d['median']:.2f}   p90 {d['p90']:.2f}   max {d['max']:.2f}")
        _histogram(spread, ((0, 2), (2, 4), (4, 8), (8, 16), (16, 1e9)), "px")
    else:
        print("    nothing measurable — no frame resolved four markers")
    print(f"  clock: nominal {1000.0 / fps:.2f} ms/frame; |realised - nominal|:")
    if clock.size:
        d = _dist(clock)
        print(f"    median {d['median']:.3f} ms   p90 {d['p90']:.3f}   max {d['max']:.3f}")
        _histogram(clock, ((0, 1), (1, 4), (4, 16), (16, 1e9)), "ms")
    else:
        print("    nothing measurable — the container reports no presentation timestamps")
    return {"detection_rate": round(rate, 4), "detected": detected, "frames": len(quads),
            "quad_spread_px": _dist(spread), "clock_error_ms": _dist(clock)}


def ffmpeg_cfr_hint(video: Path, fps: float) -> str:
    """The command to fix a variable-rate source, printed rather than run.

    Not corrected in-process on purpose: re-timing frames is exactly the kind of silent repair
    that makes a replay's numbers un-attributable. ffmpeg is established, the user's standing
    preference, and leaves a file whose rate is a fact rather than an assumption.
    """
    return (f'ffmpeg -i "{video}" -vsync cfr -r {fps:g} -c:v libx264 -crf 18 '
            f'-preset slow -an "{video.with_name(video.stem + "-cfr.mp4")}"')


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", nargs="?", help="the filmed game (anything OpenCV reads)")
    ap.add_argument("--profile", default="phone",
                    help="calibration profile — supplies board_size and, critically, MARGIN "
                         "(default: phone)")
    ap.add_argument("--name", default=None,
                    help="candidate directory name (default: the video's stem)")
    return ap


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not args.video:
        build_parser().error("a video is required")
    video = Path(args.video)
    profile = load_profile(args.profile)
    print(f"scanning {video.name} through profile {args.profile!r} "
          f"(board_size {profile.board_size}, margin {profile.margin})")
    scan = scan_geometry(video, profile)
    quad = median_quad(scan["quads"])
    if quad is None:
        raise SystemExit("no frame resolved four ArUco markers — is the board's border visible?")
    spread = quad_spread(scan["quads"], quad, profile.board_size, profile.margin)
    report_geometry(scan, spread, profile.board_size)
    print("  if the clock above is not flat, re-encode first:\n    "
          + ffmpeg_cfr_hint(video, scan["fps"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
