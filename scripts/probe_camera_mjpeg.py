"""Find a call sequence that actually engages MJPEG on the USB camera — and verify the
frames it produces are real.

Background
----------
`probe_camera_format.py` established that on this cam (ELP-U3CAM4K60-IB / IMX678)
`cap.set(CAP_PROP_FOURCC, MJPG)` *after* opening with CAP_DSHOW is accepted and ignored:
the FOURCC reads back YUY2 and the fps lands on the datasheet's YUY2 row.

This script sweeps the candidate escapes and — the part that turned out to matter — checks
that each variant's frames are genuine. Two independent traps were found here, and both
fake a high frame rate:

  * `CAP_PROP_FPS = 60` renegotiates the media type back to YUY2 and then delivers
    near-empty buffers at exactly the requested rate. 4K YUY2 at 60 fps is ~1 GB/s, far
    beyond USB-3, so the rate alone proves the frames cannot be real.
  * CAP_MSMF reports ~60 fps at 1440p of which ~43% are byte-identical repeats of the
    previous frame.

So a variant is only a success if it engages MJPG AND the frames are distinct AND they
carry image content. The columns:

    back      FOURCC the driver reports back after the sequence (MJPG = engaged)
    raw fps   frames returned per second
    uniq fps  raw fps minus byte-identical repeats — the rate that is actually useful
    cores     CPU cores burned (JPEG decode shows up here; ~0.1 means nothing arrived)
    mean      mean pixel value; near-zero across the board means empty buffers, not a
              dark scene, and invalidates the row
    delivered decoded shape, or a raw/JPEG buffer if CONVERT_RGB handed back compressed data

IMPORTANT: run this with the LENS CAP OFF and a normally lit scene. A black scene makes
`mean` useless as a validity signal and lets auto-exposure lengthen integration time, which
throttles the frame rate for reasons that have nothing to do with the pixel format.

Usage
-----
    .venv/Scripts/python.exe scripts/probe_camera_mjpeg.py
    .venv/Scripts/python.exe scripts/probe_camera_mjpeg.py --index 1 --modes 4k,1440p
"""

from __future__ import annotations

import argparse
import sys
import time

import cv2
import numpy as np

MODES = {"4k": (3840, 2160), "1440p": (2560, 1440), "1080p": (1920, 1080)}
BACKENDS = {"dshow": cv2.CAP_DSHOW, "msmf": cv2.CAP_MSMF}
MJPG = cv2.VideoWriter_fourcc(*"MJPG")


def fourcc_str(value: float) -> str:
    v = int(value)
    s = "".join(chr((v >> (8 * i)) & 0xFF) for i in range(4))
    return "".join(c if c.isprintable() else "?" for c in s) or "?"


# --- open strategies ------------------------------------------------------------------
# These differ ONLY in how and when FOURCC / resolution / CONVERT_RGB are applied, which
# is the entire question: DirectShow negotiates the media type when the graph is built,
# so anything set afterwards can only trigger a renegotiation the driver may refuse.

def _open_set_after(index, backend, w, h, convert_rgb=None, set_fps=False):
    """What camera._open_index does today: FOURCC first, then size, after opening."""
    cap = cv2.VideoCapture(index, backend)
    if not cap.isOpened():
        return None
    if convert_rgb is not None:
        cap.set(cv2.CAP_PROP_CONVERT_RGB, convert_rgb)
    cap.set(cv2.CAP_PROP_FOURCC, MJPG)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
    if set_fps:
        cap.set(cv2.CAP_PROP_FPS, 60)
    return cap


def _open_size_first(index, backend, w, h, _convert_rgb=None, set_fps=False):
    """Size before FOURCC — the inverse of the documented advice, which is what works."""
    cap = cv2.VideoCapture(index, backend)
    if not cap.isOpened():
        return None
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
    cap.set(cv2.CAP_PROP_FOURCC, MJPG)
    if set_fps:
        cap.set(cv2.CAP_PROP_FPS, 60)
    return cap


def _open_params(index, backend, w, h, convert_rgb=None, set_fps=False):
    """OpenCV >= 4.5.3: properties applied AT open time, so the graph is built with the
    MJPEG media type instead of being asked to switch to it afterwards."""
    params = [cv2.CAP_PROP_FOURCC, int(MJPG),
              cv2.CAP_PROP_FRAME_WIDTH, int(w),
              cv2.CAP_PROP_FRAME_HEIGHT, int(h)]
    if convert_rgb is not None:
        params += [cv2.CAP_PROP_CONVERT_RGB, int(convert_rgb)]
    cap = cv2.VideoCapture(index, backend, params)
    if cap.isOpened() and set_fps:
        cap.set(cv2.CAP_PROP_FPS, 60)
    return cap if cap.isOpened() else None


