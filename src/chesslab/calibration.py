"""Stage 1 — Calibration.

Determines the geometry between camera image and board (homography) once and stores
it as a reusable YAML profile. As long as camera and board remain stationary, the
profile provides the 64 square crops deterministically for each frame.

The core mapping function `square_to_crop_box` lives here centrally (profile-bound) and
is imported by Stage 3 (`labeling.py`). Profile loading/saving and the geometry
are usable and tested headless — the live-camera verbs (`calibrate auto`/`check`) were
removed with `chesslab.camera` (2026-08-20); Kotlin owns the live camera.
"""

from __future__ import annotations

import logging
import math
import os
import shutil
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np
import yaml

from . import config

log = logging.getLogger("chesslab.calibration")

_FILES = "abcdefgh"


# --- Datenmodell ----------------------------------------------------------------------

@dataclass
class CropParams:
    cell: float
    pad_side: float
    out_size: tuple[int, int]  # [W, H]

    def to_dict(self) -> dict:
        return {
            "cell": float(self.cell),
            "pad_side": float(self.pad_side),
            "out_size": [int(self.out_size[0]), int(self.out_size[1])],
        }

    @classmethod
    def from_dict(cls, d: dict) -> CropParams:
        return cls(
            cell=float(d["cell"]),
            pad_side=float(d["pad_side"]),
            out_size=(int(d["out_size"][0]), int(d["out_size"][1])),
        )

    @classmethod
    def default(cls, board_size: int) -> CropParams:
        c = config.CROP
        return cls(
            cell=board_size / 8.0,
            pad_side=c.pad_side,
            out_size=(c.out_w, c.out_h),
        )


@dataclass
class CalibrationProfile:
    profile: str
    camera_index: int
    frame_size: tuple[int, int]          # [W, H] of the source
    board_size: int
    image_corners: list[list[float]]     # clicked points, order a8, h8, h1, a1
    homography: list[list[float]]        # 3x3, row-major
    white_pov: bool
    crop: CropParams
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    # Marker-based (mandatory): calibrate slicing/recording per frame from ArUco markers.
    # image_corners/homography are only the snapshot from calibration (fallback/preview).
    # Per-corner (a8, h8, h1, a1): the markers are glued on by hand, so a re-stick moves each
    # one independently. A single number stays valid input everywhere via `margins4`.
    margin: list[float] = field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0])
    marker_dict: str = "DICT_4X4_50"
    # Multi-cam: optional source (URL/path instead of camera_index) and real intrinsics, so each
    # camera is a self-contained profile.
    source: str | None = None

    def __post_init__(self) -> None:
        # A scalar is still the natural thing to write at a call site ("all four the same"),
        # so normalise here rather than making every caller spell out four values.
        self.margin = margins4(self.margin)

    # -- serialization --
    def to_dict(self) -> dict:
        return {
            "profile": self.profile,
            "created_at": self.created_at,
            "camera_index": int(self.camera_index),
            "frame_size": [int(self.frame_size[0]), int(self.frame_size[1])],
            "board_size": int(self.board_size),
            "image_corners": [[float(x), float(y)] for x, y in self.image_corners],
            "homography": [[float(v) for v in row] for row in self.homography],
            "white_pov": bool(self.white_pov),
            "crop": self.crop.to_dict(),
            # Normalised on the way out as well as in: assigning a scalar to a live profile
            # (`prof.margin = 0.11`) is natural and bypasses `__post_init__`, and every reader
            # already goes through `margins4` — serialization was the one place that did not.
            "margin": margins4(self.margin),
            "marker_dict": self.marker_dict,
            "source": self.source,
        }

    @classmethod
    def from_dict(cls, d: dict) -> CalibrationProfile:
        # Profiles written before 2026-08-21 carry `undistorted`, `lens_calib_id`,
        # `camera_matrix` and `dist_coeffs` — ignored: the optics live in the recording's own
        # `lens.json` now, and a stored copy could only go stale.
        return cls(
            profile=d["profile"],
            created_at=d.get("created_at", ""),
            camera_index=int(d["camera_index"]),
            frame_size=(int(d["frame_size"][0]), int(d["frame_size"][1])),
            board_size=int(d["board_size"]),
            image_corners=[[float(x), float(y)] for x, y in d["image_corners"]],
            homography=[[float(v) for v in row] for row in d["homography"]],
            white_pov=bool(d["white_pov"]),
            crop=CropParams.from_dict(d["crop"]),
            # Old profiles stored one number; broadcast it to the four corners.
            margin=margins4(d.get("margin", 0.0)),
            marker_dict=d.get("marker_dict", "DICT_4X4_50"),
            source=d.get("source"),
        )

    def save(self, path: Path, *, backup: bool = False) -> Path:
        """Persist the profile ATOMICALLY (temp file + `os.replace`).

        A profile is safety-critical geometry (CLAUDE.md: a wrong a8 corner silently
        transposes every label), so a half-written YAML — killed process, full disk — must
        never be observable. `backup=True` additionally keeps the previous content as
        `<name>.yaml.bak`; pass it wherever a profile the USER may have tuned by hand is
        overwritten by an automatic regeneration.
        """
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        if backup and path.exists():
            try:
                shutil.copy2(path, path.with_suffix(path.suffix + ".bak"))
            except OSError as e:
                log.warning("could not back up calibration profile %s: %r", path, e)
        tmp = path.with_suffix(path.suffix + ".tmp")
        try:
            with tmp.open("w", encoding="utf-8") as fh:
                yaml.safe_dump(self.to_dict(), fh, sort_keys=False, allow_unicode=True)
            os.replace(tmp, path)
        finally:
            tmp.unlink(missing_ok=True)
        return path

    @classmethod
    def load(cls, path: Path) -> CalibrationProfile:
        with Path(path).open("r", encoding="utf-8") as fh:
            return cls.from_dict(yaml.safe_load(fh))


def profile_path(name: str) -> Path:
    return config.DATA.calibration / f"{name}.yaml"


def load_profile(name: str) -> CalibrationProfile:
    p = profile_path(name)
    if not p.exists():
        raise FileNotFoundError(f"calibration profile '{name}' not found ({p}).")
    return CalibrationProfile.load(p)


