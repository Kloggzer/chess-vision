"""Import a VIDEO of the physical board as a normal chesslab session.

Use case (2026-07-21): the user films the EMPTY board while varying the lighting —
each usable frame yields 64 auto-labeled `empty` crops across many light levels,
exactly the hard-negative material the dark-square/empty domain gap needs. Works for
any fixed position, not just the empty board (pass --fen).

Per sampled frame the board corners are re-detected from the ArUco markers (frames
without a confident detection are skipped and counted). The result is a standard
session directory (frames/ + log.jsonl + session.yaml), so the whole existing
pipeline applies afterwards:

    python scripts/ingest_video_session.py board.mp4 --profile phone
    # then: uv run chesslab slice --session <printed sid>
    #       include the sid in the next `dataset build` session list

Frames are stored RAW (no lens remap) — consistent with live capture, which also
feeds raw frames to slicing (lens state is recorded in session.yaml by SessionWriter).
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent))   # sibling scripts

from chesslab import config, labeling  # noqa: E402
from chesslab.calibration import (  # noqa: E402
    board_corners_for_frame,
    detect_board_markers,
    load_profile,
    make_tracker,
    resolve_board_corners,
)
from chesslab.collect import SessionWriter  # noqa: E402

EMPTY_FEN = "8/8/8/8/8/8/8/8 w - - 0 1"


def raw_corners(frame, profile, min_markers: int = 4):
    """Board corners from THIS frame's markers alone — no tracker, no smoothing, no seed.

    `board_corners_for_frame` goes through a `MarkerTracker`, which is right for a fixed camera and
    wrong for a MOVING board. It freezes any marker that moved less than `move_threshold`, EMA-
    smooths the rest, and falls back to a profile `seed` for markers it has not seen live. While the
    board rotates, the four markers travel at different speeds — their distance to the centre of
    rotation differs — so the EMA lags by a different amount per marker and the quad comes out
    sheared by a few degrees. Measured on the 2026-07-31 rotation video: frame 0 (the calibration
    pose) rectifies perfectly, every rotated frame lands a few degrees off with the board's edge
    labels inside the crop area.

    Returns None when fewer than `min_markers` resolve, so a frame is skipped rather than warped
    through a guess. That sentence was in this docstring since it was written and was NOT true:
    `resolve_board_corners` answers from two markers up, silently degrading to an affine
    parallelogram at three and a similarity at two, and the `res[0]` here took whatever came back.

    It cost a full day on 2026-08-03. The 2026-08-02 game video has its fourth marker clipped by
    the right image border, so exactly three ever decode; every frame was warped through an affine
    reconstruction of a PERSPECTIVE view, which cannot be right by construction. The quality
    measurement did not catch it because it compares each frame's quad against the MEDIAN of the
    same quads: a consistently wrong quad has excellent spread (p90 0.93 px), and "99.9 % of frames
    yielded a quad" counted the guesses. Precision, reported as accuracy.

    `n_used` is returned alongside so a caller can say WHICH degradation it is accepting. Nothing
    may report a detection rate without it.
    """
    det = detect_board_markers(frame, profile.marker_dict, corner="center")
    res = resolve_board_corners(det, board_size=profile.board_size)
    if res is None or res[1] < min_markers:
        return None
    return res[0]


def report_alignment(sid: str, profile) -> None:
    """Print the per-frame square-offset distribution of the session just written.

    Run here rather than left to a separate command because a sheared warp is invisible everywhere
    else: the frame count, the crop count and the corner count all look healthy while every crop
    straddles two squares. Seeing the distribution at import is the cheapest moment to notice.
    """
    import numpy as np
    from check_alignment import frame_offsets, judge

    d = config.DATA.sessions / sid
    log = labeling.read_log(d)
    worst = []
    for e in log:
        if not e.get("corners"):
            continue
        frame = cv2.imread(str(d / e["frame"]))
        if frame is None:
            continue
        off, _ = frame_offsets(frame, e["corners"], profile)
        _bad, w = judge(off, 0.0)
        if np.isfinite(w):
            worst.append(w)
    if not worst:
        print("  alignment: nothing measurable")
        return
    v = np.array(worst)
    cell = profile.board_size / 8.0
    print(f"  alignment (worst square offset per frame, one square = {cell:.0f} px):")
    print(f"    median {np.median(v):.1f} px   p90 {np.percentile(v, 90):.1f}   max {v.max():.1f}")
    for lo, hi in ((0, 4), (4, 6), (6, 8), (8, 12), (12, 1e9)):
        n = int(((v >= lo) & (v < hi)).sum())
        label = f">{lo:.0f}" if hi > 1e8 else f"{lo:.0f}-{hi:.0f}"
        bar = "#" * int(40 * n / len(v))
        print(f"    {label:>6} px: {n:4} ({100 * n / len(v):4.1f} %) {bar}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("video", help="video file (mp4/avi/... anything OpenCV reads)")
    ap.add_argument("--profile", default="phone", help="calibration profile (default: phone)")
    ap.add_argument("--fen", default=EMPTY_FEN,
                    help="position shown in the ENTIRE video (default: empty board)")
    ap.add_argument("--every", type=float, default=1.0,
                    help="seconds between sampled frames (default 1.0 — lighting changes "
                         "are slow; near-duplicate frames only bloat the dedup step)")
    ap.add_argument("--max-frames", type=int, default=300)
    ap.add_argument("--notes", default="", help="free-text note stored in session.yaml")
    ap.add_argument("--check-alignment", action="store_true",
                    help="after writing, measure how far every frame's squares sit from the grid "
                         "and print the distribution. Nothing in the pipeline notices a sheared "
                         "warp on its own — see scripts/check_alignment.py.")
    ap.add_argument("--raw-markers", action="store_true",
                    help="resolve corners from each frame's markers alone, bypassing the "
                         "MarkerTracker. Use this whenever the BOARD moves: the tracker's dead "
                         "zone, EMA and seed fallback all assume a static board and shear the quad "
                         "by a few degrees while it rotates.")
    ap.add_argument("--jpeg-quality", type=int, default=95,
                    help="store frames as JPEG at this quality (0 = PNG). Default 95: the source "
                         "is already H.264, so PNG spends ~5x the disk losslessly preserving "
                         "someone else's compression artefacts — 3 202 4K frames are 36 GB as PNG "
                         "against ~7 GB as JPEG 95.")
    args = ap.parse_args()

    cap = cv2.VideoCapture(str(args.video))
    if not cap.isOpened():
        raise SystemExit(f"cannot open video: {args.video}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, int(round(fps * args.every)))
    profile = load_profile(args.profile)
    tracker = make_tracker(profile)

    sid = time.strftime("%Y%m%d-%H%M%S")            # standard camera-session id format
    writer = None
    n_read = n_sampled = n_kept = n_nocorners = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        n_read += 1
        if (n_read - 1) % step:
            continue
        n_sampled += 1
        corners = (raw_corners(frame, profile) if args.raw_markers
                   else board_corners_for_frame(frame, profile, tracker))
        if corners is None:
            n_nocorners += 1
            continue
        if writer is None:
            h, w = frame.shape[:2]
            writer = SessionWriter(
                config.DATA.sessions / sid, session_id=sid, profile=args.profile,
                mode="video-import", camera_index=-1, frame_size=(w, h),
                notes=args.notes or f"video import: {Path(args.video).name}",
                jpeg_quality=args.jpeg_quality or None)
        writer.capture(frame, ply=n_kept, fen=args.fen, corners=corners)
        n_kept += 1
        if n_kept >= args.max_frames:
            break
    cap.release()

    if writer is None:
        raise SystemExit(
            f"no usable frames: {n_sampled} sampled, {n_nocorners} without ArUco corners — "
            "are the markers visible in the video?")
    writer.close()
    print(f"session {sid}: {n_kept} frames kept "
          f"({n_sampled} sampled of {n_read} read, {n_nocorners} without corners)")
    if args.check_alignment:
        report_alignment(sid, profile)
    print(f"  -> next: uv run chesslab slice --session {sid}")
    print("  -> then include the sid in the next `dataset build` session list")


if __name__ == "__main__":
    main()
