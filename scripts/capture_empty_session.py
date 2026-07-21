"""Live capture tool: record auto-labeled frames of a FIXED position into a session.

Use case (2026-07-21): the user varies the LIGHTING over the empty board while this
tool auto-snaps one frame per interval — every kept frame yields 64 auto-labeled
`empty` crops across many light levels (the dark-square/empty hard negatives).
Replaces the video-import route (scripts/ingest_video_session.py) when recording a
video is inconvenient — frames land DIRECTLY in a standard session directory.

    python scripts/capture_empty_session.py --camera 0 --profile phone
    # vary the light; watch the counter; press q when done
    # then: uv run chesslab slice --session <printed sid>

Keys in the preview window:  SPACE = snap now   |   p = pause/resume auto   |   q = quit

The camera is opened through `camera.open_capture` (same backend/MJPG/undistort
decisions as live tracking). Frames without a confident ArUco corner detection are
shown with a red border and NOT captured. Stop the tracker/web UI first — it holds
the camera.
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
from chesslab.camera import CameraSpec, open_capture  # noqa: E402
from chesslab.collect import SessionWriter  # noqa: E402

EMPTY_FEN = "8/8/8/8/8/8/8/8 w - - 0 1"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--camera", type=int, default=0, help="camera index (default 0)")
    ap.add_argument("--profile", default="phone", help="calibration profile (default: phone)")
    ap.add_argument("--fen", default=EMPTY_FEN,
                    help="position on the board for the WHOLE recording (default: empty)")
    ap.add_argument("--every", type=float, default=1.0,
                    help="seconds between auto-captures (default 1.0)")
    ap.add_argument("--max-frames", type=int, default=300)
    ap.add_argument("--notes", default="lighting-variance capture")
    args = ap.parse_args()

    cap = open_capture(CameraSpec(source=args.camera))
    profile = load_profile(args.profile)
    tracker = make_tracker(profile)

    sid = time.strftime("%Y%m%d-%H%M%S")
    writer: SessionWriter | None = None
    n_kept = 0
    auto = True
    last_snap = 0.0
    win = "chesslab capture — SPACE snap | p pause | q quit"
    print(f"session {sid}: auto-capture every {args.every}s while corners are found. "
          f"Vary the light! q to finish.")
    try:
        while True:
            ok, frame = cap.read()
            if not ok or frame is None:
                time.sleep(0.05)
                continue
            corners = board_corners_for_frame(frame, profile, tracker)
            now = time.monotonic()
            snap = False
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key == ord("p"):
                auto = not auto
                print("auto-capture:", "ON" if auto else "PAUSED")
            if key == ord(" "):
                snap = True
            if auto and corners is not None and now - last_snap >= args.every:
                snap = True
            if snap and corners is not None:
                if writer is None:
                    h, w = frame.shape[:2]
                    writer = SessionWriter(
                        config.DATA.sessions / sid, session_id=sid, profile=args.profile,
                        mode="lighting-capture", camera_index=args.camera,
                        frame_size=(w, h), notes=args.notes)
                writer.capture(frame, ply=n_kept, fen=args.fen, corners=corners)
                n_kept += 1
                last_snap = now
                if n_kept >= args.max_frames:
                    print("max-frames reached.")
                    break

            # Preview: fit to screen, green border = corners ok, red = not detected.
            disp = frame
            if disp.shape[1] > 1280:
                s = 1280 / disp.shape[1]
                disp = cv2.resize(disp, (1280, int(disp.shape[0] * s)))
            color = (0, 200, 0) if corners is not None else (0, 0, 255)
            cv2.rectangle(disp, (0, 0), (disp.shape[1] - 1, disp.shape[0] - 1), color, 6)
            status = f"kept {n_kept}/{args.max_frames}  auto={'ON' if auto else 'PAUSED'}"
            if corners is None:
                status += "  NO CORNERS — not capturing"
            cv2.putText(disp, status, (14, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.9,
                        (255, 255, 255), 2, cv2.LINE_AA)
            cv2.imshow(win, disp)
    finally:
        cap.release()
        cv2.destroyAllWindows()

    if writer is None:
        raise SystemExit("nothing captured — were the ArUco markers visible?")
    writer.close()
    print(f"session {sid}: {n_kept} frames.")
    print(f"  -> next: uv run chesslab slice --session {sid}")
    print("  -> then include the sid in the next `dataset build` session list")


if __name__ == "__main__":
    main()
