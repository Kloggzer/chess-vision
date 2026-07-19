"""Hunt for a call sequence that actually engages MJPEG on the USB camera.

Follow-up to `probe_camera_format.py`, which established that on this cam
(ELP-U3CAM4K60-IB / IMX678) `cap.set(CAP_PROP_FOURCC, MJPG)` after opening with CAP_DSHOW is
accepted and ignored: every variant reads back YUY2 and lands on the datasheet's YUY2 fps row
while the CPU stays near idle (bandwidth-bound uncompressed video, not decode-bound JPEG).

This script sweeps the candidate escapes:

    dshow-set-after      baseline — FOURCC set after open (what camera._open_index does)
    dshow-params         FOURCC + size passed as open-time `params` (OpenCV >= 4.5.3)
    dshow-size-first     size before FOURCC (inverted order)
    dshow-reopen         set FOURCC, release, reopen, set again
    dshow-convert-rgb0   CAP_PROP_CONVERT_RGB = 0 (ask for the compressed stream)
    msmf-*               the same, on Media Foundation

Per variant it reports the FOURCC asked for, the FOURCC read back, the delivered frame shape,
measured fps, CPU-cores burned, and — the part that matters for adoption — whether the frames
are a decodable BGR image or raw bytes. A variant that reports MJPG but hands back a 1xN blob
of JPEG bytes breaks every downstream consumer and is a failure, not a success.

`decode` column:
    bgr HxWx3   normal image (what the codebase expects)
    raw N bytes 1-D buffer — compressed passthrough, needs cv2.imdecode by the caller
    jpeg-ok     that buffer did decode as a JPEG (size shown)
    static      frames are byte-identical / near-zero variance — a dead or frozen stream

Usage
-----
    .venv/Scripts/python.exe scripts/probe_camera_mjpeg.py
    .venv/Scripts/python.exe scripts/probe_camera_mjpeg.py --index 1 --frames 60 --modes 4k,1440p
"""

from __future__ import annotations

import argparse
import sys
import time

import cv2
import numpy as np

MODES = {
    "4k": (3840, 2160),
    "1440p": (2560, 1440),
    "1080p": (1920, 1080),
}

BACKENDS = {"dshow": cv2.CAP_DSHOW, "msmf": cv2.CAP_MSMF}

MJPG = cv2.VideoWriter_fourcc(*"MJPG")


def fourcc_str(value: float) -> str:
    v = int(value)
    s = "".join(chr((v >> (8 * i)) & 0xFF) for i in range(4))
    return "".join(c if c.isprintable() else "?" for c in s) or "?"


# --- open strategies ------------------------------------------------------------------
# Each returns an opened VideoCapture (or None). They differ ONLY in how/when FOURCC,
# resolution and CONVERT_RGB are applied — that is the whole question.

def _open_set_after(index, backend, w, h, convert_rgb=None):
    cap = cv2.VideoCapture(index, backend)
    if not cap.isOpened():
        return None
    if convert_rgb is not None:
        cap.set(cv2.CAP_PROP_CONVERT_RGB, convert_rgb)
    cap.set(cv2.CAP_PROP_FOURCC, MJPG)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
    return cap


def _open_size_first(index, backend, w, h, convert_rgb=None):
    cap = cv2.VideoCapture(index, backend)
    if not cap.isOpened():
        return None
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
    cap.set(cv2.CAP_PROP_FOURCC, MJPG)
    return cap


def _open_params(index, backend, w, h, convert_rgb=None):
    """OpenCV >= 4.5.3: properties applied AT open time, before the graph is built. This is
    the documented way to influence media-type negotiation rather than renegotiate after."""
    params = [
        cv2.CAP_PROP_FOURCC, int(MJPG),
        cv2.CAP_PROP_FRAME_WIDTH, int(w),
        cv2.CAP_PROP_FRAME_HEIGHT, int(h),
    ]
    if convert_rgb is not None:
        params += [cv2.CAP_PROP_CONVERT_RGB, int(convert_rgb)]
    cap = cv2.VideoCapture(index, backend, params)
    return cap if cap.isOpened() else None


def _open_reopen(index, backend, w, h, convert_rgb=None):
    """Set FOURCC, tear the graph down, reopen and set again — the 'driver remembers the
    last negotiated media type' folk remedy."""
    cap = cv2.VideoCapture(index, backend)
    if cap.isOpened():
        cap.set(cv2.CAP_PROP_FOURCC, MJPG)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
        cap.release()
    time.sleep(0.3)
    cap = cv2.VideoCapture(index, backend)
    if not cap.isOpened():
        return None
    cap.set(cv2.CAP_PROP_FOURCC, MJPG)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
    return cap


