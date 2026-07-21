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

from chesslab import config  # noqa: E402
from chesslab.calibration import board_corners_for_frame, load_profile, make_tracker  # noqa: E402
from chesslab.collect import SessionWriter  # noqa: E402

EMPTY_FEN = "8/8/8/8/8/8/8/8 w - - 0 1"


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
        corners = board_corners_for_frame(frame, profile, tracker)
        if corners is None:
            n_nocorners += 1
            continue
        if writer is None:
            h, w = frame.shape[:2]
            writer = SessionWriter(
                config.DATA.sessions / sid, session_id=sid, profile=args.profile,
                mode="video-import", camera_index=-1, frame_size=(w, h),
                notes=args.notes or f"video import: {Path(args.video).name}")
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
    print(f"  -> next: uv run chesslab slice --session {sid}")
    print("  -> then include the sid in the next `dataset build` session list")


if __name__ == "__main__":
    main()