def profile_from_frame(frame, profile: str, *, board_size: int = 1000,
                       margin=config.DEFAULT_MARKER_MARGIN,
                       dict_name: str = "DICT_4X4_50", white_pov: bool = True,
                       camera_index: int = -1) -> CalibrationProfile | None:
    """Build a profile headlessly from a single frame via ArUco markers.

    Returns None if too few markers are visible (at least 2 needed for the
    geometric reconstruction; 4 for full accuracy)."""
    pts = detect_board_markers(frame, dict_name, corner="center")
    res = resolve_board_corners(pts, board_size=board_size)
    if res is None:
        return None
    corners, n_used = res
    _warn_degraded(n_used)
    h, w = frame.shape[:2]
    prof = CalibrationProfile(
        profile=profile,
        camera_index=camera_index,
        frame_size=(w, h),
        board_size=board_size,
        image_corners=corners,
        homography=compute_homography(corners, board_size, margin),
        white_pov=white_pov,
        crop=CropParams.default(board_size),
        margin=margins4(margin),
        marker_dict=dict_name,
    )
    return prof


def ensure_profile(profile: str, source: int | str | None = None, *,
                   save: bool = True, attempts: int = 30,
                   **kwargs) -> CalibrationProfile:
    """Load `profile`; if it does not exist, auto-calibrate it from `source` via ArUco.

    This removes the mandatory separate calibration step: `track`/`collect` can create a
    missing profile from the first frames of their own source, as long as the markers are
    on the board. Raises FileNotFoundError if the profile is missing and no usable source
    or no markers are found.

    A profile whose LENS stamp no longer matches the active lens state (e.g. the user just
    ran `chesslab lens calibrate-board`) is treated like a missing one and regenerated from the
    source — nobody has to re-stamp by hand. If it cannot be regenerated,
    the stale profile is re-stamped in place and used, never crashed on.

    An existing profile is returned as it lies. Until 2026-08-20 it was first tested against
    the active lens and regenerated when the stamp disagreed; profiles carry no lens stamp any
    more, so there is nothing left to disagree.

    `source` is a video file or a frame image — the live-camera path was removed with
    `chesslab.camera` (2026-08-20)."""
    try:
        return load_profile(profile)
    except FileNotFoundError:
        if source is None:
            raise

    gen_kwargs = dict(kwargs)

    src = int(source) if isinstance(source, str) and source.isdigit() else source
    cap = cv2.VideoCapture(src)
    prof: CalibrationProfile | None = None
    try:
        if not cap.isOpened():
            raise FileNotFoundError(
                f"profile '{profile}' missing and source {source!r} could not be opened "
                "for auto-calibration.")
        for _ in range(attempts):
            ok, frame = cap.read()
            if not ok or frame is None:
                continue
            prof = profile_from_frame(frame, profile, camera_index=src if isinstance(src, int) else -1,
                                      **gen_kwargs)
            if prof is not None:
                break
    finally:
        cap.release()
    if prof is None:
        raise FileNotFoundError(
            f"profile '{profile}' missing and auto-calibration from {source!r} found no "
            "ArUco markers — tape the markers to the board (calibrate markers).")
    if save:
        out = profile_path(profile)
        out.parent.mkdir(parents=True, exist_ok=True)
        prof.save(out, backup=True)
        print(f"[OK] profile '{profile}' auto-calibrated from the camera source -> {out}")
    return prof


# --- Pure geometry (headless, tested) ---------------------------------------------

def _square_to_col_row(square: str, white_pov: bool) -> tuple[int, int]:
    """Square 'e4' -> (col, row) in the rectified image. Origin top left.

    file a..h -> col 0..7; rank 8..1 -> row 0..7. Rotated 180° when white_pov=False.
    """
    sq = square.strip().lower()
    if len(sq) != 2 or sq[0] not in _FILES or not sq[1].isdigit():
        raise ValueError(f"invalid square: {square!r}")
    col = _FILES.index(sq[0])
    rank = int(sq[1])
    if not 1 <= rank <= 8:
        raise ValueError(f"invalid rank: {square!r}")
    row = 8 - rank
    if not white_pov:
        col, row = 7 - col, 7 - row
    return col, row


def square_to_crop_box(square: str, profile: CalibrationProfile,
                        clamp: bool = True) -> tuple[int, int, int, int]:
    """'e4' -> (x0, y0, x1, y1) in the rectified board_size image.

    Base cell (cell x cell, square) expanded by pad_side*cell on every side.
    `clamp=True` clips to image boundaries (box may become smaller);
    `clamp=False` returns the raw box — the caller (crop_square) fills protruding
    areas with border padding so the box geometry stays constant across all squares.
    """
    col, row = _square_to_col_row(square, profile.white_pov)
    bs = profile.board_size
    cell = bs / 8.0
    pad_side = profile.crop.pad_side

    # Symmetric in all 4 directions, so the box stays SQUARE: a bit more of the piece is
    # visible instead of being cut off sharply at the square edge. pad_side=0 = exact cell.
    x0 = col * cell - pad_side * cell
    x1 = (col + 1) * cell + pad_side * cell
    y0 = row * cell - pad_side * cell
    y1 = (row + 1) * cell + pad_side * cell

    def fix(v: float) -> int:
        return int(round(max(0.0, min(float(bs), v)) if clamp else v))

    return fix(x0), fix(y0), fix(x1), fix(y1)


#: A grid line steeper than this fraction-per-fraction is a misfit, not a lens; the same for its
#: parabola term. Parity twins: `MESH_TILT_LIMIT`/`MESH_CURV_LIMIT` in CropBox.kt and `warp.ts`.
MESH_TILT_LIMIT = 0.05
MESH_CURV_LIMIT = 0.08

#: 8 cells share 9 boundaries.
GRID_LINES_PER_AXIS = 9


@dataclass(frozen=True)
class GridMesh:
    """One frame's 18 MEASURED grid lines as fractions of the field side (`grid_lines`).

    Per line `pos(t) = x + tx*(t-0.5) + cx*(t-0.5)^2`. Tilts and curvatures come per PAIR or not
    at all, curvature only on top of tilts, so a consumer can never cut half a stage.
    """

    x: list[float]
    y: list[float]
    tx: list[float] | None = None
    ty: list[float] | None = None
    cx: list[float] | None = None
    cy: list[float] | None = None

    @property
    def tilted(self) -> bool:
        return self.tx is not None and self.ty is not None


def _mesh_values(lines: dict, name: str) -> list[float] | None:
    v = lines.get(name)
    if not isinstance(v, list) or len(v) != GRID_LINES_PER_AXIS:
        return None
    if any(isinstance(e, bool) or not isinstance(e, (int, float)) for e in v):
        return None
    return [float(e) for e in v]


def _mesh_axis(lines: dict, name: str) -> list[float] | None:
    v = _mesh_values(lines, name)
    if v is None or not all(math.isfinite(e) for e in v):
        return None
    return v if all(b > a for a, b in zip(v, v[1:], strict=False)) else None


