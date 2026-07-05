"""Rectify a top-down board photo into a square texture (runs in uv-env, NOT Blender).

Uses chesslab's calibration module (ArUco detection + homography) to detect the 4
corner markers and warp the playing surface to a clean square PNG for use as the
albedo in render_board_v2.py.

Usage:
    python synth/board_texture.py --image scans/board/IMG_20260702_221301.jpg \\
                                  --out synth_pieces/board_texture.png \\
                                  [--size 1024] [--dict DICT_4X4_50] [--margin 0.04]

The ArUco markers (ids 0,1,2,3 → a8,h8,h1,a1) sit at the outer board corners. The
`margin` parameter (fraction of board_size) accounts for the offset between the
marker positions and the actual 8×8 grid edge. Default 0.04 = ~4% inset.

Detection uses multi-pass: standard ArUco first, then CLAHE-enhanced for shadow
regions. Requires all 4 markers for a clean full-perspective rectification.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np

from chesslab.calibration import (
    _aruco_dictionary,
    compute_homography,
    detect_board_markers,
    resolve_board_corners,
)

ARUCO_IDS = (0, 1, 2, 3)  # a8, h8, h1, a1 (same contract as renderer + labeling)


def _detect_lenient(img, dict_name, ids):
    """Detection with relaxed thresholds for difficult lighting/perspective."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img
    params = cv2.aruco.DetectorParameters()
    params.adaptiveThreshWinSizeMin = 3
    params.adaptiveThreshWinSizeMax = 23
    params.adaptiveThreshConstant = 2
    params.minMarkerPerimeterRate = 0.01
    params.polygonalApproxAccuracyRate = 0.1
    params.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX
    detector = cv2.aruco.ArucoDetector(_aruco_dictionary(dict_name), params)
    found_corners, found_ids, _ = detector.detectMarkers(gray)
    if found_ids is None:
        return {}
    target = set(ids)
    out = {}
    for c, i in zip(found_corners, found_ids.flatten(), strict=False):
        i = int(i)
        if i in target:
            quad = c.reshape(4, 2)
            centroid = [float(quad.mean(axis=0)[0]), float(quad.mean(axis=0)[1])]
            out[i] = centroid
    return out


def _detect_markers_multi_pass(img, dict_name, ids):
    """Try standard, then CLAHE-enhanced, then lenient-CLAHE if < all markers found.

    Returns (points_by_id, label) where label indicates which pass succeeded.
    """
    # Pass 1: standard (same as calibration.detect_board_markers)
    points = detect_board_markers(img, dict_name=dict_name, ids=ids)
    if len(points) == len(ids):
        return points, "standard"

    # Pass 2: CLAHE-enhanced (brightens dark corners)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray_eq = clahe.apply(gray)
    img_eq = cv2.cvtColor(gray_eq, cv2.COLOR_GRAY2BGR) if img.ndim == 3 else gray_eq
    points2 = detect_board_markers(img_eq, dict_name=dict_name, ids=ids)
    if len(points2) == len(ids):
        return points2, "CLAHE"
    best = points2 if len(points2) > len(points) else points

    # Pass 3: lenient params on CLAHE-enhanced image
    points3 = _detect_lenient(img_eq, dict_name, ids)
    if len(points3) == len(ids):
        return points3, "CLAHE+lenient"
    if len(points3) > len(best):
        return points3, f"CLAHE+lenient ({len(points3)}/{len(ids)})"

    return best, f"standard ({len(best)}/{len(ids)})"


def rectify(image_path: str, out_path: str, size: int = 1024,
            dict_name: str = "DICT_4X4_50", margin: float = 0.04) -> Path:
    """Main entry: load image, detect 4 ArUco markers, warp to square texture.

    Returns the output Path on success. Raises SystemExit on failure.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise SystemExit(f"ERROR: cannot read image: {image_path}")
    print(f"[board_texture] loaded {image_path}  shape={img.shape}")

    # 1. Multi-pass marker detection
    points_by_id, how = _detect_markers_multi_pass(img, dict_name, ARUCO_IDS)
    found_ids = sorted(points_by_id.keys())
    print(f"[board_texture] detection={how}  found ids={found_ids}")

    if len(points_by_id) < 3:
        missing = sorted(set(ARUCO_IDS) - set(points_by_id))
        raise SystemExit(
            f"ERROR: only {len(points_by_id)}/4 ArUco markers found (missing ids: {missing}).\n"
            f"  Dict: {dict_name}.  Detection passes tried: standard + CLAHE.\n"
            f"  Ensure all 4 markers (ids 0,1,2,3 → a8,h8,h1,a1) are visible\n"
            f"  and well-lit in the image. Try a different photo or adjust lighting."
        )
    if len(points_by_id) == 3:
        # Bei 3 Markern wird die 4. Ecke als Parallelogramm ergänzt (resolve_board_corners).
        # OK für ein nahezu frontales Foto eines rechteckigen Bretts (leichte Perspektive → minimaler Fehler).
        missing = sorted(set(ARUCO_IDS) - set(points_by_id))
        print(f"[board_texture] WARN: nur 3/4 Marker (fehlt {missing}) — 4. Ecke wird rechnerisch ergänzt.")

    # 2. Resolve board corners in image space (a8, h8, h1, a1)
    res = resolve_board_corners(points_by_id, ids=ARUCO_IDS, board_size=size)
    if res is None:
        raise SystemExit("ERROR: resolve_board_corners returned None")
    image_corners, n_used = res
    print(f"[board_texture] resolved corners (n={n_used} used, full perspective):")
    for label, (x, y) in zip(("a8", "h8", "h1", "a1"), image_corners, strict=False):
        print(f"  {label}: ({x:.1f}, {y:.1f})")

    # 3. Compute homography: marker corners → square texture with playing-surface inset
    H = np.array(compute_homography(image_corners, board_size=size, margin=margin),
                 dtype=np.float64)
    texture = cv2.warpPerspective(img, H, (size, size),
                                  flags=cv2.INTER_LANCZOS4,
                                  borderMode=cv2.BORDER_REPLICATE)

    # 4. Save
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), texture)
    print(f"[board_texture] saved {out}  ({out.stat().st_size} bytes, "
          f"{texture.shape[1]}x{texture.shape[0]})")
    return out


def main():
    ap = argparse.ArgumentParser(description="Rectify board photo -> square texture")
    ap.add_argument("--image", required=True, help="Path to board photo (JPG/PNG)")
    ap.add_argument("--out", required=True, help="Output texture PNG path")
    ap.add_argument("--size", type=int, default=1024, help="Output square size (default: 1024)")
    ap.add_argument("--dict", default="DICT_4X4_50",
                    help="ArUco dictionary (default: DICT_4X4_50)")
    ap.add_argument("--margin", type=float, default=0.04,
                    help="Marker-to-grid inset fraction (default: 0.04)")
    args = ap.parse_args()
    rectify(args.image, args.out, args.size, args.dict, args.margin)


if __name__ == "__main__":
    main()
