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
    corners, _n_used = res
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


# =======================================================================================
# Markerless board detection via board lines (Spec 11, chesscog-style, NO DL)
# =======================================================================================

def _cluster_two_angle_families(lines) -> tuple[list, list]:
    """Split Hough lines (rho, theta) into two angle families (k-means on the
    doubled angle, because theta and theta+pi are the same line direction)."""
    import numpy as _np
    pts = _np.array([[_np.cos(2 * t), _np.sin(2 * t)] for _r, t in lines], dtype=_np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 1e-3)
    _c, labels, _ctr = cv2.kmeans(pts, 2, None, crit, 5, cv2.KMEANS_PP_CENTERS)
    fam = [[], []]
    for (r, t), lab in zip(lines, labels.ravel(), strict=False):
        fam[int(lab)].append((float(r), float(t)))
    return fam[0], fam[1]


def _family_positions(family) -> tuple[float, list[tuple[float, float, float]]]:
    """Per family: mean angle + 1D position of each line along the family normal.
    rho sign is normalized to the mean angle (theta vs. theta+pi)."""
    import numpy as _np
    ref = float(_np.arctan2(_np.mean([_np.sin(2 * t) for _r, t in family]),
                            _np.mean([_np.cos(2 * t) for _r, t in family])) / 2.0) % _np.pi
    out = []
    for r, t in family:
        # Normalize line to reference direction: |theta - ref| > pi/2 → flip line.
        d = (t - ref + _np.pi / 2) % _np.pi - _np.pi / 2
        rr = r if abs(d) <= _np.pi / 2 else -r
        out.append((float(rr), r, t))
    return ref, out


def _merge_positions(pos_lines, tol: float) -> list[tuple[float, float, float]]:
    """Merge nearly identical Hough lines (same board line hit multiple times) into one average."""
    merged = []
    for p, r, t in sorted(pos_lines):
        if merged and abs(p - merged[-1][0]) <= tol:
            mp, mr, mt, n = merged[-1]
            merged[-1] = ((mp * n + p) / (n + 1), (mr * n + r) / (n + 1),
                          (mt * n + t) / (n + 1), n + 1)
        else:
            merged.append((p, r, t, 1))
    return [(p, r, t) for p, r, t, _n in merged]


def _grid_progression(positions: list[float]) -> tuple[float, float] | None:
    """RANSAC over line positions: find the 9-term arithmetic progression (board grid).

    Counts DISTINCT slots (two lines in the same slot count once) and normalizes the
    error to spacing — otherwise large spacings win automatically (large tolerance
    catches everything). Spacing is limited to a plausible ratio of the position span
    (at least 5 of 9 lines visible → span/8 ≤ s ≤ span/4).
    Returns (first_position, spacing) of outer line slots 0 and 8, else None."""
    n = len(positions)
    if n < 6:                                    # at least 6 of the 9 grid lines needed
        return None
    best = None                                  # (slots, -error/s, base, s)
    span = max(positions) - min(positions)
    s_lo, s_hi = span / 9.0, span / 4.0
    for i in range(n):
        for j in range(i + 1, n):
            gap = positions[j] - positions[i]
            for k in range(1, 9):                # hypothesis: lines i,j are k slots apart
                s = gap / k
                if s <= 2 or not (s_lo <= s <= s_hi):
                    continue
                for shift in range(0, 9 - k):    # slot offset: line i onto slot `shift`
                    base = positions[i] - shift * s
                    slots: dict[int, float] = {}
                    for q in positions:
                        m = round((q - base) / s)
                        e = abs(q - (base + m * s))
                        if 0 <= m <= 8 and e <= s * 0.15:
                            slots[m] = min(e, slots.get(m, 1e9))
                    if len(slots) < 6:
                        continue
                    cand = (len(slots), -sum(slots.values()) / s, base, s)
                    if best is None or cand > best:
                        best = cand
    if best is None:
        return None
    return best[2], best[3]