def _mesh_bounded(lines: dict, name: str, limit: float) -> list[float] | None:
    v = _mesh_values(lines, name)
    if v is None or not all(math.isfinite(e) and abs(e) < limit for e in v):
        return None
    return v


def mesh_from_lines(lines) -> GridMesh | None:
    """`grid_lines` -> the strongest stage it carries: curved -> tilted -> scalar -> None.

    Additive by construction: a missing, short or out-of-limit pair costs exactly ONE stage and
    never half an axis, so a bad sidecar cannot take a slice down. Twin: `meshOrNull`
    (LabeledVideoPack.kt).
    """
    if not isinstance(lines, dict):
        return None
    xs, ys = _mesh_axis(lines, "x"), _mesh_axis(lines, "y")
    if xs is None or ys is None:
        return None
    tx = _mesh_bounded(lines, "tx", MESH_TILT_LIMIT)
    ty = _mesh_bounded(lines, "ty", MESH_TILT_LIMIT)
    if tx is None or ty is None:
        return GridMesh(xs, ys)
    cx = _mesh_bounded(lines, "cx", MESH_CURV_LIMIT)
    cy = _mesh_bounded(lines, "cy", MESH_CURV_LIMIT)
    if cx is None or cy is None:
        return GridMesh(xs, ys, tx, ty)
    return GridMesh(xs, ys, tx, ty, cx, cy)


#: How many meshes must carry a term before its median is trusted. Same number, same argument as
#: `sessions._repair_mesh_outliers`.
MESH_POOL_MIN = 3


def pooled_mesh(meshes) -> GridMesh | None:
    """One mesh out of many: per TERM the median over the meshes that carry that term.

    A hand over the grooves moves single lines, and the per-frame mesh it produces can leave the
    board WORSE than no mesh at all (measured 2026-08-21 on 13-52-38: 15.21 px raw against 12.36
    with its own mesh). The camera does not move, so feed this the CLEAN frames and every frame of
    the recording can be straightened by a mesh no hand ever touched.

    Per TERM, not per mesh: a recording mixes curved frames with merely tilted ones, and demanding
    that every mesh carry `cx` drops the one term that takes the bow out.
    """
    have = [m for m in meshes if m is not None]
    if not have:
        return None

    def med(name: str, need: int):
        vals = [getattr(m, name) for m in have if getattr(m, name) is not None]
        return None if len(vals) < need else np.median(np.array(vals), axis=0).tolist()

    tx, ty = med("tx", MESH_POOL_MIN), med("ty", MESH_POOL_MIN)
    xs = np.median(np.array([m.x for m in have]), axis=0).tolist()
    ys = np.median(np.array([m.y for m in have]), axis=0).tolist()
    if tx is None or ty is None:
        return GridMesh(xs, ys)
    cx, cy = med("cx", MESH_POOL_MIN), med("cy", MESH_POOL_MIN)
    return GridMesh(xs, ys, tx, ty, cx, cy) if cx is not None and cy is not None         else GridMesh(xs, ys, tx, ty)


#: A curvature this far off the cross-line trend was measured on pieces, not optics:
#: rg-2026-08-15-22-57-06 carries cy = -0.070 on the pawn-occupied 7/6 line against ±0.011 on its
#: free neighbours — a +11.6 px arch baked into the straightened board (2026-08-21).
CURV_TREND_LIMIT = 0.02


def _trend_replaced(values: list[float]) -> list[float]:
    k = np.arange(GRID_LINES_PER_AXIS, dtype=np.float64)
    v = np.asarray(values, dtype=np.float64)
    slopes = [(v[j] - v[i]) / (j - i) for i in range(GRID_LINES_PER_AXIS)
              for j in range(i + 1, GRID_LINES_PER_AXIS)]
    m = float(np.median(slopes))
    trend = m * k + float(np.median(v - m * k))
    return [float(e) for e in np.where(np.abs(v - trend) > CURV_TREND_LIMIT, trend, v)]


def smooth_mesh_curvature(mesh: GridMesh | None) -> GridMesh | None:
    """Curvature is optics and optics are smooth across parallel lines — a line that breaks out of
    the others' Theil-Sen trend was measured on whatever stood ON it and takes the trend's value
    instead. Board-writing only, on purpose: the cut consumers (`meshOrNull`, warp.ts) stay pinned
    to the parity fixture, and a straightened store never hands them a mesh again.
    """
    if mesh is None or mesh.cx is None or mesh.cy is None:
        return mesh
    return replace(mesh, cx=_trend_replaced(mesh.cx), cy=_trend_replaced(mesh.cy))


#: Simultaneous evaluations per point. Three was measured to leave the residual far inside a pixel
#: at the mesh limits. Parity twin: `CORNER_ITERATIONS` (CropBox.kt).
MESH_POINT_ITERATIONS = 3


def _mesh_line_at(offs, tilts, curvs, k, t):
    """Where line `k` of one axis sits at run `t` along it, in field fractions. Arrays welcome."""
    d = t - 0.5
    curved = 0.0 if curvs is None else np.asarray(curvs)[k] * d * d
    return np.asarray(offs)[k] + np.asarray(tilts)[k] * d + curved


def mesh_point(u, v, mesh: GridMesh):
    """The MEASURED board point belonging to the ideal one at `(u, v)` — field fractions both ways.

    Inside a cell the two bounding lines blend linearly, and the axes are coupled (each line's
    position depends on the run along it), so the pair is solved by simultaneous evaluations
    exactly as a cell corner is. A mesh without tilts is carried as tilt 0 — its measured OFFSETS
    are still a correction, and refusing it would silently drop the scalar stage. Twin: `meshPoint`.
    """
    zero = [0.0] * GRID_LINES_PER_AXIS
    tx, ty = mesh.tx or zero, mesh.ty or zero
    u, v = np.asarray(u, np.float64), np.asarray(v, np.float64)
    cu = np.clip(np.floor(u * 8.0), 0, 7).astype(np.int32)
    cv_ = np.clip(np.floor(v * 8.0), 0, 7).astype(np.int32)
    fu, fv = u * 8.0 - cu, v * 8.0 - cv_
    x, y = u, v
    for _ in range(MESH_POINT_ITERATIONS):
        x = (_mesh_line_at(mesh.x, tx, mesh.cx, cu, y) * (1.0 - fu)
             + _mesh_line_at(mesh.x, tx, mesh.cx, cu + 1, y) * fu)
        y = (_mesh_line_at(mesh.y, ty, mesh.cy, cv_, x) * (1.0 - fv)
             + _mesh_line_at(mesh.y, ty, mesh.cy, cv_ + 1, x) * fv)
    return x, y


