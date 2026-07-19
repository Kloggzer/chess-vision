"""Decide whether MJPG actually engages on the USB camera, or the driver silently stays on YUY2.

Why this exists
---------------
`camera.py` requests MJPG before the resolution and then assumes it worked, treating OpenCV's
`CAP_PROP_FOURCC` readback of "YUY2" as a mislabel. The measured frame rates say otherwise —
they land exactly on the datasheet's YUY2 row, never near MJPEG's:

    ELP-U3CAM4K60-IB (IMX678), USB-3 speed      MJPEG      YUY2     measured
        3840x2160                                60 fps    23 fps    ~21
        2560x1440                                60 fps    30 fps     30
        1920x1080                                60 fps    60 fps     58   <- cannot discriminate

If MJPG never engages, 1440p is leaving 2x and 4K nearly 3x on the table.

Two hypotheses produce the same ~21 fps at 4K, and CPU load separates them:

    MJPEG, decode-bound   -> our process burns ~a full core on JPEG decode
    YUY2, bandwidth-bound -> CPU near idle; 4K YUY2 @23 fps is ~380 MB/s, i.e. the USB-3 ceiling

So this probe reports, per variant: the FOURCC we asked for, what the driver reports back, the
frame size actually delivered, the measured fps, and the CPU-cores-equivalent burned while
capturing. `process_time` is the right clock here because OpenCV decodes inside our process.

Usage
-----
    .venv/Scripts/python.exe scripts/probe_camera_format.py            # default index 1
    .venv/Scripts/python.exe scripts/probe_camera_format.py --index 0 --frames 90
"""

from __future__ import annotations

import argparse
import sys
import time

import cv2

# (label, fourcc, set_fps) — the third column is the suspect: CAP_PROP_FPS is applied AFTER the
# resolution in camera._open_index, and some DSHOW drivers renegotiate the format on an fps change.
VARIANTS = [
    ("MJPG + fps", "MJPG", True),
    ("MJPG, no fps", "MJPG", False),
    ("YUY2 (control)", "YUY2", True),
]

MODES = [(3840, 2160), (2560, 1440), (1920, 1080)]


def fourcc_str(value: float) -> str:
    v = int(value)
    s = "".join(chr((v >> (8 * i)) & 0xFF) for i in range(4))
    return "".join(c if c.isprintable() else "?" for c in s)


def probe(index: int, width: int, height: int, fourcc: str, set_fps: bool,
          fps: int, frames: int) -> dict:
    cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
    if not cap.isOpened():
        return {"error": "could not open"}
    try:
        # Same order as camera._open_index: FOURCC first, then size, then (optionally) fps.
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*fourcc))
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        if set_fps:
            cap.set(cv2.CAP_PROP_FPS, fps)

        for _ in range(8):                      # warm-up: let auto-exposure and the pipe settle
            cap.read()

        ok, frame = cap.read()
        if not ok or frame is None:
            return {"error": "no frame"}
        actual = (frame.shape[1], frame.shape[0])

        t0, c0 = time.perf_counter(), time.process_time()
        got = 0
        for _ in range(frames):
            if cap.read()[0]:
                got += 1
        wall = time.perf_counter() - t0
        cpu = time.process_time() - c0

        return {
            "readback": fourcc_str(cap.get(cv2.CAP_PROP_FOURCC)),
            "actual": actual,
            "fps": got / wall if wall > 0 else 0.0,
            "cores": cpu / wall if wall > 0 else 0.0,
            "got": got,
        }
    finally:
        cap.release()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--index", type=int, default=1, help="camera index (the 4K cam is usually 1)")
    ap.add_argument("--frames", type=int, default=60, help="frames to time per variant")
    ap.add_argument("--fps", type=int, default=60, help="fps to request where the variant sets it")
    a = ap.parse_args()

    print(f"camera index {a.index}, {a.frames} timed frames per variant, DSHOW\n")
    header = f"{'mode':>11} | {'variant':<15} | {'asked':>5} {'got':>5} | {'delivered':>11} | " \
             f"{'fps':>6} | {'cores':>5}"
    print(header)
    print("-" * len(header))

    results: dict[tuple, dict] = {}
    for width, height in MODES:
        for label, fourcc, set_fps in VARIANTS:
            r = probe(a.index, width, height, fourcc, set_fps, a.fps, a.frames)
            if "error" in r:
                print(f"{width}x{height:<5} | {label:<15} | {fourcc:>5} {'-':>5} | "
                      f"{'ERROR: ' + r['error']:>11}")
                continue
            results[(width, height, label)] = r
            size = f"{r['actual'][0]}x{r['actual'][1]}"
            flag = "" if r["actual"] == (width, height) else "  <- SIZE FALLBACK"
            print(f"{width}x{height:<5} | {label:<15} | {fourcc:>5} {r['readback']:>5} | "
                  f"{size:>11} | {r['fps']:6.1f} | {r['cores']:5.2f}{flag}")
        print()

    # Verdict on the mode where the two formats differ most.
    key_mjpg = (3840, 2160, "MJPG + fps")
    key_yuy2 = (3840, 2160, "YUY2 (control)")
    if key_mjpg in results and key_yuy2 in results:
        m, y = results[key_mjpg], results[key_yuy2]
        print("verdict (4K, datasheet: MJPEG 60 fps / YUY2 23 fps):")
        print(f"  MJPG requested -> {m['fps']:.1f} fps at {m['cores']:.2f} cores")
        print(f"  YUY2 control   -> {y['fps']:.1f} fps at {y['cores']:.2f} cores")
        if m["fps"] > 40:
            print("  => MJPG ENGAGES. The old assumption held; nothing to fix.")
        elif abs(m["fps"] - y["fps"]) < 5 and m["cores"] < 0.5:
            print("  => MJPG does NOT engage: same rate as the YUY2 control and the CPU is idle,")
            print("     so this is bandwidth-bound YUY2, not decode-bound MJPEG. ~3x is unclaimed.")
        elif m["cores"] > 0.8:
            print("  => MJPG engages but is DECODE-BOUND (a core is pegged). The camera is not")
            print("     the limit — a faster JPEG decode path would raise the rate.")
        else:
            print("  => inconclusive; compare the 1440p rows (MJPEG 60 vs YUY2 30 there).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
