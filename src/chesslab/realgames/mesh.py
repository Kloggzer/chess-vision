"""Die 18 Rillen-Linien eines Bretts und das EINE Mesh einer Aufnahme."""

from __future__ import annotations

import math
from itertools import pairwise
from pathlib import Path
from typing import Any

from ..calibration import MESH_CURV_LIMIT, MESH_TILT_LIMIT
from ..work_audit import measure, object_revision

#: Was ein Sensor als Hand im Bild fuehrt: die Rillen benennen Felder, das Gate des Scans nur den
#: Frame. 315 von 1 228 Mesh-Gebern waren so eine Zeile.
HAND_DIRTY_REASONS = ("occluded", "grid-late")


def hand_seen(row: dict) -> bool:
    """Sah irgendein Sensor auf diesem Frame eine Hand? Dann gibt er kein Mesh ab."""
    return bool(row.get("hand_squares")) or row.get("dirty_reason") in HAND_DIRTY_REASONS


def meshes_for_boards(rows: list[dict]) -> dict[int, Any]:
    """{frame index: mesh} — ONE per-line median mesh for the recording, from frames without a hand.

    The camera does not move: back-rank lines scatter 3.8-4.6 px per frame (pieces on the
    grooves), while a real lens bow is constant.
    """
    from ..calibration import mesh_from_lines, pooled_mesh, smooth_mesh_curvature

    clean = [smooth_mesh_curvature(mesh_from_lines(r["grid_lines"]))
             for r in rows if r.get("grid_lines") and not hand_seen(r)]
    session = pooled_mesh([m for m in clean if m is not None])
    return {int(Path(row["frame"]).stem): session for row in rows}


#: `measuredBoardSize` (CalibrationStore.kt): the fit measures at the size the pack warps, so
#: `align_worst_px` is in the pixels the cells are cut in.
BOARD_SIZE_STEP, MIN_BOARD_SIZE, MAX_BOARD_SIZE = 16, 320, 1280


def measured_board_size(quad) -> int:
    """The rectified board size a quad is worth, stepped and clamped like the Kotlin consumer's."""
    import numpy as np

    pts = np.asarray(quad, np.float64)
    longest = float(np.linalg.norm(pts - np.roll(pts, -1, axis=0), axis=1).max())
    stepped = int(round(longest / BOARD_SIZE_STEP)) * BOARD_SIZE_STEP
    return min(max(stepped, MIN_BOARD_SIZE), MAX_BOARD_SIZE)


def field_quad(quad, board_size: int, margin: float) -> list[list[float]]:
    """The PLAYING FIELD's corners for a quad whose points sit `margin` outside it."""
    import numpy as np

    from ..calibration import compute_homography

    bs = float(board_size)
    h = np.array(compute_homography(quad, board_size, margin), np.float64)
    corners = np.array([[0.0, 0.0, 1.0], [bs, 0.0, 1.0], [bs, bs, 1.0], [0.0, bs, 1.0]]).T
    out = np.linalg.inv(h) @ corners
    return [[float(x), float(y)] for x, y in (out[:2] / out[2]).T]


def _field_profile(quad, frame_size, board_size: int):
    """Margin 0: `quad` already IS the playing field. Never saved, only measured through."""
    from ..calibration import CalibrationProfile, CropParams, compute_homography

    return CalibrationProfile(
        profile="__stored-fit__", camera_index=-1,
        frame_size=(int(frame_size[0]), int(frame_size[1])), board_size=board_size,
        image_corners=quad, homography=compute_homography(quad, board_size, 0.0),
        white_pov=True, crop=CropParams.default(board_size), margin=0.0, source="stored-fit",
    )


#: The limits live in `calibration.py` because the CONSUMERS read them. Real outer lines reach c =
#: 0.046 (~10 px at 928), so 0.08 leaves headroom; bigger is a shadow, not a lens.


def _mesh_axis(values: list[float]) -> bool:
    """Finite and strictly increasing: a NaN in the JSON breaks both consumer parsers."""
    return (all(math.isfinite(v) for v in values)
            and all(b > a for a, b in pairwise(values)))


def _mesh_tilts(values: list[float], limit: float = MESH_TILT_LIMIT) -> bool:
    return all(math.isfinite(v) and abs(v) < limit for v in values)


def _curved_axes(lines, curls, pad: int, board_size: int) -> dict | None:
    """The curvature pair, ALL-or-nothing, or None. `d` folds into the offset so `x` stays the
    parabola's centre position; a refused pair leaves the linear stage untouched.
    """
    if any(c is None for axis in curls for c in axis):
        return None
    fold = [[round((lines[a][k][1] + curls[a][k][0] - pad) / board_size, 5) for k in range(9)]
            for a in (0, 1)]
    curv = [[round(curls[a][k][1] / board_size, 5) for k in range(9)] for a in (0, 1)]
    ok = (_mesh_axis(fold[0]) and _mesh_axis(fold[1])
          and _mesh_tilts(curv[0], MESH_CURV_LIMIT) and _mesh_tilts(curv[1], MESH_CURV_LIMIT))
    return {"x": fold[0], "y": fold[1], "cx": curv[0], "cy": curv[1]} if ok else None


def grid_line_fracs(image, quad, board_size: int, profile=None, lens=None) -> dict | None:
    quad_key = tuple(round(float(v), 4) for point in quad for v in point)
    key = (object_revision(image), tuple(image.shape), quad_key, int(board_size),
           getattr(profile, "profile", None), id(lens) if lens is not None else None)
    with measure("grid sweeps", key, processed_bytes=getattr(image, "nbytes", 0)):
        return _grid_line_fracs(image, quad, board_size, profile=profile, lens=lens)


def _grid_line_fracs(image, quad, board_size: int, profile=None, lens=None) -> dict | None:
    """The 18 measured lines as field fractions (offset, tilt, `cx`/`cy`), or None unless ALL are
    located.

    `profile`: measure through ITS margin — margin 0 would describe a board the slice never
    warps."""
    from ..alignment import grid_lines_with_curvature, warp_for_grid

    if profile is None:
        profile = _field_profile(quad, (image.shape[1], image.shape[0]), board_size)
    warped, pad = warp_for_grid(image, profile, quad, lens=lens)
    lines, curls = grid_lines_with_curvature(warped, board_size, pad=pad)
    if any(line is None for axis in lines for line in axis):
        return None
    xs = [round((lines[0][k][1] - pad) / board_size, 5) for k in range(9)]
    ys = [round((lines[1][k][1] - pad) / board_size, 5) for k in range(9)]
    txs = [round(lines[0][k][0], 5) for k in range(9)]
    tys = [round(lines[1][k][0], 5) for k in range(9)]
    if not (_mesh_axis(xs) and _mesh_axis(ys) and _mesh_tilts(txs) and _mesh_tilts(tys)):
        return None
    mesh = {"x": xs, "y": ys, "tx": txs, "ty": tys}
    curved = _curved_axes(lines, curls, pad, board_size)
    if curved is not None:
        mesh.update(curved)
    return mesh