def straighten_board(board, mesh: GridMesh, board_size: int, border: int = 0):
    """A bordered board pulled straight GLOBALLY — every pixel read where its own lines say it is.

    This REPLACES the per-cell mesh cut, it does not join it: a board straightened here is cut at
    the nominal eighth afterwards, and straightening twice corrects twice. Twin: `sampleBoxMesh`.

    CUBIC, not LINEAR: the map is a near-identity, and a bilinear resample at half-pixel offsets is
    a low-pass the crop then keeps. Measured 2026-08-21 as Laplacian energy of the finished crop
    against one cut from the raw board — linear -44 %, cubic -22 %, lanczos4 -19 % at the same
    290 ms per 952 px board (the WebP encode beside it costs 72 ms).
    """
    mx, my = _straighten_maps(board.shape[:2], mesh, board_size, border)
    return cv2.remap(board, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def _mesh_key(mesh: GridMesh) -> tuple:
    """Hashable Fassung eines Mesh — die Listen sind es nicht."""
    return tuple(tuple(v) if v is not None else None
                 for v in (mesh.x, mesh.y, mesh.tx, mesh.ty, mesh.cx, mesh.cy))


def _straighten_maps(shape: tuple[int, int], mesh: GridMesh, board_size: int, border: int):
    """Die Remap-Tabellen, gemerkt: sie haengen NUR an Groesse, Mesh, board_size und Rand.

    Gemessen 2026-08-23 auf einem 1312er Brett: der Aufbau kostet 623 ms, der `remap` daneben 14.
    Eine Aufnahme hat EIN Mesh (`composite.median_mesh`, `realgames.meshes_for_boards`), also
    zahlt der Aufbau einmal je Clip statt zweimal je Frame.
    """
    return _straighten_maps_cached(shape, _mesh_key(mesh), board_size, border)


@lru_cache(maxsize=8)
def _straighten_maps_cached(shape: tuple[int, int], key: tuple, board_size: int, border: int):
    h, w = shape
    mesh = GridMesh(*(list(v) if v is not None else None for v in key))
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float64)
    mx, my = mesh_point((xs - border) / board_size, (ys - border) / board_size, mesh)
    return ((mx * board_size + border).astype(np.float32),
            (my * board_size + border).astype(np.float32))


def square_center(square: str, profile: CalibrationProfile) -> tuple[int, int]:
    """Pixel center of the base cell of a square in the rectified board_size image."""
    col, row = _square_to_col_row(square, profile.white_pov)
    cell = profile.board_size / 8.0
    return int((col + 0.5) * cell), int((row + 0.5) * cell)


def crop_border_px(profile: CalibrationProfile) -> int:
    """Border (in pixels) with which the board is warped for the DATA crop, so edge squares
    have content for their pad_side extension. Grows automatically with the pad (at least
    `config.CROP_WARP_BORDER_CELLS`). 0 -> no border (display behavior)."""
    cell = profile.board_size / 8.0
    border_cells = max(config.CROP_WARP_BORDER_CELLS, profile.crop.pad_side)
    return int(round(border_cells * cell))


def margins4(margin) -> list[float]:
    """A scalar or any 4-sequence -> the four per-corner margins (a8, h8, h1, a1).

    One number is the common case (all four markers stuck at the same offset); four is the
    real one, because the markers are glued by hand and a re-stick moves them independently.
    """
    if isinstance(margin, (int, float)):
        return [float(margin)] * 4
    vals = [float(v) for v in margin]
    if len(vals) != 4:
        raise ValueError(f"margin must be a number or 4 values (a8,h8,h1,a1), got {len(vals)}")
    return vals


def compute_homography(image_corners, board_size: int, margin=0.0) -> list[list[float]]:
    """Four image points (a8, h8, h1, a1) -> 3x3 homography to a board_size square.

    `margin` > 0: the image points lie this fraction OUTSIDE the playing field (markers
    at the outer corners). The playing field [0, board_size] is then indented accordingly.
    It is a scalar OR four per-corner values — see `margins4`. Each corner is pushed
    outward along its own diagonal, so a single number reproduces the old square exactly.
    """
    src = np.array(image_corners, dtype=np.float32)
    bs = float(board_size)
    m0, m1, m2, m3 = (v * bs for v in margins4(margin))
    # Target points according to click order a8, h8, h1, a1 (extended outward if margin > 0):
    dst = np.array([[-m0, -m0], [bs + m1, -m1], [bs + m2, bs + m2], [-m3, bs + m3]],
                   dtype=np.float32)
    H = cv2.getPerspectiveTransform(src, dst)
    return H.tolist()


def warp_board(frame, profile: CalibrationProfile):
    H = np.array(profile.homography, dtype=np.float64)
    return cv2.warpPerspective(frame, H, (profile.board_size, profile.board_size))


# --- ArUco auto-corners (markers at a8/h8/h1/a1) -----------------------------------------
# id 0 -> a8, id 1 -> h8, id 2 -> h1, id 3 -> a1 (same order as click calibration).
_ARUCO_LABELS = ("a8", "h8", "h1", "a1")


def _aruco_dictionary(dict_name: str):
    known = getattr(cv2.aruco, dict_name, None)
    if not isinstance(known, int):
        raise ValueError(f"unknown ArUco dictionary '{dict_name}' "
                         f"(e.g. DICT_4X4_50, DICT_5X5_100)")
    return cv2.aruco.getPredefinedDictionary(known)


#: Fenstergrößen (min, max, step), die die Binarisierung des Markers durchprobiert. 13 statt 3 —
#: der Preis ist Rechenzeit je Frame, der Gewinn die Randmarker.
ADAPTIVE_THRESH_WIN = (3, 53, 4)
#: Längste Kante, auf die zum SUCHEN verkleinert wird. Auf 4K gemessen (2026-08-23): voll 135 ms
#: und 10/12 Frames mit allen vier Markern, hier 27 ms und 12/12 — das Verkleinern mittelt die
#: Maserung weg, die dem Dekoder das Bit kippt. Der Eckfehler steigt auf 1,34 px, was der Grid-Fit
#: danach ohnehin korrigiert: ArUco ist die grobe Lage, nicht die Feldecke.
DETECT_LONG_SIDE = 1344


