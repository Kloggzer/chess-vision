"""Ground truth: what media types does the camera ACTUALLY advertise, and is MSMF's
1440p60 real detail or an upscale?

Two questions the fps tables can't settle:

1. `probe_camera_mjpeg.py` shows MJPG engaging on DSHOW at 4K yet still only ~21 fps with
   ~1.1 CPU cores. That is either our JPEG decode saturating a core, or the device simply
   not offering 4K MJPEG above ~20-30 fps. Only the device's own capability list decides
   this. DirectShow exposes it via `IAMStreamConfig::GetStreamCaps`, which `pygrabber`
   wraps — so we ask the camera instead of guessing.

2. MSMF delivers 2560x1440 at ~60 fps no matter which resolution is requested. A known
   Windows trap is MSMF handing back an UPSCALED lower-resolution stream at the nominal
   size, which would look like a win and quietly cost real detail. We compare high-frequency
   energy (variance of the Laplacian, plus a downscale-upscale residual) against the DSHOW
   1440p frame of the same scene. An upscaled stream has markedly less high-frequency
   energy and a much smaller residual.

pygrabber is NOT a project dependency — install it somewhere disposable and point this
script at it, so the venv stays clean:

    uv pip install --python .venv/Scripts/python.exe --target %TEMP%/pgrab pygrabber
    .venv/Scripts/python.exe scripts/probe_camera_formats_list.py --pygrabber %TEMP%/pgrab

Without `--pygrabber` the format listing is skipped and only the sharpness check runs.
"""

from __future__ import annotations

import argparse
import os
import sys

import cv2
import numpy as np


def list_formats(pygrabber_path: str | None, index: int) -> None:
    """Print every media type the DirectShow capture pin advertises (subtype, size, fps)."""
    if pygrabber_path:
        # Append, never prepend: the temp dir must not shadow the venv's numpy/cv2.
        sys.path.append(pygrabber_path)
    try:
        from pygrabber.dshow_graph import FilterGraph
    except ImportError as exc:
        print(f"(pygrabber unavailable: {exc} — skipping the format listing)\n")
        return

    graph = FilterGraph()
    devices = graph.get_input_devices()
    print("DirectShow devices:")
    for i, name in enumerate(devices):
        print(f"  [{i}] {name}")
    if index >= len(devices):
        print(f"\nindex {index} out of range — nothing to list\n")
        return

    print(f"\n=== advertised media types of [{index}] {devices[index]} ===")
    graph.add_video_input_device(index)
    try:
        formats = graph.get_input_device().get_formats()
    finally:
        try:
            graph.remove_filters()
        except Exception:                                    # noqa: BLE001
            pass

    # Group by subtype so "does 4K MJPEG do 60?" is answerable at a glance.
    by_type: dict[str, list] = {}
    for f in formats:
        by_type.setdefault(str(f.get("media_type_str", "?")), []).append(f)

    for subtype, entries in sorted(by_type.items()):
        print(f"\n  -- {subtype} --")
        entries.sort(key=lambda e: (-int(e.get("width", 0)), -int(e.get("height", 0))))
        for e in entries:
            w, h = e.get("width"), e.get("height")
            lo, hi = e.get("min_framerate"), e.get("max_framerate")
            print(f"     {w:>5}x{h:<5}  fps {lo}..{hi}   (index {e.get('index')})")
    print()


def sharpness(frame) -> tuple[float, float]:
    """(Laplacian variance, downscale-upscale residual) — two independent proxies for real
    optical detail. A stream upscaled from a lower resolution scores low on both."""
    g = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if frame.ndim == 3 else frame
    lap = float(cv2.Laplacian(g, cv2.CV_64F).var())
    h, w = g.shape[:2]
    small = cv2.resize(g, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    back = cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)
    resid = float(np.mean(np.abs(g.astype(np.int16) - back.astype(np.int16))))
    return lap, resid


def grab_one(backend, w: int, h: int, index: int, use_params: bool):
    if use_params:
        cap = cv2.VideoCapture(index, backend, [
            cv2.CAP_PROP_FOURCC, int(cv2.VideoWriter_fourcc(*"MJPG")),
            cv2.CAP_PROP_FRAME_WIDTH, int(w),
            cv2.CAP_PROP_FRAME_HEIGHT, int(h),
        ])
    else:
        cap = cv2.VideoCapture(index, backend)
        if cap.isOpened():
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
    if not cap.isOpened():
        return None, 0
    try:
        for _ in range(15):                                  # let AE/AWB settle before judging
            cap.read()
        ok, frame = cap.read()
        raw = int(cap.get(cv2.CAP_PROP_FOURCC))
        return (frame if ok else None), raw
    finally:
        cap.release()


def compare_sharpness(index: int) -> None:
    print("=== is MSMF's 1440p real detail, or upscaled? (same scene, back to back) ===")
    print("    higher lap-var / residual = more genuine high-frequency detail\n")
    print(f"{'path':<34} | {'delivered':>11} | {'fourcc':>10} | {'lap-var':>9} | {'residual':>8}")
    cases = [
        ("DSHOW 1440p MJPG (params)", cv2.CAP_DSHOW, 2560, 1440, True),
        ("MSMF  1440p (set-after)", cv2.CAP_MSMF, 2560, 1440, False),
        ("DSHOW 1080p MJPG (params)", cv2.CAP_DSHOW, 1920, 1080, True),
    ]
    for label, backend, w, h, params in cases:
        frame, raw = grab_one(backend, w, h, index, params)
        if frame is None:
            print(f"{label:<34} | {'no frame':>11}")
            continue
        lap, resid = sharpness(frame)
        size = f"{frame.shape[1]}x{frame.shape[0]}"
        cc = "".join(chr((raw >> (8 * i)) & 0xFF) for i in range(4))
        cc = "".join(c if c.isprintable() else "." for c in cc)
        print(f"{label:<34} | {size:>11} | {cc!r:>10} | {lap:9.1f} | {resid:8.2f}")
    print()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--index", type=int, default=1)
    ap.add_argument("--pygrabber", default=os.environ.get("PYGRABBER_PATH"),
                    help="directory pygrabber was installed into (keeps the venv clean)")
    a = ap.parse_args()
    list_formats(a.pygrabber, a.index)
    compare_sharpness(a.index)
    return 0


if __name__ == "__main__":
    sys.exit(main())
