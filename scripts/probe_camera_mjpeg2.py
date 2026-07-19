"""Second-stage MJPEG probe: separate the CAMERA's delivery rate from OUR decode cost.

`probe_camera_mjpeg.py` found that MJPG *does* engage on DSHOW when the FOURCC is not set
first (open-time `params`, or size-before-FOURCC), and that MSMF runs 1440p at ~60 fps.
Two questions that table cannot answer:

1. At 4K, MJPG engages (readback MJPG, ~1.1 cores) but still yields ~20 fps. Is the camera
   only sending 20, or is our JPEG decode the wall? `cap.grab()` pulls a frame WITHOUT
   decoding it, so grab-only fps is the camera-side rate; read() fps is what we can consume.
2. MSMF delivered 2560x1440 no matter what size was requested. Is it stuck there, or does
   it honour a size when asked differently (set before/after, other resolutions)?

Also verifies MSMF's ~60 fps frames are genuinely fresh (a repeated buffer would fake it):
counts how many consecutive frames differ from their predecessor.

Usage
-----
    .venv/Scripts/python.exe scripts/probe_camera_mjpeg2.py --index 1
"""

from __future__ import annotations

import argparse
import sys
import time

import cv2
import numpy as np

MJPG = cv2.VideoWriter_fourcc(*"MJPG")


def fourcc_str(value: float) -> str:
    v = int(value)
    s = "".join(chr((v >> (8 * i)) & 0xFF) for i in range(4))
    return "".join(c if c.isprintable() else "?" for c in s) or "?"


def open_params(index, backend, w, h):
    """Open-time properties — the sequence that made MJPG engage on DSHOW."""
    return cv2.VideoCapture(index, backend, [
        cv2.CAP_PROP_FOURCC, int(MJPG),
        cv2.CAP_PROP_FRAME_WIDTH, int(w),
        cv2.CAP_PROP_FRAME_HEIGHT, int(h),
    ])


def open_msmf(index, w, h):
    """MSMF rejects FOURCC in params ('can't set property 6'), so size only."""
    cap = cv2.VideoCapture(index, cv2.CAP_MSMF)
    if cap.isOpened():
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
    return cap


def timed(cap, frames: int, decode: bool) -> tuple[float, float]:
    """fps and CPU-cores for `frames` iterations. `decode=False` uses grab() only, which
    pulls the frame off the driver but skips JPEG decode + colour conversion."""
    t0, c0 = time.perf_counter(), time.process_time()
    got = 0
    for _ in range(frames):
        if decode:
            if cap.read()[0]:
                got += 1
        elif cap.grab():
            got += 1
    wall = time.perf_counter() - t0
    cpu = time.process_time() - c0
    return (got / wall if wall else 0.0), (cpu / wall if wall else 0.0)


def freshness(cap, frames: int = 30) -> str:
    """How many of `frames` consecutive reads actually differ from the previous one. A
    backend that re-hands the same buffer would post a high fps with 0 fresh frames."""
    prev = None
    fresh = 0
    seen = 0
    for _ in range(frames):
        ok, f = cap.read()
        if not ok or f is None:
            continue
        seen += 1
        if prev is not None and f.shape == prev.shape:
            if float(np.mean(np.abs(f.astype(np.int16) - prev.astype(np.int16)))) > 0.05:
                fresh += 1
        prev = f
    return f"{fresh}/{max(0, seen - 1)}"


def run_dshow(index: int, frames: int) -> None:
    print("=== DSHOW + open-time params (MJPG engages) — grab vs read ===")
    print(f"{'mode':>11} | {'back':>4} | {'grab fps':>8} {'cores':>5} | "
          f"{'read fps':>8} {'cores':>5} | {'fresh':>6}")
    for w, h in [(3840, 2160), (2560, 1440), (1920, 1080)]:
        cap = open_params(index, cv2.CAP_DSHOW, w, h)
        if not cap.isOpened():
            print(f"{w}x{h:<5} | could not open")
            continue
        try:
            for _ in range(8):
                cap.read()
            back = fourcc_str(cap.get(cv2.CAP_PROP_FOURCC))
            gfps, gcores = timed(cap, frames, decode=False)
            rfps, rcores = timed(cap, frames, decode=True)
            fr = freshness(cap)
            print(f"{w}x{h:<5} | {back:>4} | {gfps:8.1f} {gcores:5.2f} | "
                  f"{rfps:8.1f} {rcores:5.2f} | {fr:>6}")
        finally:
            cap.release()
    print()


def run_msmf(index: int, frames: int) -> None:
    print("=== MSMF — does it honour any requested size? ===")
    print(f"{'requested':>11} | {'delivered':>11} | {'back':>4} | {'grab fps':>8} | "
          f"{'read fps':>8} {'cores':>5} | {'fresh':>6}")
    for w, h in [(3840, 2160), (2560, 1440), (1920, 1080), (1280, 720), (640, 480)]:
        cap = open_msmf(index, w, h)
        if not cap.isOpened():
            print(f"{w}x{h:<5} | could not open")
            continue
        try:
            for _ in range(8):
                cap.read()
            ok, frame = cap.read()
            if not ok or frame is None:
                print(f"{w}x{h:<5} | no frame")
                continue
            delivered = f"{frame.shape[1]}x{frame.shape[0]}"
            back = fourcc_str(cap.get(cv2.CAP_PROP_FOURCC))
            gfps, _ = timed(cap, frames, decode=False)
            rfps, rcores = timed(cap, frames, decode=True)
            fr = freshness(cap)
            print(f"{w}x{h:<5} | {delivered:>11} | {back:>4} | {gfps:8.1f} | "
                  f"{rfps:8.1f} {rcores:5.2f} | {fr:>6}")
        finally:
            cap.release()
    print()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--index", type=int, default=1)
    ap.add_argument("--frames", type=int, default=60)
    a = ap.parse_args()
    print(f"OpenCV {cv2.__version__} — camera index {a.index}, {a.frames} frames per timing\n")
    run_dshow(a.index, a.frames)
    run_msmf(a.index, a.frames)
    return 0


if __name__ == "__main__":
    sys.exit(main())
