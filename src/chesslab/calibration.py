"""Stage 1 — Calibration.

Determines the geometry between camera image and board (homography) once and stores
it as a reusable YAML profile. As long as camera and board remain stationary, the
profile provides the 64 square crops deterministically for each frame.

The core mapping function `square_to_crop_box` lives here centrally (profile-bound) and
is imported by Stage 3 (`labeling.py`). Profile loading/saving and the geometry
are usable and tested headless (without camera/GUI); only `calibrate auto`/`check` need
camera + display.
"""

from __future__ import annotations

import logging
import os
import shutil
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

import cv2
import numpy as np
import yaml

from . import config
from .camera import open_camera

log = logging.getLogger("chesslab.calibration")

_FILES = "abcdefgh"


# --- Datenmodell ----------------------------------------------------------------------

@dataclass
class CropParams:
    cell: float
    pad_up: float
    pad_side: float
    out_size: tuple[int, int]  # [W, H], H > W

    def to_dict(self) -> dict:
        return {
            "cell": float(self.cell),
            "pad_up": float(self.pad_up),
            "pad_side": float(self.pad_side),
            "out_size": [int(self.out_size[0]), int(self.out_size[1])],
        }

    @classmethod
    def from_dict(cls, d: dict) -> CropParams:
        return cls(
            cell=float(d["cell"]),
            pad_up=float(d["pad_up"]),
            pad_side=float(d["pad_side"]),
            out_size=(int(d["out_size"][0]), int(d["out_size"][1])),
        )

    @classmethod
    def default(cls, board_size: int) -> CropParams:
        c = config.CROP
        return cls(
            cell=board_size / 8.0,
            pad_up=c.pad_up,
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
    # Multi-cam: optional source (URL/path instead of camera_index) and real intrinsics. If missing,
    # geometry3d uses an approximation from frame_size. This way each camera is a self-contained profile.
    source: str | None = None
    camera_matrix: list[list[float]] | None = None
    dist_coeffs: list[float] | None = None
    # Lens state this profile was made under (see chesslab/lens.py). On UNDISTORTED frames
    # the correct intrinsics above are the NEW optimal camera matrix and ZERO distortion —
    # a profile still carrying the raw-lens K/D would make solvePnP/box3d compensate the
    # distortion a SECOND time. `lens_calib_id` pins WHICH lens calibration that was.
    # Defaults keep old YAML (written before undistortion existed) loadable as raw frames.
    undistorted: bool = False
    lens_calib_id: str | None = None

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
            "camera_matrix": (None if self.camera_matrix is None
                              else [[float(v) for v in row] for row in self.camera_matrix]),
            "dist_coeffs": (None if self.dist_coeffs is None else [float(v) for v in self.dist_coeffs]),
            "undistorted": bool(self.undistorted),
            "lens_calib_id": self.lens_calib_id,
        }

    @classmethod
    def from_dict(cls, d: dict) -> CalibrationProfile:
        cm = d.get("camera_matrix")
        dc = d.get("dist_coeffs")
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
            camera_matrix=(None if cm is None else [[float(v) for v in row] for row in cm]),
            dist_coeffs=(None if dc is None else [float(v) for v in dc]),
            undistorted=bool(d.get("undistorted", False)),
            lens_calib_id=d.get("lens_calib_id"),
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
    # Stamp the lens state AND the intrinsics that match it: on undistorted frames the
    # correct values are the new optimal camera matrix + zero distortion, never the raw
    # lens K/D (that would compensate the distortion twice in geometry3d/box3d PnP).
    # camera_index -1 = "not from a live local camera" (recorded frame / URL) — route it
    # through the non-index branch of the source policy so it is NOT marked undistorted.
    from . import lens
    lens.stamp_profile(prof, frame_size=(w, h),
                       source=camera_index if camera_index >= 0 else "offline")
    return prof