VARIANTS = [
    # (label, backend, opener, convert_rgb, set_fps)
    ("set-after (current code)", "dshow", _open_set_after, None, False),
    ("open-params", "dshow", _open_params, None, False),
    ("size-first", "dshow", _open_size_first, None, False),
    ("open-params + fps60", "dshow", _open_params, None, True),
    ("convert_rgb=0", "dshow", _open_set_after, 0, False),
    ("params+convert_rgb=0", "dshow", _open_params, 0, False),
    ("set-after (current code)", "msmf", _open_set_after, None, False),
    ("open-params", "msmf", _open_params, None, False),
    ("convert_rgb=0", "msmf", _open_set_after, 0, False),
]


def describe(frame) -> str:
    """Classify what read() handed back: a BGR image, or a compressed/raw buffer that
    every downstream consumer in this codebase would choke on."""
    if frame is None:
        return "none"
    if frame.ndim == 3 and frame.shape[2] == 3:
        return f"bgr {frame.shape[1]}x{frame.shape[0]}"
    flat = frame.reshape(-1)
    if flat.size >= 2 and flat[:2].tobytes() == b"\xff\xd8":     # JPEG SOI
        img = cv2.imdecode(flat, cv2.IMREAD_COLOR)
        return (f"jpeg-ok {img.shape[1]}x{img.shape[0]}" if img is not None
                else f"jpeg-bad {flat.size}B")
    return f"raw {flat.size}B"


def probe(index, backend_name, opener, w, h, convert_rgb, set_fps, frames) -> dict:
    backend = BACKENDS[backend_name]
    try:
        cap = opener(index, backend, w, h, convert_rgb, set_fps)
    except Exception as exc:                                     # noqa: BLE001
        return {"error": f"open raised {type(exc).__name__}"}
    if cap is None:
        return {"error": "could not open"}
    try:
        for _ in range(12):                                      # let AE/AWB settle
            cap.read()
        ok, first = cap.read()
        if not ok or first is None:
            return {"error": "no frame"}

        prev = None
        dup = got = 0
        t0, c0 = time.perf_counter(), time.process_time()
        for _ in range(frames):
            ok2, f = cap.read()
            if not ok2 or f is None:
                continue
            got += 1
            # Byte-identical to its predecessor = the backend re-handed a stale buffer.
            # Real sensor output always differs by at least noise.
            if prev is not None and f.shape == prev.shape and np.array_equal(f, prev):
                dup += 1
            prev = f.copy()
        wall = time.perf_counter() - t0
        cpu = time.process_time() - c0

        return {
            "readback": fourcc_str(cap.get(cv2.CAP_PROP_FOURCC)),
            "desc": describe(first),
            "fps": got / wall if wall else 0.0,
            "uniq": (got - dup) / wall if wall else 0.0,
            "cores": cpu / wall if wall else 0.0,
            "mean": float(prev.mean()) if prev is not None else -1.0,
        }
    finally:
        try:
            cap.release()
        except Exception:                                        # noqa: BLE001
            pass


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--index", type=int, default=1)
    ap.add_argument("--frames", type=int, default=120)
    ap.add_argument("--modes", default="4k,1440p,1080p")
    a = ap.parse_args()

    modes = [m.strip() for m in a.modes.split(",") if m.strip() in MODES]
    print(f"OpenCV {cv2.__version__} — index {a.index}, {a.frames} frames/variant")
    print("MJPG requested everywhere. Run with the LENS CAP OFF: a black scene makes 'mean'")
    print("meaningless and lets auto-exposure throttle the frame rate on its own.\n")

    header = (f"{'mode':>6} | {'backend':<5} | {'variant':<24} | {'back':>4} | "
              f"{'delivered':<14} | {'raw':>6} | {'uniq':>6} | {'cores':>5} | {'mean':>6}")
    print(header)
    print("-" * len(header))

    for mode in modes:
        w, h = MODES[mode]
        for label, backend_name, opener, crgb, sfps in VARIANTS:
            r = probe(a.index, backend_name, opener, w, h, crgb, sfps, a.frames)
            if "error" in r:
                print(f"{mode:>6} | {backend_name:<5} | {label:<24} | {'-':>4} | "
                      f"{'ERROR: ' + r['error']:<14} | {'-':>6} | {'-':>6} | "
                      f"{'-':>5} | {'-':>6}")
                continue
            print(f"{mode:>6} | {backend_name:<5} | {label:<24} | {r['readback']:>4} | "
                  f"{r['desc']:<14} | {r['fps']:6.1f} | {r['uniq']:6.1f} | "
                  f"{r['cores']:5.2f} | {r['mean']:6.1f}")
        print()

    print("Reading the table: 'back' = MJPG means the format engaged. A large raw-vs-uniq")
    print("gap means the backend repeats stale buffers. A near-zero 'mean' with the cap OFF")
    print("means empty buffers — that row's frame rate is fiction regardless of what it says.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