def board_corners_from_lines(frame, profile: CalibrationProfile | None = None,
                             work_width: int = 960) -> list[list[float]] | None:
    """Estimate the 4 board corners WITHOUT markers from the board lines (Spec 11).

    Classic pipeline: Canny → HoughLines → two angle families → per family the
    9-term grid progression of line positions (RANSAC) → intersect outer lines = corners.
    Works under moderate perspective (camera roughly above the board); the mapping to
    (a8,h8,h1,a1) uses — where available — proximity to `profile.image_corners`, otherwise
    the default reading direction. Returns None if no consistent grid is found."""
    import numpy as _np

    h, w = frame.shape[:2]
    scale = min(1.0, work_width / float(w))
    small = cv2.resize(frame, (int(w * scale), int(h * scale))) if scale < 1.0 else frame
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(gray, 40, 120)
    # Reduce Hough threshold adaptively until BOTH families carry enough grid lines —
    # vertical board lines are often weaker (pieces interrupt them); too low
    # thresholds flood with diagonal edges (clip02 empirical: 0.30 → B only 5 lines,
    # 0.18 → 4400 lines clutter). The progression search itself is the quality filter.
    quad = None
    for thr_frac in (0.30, 0.24, 0.19):
        raw = cv2.HoughLines(edges, 1, _np.pi / 360,
                             threshold=int(min(small.shape[:2]) * thr_frac))
        if raw is None or len(raw) < 12:
            continue
        lines = [(float(r), float(t)) for r, t in raw[:, 0, :]][:250]
        quad = _quad_from_lines(lines)
        if quad is not None:
            break
    if quad is None:
        return None
    quad = [[x / scale, y / scale] for x, y in quad]
    return _finish_quad(quad, w, h, profile)


def _quad_from_lines(lines) -> list[list[float]] | None:
    """From Hough lines the 4 outer corners of the grid (in working resolution) or None."""
    import numpy as _np

    fam_a, fam_b = _cluster_two_angle_families(lines)
    # Families must have clearly different directions (otherwise one is just clutter).
    def _ref(fam):
        return float(_np.arctan2(_np.mean([_np.sin(2 * t) for _r, t in fam]),
                                 _np.mean([_np.cos(2 * t) for _r, t in fam])) / 2.0) % _np.pi
    if len(fam_a) < 6 or len(fam_b) < 6:
        return None
    dref = abs(_ref(fam_a) - _ref(fam_b)) % _np.pi
    if min(dref, _np.pi - dref) < _np.radians(35):
        return None
    borders = []
    for fam in (fam_a, fam_b):
        ref, pos_lines = _family_positions(fam)
        span = max(p for p, _r, _t in pos_lines) - min(p for p, _r, _t in pos_lines)
        merged = _merge_positions(pos_lines, tol=max(3.0, span / 40.0))
        prog = _grid_progression([p for p, _r, _t in merged])
        if prog is None:
            return None
        base, s = prog
        # Outer lines: prefer real line near slot 0/8, otherwise extrapolate with the family angle
        # (position p is by definition the rho of a line with theta=ref).
        pair = []
        for slot in (0, 8):
            target = base + slot * s
            near = min(merged, key=lambda m: abs(m[0] - target))
            pair.append((near[1], near[2]) if abs(near[0] - target) <= s * 0.15
                        else (target, ref))
        borders.append(pair)

    def _intersect(l1, l2):
        r1, t1 = l1
        r2, t2 = l2
        a = _np.array([[_np.cos(t1), _np.sin(t1)], [_np.cos(t2), _np.sin(t2)]])
        b = _np.array([r1, r2])
        if abs(_np.linalg.det(a)) < 1e-9:
            return None
        x, y = _np.linalg.solve(a, b)
        return [float(x), float(y)]

    quad = []
    for la in borders[0]:
        for lb in borders[1]:
            p = _intersect(la, lb)
            if p is None:
                return None
            quad.append(p)
    # quad = [A0B0, A0B8, A8B0, A8B8] → order as convex quad (angle around centroid).
    cx = sum(p[0] for p in quad) / 4.0
    cy = sum(p[1] for p in quad) / 4.0
    quad.sort(key=lambda p: _np.arctan2(p[1] - cy, p[0] - cx))
    return quad


def _finish_quad(quad, w: int, h: int,
                 profile: CalibrationProfile | None) -> list[list[float]] | None:
    """Plausibility (inside image, minimum area) + mapping to (a8,h8,h1,a1): choose rotation
    closest to the calibration corners — lines alone cannot distinguish 90°/180° rotations.
    Without profile: order as sorted (user checks overlay)."""
    for x, y in quad:
        if not (-0.2 * w <= x <= 1.2 * w and -0.2 * h <= y <= 1.2 * h):
            return None
    area = 0.0
    for i in range(4):
        x1, y1 = quad[i]
        x2, y2 = quad[(i + 1) % 4]
        area += x1 * y2 - x2 * y1
    if abs(area) / 2.0 < 0.05 * w * h:
        return None
    if profile is not None and profile.image_corners and len(profile.image_corners) >= 4:
        ref = profile.image_corners
        best_rot, best_cost = 0, None
        for rot in range(4):
            rq = quad[rot:] + quad[:rot]
            cost = sum((rq[i][0] - ref[i][0]) ** 2 + (rq[i][1] - ref[i][1]) ** 2 for i in range(4))
            if best_cost is None or cost < best_cost:
                best_rot, best_cost = rot, cost
        quad = quad[best_rot:] + quad[:best_rot]
    return quad


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
    return res[0] if res is not None else None


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