def _detect_marker_quads(frame, dict_name: str, ids: tuple[int, ...]) -> dict[int, np.ndarray]:
    """Raw detection: {id: (4,2) corner array} per found marker (order as from ArUco)."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if frame.ndim == 3 else frame
    scale = min(1.0, DETECT_LONG_SIDE / max(gray.shape[:2]))
    if scale < 1.0:
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    params = cv2.aruco.DetectorParameters()
    params.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX  # more precise corners
    # Ein Randmarker steht auf dünnem Weiß vor dunklem Holz; bei OpenCVs drei Fenstergrößen kippt
    # dort ein Bit und er wird als 17 oder 37 gelesen (2026-08-23: 2/30 Frames gegen 21-25/30).
    params.adaptiveThreshWinSizeMin = ADAPTIVE_THRESH_WIN[0]
    params.adaptiveThreshWinSizeMax = ADAPTIVE_THRESH_WIN[1]
    params.adaptiveThreshWinSizeStep = ADAPTIVE_THRESH_WIN[2]
    detector = cv2.aruco.ArucoDetector(_aruco_dictionary(dict_name), params)
    found_corners, found_ids, _ = detector.detectMarkers(gray)
    if found_ids is None:
        return {}
    return {int(i): c.reshape(4, 2) / scale
            for c, i in zip(found_corners, found_ids.flatten(), strict=False) if int(i) in ids}


def detect_board_markers(frame, dict_name: str = "DICT_4X4_50", ids: tuple[int, ...] = (0, 1, 2, 3),
                         corner: str = "center") -> dict[int, list[float]]:
    """Detects the markers and returns {id: [x,y]} of the FOUND ones (center or inner corner)."""
    quads = _detect_marker_quads(frame, dict_name, ids)
    if not quads:
        return {}
    centroid = np.mean([q.mean(axis=0) for q in quads.values()], axis=0)
    out: dict[int, list[float]] = {}
    for i, quad in quads.items():
        if corner == "inner":
            pt = quad[int(np.argmin(np.linalg.norm(quad - centroid, axis=1)))]
        else:
            pt = quad.mean(axis=0)
        out[i] = [float(pt[0]), float(pt[1])]
    return out


def resolve_board_corners(points_by_id, ids: tuple[int, ...] = (0, 1, 2, 3),
                          board_size: int = 800) -> tuple[list[list[float]], int] | None:
    """Reconstruct the 4 corner points (a8,h8,h1,a1) from 2/3/4 marker points.

    Returns (corners4, n_used) or None when < 2. 4 -> exact perspective,
    3 -> affine (parallelogram), 2 -> similarity (square assumption). This way 2/3 markers suffice.
    """
    bs = float(board_size)
    board = {ids[0]: (0.0, 0.0), ids[1]: (bs, 0.0), ids[2]: (bs, bs), ids[3]: (0.0, bs)}
    have = [i for i in ids if i in points_by_id]
    if len(have) < 2:
        return None
    src = np.array([board[i] for i in have], dtype=np.float64)
    dst = np.array([points_by_id[i] for i in have], dtype=np.float64)
    targets = np.array([[0.0, 0.0], [bs, 0.0], [bs, bs], [0.0, bs]], dtype=np.float64)

    if len(have) == 2:  # similarity (rotation + scaling) exact from 2 points
        vb, vd = src[1] - src[0], dst[1] - dst[0]
        nb = float(np.linalg.norm(vb))
        if nb < 1e-6:
            return None
        s = float(np.linalg.norm(vd)) / nb
        ang = np.arctan2(vd[1], vd[0]) - np.arctan2(vb[1], vb[0])
        c, si = np.cos(ang), np.sin(ang)
        rot = np.array([[c, -si], [si, c]])
        proj = np.array([dst[0] + s * (rot @ (t - src[0])) for t in targets])
    elif len(have) == 3:
        m = cv2.getAffineTransform(src[:3].astype(np.float32), dst[:3].astype(np.float32))
        proj = cv2.transform(targets.astype(np.float32).reshape(-1, 1, 2), m).reshape(-1, 2)
    else:
        h = cv2.getPerspectiveTransform(src[:4].astype(np.float32), dst[:4].astype(np.float32))
        proj = cv2.perspectiveTransform(targets.astype(np.float32).reshape(-1, 1, 2), h).reshape(-1, 2)
    return [[float(x), float(y)] for x, y in proj], len(have)


def detect_board_corners_aruco(frame, dict_name: str = "DICT_4X4_50", ids: tuple[int, ...] = (0, 1, 2, 3),
                               corner: str = "center", min_markers: int = 4) -> list[list[float]] | None:
    """4 corner points (a8,h8,h1,a1) — reconstructs missing markers as long as >= min_markers are present."""
    res = resolve_board_corners(detect_board_markers(frame, dict_name, ids, corner), ids)
    if res is None or res[1] < min_markers:
        return None
    return res[0]


class MarkerTracker:
    """Tracks a smoothed, occlusion/jitter-resilient position per marker.

    Properties (parameters from `config.TRACKER`):
    - **Dead zone**: detected movement <= `move_threshold` -> freeze position (stable box).
    - **Smoothing**: real movement -> EMA with `smooth_alpha` instead of hard snapping.
    - **Outlier / self-correction**: a single-frame jump > `jump_reject_px` is initially
      held; only when the new position stays stable over `jump_confirm_frames` frames is the
      corner updated. This way false detections don't survive, but real movement does.
    - **Aging**: each frame increments the age of every corner; a live detection resets it to 0.
      After `max_held_frames` without visibility a corner is considered `stale` (feedback only, still usable).
    - **Seed**: `seed()` pre-populates corners from a calibration profile (status `seed`), so the
      box stands immediately and perspective-accurately with a fixed camera — a live detection replaces the seed.
    """

    def __init__(self, params: config.TrackerDefaults | None = None) -> None:
        self.p = params or config.TRACKER
        self.pos: dict[int, list[float]] = {}                  # smoothed/held position
        self.age: dict[int, int] = {}                          # frames since last live detection
        self.seeded: set[int] = set()                          # never live-confirmed, only from seed
        self._pending: dict[int, tuple[list[float], int]] = {}  # jump candidate: (position, frames)

    # -- Pre-population from known geometry (e.g. profile) --
    def seed(self, points_by_id: dict[int, list[float]]) -> None:
        for i, q in points_by_id.items():
            if i not in self.pos:
                self.pos[i] = [float(q[0]), float(q[1])]
                self.age[i] = self.p.max_held_frames           # Seed immediately counts as "old"/unconfirmed
                self.seeded.add(int(i))

    def update(self, detected: dict[int, list[float]]) -> dict[int, list[float]]:
        for i in self.pos:                                     # first let all age
            self.age[i] = self.age.get(i, 0) + 1
        for i, q in detected.items():
            p = [float(q[0]), float(q[1])]
            prev = self.pos.get(i)
            if prev is None:                                   # new marker -> adopt directly
                self.pos[i] = p
                self.age[i] = 0
                self.seeded.discard(i)
                self._pending.pop(i, None)
                continue
            d = abs(p[0] - prev[0]) + abs(p[1] - prev[1])      # L1 distance to current position
            if d <= self.p.move_threshold:                     # dead zone -> freeze, but mark live
                self.age[i] = 0
                self.seeded.discard(i)
                self._pending.pop(i, None)
                continue
            if i in self.seeded:                               # first real detection replaces the seed
                self.pos[i] = p                                # -> SNAP instead of EMA-blending (otherwise
                self.age[i] = 0                                #    the corner stays 65% at the seed =
                self.seeded.discard(i)                         #    offset grid, pitfall in
                self._pending.pop(i, None)                     #    marker fallback slicing)
                continue
            # TODO: `i not in self.seeded` ist hier immer wahr — der Zweig oben hat jeden
            # gesaeten Marker schon mit `continue` verlassen. Der Zusatz liest sich wie eine
            # Bedingung und ist keine.
            if d > self.p.jump_reject_px and i not in self.seeded:
                if not self._confirm_jump(i, p):               # not yet confirmed -> keep old position
                    continue
            a = self.p.smooth_alpha                            # real movement -> EMA smoothing
            self.pos[i] = [prev[0] + a * (p[0] - prev[0]), prev[1] + a * (p[1] - prev[1])]
            self.age[i] = 0
            self.seeded.discard(i)
            self._pending.pop(i, None)
        return self.points()

    def _confirm_jump(self, i: int, p: list[float]) -> bool:
        """Only accept a jump when the new position is stable for `jump_confirm_frames` frames."""
        cand, cnt = self._pending.get(i, (None, 0))
        if cand is not None and abs(p[0] - cand[0]) + abs(p[1] - cand[1]) <= self.p.jump_reject_px:
            cnt += 1
        else:
            cnt = 1
        self._pending[i] = (p, cnt)
        return cnt >= self.p.jump_confirm_frames

    # -- Queries --
    def points(self) -> dict[int, list[float]]:
        return {i: list(p) for i, p in self.pos.items()}

    def status(self) -> dict[int, str]:
        out: dict[int, str] = {}
        for i in self.pos:
            if i in self.seeded:
                out[i] = "seed"
            elif self.age.get(i, 0) == 0:
                out[i] = "live"
            elif self.age.get(i, 0) >= self.p.max_held_frames:
                out[i] = "stale"
            else:
                out[i] = "held"
        return out

    def n_held(self) -> int:
        return sum(1 for i in self.pos if i not in self.seeded and self.age.get(i, 0) > 0)

    @property
    def last(self) -> dict[int, list[float]]:
        """Backward compatible: all known corners (live, held, seeded)."""
        return self.points()


def make_tracker(profile: CalibrationProfile | None = None) -> MarkerTracker:
    """Create tracker, seeded from the profile's 4 corner points if available.

    `profile.image_corners` are exactly the 4 marker centers (a8,h8,h1,a1) of the calibration.
    This way the box stands immediately and perspective-accurately with a fixed camera,
    even when fewer than 4 markers are currently visible.
    """
    t = MarkerTracker()
    if profile is not None and profile.image_corners and len(profile.image_corners) >= 4:
        t.seed({i: profile.image_corners[i] for i in range(4)})
    return t


def board_corners_for_frame(frame, profile: CalibrationProfile, tracker: MarkerTracker,
                            min_markers: int | None = None,
                            detect_scale: float = 1.0) -> list[list[float]] | None:
    """The 4 board corners (a8,h8,h1,a1) in **frame pixels** for this frame.

    Updates the tracker once with the current marker detection and resolves the
    corners from it (marker-derived, **before** `margin`). Returns None if fewer than
    `min_markers` corners are known (default `config.TRACKER.default_min_markers`). These exact
    points are written to the log during recording so that `slice` later warps identically.
    """
    if min_markers is None:
        min_markers = config.TRACKER.default_min_markers
    # `detect_scale` < 1: detect on a downscaled frame and scale the points back — ArUco is
    # the most expensive per-frame op (~25 ms at 1080p, ~9 ms at half-res) and the ±1 px
    # rescale error lies inside the MarkerTracker's dead-zone (move_threshold 4 px).
    if detect_scale and detect_scale < 1.0:
        small = cv2.resize(frame, None, fx=detect_scale, fy=detect_scale,
                           interpolation=cv2.INTER_AREA)
        det = detect_board_markers(small, profile.marker_dict, corner="center")
        det = {i: [p[0] / detect_scale, p[1] / detect_scale] for i, p in det.items()}
    else:
        det = detect_board_markers(frame, profile.marker_dict, corner="center")
    tracker.update(det)
    pts = tracker.points()
    if len(pts) < min_markers:
        return None
    # Exactly ONE corner is seed-only (marker never seen live — e.g. clipped at image edge,
    # clip02: a8 0% detection rate)? Then complete it from the three REAL corners as a parallelogram
    # instead of using the seed from a potentially different camera position
    # (the offset seed would otherwise permanently distort a quarter of the warp).
    status = tracker.status()
    seeded = [i for i, s in status.items() if s == "seed"]
    if len(seeded) == 1 and len(pts) >= 4:
        m = seeded[0]
        prev_i, next_i, opp_i = (m - 1) % 4, (m + 1) % 4, (m + 2) % 4
        if all(i in pts for i in (prev_i, next_i, opp_i)):
            pts = dict(pts)
            pts[m] = [pts[prev_i][0] + pts[next_i][0] - pts[opp_i][0],
                      pts[prev_i][1] + pts[next_i][1] - pts[opp_i][1]]
    res = resolve_board_corners(pts, board_size=profile.board_size)
    if res is None:
        return None
    _warn_degraded(res[1])
    return res[0]


#: Marker counts already warned about, so a live tracker at three markers logs once rather than
#: thirty times a second. Reset is not worth a mechanism: the set holds at most three ints.
_DEGRADED_WARNED: set[int] = set()


def _warn_degraded(n_used: int) -> None:
    """Say LOUDLY, once per count, that this quad is a reconstruction and not a measurement.

    `resolve_board_corners` answers from two markers up: four is an exact perspective transform,
    three degrades to `cv2.getAffineTransform` — a PARALLELOGRAM standing in for a perspective view
    of a plane, which cannot be right by construction — and two to a similarity that assumes the
    board is square in the image. None of that failed anywhere, which is the problem: the
    2026-08-02 game ran its whole length on three markers with 27-33 px of square-edge error on a
    100 px cell, and every count downstream looked healthy.

    A warning and not a refusal, because since 2026-08-03 a degraded quad is a usable COARSE seed —
    `alignment.refine_quad` fits the board's own grid on top of it and takes the same footage to
    2.0 px. What must never happen again is it passing silently.
    """
    if n_used >= 4 or n_used in _DEGRADED_WARNED:
        return
    _DEGRADED_WARNED.add(n_used)
    shape = "an affine parallelogram" if n_used == 3 else "a similarity (square-board assumption)"
    log.warning(
        "only %d of 4 ArUco markers resolved — the corner quad is %s, not a measured perspective. "
        "Expect tens of pixels of square-edge error until the board's grid corrects it "
        "(alignment.refine_quad). Check that all four markers are fully inside the frame.",
        n_used, shape)


def warp_from_corners(frame, profile: CalibrationProfile, corners, target_size: int | None = None):
    """Rectify board **borderless** from 4 frame corners (a8,h8,h1,a1) — playing field fills [0, board_size].

    This is the **display warp** (web frontend places its 8×8 overlay exactly on the playing field edge).
    For DATA crop see `warp_board_for_crops` (with border). Pure transformation without
    marker detection; reproduces the same geometry as at recording time.

    If `target_size` is given, the warp destination is target_size×target_size instead of
    board_size×board_size (much cheaper for detection at detect_scale < 1.0).
    """
    sz = target_size if target_size is not None else profile.board_size
    h = np.array(compute_homography(corners, profile.board_size, profile.margin), dtype=np.float64)
    if sz != profile.board_size:
        s = float(sz) / profile.board_size
        h[0] *= s; h[1] *= s
    return cv2.warpPerspective(frame, h, (sz, sz))


@dataclass(frozen=True)
class LensModel:
    """The board-fitted optics: two radial terms about a centre, at the scale they were fitted at.

    `focal` is the scale the straightness fit held FIXED, not an estimate of the optics — carried
    through unchanged because the coefficients mean nothing without it. Written by
    `:desktop undistort` into `lens.json`; the FIT itself stays in Kotlin. Twin: `LensModel`.
    """

    k1: float
    k2: float
    focal: float
    cx: float
    cy: float

    @classmethod
    def from_receipt(cls, receipt: dict | None):
        """A `lens.json` -> the model, or None when the fit was refused or the receipt is older."""
        need = ("k1", "k2", "focal", "cx", "cy")
        if not isinstance(receipt, dict) or any(receipt.get(k) is None for k in need):
            return None
        return cls(*(float(receipt[k]) for k in need))


def distort_points(x, y, lens: LensModel):
    """Ideal image points -> where the raw frame actually put them (Brown, radial only).

    The direction a warp needs: it asks per destination pixel WHERE TO READ, and the file on disk
    still carries the barrel. Arrays welcome.
    """
    u, v = (x - lens.cx) / lens.focal, (y - lens.cy) / lens.focal
    r2 = u * u + v * v
    scale = 1.0 + lens.k1 * r2 + lens.k2 * r2 * r2
    return lens.cx + lens.focal * u * scale, lens.cy + lens.focal * v * scale


def undistort_points(points, lens: LensModel):
    """Raw image points -> where an undistorted frame puts them, in the SAME pixel space (P = K).

    The board quad is detected on the raw frame, so it has to come along before a homography built
    from it can mean anything — without this the corners land right and the content between them
    stays bowed (`Rectify.kt`, 2026-08-10).
    """
    k = np.array([[lens.focal, 0.0, lens.cx], [0.0, lens.focal, lens.cy], [0.0, 0.0, 1.0]])
    d = np.array([lens.k1, lens.k2, 0.0, 0.0, 0.0])
    pts = np.asarray(points, np.float64).reshape(-1, 1, 2)
    return cv2.undistortPoints(pts, k, d, P=k).reshape(-1, 2).tolist()


def _board_to_image(u, v, h_inv, board_size: int):
    """Board fractions -> image pixels, through the inverse of the board homography."""
    bx, by = u * board_size, v * board_size
    d = h_inv[2, 0] * bx + h_inv[2, 1] * by + h_inv[2, 2]
    return ((h_inv[0, 0] * bx + h_inv[0, 1] * by + h_inv[0, 2]) / d,
            (h_inv[1, 0] * bx + h_inv[1, 1] * by + h_inv[1, 2]) / d)


@lru_cache(maxsize=2)
def _crop_mesh_coordinates(board_size: int, pad: int, key: tuple | None):
    """Reuse the session mesh; camera homography and lens remain specific to each frame.

    Keep float64 and the original operation order so remap coordinates do not change.
    Two entries bound retained memory to about 30 MB at the export's 952-pixel size.
    """
    side = board_size + 2 * pad
    ys, xs = np.mgrid[0:side, 0:side].astype(np.float64)
    u, v = (xs - pad) / board_size, (ys - pad) / board_size
    if key is not None:
        mesh = GridMesh(*(list(values) if values is not None else None for values in key))
        u, v = mesh_point(u, v, mesh)
    u.flags.writeable = v.flags.writeable = False
    return u, v


def warp_board_for_crops(frame, profile: CalibrationProfile, corners,
                         mesh: GridMesh | None = None, lens: LensModel | None = None):
    """Rectify board **with border** — the DATA crop warp. Canvas `board_size + 2B` with
    `B = crop_border_px(profile)`, homography translated by B. This way EDGE squares have real
    board/edge content for their pad_side extension (instead of black border at the
    playing field edge); `crop_square` shifts its box accordingly by +B.

    `mesh` and `lens` are COMPOSED into this one map, so the board is straight after a SINGLE
    resample. Warping first and correcting afterwards costs a second one, and that second one is a
    low-pass: the composed path measured +57 % Laplacian energy in the finished crop (2026-08-21).
    `straighten_board` stays for stores that are already warped and have no frame left.

    Order matters: the quad was detected on the RAW frame, so the optics take it along BEFORE the
    homography is built from it, and the map then reads through the barrel still in the file.
    """
    # Kubisch, weil hier BILDDATEN entstehen: bilinear behaelt 63,6 % der Laplace-Energie gegen
    # 92,1 % (`docs/warp-resampling.md`). Der Gitter-Warp bleibt bilinear — er misst, und eine
    # kubische Messung verschob das gefittete Quad um 2,78 px.
    return warp_padded(frame, profile, corners, crop_border_px(profile), mesh, lens,
                       interpolation=cv2.INTER_CUBIC)


def warp_padded(frame, profile: CalibrationProfile, corners, pad: int,
                mesh: GridMesh | None = None, lens: LensModel | None = None,
                interpolation: int = cv2.INTER_LINEAR):
    """The board rectified into a `board_size + 2*pad` canvas — the one warp, two borders use it.

    `warp_board_for_crops` asks for the crop border, `alignment.warp_for_grid` for the wider one
    that makes the outer grid lines measurable. Everything else about the map is identical, and
    that is why it lives in one place.

    [interpolation] steuert NUR den schnellen Zweig; der Mesh-Zweig war immer kubisch. Der
    Crop-Warp bittet um kubisch (Bilddaten), der Gitter-Warp nicht: kubisch gemessen verschob das
    gefittete Quad um 2,78 px (`docs/warp-resampling.md`).
    """
    bs = profile.board_size
    quad = corners if lens is None else undistort_points(corners, lens)
    h = np.array(compute_homography(quad, bs, profile.margin), dtype=np.float64)
    if mesh is None and lens is None:
        t = np.array([[1.0, 0.0, pad], [0.0, 1.0, pad], [0.0, 0.0, 1.0]], dtype=np.float64)
        return cv2.warpPerspective(frame, t @ h, (bs + 2 * pad, bs + 2 * pad), flags=interpolation)
    u, v = _crop_mesh_coordinates(bs, pad, None if mesh is None else _mesh_key(mesh))
    ix, iy = _board_to_image(u, v, np.linalg.inv(h), bs)
    if lens is not None:
        ix, iy = distort_points(ix, iy, lens)
    return cv2.remap(frame, ix.astype(np.float32), iy.astype(np.float32),
                     cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT)


def generate_markers(out_path, dict_name: str = "DICT_4X4_50", ids: tuple[int, ...] = (0, 1, 2, 3),
                     marker_px: int = 300, quiet: int | None = None, gap: int = 70):
    """Printable 2x2 sheet: each marker with white quiet zone in an equally-sized cut box.

    `quiet`: white border around the marker (important for detection). Cut along the thin
    black box → all 4 markers exactly the same size. `gap`: spacing between boxes.
    """
    d = _aruco_dictionary(dict_name)
    out_path = Path(out_path)
    if out_path.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"):
        raise ValueError(f"'{out_path}' has no image suffix cv2 can write (.png, .jpg, .webp)")
    if marker_px < d.markerSize + 2:
        raise ValueError(f"--marker-px {marker_px} is below the {dict_name} grid "
                         f"({d.markerSize} modules plus border)")
    if quiet is None:
        quiet = max(marker_px // 6, 20)
    box = marker_px + 2 * quiet                      # cut edge size (same for all)
    label_h = 46
    cell = box + 2 * gap + label_h
    sheet = np.full((cell * 2, cell * 2, 3), 255, dtype=np.uint8)
    pos = [(0, 0), (0, 1), (1, 1), (1, 0)]           # a8, h8, h1, a1
    for (r, c), mid, lab in zip(pos, ids, _ARUCO_LABELS, strict=False):
        bx0, by0 = c * cell + gap, r * cell + gap    # obere linke Ecke der Schnitt-Box
        marker = cv2.cvtColor(cv2.aruco.generateImageMarker(d, mid, marker_px), cv2.COLOR_GRAY2BGR)
        sheet[by0 + quiet:by0 + quiet + marker_px, bx0 + quiet:bx0 + quiet + marker_px] = marker
        cv2.rectangle(sheet, (bx0, by0), (bx0 + box, by0 + box), (0, 0, 0), 1, cv2.LINE_AA)  # cut line
        cv2.putText(sheet, f"{lab} (id {mid})", (bx0, by0 + box + 34),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2, cv2.LINE_AA)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), sheet)
    return out_path


def calibrate_list() -> int:
    d = config.DATA.calibration
    d.mkdir(parents=True, exist_ok=True)
    profiles = sorted(d.glob("*.yaml"))
    if not profiles:
        print(f"No profiles in {d}.")
        return 0
    print(f"Profiles in {d}:")
    for p in profiles:
        try:
            prof = CalibrationProfile.load(p)
            print(f"  {prof.profile:<12} board_size={prof.board_size} white_pov={prof.white_pov} "
                  f"frame={prof.frame_size[0]}x{prof.frame_size[1]} created={prof.created_at}")
        except Exception as e:  # noqa: BLE001
            print(f"  {p.name:<12} [unreadable: {e!r}]")
    return 0


def field_to_profile(field, profile) -> list[list[float]]:
    """Ein SPIELFELD-Quad in die Profil-Konvention, also nach aussen um `margin` gedehnt.

    `markerless.find_board` liefert die vier Feldecken, `correct_quad` und `alignment_of` rechnen
    dagegen wie die Marker: `margin` ausserhalb des Feldes (`compute_homography`).
    """
    import cv2
    import numpy as np

    bs = profile.board_size
    m = [v * bs for v in margins4(profile.margin)]
    h = cv2.getPerspectiveTransform(
        np.array([[0, 0], [bs, 0], [bs, bs], [0, bs]], np.float32), np.array(field, np.float32))
    box = np.array([[[-m[0], -m[0]], [bs + m[1], -m[1]],
                     [bs + m[2], bs + m[2]], [-m[3], bs + m[3]]]], np.float32)
    return [[float(x), float(y)] for x, y in cv2.perspectiveTransform(box, h)[0]]


def run_markerless(source: str, frame_no: int, profile_name: str, out: str | None) -> int:
    """Das Brett ohne ArUco suchen und das Ergebnis vom Grid-Fit beurteilen lassen."""
    from pathlib import Path

    import cv2

    from .alignment import alignment_of, correct_quad
    from .markerless import find_board

    src = Path(source)
    if not src.exists():
        print(f"[FAIL] {src} gibt es nicht.")
        return 1
    if src.suffix.lower() in {".mp4", ".mov", ".mkv", ".avi"}:
        cap = cv2.VideoCapture(str(src))
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
        ok, frame = cap.read()
        cap.release()
    else:
        frame = cv2.imread(str(src))
        ok = frame is not None
    if not ok:
        print(f"[FAIL] Frame {frame_no} aus {src} nicht lesbar.")
        return 1

    profile = load_profile(profile_name)
    field = find_board(frame)
    if field is None:
        print("[FAIL] kein Brett gefunden.")
        return 1
    quad = field_to_profile(field, profile)
    quad = correct_quad(frame, quad, profile) or quad
    verdict = alignment_of(frame, quad, profile)
    print("Ecken (a8, h8, h1, a1): " + " ".join(f"({x:.1f},{y:.1f})" for x, y in quad))
    print(verdict)
    if out:
        import numpy as np

        vis = frame.copy()
        cv2.polylines(vis, [np.array(quad, np.int32)], True, (0, 255, 0), 3)
        Path(out).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(out, vis)
        print(f"geschrieben: {out}")
    return 0 if verdict.ok else 2
