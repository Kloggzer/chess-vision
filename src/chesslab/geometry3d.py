"""Stage 7 (Part 2) — 3D-aware square crop (`box3d`).

**Problem:** The camera is not orthographic (pinhole, often close/overhead). A homography
only maps the board **plane** (z=0) correctly; a tall piece protrudes from its cell and projects
its top **radially outward from the image center** — depending on position, in *any* direction.
The top-down warp additionally smears tall pieces during resampling.

**Solution:** Estimate camera pose per frame from the 4 board corners/markers (`solvePnP`, planar/IPPE),
define a **3D box** per square (cell base at z=0, extruded upward to piece height) and
project all **8 corner points** into the **sharp original frame**. The axis-aligned
bounding box of these 8 points is the crop — captures the piece in every lean direction and
preserves the native detail (no warp upsampling).

Board model identical to `calibration.compute_homography`: plane z=0, playing field [0, board_size];
markers/stored corners (a8,h8,h1,a1) lie `margin·board_size` OUTSIDE. The (col,row)
mapping including `white_pov` flip is **reused** from `calibration._square_to_col_row`
(single source of truth — otherwise squares get silently swapped).

Headless, kein torch.
"""

from __future__ import annotations

import cv2
import numpy as np

from . import config
from .calibration import _square_to_col_row
from .imgops import resize_keep_aspect

# --- Intrinsics -----------------------------------------------------------------------

def approx_intrinsics(frame_size: tuple[int, int], fov_deg: float = 60.0) -> np.ndarray:
    """Approximate camera matrix K from image size: fx=fy=0.5·W/tan(FOV/2), principal point = center.

    Rough (no real calibration), but plausible for a planar PnP. The bake-off measures
    whether it suffices; real `cv2.calibrateCamera` intrinsics come via `profile.camera_matrix`.
    """
    w, h = float(frame_size[0]), float(frame_size[1])
    f = 0.5 * w / float(np.tan(np.radians(fov_deg) / 2.0))
    return np.array([[f, 0.0, w / 2.0], [0.0, f, h / 2.0], [0.0, 0.0, 1.0]], dtype=np.float64)


def intrinsics(profile, frame_wh: tuple[int, int], fov_deg: float | None = None
               ) -> tuple[np.ndarray, np.ndarray]:
    """(K, dist) für eine Kamera: echte Intrinsics aus dem Profil falls vorhanden, sonst Näherung
    aus der tatsächlichen Frame-Größe. dist = Profil-Verzeichnung oder 0."""
    if getattr(profile, "camera_matrix", None) is not None:
        K = np.array(profile.camera_matrix, dtype=np.float64)
        dist = np.array(profile.dist_coeffs if profile.dist_coeffs else [0.0] * 5, dtype=np.float64)
        return K, dist
    K = approx_intrinsics(frame_wh, fov_deg if fov_deg is not None else config.EXP_BOX3D_FOV_DEG)
    return K, np.zeros(5, dtype=np.float64)


# --- Pose -----------------------------------------------------------------------------

def board_corner_object_points(board_size: int, margin: float) -> np.ndarray:
    """3D board points (z=0) for the stored corners/markers a8,h8,h1,a1 — order & position
    identical to `compute_homography`'s dst (markers offset outward by m=margin·bs)."""
    bs = float(board_size)
    m = float(margin) * bs
    return np.array([[-m, -m, 0.0], [bs + m, -m, 0.0], [bs + m, bs + m, 0.0], [-m, bs + m, 0.0]],
                    dtype=np.float64)


def estimate_pose(image_corners, K: np.ndarray, dist: np.ndarray, board_size: int, margin: float
                  ) -> tuple[np.ndarray, np.ndarray] | None:
    """(rvec, tvec) from the 4 board corners (a8,h8,h1,a1, frame pixels) via planar solvePnP (IPPE).

    Same 4 points that the baseline warp uses for its homography → fair A/B
    (difference warp↔box3d = resample vs 3D projection). Returns None when !=4 points / solve error.
    """
    img = np.asarray(image_corners, dtype=np.float64).reshape(-1, 2)
    if img.shape[0] != 4:
        return None
    obj = board_corner_object_points(board_size, margin)
    try:
        ok, rvec, tvec = cv2.solvePnP(obj, img, K, dist, flags=cv2.SOLVEPNP_IPPE)
    except cv2.error:
        return None
    if not ok:
        return None
    return rvec, tvec