def ensure_profile(profile: str, source: int | str | None = None, *,
                   save: bool = True, attempts: int = 30, camera_mode: str | None = None,
                   **kwargs) -> CalibrationProfile:
    """Load `profile`; if it does not exist, auto-calibrate it from `source` via ArUco.

    This removes the mandatory separate calibration step: `track`/`collect` can create a
    missing profile from the first frames of their own camera source, as long as the
    markers are on the board. `calibrate auto` stays available for interactive margin
    tuning. Raises FileNotFoundError if the profile is missing and no usable source or
    no markers are found.

    A profile whose LENS stamp no longer matches the active lens state (e.g. the user just
    ran `chesslab lens calibrate`) is treated like a missing one and regenerated from the
    source — nobody has to re-run `calibrate auto` by hand. If it cannot be regenerated,
    the stale profile is re-stamped in place and used, never crashed on.

    Regenerating a STALE profile only replaces what is actually measured — the pixel
    corners, the homography and the lens stamp. Everything the user configured
    (`board_size`, `margin`, `marker_dict`, `white_pov`, `crop`) is CARRIED OVER, because
    only the lens changed, not the board. Silently falling back to the defaults here would
    reset a hand-set `white_pov: false` and transpose every label of the next session.
    Explicit caller kwargs still win over the carried-over values.

    `camera_mode` is a named capture mode (`config.CAMERA_MODES`): auto-calibration then
    opens the source at THAT resolution, so the recorded pixel corners + `frame_size` match
    the mode the caller is about to run at."""
    from . import lens

    stale_prof: CalibrationProfile | None = None
    try:
        prof0 = load_profile(profile)
        is_stale, why = lens.profile_is_stale(prof0, source)
        if not is_stale:
            return prof0
        print(f"[WARN] calibration profile '{profile}' is stale: {why} — regenerating from "
              f"{source!r}.")
        stale_prof = prof0
        if source is None:
            lens.stamp_profile(stale_prof, source=source)
            if save:                # persist — otherwise every process re-warns + re-stamps
                stale_prof.save(profile_path(profile), backup=True)
            return stale_prof
    except FileNotFoundError:
        if source is None:
            raise

    # Carry the stale profile's own geometry settings into the regeneration (see docstring);
    # `setdefault` keeps an explicit caller kwarg authoritative.
    gen_kwargs = dict(kwargs)
    if stale_prof is not None:
        gen_kwargs.setdefault("board_size", stale_prof.board_size)
        gen_kwargs.setdefault("margin", stale_prof.margin)
        gen_kwargs.setdefault("dict_name", stale_prof.marker_dict)
        gen_kwargs.setdefault("white_pov", stale_prof.white_pov)

    src = int(source) if isinstance(source, str) and source.isdigit() else source
    if camera_mode:
        from .camera import spec_for_mode
        cap = open_camera(src, spec=spec_for_mode(camera_mode, source=src))
    else:
        cap = open_camera(src)
    prof: CalibrationProfile | None = None
    try:
        if not cap.isOpened():
            if stale_prof is not None:      # keep working: re-stamp instead of crashing
                lens.stamp_profile(stale_prof, source=source)
                if save:
                    stale_prof.save(profile_path(profile), backup=True)
                return stale_prof
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
        if stale_prof is not None:          # no markers right now — re-stamp and carry on
            print(f"[WARN] could not regenerate '{profile}' (no ArUco markers visible) — "
                  "re-stamping the existing profile for the current lens instead.")
            lens.stamp_profile(stale_prof, source=source)
            if save:
                stale_prof.save(profile_path(profile), backup=True)
            return stale_prof
        raise FileNotFoundError(
            f"profile '{profile}' missing and auto-calibration from {source!r} found no "
            "ArUco markers — tape the markers to the board (calibrate markers) or run "
            "'chesslab calibrate auto'.")
    if stale_prof is not None:
        # `crop` is a user setting (pad_up/pad_side/out_size), never measured from a frame.
        prof.crop = stale_prof.crop
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

    Base cell (cell x cell, square) optionally extended UPWARD (height =
    cell*(1+pad_up), anchored at the lower square edge) and expanded sideways by
    pad_side*cell. `clamp=True` clips to image boundaries (box may become smaller);
    `clamp=False` returns the raw box — the caller (crop_square) fills protruding
    areas with border padding so the box geometry stays constant across all squares.
    """
    col, row = _square_to_col_row(square, profile.white_pov)
    bs = profile.board_size
    cell = bs / 8.0
    pad_up = profile.crop.pad_up
    pad_side = profile.crop.pad_side

    # `pad_side` expands the cell SYMMETRICALLY in all 4 directions (a bit more of the piece visible,
    # not cut off sharply at the square edge). `pad_up` additionally extends upward for
    # the 3D lean. pad_side=pad_up=0 = exact cell (backward compatible).
    x0 = col * cell - pad_side * cell
    x1 = (col + 1) * cell + pad_side * cell
    y0 = row * cell - pad_side * cell - pad_up * cell
    y1 = (row + 1) * cell + pad_side * cell

    def fix(v: float) -> int:
        return int(round(max(0.0, min(float(bs), v)) if clamp else v))

    return fix(x0), fix(y0), fix(x1), fix(y1)


def square_center(square: str, profile: CalibrationProfile) -> tuple[int, int]:
    """Pixel center of the base cell of a square in the rectified board_size image."""
    col, row = _square_to_col_row(square, profile.white_pov)
    cell = profile.board_size / 8.0
    return int((col + 0.5) * cell), int((row + 0.5) * cell)


def crop_border_px(profile: CalibrationProfile) -> int:
    """Border (in pixels) with which the board is warped for the DATA crop, so edge squares
    have content for their pad_side/pad_up extension. Grows automatically with the pads (at least
    `config.CROP_WARP_BORDER_CELLS`). 0 -> no border (display behavior)."""
    cell = profile.board_size / 8.0
    # The two pads STACK at the top edge — `square_region` puts y0 at
    # `row*cell - pad_side*cell - pad_up*cell`, so rank 8 reaches `pad_side + pad_up` cells above
    # the board. Taking the max of the two instead left the sum minus the larger one uncovered,
    # i.e. rank 8 crops carried replicated border where they should carry image. No effect at the
    # shipped `pad_up = 0`; it bites any oblique profile that reintroduces upward padding.
    border_cells = max(config.CROP_WARP_BORDER_CELLS, profile.crop.pad_side + profile.crop.pad_up)
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


def draw_calibration_overlay(frame, marker_pts, profile: CalibrationProfile, labels: bool = False):
    """On the camera image: marker box (outer, orange) + actual playing field + grid (inner, green).

    `labels=True` additionally labels each of the 64 squares (a1..h8) at its cell center —
    resolution-adaptive, so it remains readable in the web UI at any stream/snapshot size.
    """
    img = frame.copy()
    bs = profile.board_size
    h_inv = np.linalg.inv(np.array(profile.homography, dtype=np.float64))

    def to_img(board_pts):
        a = np.array(board_pts, dtype=np.float32).reshape(-1, 1, 2)
        return cv2.perspectiveTransform(a, h_inv).reshape(-1, 2)

    cell = bs / 8.0
    # Estimate cell size in image pixels -> scale line thickness/font (stream vs snapshot).
    o, ex = to_img([[0.0, 0.0]])[0], to_img([[cell, 0.0]])[0]
    cell_px = float(np.hypot(*(ex - o))) or 40.0
    grid_th = max(1, int(round(cell_px / 60)))
    for i in range(9):  # back-project 8x8 grid
        p = i * cell
        v = to_img([[p, 0], [p, bs]]).astype(int)
        hh = to_img([[0, p], [bs, p]]).astype(int)
        cv2.line(img, tuple(v[0]), tuple(v[1]), (0, 200, 0), grid_th, cv2.LINE_AA)
        cv2.line(img, tuple(hh[0]), tuple(hh[1]), (0, 200, 0), grid_th, cv2.LINE_AA)
    field = to_img([[0, 0], [bs, 0], [bs, bs], [0, bs]]).astype(np.int32)
    cv2.polylines(img, [field], True, (0, 255, 0), grid_th + 1, cv2.LINE_AA)  # playing field (green)

    if labels:
        fs = max(0.3, cell_px / 150.0)            # font size ~ cell size
        th = max(1, int(round(cell_px / 90)))
        off = int(cell_px * 0.18)
        for rank in range(1, 9):
            for fl in _FILES:
                col, row = _square_to_col_row(f"{fl}{rank}", profile.white_pov)
                c = to_img([[(col + 0.5) * cell, (row + 0.5) * cell]])[0].astype(int)
                cv2.putText(img, f"{fl}{rank}", (c[0] - off, c[1] + off // 2),
                            cv2.FONT_HERSHEY_SIMPLEX, fs, (0, 0, 255), th, cv2.LINE_AA)

    mb = np.array(marker_pts, dtype=np.int32)
    cv2.polylines(img, [mb], True, (0, 180, 255), grid_th + 1, cv2.LINE_AA)   # marker box (orange)
    for p in marker_pts:
        cv2.circle(img, (int(p[0]), int(p[1])), max(4, int(cell_px / 18)), (0, 180, 255), -1, cv2.LINE_AA)
    return img


def warp_board(frame, profile: CalibrationProfile):
    H = np.array(profile.homography, dtype=np.float64)
    return cv2.warpPerspective(frame, H, (profile.board_size, profile.board_size))


def draw_board_grid(board_img, profile: CalibrationProfile, labels: bool = True):
    """Draw 8x8 grid (+ corner/center labels) on the rectified board."""
    img = board_img.copy()
    bs = profile.board_size
    for i in range(9):
        p = int(round(i * bs / 8.0))
        cv2.line(img, (p, 0), (p, bs), (0, 255, 0), 1)
        cv2.line(img, (0, p), (bs, p), (0, 255, 0), 1)
    if labels:
        for sq in ("a8", "h8", "a1", "h1", "e4"):
            col, row = _square_to_col_row(sq, profile.white_pov)
            cx = int((col + 0.5) * bs / 8.0)
            cy = int((row + 0.5) * bs / 8.0)
            cv2.putText(img, sq, (cx - 12, cy + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
    return img


# Camera opening moved to `chesslab.camera` (open_camera is imported at the top of this
# module for the calibration helpers below).


# --- ArUco auto-corners (markers at a8/h8/h1/a1) -----------------------------------------
# id 0 -> a8, id 1 -> h8, id 2 -> h1, id 3 -> a1 (same order as click calibration).
_ARUCO_LABELS = ("a8", "h8", "h1", "a1")


def _aruco_dictionary(dict_name: str):
    return cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, dict_name))


def _detect_marker_quads(frame, dict_name: str, ids: tuple[int, ...]) -> dict[int, np.ndarray]:
    """Raw detection: {id: (4,2) corner array} per found marker (order as from ArUco)."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if frame.ndim == 3 else frame
    params = cv2.aruco.DetectorParameters()
    params.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX  # more precise corners
    detector = cv2.aruco.ArucoDetector(_aruco_dictionary(dict_name), params)
    found_corners, found_ids, _ = detector.detectMarkers(gray)
    if found_ids is None:
        return {}
    return {int(i): c.reshape(4, 2) for c, i in zip(found_corners, found_ids.flatten(), strict=False) if int(i) in ids}


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

    def n_live(self) -> int:
        return sum(1 for i in self.pos if i not in self.seeded and self.age.get(i, 0) == 0)

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


