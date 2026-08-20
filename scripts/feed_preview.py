"""Quick test: grab a frame from any source and split into 8x8 squares.

Preview of stage 1/3 — NOT a replacement for the real pipeline. The purpose is to
test a camera/feed source and the board viewing angle on a live image before calibrating.

Two modes:
  * without --profile : naive, uniform 8x8 grid over a square region.
                      Fast, but NOT perspective-correct (that's what stage 1 is for).
  * with  --profile : real rectification + crop via calibration/labeling (perspective-correct).

Source (--source):
  * Integer  -> camera index   (USB webcam:  --source 0)
  * http(s)  -> stream URL     (IP webcam:   --source http://192.168.x.x:8080/video)
  * Filepath -> still image or video file

Examples:
  python scripts/feed_preview.py --source 0
  python scripts/feed_preview.py --source http://192.168.1.50:8080/video --region 300,80,720,720
  python scripts/feed_preview.py --source bild.png --out data/_preview
"""

from __future__ import annotations

import argparse
import ssl
import sys
import urllib.request
from pathlib import Path

import cv2
import numpy as np

_FILES = "abcdefgh"
_IMG_EXT = {".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tif", ".tiff"}


def _grab_http_jpeg(url: str, max_bytes: int = 32_000_000) -> np.ndarray:
    """Grab a JPEG frame from an http(s) URL — accept self-signed TLS.

    Works for snapshot endpoints (single JPEG) AND MJPEG streams
    ('multipart/x-mixed-replace'): it reads until the first complete JPEG (FFD8..FFD9).
    Bypasses cv2.VideoCapture which fails on self-signed certificates.
    """
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    buf = b""
    with urllib.request.urlopen(url, timeout=10, context=ctx) as resp:
        while len(buf) < max_bytes:
            chunk = resp.read(65536)
            if not chunk:
                break
            buf += chunk
            start = buf.find(b"\xff\xd8")            # JPEG SOI
            if start != -1:
                end = buf.find(b"\xff\xd9", start)   # JPEG EOI
                if end != -1:
                    buf = buf[start:end + 2]
                    break
    img = cv2.imdecode(np.frombuffer(buf, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError(f"No decodable JPEG from {url!r} (check endpoint/stream).")
    return img


def grab_frame(source: str, warmup: int = 5, timeout_reads: int = 30) -> np.ndarray:
    """Grab a single frame from index/URL/file. Raises on failure."""
    if source.startswith(("http://", "https://")):
        return _grab_http_jpeg(source)

    p = Path(source)
    if p.suffix.lower() in _IMG_EXT and p.exists():
        img = cv2.imread(str(p))
        if img is None:
            raise RuntimeError(f"Still image not readable: {source}")
        return img

    cap = cv2.VideoCapture(int(source)) if source.isdigit() else cv2.VideoCapture(source)
    if not cap.isOpened():
        raise RuntimeError(
            f"Cannot open source: {source!r}. "
            "Provide USB webcam index, IP webcam URL, or image/video path."
        )
    try:
        for _ in range(warmup):          # let auto exposure/buffer settle
            cap.read()
        frame = None
        for _ in range(timeout_reads):   # first real frame may be delayed
            ok, frame = cap.read()
            if ok and frame is not None:
                return frame
        raise RuntimeError(f"No frame read from {source!r} (stream empty?).")
    finally:
        cap.release()


def square_region(w: int, h: int) -> tuple[int, int, int, int]:
    """Largest centered square in the frame -> (x, y, side, side)."""
    side = min(w, h)
    return (w - side) // 2, (h - side) // 2, side, side


def square_name(col: int, row: int) -> str:
    """Grid cell (col 0..7 left->right, row 0..7 top->bottom) -> a1..h8.

    Assumption: top-left corner = a8 (chesslab convention; the real
    a8 corner is fixed during calibration). Naive mode only guesses it —
    so it's only for eyeball testing.
    """
    return f"{_FILES[col]}{8 - row}"


def slice_naive(frame: np.ndarray, region: tuple[int, int, int, int],
                out_size: tuple[int, int]) -> tuple[dict[str, np.ndarray], np.ndarray]:
    """Split region into 8x8 equal cells. Returns {square: crop} + overlay image."""
    x, y, w, h = region
    overlay = frame.copy()
    crops: dict[str, np.ndarray] = {}
    for row in range(8):
        for col in range(8):
            x0 = x + round(col * w / 8)
            x1 = x + round((col + 1) * w / 8)
            y0 = y + round(row * h / 8)
            y1 = y + round((row + 1) * h / 8)
            cell = frame[y0:y1, x0:x1]
            if cell.size:
                crops[square_name(col, row)] = cv2.resize(cell, out_size,
                                                          interpolation=cv2.INTER_AREA)
            cv2.rectangle(overlay, (x0, y0), (x1, y1), (0, 255, 0), 1)
    cv2.rectangle(overlay, (x, y), (x + w, y + h), (0, 200, 255), 2)
    cv2.putText(overlay, "a8", (x + 3, y + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                (0, 200, 255), 2, cv2.LINE_AA)
    cv2.putText(overlay, "h1", (x + w - 36, y + h - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                (0, 200, 255), 2, cv2.LINE_AA)
    return crops, overlay


def slice_calibrated(frame: np.ndarray, profile_name: str,
                     out_size: tuple[int, int]) -> dict[str, np.ndarray]:
    """Real pipeline: rectify frame and crop each square perspective-correctly.

    Detects markers FRESHLY in the frame and rectifies directly via `warp_from_corners` —
    the same path as capture (corners from log) and calibration check. NOT
    via `warp_board_markers`+tracker: its seed from `image_corners` (already resolved
    corners) would be resolved a second time and EMA-blended -> offset geometry.
    """
    # Lazy import so naive mode works without the chesslab package installed.
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
    from chesslab.calibration import (
        detect_board_markers,
        load_profile,
        resolve_board_corners,
        warp_from_corners,
    )
    from chesslab.labeling import all_squares, crop_square

    prof = load_profile(profile_name)
    pts = detect_board_markers(frame, prof.marker_dict, corner="center")
    res = resolve_board_corners(pts, board_size=prof.board_size)
    if res is None:
        raise RuntimeError(f"too few markers detected ({len(pts)}/4) — check profile/view.")
    warped = warp_from_corners(frame, prof, res[0])
    return {sq: crop_square(warped, sq, prof, out_size) for sq in all_squares()}


def montage(crops: dict[str, np.ndarray], out_size: tuple[int, int]) -> np.ndarray:
    """8x8 contact sheet of crops (a8 top-left ... h1 bottom-right)."""
    w, h = out_size
    board = np.zeros((h * 8, w * 8, 3), dtype=np.uint8)
    for row in range(8):
        for col in range(8):
            sq = square_name(col, row)
            if sq in crops:
                board[row * h:(row + 1) * h, col * w:(col + 1) * w] = crops[sq]
    return board


def main() -> int:
    ap = argparse.ArgumentParser(description="Grab a feed frame and split into 8x8 squares.")
    ap.add_argument("--source", required=True,
                    help="Camera index (e.g. 0), IP webcam URL, or image/video path.")
    ap.add_argument("--region", default=None,
                    help="x,y,w,h of the board region (naive). Default: centered square.")
    ap.add_argument("--profile", default=None,
                    help="Calibration profile name -> real rectification instead of naive grid.")
    ap.add_argument("--out", default="data/_preview", help="Output directory.")
    ap.add_argument("--out-size", default="128x128", help="Crop size WxH (default 128x128).")
    ap.add_argument("--no-crops", action="store_true", help="Only overlay/montage, no 64 individual images.")
    args = ap.parse_args()

    ow, oh = (int(v) for v in args.out_size.lower().split("x"))
    out_size = (ow, oh)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        frame = grab_frame(args.source)
    except Exception as e:  # noqa: BLE001
        print(f"[FAIL] {e}")
        return 1
    h, w = frame.shape[:2]
    print(f"[OK] Frame {w}x{h} from {args.source!r}.")
    cv2.imwrite(str(out_dir / "frame.png"), frame)

    if args.profile:
        try:
            crops = slice_calibrated(frame, args.profile, out_size)
            print(f"[OK] calibrated crop via profile {args.profile!r} ({len(crops)} squares).")
        except Exception as e:  # noqa: BLE001
            print(f"[FAIL] Calibrated slicing: {e}")
            return 1
    else:
        if args.region:
            region = tuple(int(v) for v in args.region.split(","))
        else:
            region = square_region(w, h)
        crops, overlay = slice_naive(frame, region, out_size)
        cv2.imwrite(str(out_dir / "overlay.png"), overlay)
        print(f"[OK] naive 8x8 grid over region {region} -> {len(crops)} squares. "
              f"(Overlay: {out_dir / 'overlay.png'})")

    cv2.imwrite(str(out_dir / "montage.png"), montage(crops, out_size))
    if not args.no_crops:
        cells_dir = out_dir / "cells"
        cells_dir.mkdir(exist_ok=True)
        for sq, crop in crops.items():
            cv2.imwrite(str(cells_dir / f"{sq}.png"), crop)
        print(f"[OK] {len(crops)} individual crops -> {cells_dir}")
    print(f"[OK] Montage -> {out_dir / 'montage.png'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