VARIANTS = [
    # (label, backend, opener, convert_rgb)
    ("set-after (baseline)", "dshow", _open_set_after, None),
    ("open-params", "dshow", _open_params, None),
    ("size-first", "dshow", _open_size_first, None),
    ("reopen", "dshow", _open_reopen, None),
    ("convert_rgb=0", "dshow", _open_set_after, 0),
    ("params+convert_rgb=0", "dshow", _open_params, 0),
    ("set-after (baseline)", "msmf", _open_set_after, None),
    ("open-params", "msmf", _open_params, None),
    ("convert_rgb=0", "msmf", _open_set_after, 0),
    ("params+convert_rgb=0", "msmf", _open_params, 0),
]


def describe_frame(frame) -> str:
    """Classify what read() handed back — a BGR image, or a compressed/raw buffer."""
    if frame is None:
        return "none"
    if frame.ndim == 3 and frame.shape[2] == 3:
        return f"bgr {frame.shape[0]}x{frame.shape[1]}x3"
    flat = frame.reshape(-1)
    head = bytes(flat[:2].tobytes()) if flat.size >= 2 else b""
    if head == b"\xff\xd8":                       # JPEG SOI — compressed passthrough
        img = cv2.imdecode(flat, cv2.IMREAD_COLOR)
        if img is not None:
            return f"jpeg-ok {img.shape[1]}x{img.shape[0]} ({flat.size}B)"
        return f"jpeg-bad ({flat.size}B)"
    return f"raw {flat.size}B shape={tuple(frame.shape)}"


def probe(index: int, backend_name: str, opener, w: int, h: int, convert_rgb, frames: int) -> dict:
    backend = BACKENDS[backend_name]
    try:
        cap = opener(index, backend, w, h, convert_rgb)
    except Exception as exc:                      # noqa: BLE001 — a backend may reject params
        return {"error": f"open raised: {type(exc).__name__}"}
    if cap is None:
        return {"error": "could not open"}
    try:
        for _ in range(8):                        # warm-up: let the graph and AE settle
            cap.read()

        ok, frame = cap.read()
        if not ok or frame is None:
            return {"error": "no frame"}
        shape_desc = describe_frame(frame)
        first = frame.copy()

        t0, c0 = time.perf_counter(), time.process_time()
        got = 0
        last = None
        for _ in range(frames):
            ok2, f = cap.read()
            if ok2 and f is not None:
                got += 1
                last = f
        wall = time.perf_counter() - t0
        cpu = time.process_time() - c0

        # A frozen stream can fake a high fps: check the last frame actually differs.
        moving = True
        if last is not None and last.shape == first.shape:
            moving = float(np.mean(np.abs(last.astype(np.int16) - first.astype(np.int16)))) > 0.05

        return {
            "readback": fourcc_str(cap.get(cv2.CAP_PROP_FOURCC)),
            "desc": shape_desc if moving else shape_desc + " STATIC",
            "fps": got / wall if wall > 0 else 0.0,
            "cores": cpu / wall if wall > 0 else 0.0,
            "got": got,
        }
    finally:
        try:
            cap.release()
        except Exception:                          # noqa: BLE001
            pass


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--index", type=int, default=1, help="camera index (the 4K cam is usually 1)")
    ap.add_argument("--frames", type=int, default=60, help="frames to time per variant")
    ap.add_argument("--modes", default="4k,1440p,1080p", help="comma-separated: 4k,1440p,1080p")
    a = ap.parse_args()

    modes = [m.strip() for m in a.modes.split(",") if m.strip() in MODES]
    print(f"OpenCV {cv2.__version__} — camera index {a.index}, {a.frames} timed frames/variant")
    print("MJPG requested in every variant; 'readback' is what the driver reports back.\n")

    header = (f"{'mode':>7} | {'backend':<5} | {'variant':<21} | {'back':>4} | "
              f"{'delivered':<22} | {'fps':>6} | {'cores':>5}")
    print(header)
    print("-" * len(header))

    for mode in modes:
        w, h = MODES[mode]
        for label, backend_name, opener, convert_rgb in VARIANTS:
            r = probe(a.index, backend_name, opener, w, h, convert_rgb, a.frames)
            if "error" in r:
                print(f"{mode:>7} | {backend_name:<5} | {label:<21} | {'-':>4} | "
                      f"{'ERROR: ' + r['error']:<22} | {'-':>6} | {'-':>5}")
                continue
            print(f"{mode:>7} | {backend_name:<5} | {label:<21} | {r['readback']:>4} | "
                  f"{r['desc']:<22} | {r['fps']:6.1f} | {r['cores']:5.2f}")
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