def warp_board_for_crops(frame, profile: CalibrationProfile, corners):
    """Rectify board **with border** — the DATA crop warp. Canvas `board_size + 2B` with
    `B = crop_border_px(profile)`, homography translated by B. This way EDGE squares have real
    board/edge content for their pad_side/pad_up extension (instead of black border at the
    playing field edge). Geometry is identical to the borderless warp, only shifted by B; `crop_square`
    shifts its box accordingly by +B.
    """
    bs = profile.board_size
    b = crop_border_px(profile)
    h = np.array(compute_homography(corners, bs, profile.margin), dtype=np.float64)
    t = np.array([[1.0, 0.0, b], [0.0, 1.0, b], [0.0, 0.0, 1.0]], dtype=np.float64)
    return cv2.warpPerspective(frame, t @ h, (bs + 2 * b, bs + 2 * b))


def generate_markers(out_path, dict_name: str = "DICT_4X4_50", ids: tuple[int, ...] = (0, 1, 2, 3),
                     marker_px: int = 300, quiet: int | None = None, gap: int = 70):
    """Printable 2x2 sheet: each marker with white quiet zone in an equally-sized cut box.

    `quiet`: white border around the marker (important for detection). Cut along the thin
    black box → all 4 markers exactly the same size. `gap`: spacing between boxes.
    """
    d = _aruco_dictionary(dict_name)
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
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), sheet)
    return out_path


