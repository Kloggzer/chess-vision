"""Diagnose: Frame aus einem Clip ziehen, Marker-Erkennung + Warp visualisieren.

Usage: uv run python scripts/dump_warp.py CLIP SEKUNDE OUTPREFIX [--profile phone]
Schreibt OUTPREFIX_raw.jpg (mit Ecken, falls gefunden) und OUTPREFIX_warp.jpg (mit Raster).
"""

from __future__ import annotations

import argparse
import sys

import cv2

from chesslab.calibration import (
    board_corners_for_frame,
    load_profile,
    make_tracker,
    warp_from_corners,
)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("clip")
    ap.add_argument("second", type=float)
    ap.add_argument("outprefix")
    ap.add_argument("--profile", default="phone")
    a = ap.parse_args()

    prof = load_profile(a.profile)
    cap = cv2.VideoCapture(a.clip)
    cap.set(cv2.CAP_PROP_POS_MSEC, a.second * 1000.0)
    ok, frame = cap.read()
    cap.release()
    if not ok:
        print("Frame nicht lesbar", file=sys.stderr)
        return 1

    tracker = make_tracker(prof)
    corners = board_corners_for_frame(frame, prof, tracker)
    print("Marker-Ecken gefunden:", corners is not None)
    raw = frame.copy()
    use = corners if corners is not None else prof.image_corners
    print("verwendete Ecken:", [[round(float(x), 1), round(float(y), 1)] for x, y in use])
    for i, (x, y) in enumerate(use):
        cv2.circle(raw, (int(x), int(y)), 12, (0, 0, 255) if corners is None else (0, 255, 0), 3)
        cv2.putText(raw, "a8 h8 h1 a1".split()[i], (int(x) + 14, int(y)),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 255), 2)
    cv2.imwrite(a.outprefix + "_raw.jpg", raw)

    warped = warp_from_corners(frame, prof, use)
    bs = prof.board_size
    for i in range(9):
        p = int(i * bs / 8)
        cv2.line(warped, (p, 0), (p, bs), (0, 220, 0), 1)
        cv2.line(warped, (0, p), (bs, p), (0, 220, 0), 1)
    cv2.imwrite(a.outprefix + "_warp.jpg", warped)
    print("geschrieben:", a.outprefix + "_raw.jpg", a.outprefix + "_warp.jpg")
    return 0


if __name__ == "__main__":
    sys.exit(main())