def up_sign(rvec: np.ndarray, tvec: np.ndarray) -> float:
    """Sign of extrusion along the board normal: pieces protrude TOWARD the camera. Determined from
    the camera position C = -Rᵀt in the board frame: +1 if the camera is on the +z side.

    Resolves the IPPE pose ambiguity uniquely (otherwise the box might be projected below the board).
    """
    R, _ = cv2.Rodrigues(rvec)
    C = (-R.T @ tvec).reshape(3)
    return 1.0 if C[2] >= 0 else -1.0


# --- 3D-Box je Feld -------------------------------------------------------------------

def square_box_3d(square: str, board_size: int, white_pov: bool, piece_height_units: float,
                  pad_side_units: float, up: float) -> np.ndarray:
    """8 corner points (4,3)+(4,3) of the extruded cell: base at z=0, top at z=up·height.

    (col,row) from `_square_to_col_row` (incl. white_pov flip). `pad_side_units` expands the
    base in the board plane per side; `up` from `up_sign` (direction toward camera)."""
    col, row = _square_to_col_row(square, white_pov)
    cell = board_size / 8.0
    ps = float(pad_side_units)
    x0, x1 = col * cell - ps, (col + 1) * cell + ps
    y0, y1 = row * cell - ps, (row + 1) * cell + ps
    z = up * float(piece_height_units)
    base = [(x0, y0, 0.0), (x1, y0, 0.0), (x1, y1, 0.0), (x0, y1, 0.0)]
    top = [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)]
    return np.array(base + top, dtype=np.float64)


def project_points(obj_pts: np.ndarray, K, dist, rvec, tvec) -> np.ndarray:
    """3D board points -> 2D frame pixels (N,2)."""
    pts = np.asarray(obj_pts, dtype=np.float64).reshape(-1, 1, 3)
    img, _ = cv2.projectPoints(pts, rvec, tvec, K, dist)
    return img.reshape(-1, 2)


def square_bbox(square: str, K, dist, rvec, tvec, profile, *, piece_height_units: float,
                pad_side_units: float, up: float, frame_wh: tuple[int, int]
                ) -> tuple[int, int, int, int] | None:
    """Axis-aligned bounding box (x0,y0,x1,y1) of the 8 projected box corners, clamped to the
    frame. None if the box is completely outside / degenerate."""
    box = square_box_3d(square, profile.board_size, profile.white_pov, piece_height_units,
                        pad_side_units, up)
    pj = project_points(box, K, dist, rvec, tvec)
    if not np.all(np.isfinite(pj)):
        return None
    w, h = int(frame_wh[0]), int(frame_wh[1])
    x0 = int(np.floor(max(0.0, pj[:, 0].min())))
    y0 = int(np.floor(max(0.0, pj[:, 1].min())))
    x1 = int(np.ceil(min(float(w), pj[:, 0].max())))
    y1 = int(np.ceil(min(float(h), pj[:, 1].max())))
    if x1 <= x0 or y1 <= y0:
        return None
    return x0, y0, x1, y1


def crop_square_3d(frame_bgr: np.ndarray, square: str, K, dist, rvec, tvec, profile, *,
                   piece_height_units: float, pad_side_units: float, up: float,
                   out_size: tuple[int, int]) -> np.ndarray | None:
    """Cut a square crop from the **original frame**: project 3D box -> bbox -> region ->
    distortion-free letterbox to out_size. None if the box does not fall on the frame (caller
    then falls back to the warp crop)."""
    h, w = frame_bgr.shape[:2]
    bb = square_bbox(square, K, dist, rvec, tvec, profile, piece_height_units=piece_height_units,
                     pad_side_units=pad_side_units, up=up, frame_wh=(w, h))
    if bb is None:
        return None
    x0, y0, x1, y1 = bb
    region = frame_bgr[y0:y1, x0:x1]
    if region.size == 0:
        return None
    return resize_keep_aspect(region, out_size)
