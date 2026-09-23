"""8K-Testclips auf tracker-taugliche Auflösung reduzieren (OpenCV, kein ffmpeg nötig).

Usage: uv run python scripts/reduce_video.py IN.mp4 OUT.mp4 [--width 1920] [--fps-cap 30] [--fps N]

Der Tracker warpt ohnehin auf board_size (~800 px) — 1920 px Breite ist mehr als genug
und macht aus ~700 MB 8K-Clips handliche Regressions-Testdateien.
"""

from __future__ import annotations

import argparse
import math
import sys
import time

import cv2


def reduce(src: str, dst: str, width: int = 1920, fps_cap: float = 30.0,
           fps: float | None = None) -> int:
    cap = cv2.VideoCapture(src)
    if not cap.isOpened():
        print(f"FEHLER: kann {src} nicht öffnen (Codec?)", file=sys.stderr)
        return 1
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = fps or cap.get(cv2.CAP_PROP_FPS)
    if not (math.isfinite(fps) and fps > 0):
        cap.release()
        print(f"FEHLER: {src} nennt keine Bildrate — mit --fps ausdruecklich angeben", file=sys.stderr)
        return 1
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    out_w = min(width, w)
    out_h = int(h * out_w / w) // 2 * 2
    # fps-Cap per Frame-Skipping (Handy-8K oft 24/30 fps; falls 60, jeden 2. Frame nehmen)
    step = max(1, round(fps / fps_cap)) if fps > fps_cap else 1
    out_fps = fps / step
    wr = cv2.VideoWriter(dst, cv2.VideoWriter_fourcc(*"mp4v"), out_fps, (out_w, out_h))
    if not wr.isOpened():
        print("FEHLER: VideoWriter (mp4v) nicht verfügbar", file=sys.stderr)
        return 1
    print(f"{src}: {w}x{h} @{fps:.1f}fps, {total} Frames -> {out_w}x{out_h} @{out_fps:.1f}fps")
    n = kept = 0
    t0 = time.time()
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if n % step == 0:
            wr.write(cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA))
            kept += 1
        n += 1
        if n % 200 == 0:
            print(f"  {n}/{total} Frames ({n / max(total, 1):.0%}, {time.time() - t0:.0f}s)")
    cap.release()
    wr.release()
    print(f"fertig: {kept} Frames geschrieben -> {dst}")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--fps-cap", type=float, default=30.0)
    ap.add_argument("--fps", type=float, default=None,
                    help="Bildrate statt der des Containers; Pflicht, wenn er keine nennt")
    a = ap.parse_args()
    sys.exit(reduce(a.src, a.dst, a.width, a.fps_cap, a.fps))
