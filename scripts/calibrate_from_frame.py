"""Build a calibration profile from a SINGLE grabbed frame (URL/image/index) instead of from a
local camera index. Bridge for sources that `calibrate_auto` cannot open directly
(e.g. the HTTPS snapshot URL of a phone IP cam).

Detects the ArUco markers (id 0-3 = a8,h8,h1,a1), reconstructs the 4 corners, builds a
`CalibrationProfile` and saves it. Also writes a control overlay
(rectified board with grid) so you can adjust `--margin` by eye.

Example:
  python scripts/calibrate_from_frame.py --source https://<PHONE-IP>:4444/video/snapshot \
      --profile phone --margin 0.08
  python scripts/feed_preview.py --source https://<PHONE-IP>:4444/video/snapshot --profile phone
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parent))               # feed_preview
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))   # chesslab

from feed_preview import grab_frame  # noqa: E402

from chesslab.calibration import (  # noqa: E402
    detect_board_markers,
    draw_board_grid,
    profile_from_frame,
    profile_path,
    warp_from_corners,
)

_LABELS = ("a8", "h8", "h1", "a1")


def main() -> int:
    ap = argparse.ArgumentParser(description="Calibrate profile from a single frame.")
    ap.add_argument("--source", required=True, help="URL / image path / camera index.")
    ap.add_argument("--profile", default="phone", help="Profile name (default: phone).")
    ap.add_argument("--board-size", type=int, default=1000, help="Rectified edge length (px).")
    ap.add_argument("--margin", type=float, default=0.08,
                    help="Fraction that markers lie OUTSIDE the playing area (adjust).")
    ap.add_argument("--dict", default="DICT_4X4_50", help="ArUco dictionary.")
    ap.add_argument("--no-white-pov", action="store_true", help="Label board rotated 180°.")
    ap.add_argument("--out", default="data/_preview_cal", help="Directory for control overlay.")
    args = ap.parse_args()

    try:
        frame = grab_frame(args.source)
    except Exception as e:  # noqa: BLE001
        print(f"[FAIL] Frame: {e}")
        return 1
    h, w = frame.shape[:2]
    print(f"[OK] Frame {w}x{h} from {args.source!r}.")

    pts = detect_board_markers(frame, args.dict, corner="center")
    found = sorted(pts)
    print("[..] Markers detected (id->square): " +
          ", ".join(f"{i}={_LABELS[i]}" for i in found) if found else "[..] no markers detected")
    prof = profile_from_frame(frame, args.profile, board_size=args.board_size,
                              margin=args.margin, dict_name=args.dict,
                              white_pov=not args.no_white_pov)
    if prof is None:
        print(f"[FAIL] too few markers ({len(pts)}/4, at least 2 needed). "
              "Check lighting/view; markers must be flat and fully visible.")
        return 1
    corners = prof.image_corners
    out_path = profile_path(args.profile)
    prof.save(out_path)
    print(f"[OK] Profile saved: {out_path} (margin={args.margin:.3f}, board_size={args.board_size})")

    # Control overlay: rectify board + grid -> visual margin check.
    warped = warp_from_corners(frame, prof, corners)
    overlay = draw_board_grid(warped, prof)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_dir / "calib_check.png"), overlay)
    print(f"[OK] Control overlay -> {out_dir / 'calib_check.png'}  "
          "(green grid must align with real squares; otherwise adjust --margin)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
