"""Stufe 7 (Teil 2) — 3D-bewusster Square-Crop (`box3d`).

**Problem:** Die Kamera ist nicht orthografisch (Lochkamera, oft nah/overhead). Eine Homographie
bildet nur die Brett**ebene** (z=0) korrekt ab; eine hohe Figur ragt aus ihrer Zelle und projiziert
ihre Spitze **radial vom Bildmittelpunkt nach außen** — je nach Position in *jede* Richtung. Der
Top-Down-Warp verschmiert hohe Figuren zusätzlich beim Resampling.

**Lösung:** Kamerapose pro Frame aus den 4 Brettecken/Markern (`solvePnP`, planar/IPPE) schätzen,
pro Feld eine **3D-Box** definieren (Zellen-Grundfläche auf z=0, nach oben auf Figurenhöhe
extrudiert) und alle **8 Eckpunkte** in den **scharfen Originalframe** projizieren. Die achsen-
parallele Bounding-Box dieser 8 Punkte ist der Crop — fängt die Figur in jeder Lehnrichtung und
bewahrt das native Detail (kein Warp-Upsampling).

Brettmodell identisch zu `calibration.compute_homography`: Ebene z=0, Spielfeld [0, board_size];
Marker/gespeicherte Ecken (a8,h8,h1,a1) liegen um `margin·board_size` AUSSERHALB. Die (col,row)-
Abbildung inkl. `white_pov`-Flip wird aus `calibration._square_to_col_row` **wiederverwendet**
(eine Quelle der Wahrheit — sonst werden Felder still vertauscht).

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
    """Näherungs-Kameramatrix K aus der Bildgröße: fx=fy=0.5·W/tan(FOV/2), Hauptpunkt = Mitte.

    Grob (keine echte Kalibrierung), aber für einen planaren PnP plausibel. Der Bake-Off misst,
    ob es reicht; echte `cv2.calibrateCamera`-Intrinsics kommen über `profile.camera_matrix` rein.
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
    """3D-Brettpunkte (z=0) für die gespeicherten Ecken/Marker a8,h8,h1,a1 — Reihenfolge & Lage
    identisch zu `compute_homography`s dst (Marker um m=margin·bs nach außen versetzt)."""
    bs = float(board_size)
    m = float(margin) * bs
    return np.array([[-m, -m, 0.0], [bs + m, -m, 0.0], [bs + m, bs + m, 0.0], [-m, bs + m, 0.0]],
                    dtype=np.float64)


def estimate_pose(image_corners, K: np.ndarray, dist: np.ndarray, board_size: int, margin: float
                  ) -> tuple[np.ndarray, np.ndarray] | None:
    """(rvec, tvec) aus den 4 Brettecken (a8,h8,h1,a1, Frame-Pixel) via planarem solvePnP (IPPE).

    Gleiche 4 Punkte, aus denen der Baseline-Warp seine Homographie bildet → fairer A/B
    (Unterschied warp↔box3d = Resample vs 3D-Projektion). Gibt None bei !=4 Punkten / Solve-Fehler.
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
    """Vorzeichen der Extrusion entlang der Brettnormalen: Figuren ragen ZUR Kamera. Bestimmt aus
    der Kameraposition C = -Rᵀt im Brett-Frame: +1, wenn die Kamera auf der +z-Seite steht.

    Löst die IPPE-Pose-Mehrdeutigkeit eindeutig (sonst projizierte man die Box ggf. unter das Brett).
    """
    R, _ = cv2.Rodrigues(rvec)
    C = (-R.T @ tvec).reshape(3)
    return 1.0 if C[2] >= 0 else -1.0


# --- 3D-Box je Feld -------------------------------------------------------------------

def square_box_3d(square: str, board_size: int, white_pov: bool, piece_height_units: float,
                  pad_side_units: float, up: float) -> np.ndarray:
    """8 Eckpunkte (4,3)+(4,3) der extrudierten Zelle: Grundfläche z=0, Deckel z=up·height.

    (col,row) aus `_square_to_col_row` (inkl. white_pov-Flip). `pad_side_units` weitet die
    Grundfläche in der Brettebene je Seite; `up` aus `up_sign` (Richtung zur Kamera)."""
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
    """3D-Brettpunkte -> 2D-Frame-Pixel (N,2)."""
    pts = np.asarray(obj_pts, dtype=np.float64).reshape(-1, 1, 3)
    img, _ = cv2.projectPoints(pts, rvec, tvec, K, dist)
    return img.reshape(-1, 2)


def square_bbox(square: str, K, dist, rvec, tvec, profile, *, piece_height_units: float,
                pad_side_units: float, up: float, frame_wh: tuple[int, int]
                ) -> tuple[int, int, int, int] | None:
    """Achsenparallele Bounding-Box (x0,y0,x1,y1) der 8 projizierten Box-Ecken, auf den Frame
    geklammert. None, wenn die Box vollständig außerhalb / entartet ist."""
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
    """Einen Feld-Crop aus dem **Originalframe** schneiden: 3D-Box projizieren -> BBox -> Region ->
    verzerrungsfreies Letterbox auf out_size. None, wenn die Box nicht auf den Frame fällt (Caller
    fällt dann auf den warp-Crop zurück)."""
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