def calibrate_auto(camera: int, profile: str, board_size: int, dict_name: str = "DICT_4X4_50",
                   white_pov: bool = True, preview: bool = False,
                   margin=config.DEFAULT_MARKER_MARGIN,
                   min_markers: int = 4) -> int:
    """Detect markers → marker box + inset playing field → save profile (no clicking).

    `margin`: fraction by which the markers lie OUTSIDE the playing field. With `--preview` live
    adjust via +/- until the green playing field box aligns with the real board.
    """
    out_path = profile_path(profile)
    if out_path.exists():
        import typer

        if not typer.confirm(f"Profile '{profile}' already exists ({out_path}). Overwrite?"):
            print("Aborted.")
            return 1

    cap = open_camera(camera)
    if not cap.isOpened():
        print(f"[FAIL] Camera {camera} could not be opened.")
        return 1
    try:
        def build_from(f, p, m: float) -> CalibrationProfile:
            hh, ww = f.shape[:2]
            return CalibrationProfile(
                profile=profile, camera_index=camera, frame_size=(ww, hh), board_size=board_size,
                image_corners=p, homography=compute_homography(p, board_size, m),
                white_pov=white_pov, crop=CropParams.default(board_size),
                margin=margins4(m), marker_dict=dict_name,
            )

        if preview:
            # LIVE video: each frame is read anew + markers re-detected, boxes track along.
            win = "chesslab auto-calibrate"
            cv2.namedWindow(win, cv2.WINDOW_NORMAL)
            print("Live video: w = box LARGER, e or - = SMALLER, r = reset, s = save, q = quit")
            tracker = MarkerTracker()
            last_pts, frame, m = None, None, margin
            while True:
                ok, f = cap.read()
                if ok and f is not None:
                    frame = f
                    tracker.update(detect_board_markers(frame, dict_name, corner="center"))
                seen = len(tracker.last)
                if seen >= min_markers:
                    res = resolve_board_corners(tracker.last, board_size=board_size)
                    if res is not None:
                        last_pts = res[0]
                if frame is None:
                    if (cv2.waitKey(30) & 0xFF) in (ord("q"), 27):
                        cv2.destroyAllWindows()
                        print("[FAIL] no frame from camera.")
                        return 1
                    continue
                if last_pts and seen >= min_markers:
                    overlay = draw_calibration_overlay(frame, last_pts, build_from(frame, last_pts, m))
                    cv2.putText(overlay, f"margin={m:.3f}  {seen}/4 markers  w/e=adjust  s=save  q=quit",
                                (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2, cv2.LINE_AA)
                else:
                    overlay = frame.copy()
                    cv2.putText(overlay, f"Waiting for all {min_markers} markers ({seen}/4 known)...",
                                (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
                cv2.imshow(win, overlay)
                k = cv2.waitKey(30) & 0xFF
                if k in (ord("w"), ord("+"), ord("=")):       # larger
                    m += 0.005
                elif k in (ord("e"), ord("-"), ord("_")):     # smaller
                    m = max(0.0, m - 0.005)
                elif k == ord("r"):
                    m = margin
                elif k == ord("s") and last_pts:
                    cv2.destroyAllWindows()
                    build_from(frame, last_pts, m).save(out_path)
                    print(f"[OK] Auto-calibration saved: {out_path} (margin={m:.3f})")
                    return 0
                elif k in (ord("q"), 27):
                    cv2.destroyAllWindows()
                    print("Discarded.")
                    return 1

        # Non-interactive: collect over multiple frames until all min_markers are known.
        tracker = MarkerTracker()
        frame = None
        for _ in range(120):
            ok, frame = cap.read()
            if not ok or frame is None:
                continue
            tracker.update(detect_board_markers(frame, dict_name, corner="center"))
            if len(tracker.last) >= min_markers:
                break
        if frame is None or len(tracker.last) < min_markers:
            print(f"[FAIL] not all {min_markers} markers (id 0-3) detected — check lighting/visibility, "
                  "markers must be fully & flatly visible.")
            return 1
        pts = resolve_board_corners(tracker.last, board_size=board_size)[0]
        build_from(frame, pts, margin).save(out_path)
        print(f"[OK] Auto-calibration saved: {out_path} (margin={margin:.3f})")
        return 0
    finally:
        cap.release()


# --- Interactive commands (need camera + display) ----------------------------------

_WIN = "chesslab calibrate"
def calibrate_check(camera: int, profile: str) -> int:
    """Live overlay of the grid on the rectified camera image."""
    try:
        prof = load_profile(profile)
    except FileNotFoundError as e:
        print(f"[FAIL] {e}")
        return 1

    cap = open_camera(camera)
    if not cap.isOpened():
        print(f"[FAIL] Camera {camera} could not be opened.")
        return 1
    print("q = quit")
    cv2.namedWindow(_WIN, cv2.WINDOW_NORMAL)
    try:
        while True:
            ok, frame = cap.read()
            if not ok or frame is None:
                print("[FAIL] no frame read.")
                return 1
            board = draw_board_grid(warp_board(frame, prof), prof)
            cv2.imshow(_WIN, board)
            if (cv2.waitKey(20) & 0xFF) == ord("q"):
                return 0
    finally:
        cap.release()
        cv2.destroyAllWindows()


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
