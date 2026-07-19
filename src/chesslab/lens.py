"""Camera LENS undistortion — the optical model of the physical lens.

NOT to be confused with `calibration.py`, which is BOARD geometry (ArUco corners,
homography, per-square crops). This module knows only about the lens: it loads an
intrinsics file (`calib.npz`, written by `chesslab lens calibrate`) and remaps raw
camera frames so that straight lines in the world stay straight in the image.

**Single application point.** The only place undistortion is applied is
`camera.open_capture()`, which wraps the capture in `_UndistortCapture`. Everything
that replays ALREADY-RECORDED pixels — `labeling.py`, `ingest.py`,
`web/routers/sessions.py` — reads frames with `cv2.imread` and never goes through
`open_capture`. A recorded session therefore can never be undistorted twice: the frame
on disk and the board corners stored next to it were captured together and stay
internally consistent. Never remap on replay.

**Output size is preserved.** We deliberately do NOT crop to the valid ROI returned by
`getOptimalNewCameraMatrix`, so an undistorted frame has exactly the same (w, h) as the
raw one and `frame_size` in profiles/sessions stays invariant. `alpha` only trades black
border against field of view (0 = no black borders, 1 = keep all source pixels).

**Varifocal warning.** The rig's 5–50 mm CS-mount lens changes its intrinsics whenever
zoom or focus is touched. A calibration is only valid for the setting it was shot at —
`DriftMonitor` watches for that and tells the user to re-run `chesslab lens calibrate`.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import cv2
import numpy as np

from . import config

log = logging.getLogger("chesslab.lens")

# Warn at most ONCE per process that no calibration file exists — this is the normal
# state before the user ever calibrates, not an error worth spamming every open.
_warned = False

# (calib_id, w, h, alpha) -> (map1, map2, new_camera_matrix). Maps are expensive to build
# (~full-frame float math) and constant for a given source, so they are built exactly once.
_MAP_CACHE: dict[tuple[str, int, int, float], tuple[np.ndarray, np.ndarray, np.ndarray]] = {}


# --- Data model -----------------------------------------------------------------------

@dataclass(frozen=True, eq=False)
class LensCalibration:
    """Intrinsics of one lens at one zoom/focus setting.

    `camera_matrix` is the 3x3 K, `dist_coeffs` the OpenCV distortion vector (k1 k2 p1 p2
    k3), `image_size` the (w, h) the calibration was shot at, `rms` the reprojection
    error in pixels (< ~1.0 is good). `id` is a short content hash of K+D used as the
    cache key and as the stamp written into calibration profiles/sessions.
    """

    camera_matrix: np.ndarray
    dist_coeffs: np.ndarray
    image_size: tuple[int, int]
    rms: float = 0.0
    created_at: str = ""
    id: str = ""

    @property
    def aspect(self) -> float:
        w, h = self.image_size
        return (w / h) if h else 0.0


def calib_id(camera_matrix, dist_coeffs) -> str:
    """Short, stable content hash of K+D — identifies one calibration everywhere."""
    k = np.asarray(camera_matrix, dtype=np.float64).round(6).tobytes()
    d = np.asarray(dist_coeffs, dtype=np.float64).round(8).tobytes()
    return hashlib.sha1(k + d).hexdigest()[:12]


def default_path() -> Path:
    """Where `calib.npz` lives: `config.LENS.path` if set, else `DATA.lens/calib.npz`.

    Deliberately NOT under `data/calibration/` — that directory holds board profiles and
    `calibrate list` enumerates `*.yaml` there.
    """
    p = (config.LENS.path or "").strip()
    return Path(p) if p else (config.DATA.lens / "calib.npz")


def load(path: Path | str | None = None) -> LensCalibration | None:
    """Read a calibration from `calib.npz`. Missing/broken file → None, never raises.

    A missing file is warned about exactly once per process (module-level `_warned`);
    callers treat None as "no undistortion", which is a valid, fully working state.
    """
    global _warned
    p = Path(path) if path is not None else default_path()
    if not p.exists():
        if not _warned:
            _warned = True
            log.warning(
                "no lens calibration at %s — frames stay raw (barrel distortion NOT removed). "
                "Run `chesslab lens calibrate` to create one.", p)
        return None
    try:
        with np.load(str(p), allow_pickle=False) as z:
            k = np.asarray(z["camera_matrix"], dtype=np.float64).reshape(3, 3)
            d = np.asarray(z["dist_coeffs"], dtype=np.float64).ravel()
            size = np.asarray(z["image_size"]).ravel()
            rms = float(np.asarray(z["rms"]).ravel()[0]) if "rms" in z else 0.0
            created = str(z["created_at"]) if "created_at" in z else ""
    except Exception as e:  # noqa: BLE001 — a corrupt file must not break capture
        log.warning("lens calibration %s unreadable (%r) — continuing without undistortion.", p, e)
        return None
    return LensCalibration(
        camera_matrix=k, dist_coeffs=d, image_size=(int(size[0]), int(size[1])),
        rms=rms, created_at=created, id=calib_id(k, d),
    )


def save(path: Path | str, calib: LensCalibration, *, n_frames: int = 0,
         pattern: tuple[int, int] = (7, 7)) -> Path:
    """Write a calibration to `calib.npz` (creates the parent directory)."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    np.savez(
        str(p),
        camera_matrix=calib.camera_matrix,
        dist_coeffs=calib.dist_coeffs,
        image_size=np.asarray(calib.image_size, dtype=np.int32),
        rms=np.asarray([calib.rms], dtype=np.float64),
        created_at=calib.created_at or datetime.now(UTC).isoformat(),
        n_frames=np.asarray([n_frames], dtype=np.int32),
        pattern=np.asarray(pattern, dtype=np.int32),
    )
    return p


# --- Undistorter ----------------------------------------------------------------------

class Undistorter:
    """Applies one `LensCalibration` to frames of a (possibly different) resolution.

    Maps are built lazily from the FIRST ACTUAL FRAME's shape — never from
    `CAP_PROP_FRAME_WIDTH`, which lies on DSHOW (see `camera.py`'s module docstring).
    Per frame this does `cv2.remap` and nothing else; `cv2.undistort` (which rebuilds the
    maps on every call) is never used.
    """

    def __init__(self, calib: LensCalibration, alpha: float | None = None) -> None:
        self.calib = calib
        self.alpha = float(config.LENS.alpha if alpha is None else alpha)
        self._interp = (cv2.INTER_NEAREST if config.LENS.interpolation == "nearest"
                        else cv2.INTER_LINEAR)
        self._new_k: np.ndarray | None = None
        self._passthrough = False        # aspect mismatch → leave frames untouched
        self._size_warned = False

    # -- map construction --
    def _scaled_k(self, w: int, h: int) -> np.ndarray | None:
        """K adapted to a frame size that differs from the calibration size.

        Same aspect ratio → pure scale: fx, fy, cx, cy all multiply by w/cal_w (D is
        dimensionless in normalized coordinates and stays as is). Different aspect →
        None; the caller then passes frames through untouched (a cropped/letterboxed
        sensor mode is a different optical path and must be recalibrated).
        """
        cw, ch = self.calib.image_size
        if (w, h) == (cw, ch):
            return self.calib.camera_matrix.copy()
        if not cw or not ch or abs((w / h) - (cw / ch)) > 0.01:
            return None
        s = w / cw
        k = self.calib.camera_matrix.copy()
        k[0, 0] *= s; k[1, 1] *= s
        k[0, 2] *= s; k[1, 2] *= s
        return k

    def maps_for(self, w: int, h: int):
        """(map1, map2) for this frame size, built ONCE and cached process-wide.

        CV_16SC2 fixed-point maps: half the memory of two float32 maps and the fastest
        `cv2.remap` path. Returns None when the frame cannot be undistorted.
        """
        key = (self.calib.id, int(w), int(h), self.alpha)
        hit = _MAP_CACHE.get(key)
        if hit is not None:
            self._new_k = hit[2]
            return hit[0], hit[1]

        k = self._scaled_k(int(w), int(h))
        if k is None:
            if not self._size_warned:
                self._size_warned = True
                log.warning(
                    "frame %dx%d has a different aspect ratio than the lens calibration %dx%d — "
                    "passing frames through UNDISTORTED. Re-run `chesslab lens calibrate` in the "
                    "resolution you actually capture at.", w, h, *self.calib.image_size)
            self._passthrough = True
            return None

        d = self.calib.dist_coeffs
        # alpha only scales the result; we keep the full (w, h) output and ignore the ROI
        # on purpose so frame_size stays invariant across the whole pipeline.
        new_k, _roi = cv2.getOptimalNewCameraMatrix(k, d, (int(w), int(h)), self.alpha,
                                                    (int(w), int(h)))
        map1, map2 = cv2.initUndistortRectifyMap(k, d, None, new_k, (int(w), int(h)),
                                                 cv2.CV_16SC2)
        _MAP_CACHE[key] = (map1, map2, new_k)
        self._new_k = new_k
        log.info("lens maps built for %dx%d (calib %s, alpha=%.2f)", w, h, self.calib.id, self.alpha)
        return map1, map2

    # -- per-frame work --
    def apply(self, frame):
        """Undistorted copy of `frame` (same shape). Pass-through on any problem."""
        if frame is None or self._passthrough:
            return frame
        h, w = frame.shape[:2]
        maps = self.maps_for(w, h)
        if maps is None:
            return frame
        return cv2.remap(frame, maps[0], maps[1], self._interp, borderMode=cv2.BORDER_CONSTANT)

    @property
    def new_camera_matrix(self) -> np.ndarray | None:
        """K valid for the UNDISTORTED frames — this is what solvePnP/box3d must use.

        None until the first frame has been seen (the maps, and with them the optimal K,
        depend on the actual frame size).
        """
        return self._new_k


# --- Source policy --------------------------------------------------------------------

def should_undistort(source, override: bool | None = None) -> bool:
    """Whether `source` should be undistorted (`CameraSpec.undistort` semantics).

    `override` True/False wins. `None` = auto: a local int index is THE rig camera whose
    lens we calibrated → ON; a URL is the phone/IP cam with a completely different lens →
    OFF; a file path is already-captured pixels → OFF (they were recorded through
    whatever pipeline produced them and must not be remapped a second time).
    """
    if override is not None:
        return bool(override)
    if not config.LENS.enabled:
        return False
    if isinstance(source, str) and "://" in source:
        return bool(config.LENS.undistort_urls)
    if isinstance(source, int) or (isinstance(source, str) and source.strip().isdigit()):
        return True
    return bool(config.LENS.undistort_files)


def active(source=None, *, override: bool | None = None,
           path: Path | str | None = None) -> Undistorter | None:
    """The `Undistorter` for `source`, or None if undistortion is off / no calib exists.

    Lazy: the calibration file is only touched here, on first use — never at import time,
    so CLI startup and tests stay fast.
    """
    if source is not None and not should_undistort(source, override):
        return None
    calib = load(path)
    return Undistorter(calib) if calib is not None else None


# --- Calibration-target geometry ------------------------------------------------------

def object_points(cols: int = 7, rows: int = 7, square_mm: float = 1.0) -> np.ndarray:
    """Ideal 3D corners of a planar chessboard pattern, z == 0 (the board IS the plane).

    `cols`/`rows` are INNER corners — an 8x8 chessboard has 7x7 of them. Shape is
    (cols*rows, 3) float32, ordered row-major to match `findChessboardCorners`.
    `square_mm` only sets the world scale; it does not affect K/D at all (it would matter
    for absolute pose, not for the distortion model).
    """
    grid = np.zeros((rows * cols, 3), np.float32)
    grid[:, :2] = np.mgrid[0:cols, 0:rows].T.reshape(-1, 2) * float(square_mm)
    return grid


# --- Automation: novelty, coverage, drift ---------------------------------------------

def pose_novelty(corners, accepted) -> float:
    """Mean corner displacement (px) against the CLOSEST already-accepted view.

    This drives auto-capture: a view is only worth storing if it differs from everything
    we already have. It doubles as the degenerate-solve guard — 15 near-identical views
    give `calibrateCamera` no information and produce a confident but wrong model.
    `inf` when nothing has been accepted yet (the first pattern is always novel).
    """
    c = np.asarray(corners, dtype=np.float64).reshape(-1, 2)
    best = float("inf")
    for prev in accepted:
        p = np.asarray(prev, dtype=np.float64).reshape(-1, 2)
        if p.shape != c.shape:
            continue
        best = min(best, float(np.linalg.norm(c - p, axis=1).mean()))
    return best


def tilt_score(corners) -> float:
    """How obliquely the pattern is seen, 0 (dead-on) .. ~1 (strongly tilted).

    Uses the pattern's bounding quad: under perspective a tilted plane makes opposite
    edges unequal, so the relative spread of the four edge lengths is a cheap proxy.
    `calibrateCamera` needs tilted views to separate focal length from distortion.
    """
    c = np.asarray(corners, dtype=np.float64).reshape(-1, 2)
    if len(c) < 4:
        return 0.0
    # The four extreme points approximate the pattern's bounding quad; under perspective
    # a tilted plane makes its opposite edges unequal.
    ext = [c[c[:, 1].argmin()], c[c[:, 0].argmax()], c[c[:, 1].argmax()], c[c[:, 0].argmin()]]
    edges = [float(np.linalg.norm(ext[i] - ext[(i + 1) % 4])) for i in range(4)]
    lo, hi = min(edges), max(edges)
    if hi <= 0:
        return 0.0
    return float(1.0 - lo / hi)


class CoverageGrid:
    """Which parts of the IMAGE the calibration pattern has been seen in.

    Distortion is strongest at the frame border, so a calibration shot only in the centre
    models the centre well and the corners badly. The grid (default 3x3) is filled from
    the detected corners of every accepted view and drives both the live HUD and the
    auto-stop decision.
    """

    _LABELS = ("top-left", "top", "top-right",
               "left", "centre", "right",
               "bottom-left", "bottom", "bottom-right")

    def __init__(self, width: int, height: int, n: int = 3) -> None:
        self.width, self.height, self.n = int(width), int(height), int(n)
        self.hits = np.zeros((self.n, self.n), dtype=np.int32)

    def add(self, corners) -> None:
        """Mark every cell that at least one detected corner falls into."""
        c = np.asarray(corners, dtype=np.float64).reshape(-1, 2)
        if self.width <= 0 or self.height <= 0:
            return
        cols = np.clip((c[:, 0] / self.width * self.n).astype(int), 0, self.n - 1)
        rows = np.clip((c[:, 1] / self.height * self.n).astype(int), 0, self.n - 1)
        for r, cc in zip(rows, cols, strict=True):
            self.hits[r, cc] += 1

    @property
    def covered(self) -> int:
        return int((self.hits > 0).sum())

    @property
    def fraction(self) -> float:
        return self.covered / float(self.n * self.n)

    def missing(self) -> list[str]:
        """Human labels of the still-empty cells (3x3 only; else 'row,col')."""
        out: list[str] = []
        for r in range(self.n):
            for c in range(self.n):
                if self.hits[r, c] == 0:
                    idx = r * self.n + c
                    out.append(self._LABELS[idx] if self.n == 3 else f"r{r}c{c}")
        return out


def edge_bow(points) -> float:
    """Residual curvature of a set of points that SHOULD be collinear, normalized.

    Returns the maximum perpendicular distance from the chord through the first and last
    point, divided by that chord's length. 0 = perfectly straight. After a correct
    undistortion the board's outer edges are straight lines, so a persistently non-zero
    bow means the lens no longer matches the calibration (zoom/focus touched).
    Fewer than 3 points cannot bow → 0.0.
    """
    p = np.asarray(points, dtype=np.float64).reshape(-1, 2)
    if len(p) < 3:
        return 0.0
    a, b = p[0], p[-1]
    chord = b - a
    length = float(np.linalg.norm(chord))
    if length <= 1e-9:
        return 0.0
    # 2D cross product (numpy 2 dropped np.cross for 2-vectors): the perpendicular
    # distance of p from the line a..b is |chord x (p-a)| / |chord|.
    rel = p - a
    d = np.abs(chord[0] * rel[:, 1] - chord[1] * rel[:, 0]) / length
    return float(d.max() / length)


# Last drift status published by a live monitor, so `chesslab doctor` can report what the
# running tracker saw. In-process only — a fresh CLI invocation has nothing to report.
_LAST_DRIFT: dict | None = None


def publish_drift_status(status: dict | None) -> None:
    """Make a `DriftMonitor.status` dict visible process-wide (used by `doctor`)."""
    global _LAST_DRIFT
    _LAST_DRIFT = status


def last_drift_status() -> dict | None:
    """The most recently published drift status, or None if nothing ever measured."""
    return _LAST_DRIFT


def quad_descriptor(corners) -> dict[str, float] | None:
    """Scale descriptors of a board quad (a8, h8, h1, a1): mean side, sqrt(area), diagonals.

    All values are in pixels, so they scale LINEARLY with the board's apparent size — that
    is exactly what a bumped zoom ring changes. `sqrt(area)` is used instead of the raw
    area so both descriptors have the same (linear) units and a single relative threshold
    means the same thing for both. `diag_ratio` is dimensionless and reacts to a changed
    viewing angle rather than to zoom. None when fewer than 4 points or a degenerate quad.
    """
    p = np.asarray(corners, dtype=np.float64).reshape(-1, 2)
    if len(p) < 4 or not np.isfinite(p).all():
        return None
    p = p[:4]
    sides = [float(np.linalg.norm(p[(i + 1) % 4] - p[i])) for i in range(4)]
    mean_side = float(np.mean(sides))
    # Shoelace area of the quad in its given (cyclic) corner order.
    x, y = p[:, 0], p[:, 1]
    area = 0.5 * abs(float(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1))))
    d0 = float(np.linalg.norm(p[2] - p[0]))
    d1 = float(np.linalg.norm(p[3] - p[1]))
    if mean_side <= 1e-6 or area <= 1e-6 or min(d0, d1) <= 1e-6:
        return None
    return {"mean_side": mean_side, "root_area": float(np.sqrt(area)),
            "diag_ratio": max(d0, d1) / min(d0, d1)}


def geometry_deviation(corners, baseline) -> float | None:
    """Relative deviation of a live board quad from a baseline quad, 0 = identical.

    The worst of the two SCALE descriptors (mean side length, sqrt(area)) expressed as
    |live/base - 1|. Rotating or translating the board leaves this at ~0; changing the
    lens' zoom (or moving the camera closer) changes it proportionally. Returns None when
    either quad is unusable, so the caller can skip silently.
    """
    live = quad_descriptor(corners)
    base = quad_descriptor(baseline)
    if live is None or base is None:
        return None
    devs = [abs(live[k] / base[k] - 1.0) for k in ("mean_side", "root_area")]
    return float(max(devs))


def loo_homography_residual(live_by_id, canonical_by_id) -> float | None:
    """Leave-one-marker-out reprojection residual (px) between two coplanar point sets.

    `live_by_id` / `canonical_by_id` map marker id -> (N,2) points (the sub-pixel ArUco
    quad corners). Both sets lie on the SAME physical plane (the board), so under an ideal
    pinhole camera ONE homography maps canonical -> live exactly, no matter how the camera
    moved. We fit that homography from three markers' points, predict the held-out
    marker's points and measure the error; the reported value is the median over all
    hold-outs, which makes one badly detected marker harmless.

    A residual that grows over time means the point sets are no longer related by a
    homography — i.e. the undistortion in front of them no longer matches the optics.
    Needs >= 4 common markers (3 fitted x >= 4 points each = 12 correspondences); returns
    None otherwise.

    NOTE on the canonical frame: the canonical board positions of the marker CENTRES are
    known (`calibration.resolve_board_corners`), but the positions of the individual quad
    corners are not derivable without assuming a physical marker size. We therefore do not
    invent one — the caller supplies a previously observed set of quads as the canonical
    frame, which makes this a self-consistency check over time.
    """
    ids = [i for i in canonical_by_id if i in live_by_id]
    ids = [i for i in ids
           if np.asarray(live_by_id[i]).reshape(-1, 2).shape == np.asarray(canonical_by_id[i]).reshape(-1, 2).shape]
    if len(ids) < 4:
        return None
    residuals: list[float] = []
    for held in ids:
        fit = [i for i in ids if i != held]
        src = np.vstack([np.asarray(canonical_by_id[i], dtype=np.float64).reshape(-1, 2) for i in fit])
        dst = np.vstack([np.asarray(live_by_id[i], dtype=np.float64).reshape(-1, 2) for i in fit])
        if len(src) < 4:
            continue
        h, _ = cv2.findHomography(src.astype(np.float32), dst.astype(np.float32), 0)
        if h is None:
            continue
        q_src = np.asarray(canonical_by_id[held], dtype=np.float64).reshape(-1, 1, 2).astype(np.float32)
        pred = cv2.perspectiveTransform(q_src, h).reshape(-1, 2)
        obs = np.asarray(live_by_id[held], dtype=np.float64).reshape(-1, 2)
        residuals.append(float(np.linalg.norm(pred - obs, axis=1).mean()))
    if not residuals:
        return None
    return float(np.median(residuals))


class _Rolling:
    """Rolling median over the last `size` values plus a "sustained excess" streak counter."""

    def __init__(self, size: int, thr: float, streak: int) -> None:
        self.size, self.thr, self.streak = max(1, int(size)), float(thr), max(1, int(streak))
        self.values: list[float] = []
        self.bad = 0
        self.median: float | None = None

    def push(self, value: float) -> bool:
        """Add a measurement; True when the rolling median has been over threshold for
        `streak` consecutive samples (the moment an alarm should fire)."""
        self.values.append(float(value))
        if len(self.values) > self.size:
            del self.values[0]
        # Only judge once the window is full — a median over 1-2 samples is a single frame
        # in disguise and would defeat the whole point of the rolling window.
        self.median = float(np.median(self.values))
        if len(self.values) < self.size:
            return False
        if self.median > self.thr:
            self.bad += 1
            return self.bad >= self.streak
        self.bad = 0
        return False


class DriftMonitor:
    """Cheap, non-blocking watchdog for "the varifocal lens has been moved".

    Three independent signals, all rate-limited to ONE warning per monitor instance:

    * `check_frame_size` — capture resolution no longer matches the calibration.
    * `sample_geometry` (SIGNAL 1, primary) — the live board quad no longer has the size
      recorded in the board profile. A bumped zoom/focus ring changes the board's apparent
      pixel size a lot, so this is large and robust. Only the 4 board corners are needed,
      which the tracker computes anyway.
    * `sample_residual` (SIGNAL 2, secondary/speculative) — leave-one-marker-out homography
      residual over the ArUco sub-pixel quad corners. Finer, but its sensitivity is UNPROVEN
      on real hardware and its threshold is a starting guess; off by default.
    * `sample` (legacy) — edge bow of point sets that should be collinear.

    Every signal keeps a ROLLING MEDIAN and needs a STREAK of exceedances: occlusion,
    motion blur and partial marker loss make single frames noisy, and a single bad frame is
    noise, not drift.
    """

    def __init__(self, *, every: int = 30, bow_thr: float = 0.004, streak: int = 5,
                 window: int | None = None, geometry_thr: float | None = None,
                 residual_thr: float | None = None) -> None:
        self.every, self.bow_thr, self.streak = int(every), float(bow_thr), int(streak)
        self._n = 0
        self._bad = 0
        self._warned = False
        cfg = config.LENS
        win = int(cfg.drift_window if window is None else window)
        gs = int(cfg.drift_streak)
        self._geom = _Rolling(win, float(cfg.drift_geometry_thr if geometry_thr is None
                                         else geometry_thr), gs)
        self._resid = _Rolling(win, float(cfg.drift_residual_thr if residual_thr is None
                                          else residual_thr), gs)
        self._geom_warned = False
        self._resid_warned = False
        self.status: dict = {"geometry": None, "geometry_alarm": False,
                             "residual": None, "residual_alarm": False, "samples": 0}
        publish_drift_status(self.status)

    # -- Signal 1: board geometry / scale --
    def sample_geometry(self, corners, baseline) -> float | None:
        """Feed one live board quad. Returns the relative deviation (None = skipped)."""
        dev = geometry_deviation(corners, baseline)
        if dev is None:
            return None
        fire = self._geom.push(dev)
        self.status["geometry"] = round(self._geom.median or 0.0, 4)
        self.status["samples"] = int(self.status["samples"]) + 1
        if fire:
            self.status["geometry_alarm"] = True
            if not self._geom_warned:
                self._geom_warned = True          # rate limit: one warning per monitor
                log.warning(
                    "board geometry drifted %.1f%% from the calibrated profile — the lens "
                    "zoom/focus or the camera position has most likely changed. Re-run "
                    "`chesslab lens calibrate` and let the board profiles regenerate.",
                    (self._geom.median or 0.0) * 100.0)
        return dev

    # -- Signal 2: distortion-model residual --
    def sample_residual(self, quads_by_id, canonical_by_id, *, scale: float = 1.0) -> float | None:
        """Feed one set of ArUco quads. Returns the residual normalised by `scale` px."""
        res = loo_homography_residual(quads_by_id, canonical_by_id)
        if res is None:
            return None
        norm = res / float(scale) if scale and scale > 1e-6 else res
        fire = self._resid.push(norm)
        self.status["residual"] = round(self._resid.median or 0.0, 5)
        if fire:
            self.status["residual_alarm"] = True
            if not self._resid_warned:
                self._resid_warned = True
                log.warning(
                    "marker reprojection residual is %.3f%% of the board width — the lens "
                    "distortion model no longer fits the optics. Re-run `chesslab lens "
                    "calibrate`. (Experimental signal, threshold not tuned on real hardware.)",
                    (self._resid.median or 0.0) * 100.0)
        return norm

    def check_frame_size(self, size, calib: LensCalibration | None) -> bool:
        """True if the live frame size matches the calibration (warns once if not)."""
        if calib is None:
            return True
        if tuple(int(v) for v in size) == tuple(calib.image_size):
            return True
        if not self._warned:
            log.warning("capture is %sx%s but the lens calibration was shot at %dx%d — "
                        "undistortion is approximate; re-run `chesslab lens calibrate`.",
                        size[0], size[1], *calib.image_size)
        return False

    def sample(self, edges) -> float | None:
        """Measure this frame's worst edge bow (or None when this frame is skipped)."""
        self._n += 1
        if self.every > 1 and (self._n % self.every) != 0:
            return None
        bows = [edge_bow(e) for e in edges if e is not None and len(e) >= 3]
        if not bows:
            return None
        worst = max(bows)
        if worst > self.bow_thr:
            self._bad += 1
            if self._bad >= self.streak and not self._warned:
                self._warned = True
                log.warning(
                    "board edges still bow by %.1f%% of their length after undistortion — the "
                    "lens appears to have been moved/zoomed. Re-run `chesslab lens calibrate`.",
                    worst * 100.0)
        else:
            self._bad = 0
        return worst


# --- Board-profile consistency (auto-invalidation) ------------------------------------

def profile_lens_state(source=None, *, override: bool | None = None):
    """(undistorted, lens_calib_id) that a profile captured from `source` NOW should carry."""
    und = active(source, override=override)
    if und is None:
        return False, None
    return True, und.calib.id


def profile_is_stale(profile, source=None) -> tuple[bool, str]:
    """Does this board profile's lens stamp disagree with the currently active lens state?

    A profile carrying raw-lens K/D while frames arrive undistorted would compensate the
    distortion a SECOND time in solvePnP/box3d — silent, systematic geometry error. This
    is the check that catches it; the caller regenerates or re-stamps.
    """
    want_und, want_id = profile_lens_state(source)
    have_und = bool(getattr(profile, "undistorted", False))
    have_id = getattr(profile, "lens_calib_id", None)
    if have_und != want_und:
        return True, (f"profile was made on {'undistorted' if have_und else 'raw'} frames but "
                      f"capture is now {'undistorted' if want_und else 'raw'}")
    if want_und and have_id != want_id:
        return True, f"profile lens {have_id!r} != active lens {want_id!r}"
    return False, ""


def stamp_profile(profile, frame_size=None, source=None) -> bool:
    """Write the CORRECT intrinsics for the current lens state into a board profile.

    On undistorted frames the right values are the NEW optimal camera matrix and ZERO
    distortion — the remap has already removed it. Returns True if anything changed.
    """
    und = active(source)
    if und is None:
        changed = bool(getattr(profile, "undistorted", False))
        profile.undistorted = False
        profile.lens_calib_id = None
        return changed
    size = tuple(frame_size or profile.frame_size)
    und.maps_for(int(size[0]), int(size[1]))
    k = und.new_camera_matrix
    profile.undistorted = True
    profile.lens_calib_id = und.calib.id
    if k is not None:
        profile.camera_matrix = [[float(v) for v in row] for row in np.asarray(k)]
        profile.dist_coeffs = [0.0] * 5
    return True


# --- `chesslab lens calibrate` / `lens show` -------------------------------------------

def _banner(img, text: str, colour) -> None:
    cv2.rectangle(img, (0, 0), (img.shape[1], 40), (0, 0, 0), -1)
    cv2.putText(img, text, (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, colour, 2, cv2.LINE_AA)


def _draw_coverage(img, cov: CoverageGrid) -> None:
    """Small HUD in the bottom-left: which image regions still lack pattern views."""
    cell, pad = 26, 10
    y0 = img.shape[0] - pad - cov.n * cell
    for r in range(cov.n):
        for c in range(cov.n):
            x, y = pad + c * cell, y0 + r * cell
            hit = cov.hits[r, c] > 0
            cv2.rectangle(img, (x, y), (x + cell - 3, y + cell - 3),
                          (0, 180, 0) if hit else (40, 40, 40), -1)
            cv2.rectangle(img, (x, y), (x + cell - 3, y + cell - 3), (200, 200, 200), 1)


def _find_corners(gray, pattern, *, fast: bool):
    """`findChessboardCorners` with the flag set used for preview (fast) vs accept (full)."""
    flags = cv2.CALIB_CB_ADAPTIVE_THRESH | cv2.CALIB_CB_NORMALIZE_IMAGE
    if fast:
        flags |= cv2.CALIB_CB_FAST_CHECK
    ok, corners = cv2.findChessboardCorners(gray, pattern, flags)
    return bool(ok), corners


_SUBPIX_CRITERIA = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)


def _refine(gray, corners):
    return cv2.cornerSubPix(gray, corners, (11, 11), (-1, -1), _SUBPIX_CRITERIA)


def lens_calibrate(camera: int | str = 0, out: str | None = None, min_frames: int = 15,
                   cols: int = 7, rows: int = 7, square_mm: float = 1.0,
                   force: bool = False, alpha: float | None = None,
                   preview_max_w: int = 960, novelty_px: float = 30.0,
                   cooldown_s: float = 0.8) -> int:
    """Interactive lens calibration with AUTO-CAPTURE — the user just moves the board.

    A frame is stored automatically when the pattern is found, the view is sufficiently
    NOVEL (mean corner displacement vs. every stored view above `novelty_px`) and a short
    cooldown has passed. Keys are only q = quit, space = force capture, u = undo last.
    Calibration finishes by itself once the image coverage is adequate and `min_frames`
    views are in.
    """
    from .camera import CameraSpec, open_camera

    out_path = Path(out) if out else default_path()
    if out_path.exists() and not force:
        print(f"[FAIL] {out_path} already exists — pass --force to overwrite.")
        return 1

    # MUST calibrate on RAW frames: undistort=False, else we would model the residual of
    # an already-corrected image.
    cap = open_camera(camera, spec=CameraSpec(source=camera, undistort=False))
    if not cap.isOpened():
        print(f"[FAIL] camera {camera!r} could not be opened.")
        return 1

    pattern = (int(cols), int(rows))
    objp = object_points(cols, rows, square_mm)
    obj_points: list[np.ndarray] = []
    img_points: list[np.ndarray] = []
    accepted: list[np.ndarray] = []
    cov: CoverageGrid | None = None
    best_tilt = 0.0
    size: tuple[int, int] | None = None
    last_capture = 0.0

    win = "chesslab lens calibrate"
    cv2.namedWindow(win, cv2.WINDOW_NORMAL)
    print(f"Hold a printed {cols}x{rows}-inner-corner chessboard (a normal 8x8 board) in view.")
    print("Frames are captured AUTOMATICALLY — just move the board around slowly: corners,")
    print("edges, and tilted from several angles. q = quit, space = force capture, u = undo.")
    print("NOTE: click the camera window first so key presses register.")

    import time as _time
    try:
        while True:
            ok, frame = cap.read()
            if not ok or frame is None:
                if (cv2.waitKey(30) & 0xFF) in (ord("q"), 27):
                    print("[FAIL] no frame from camera.")
                    return 1
                continue
            h, w = frame.shape[:2]
            if size is None:
                size, cov = (w, h), CoverageGrid(w, h)

            # Preview detection runs on a DOWNSCALED copy with FAST_CHECK — full-res
            # detection at 1440p/4K would drop the preview to a crawl.
            scale = min(1.0, preview_max_w / float(w))
            small = (cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
                     if scale < 1.0 else frame)
            gray_small = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            found, corners_small = _find_corners(gray_small, pattern, fast=True)

            view = small.copy()
            if found:
                cv2.drawChessboardCorners(view, pattern, corners_small, True)
                _banner(view, f"PATTERN FOUND   {len(img_points)}/{min_frames}", (0, 255, 0))
            else:
                _banner(view, f"PATTERN NOT FOUND   {len(img_points)}/{min_frames}", (0, 0, 255))
            if cov is not None:
                _draw_coverage(view, cov)
                miss = cov.missing()
                hint = ("move board to " + miss[0]) if miss else (
                    "tilt the board more" if best_tilt < 0.12 else "coverage OK")
                cv2.putText(view, hint, (10, view.shape[0] - 16), cv2.FONT_HERSHEY_SIMPLEX,
                            0.6, (0, 220, 255), 2, cv2.LINE_AA)
            cv2.imshow(win, view)
            key = cv2.waitKey(1) & 0xFF

            if key in (ord("q"), 27):
                break
            if key == ord("u") and img_points:
                obj_points.pop(); img_points.pop(); accepted.pop()
                print(f"[undo] {len(img_points)} views left (coverage HUD keeps its history).")
                continue

            now = _time.time()
            forced = key == ord(" ")
            if not found or (not forced and (now - last_capture) < cooldown_s):
                continue
            # Scale the preview corners back and re-detect at FULL resolution — sub-pixel
            # accuracy is the whole point and cannot come from a downscaled image.
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            ok_full, corners = _find_corners(gray, pattern, fast=False)
            if not ok_full:
                continue
            corners = _refine(gray, corners)
            nov = pose_novelty(corners, accepted)
            if not forced and nov < novelty_px:
                continue

            obj_points.append(objp.copy())
            img_points.append(corners)
            accepted.append(corners.reshape(-1, 2).copy())
            if cov is not None:
                cov.add(corners.reshape(-1, 2))
            best_tilt = max(best_tilt, tilt_score(corners.reshape(-1, 2)))
            last_capture = now
            print(f"[capture] view {len(img_points)} (novelty {nov:.0f}px, "
                  f"coverage {cov.fraction:.0%} , tilt {best_tilt:.2f})")

            # Auto-finish: enough views AND the image is adequately covered.
            if len(img_points) >= min_frames and cov is not None and cov.fraction >= 0.9:
                print("[auto] coverage adequate — calibrating.")
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()

    if len(img_points) < min_frames:
        print(f"[FAIL] only {len(img_points)}/{min_frames} views captured — nothing saved.")
        return 1

    return _solve_and_save(obj_points, img_points, size, out_path, alpha=alpha, pattern=pattern)


def _solve_and_save(obj_points, img_points, size, out_path: Path, *, alpha: float | None,
                    pattern: tuple[int, int]) -> int:
    """Run `calibrateCamera`, report RMS + per-view error, persist the result."""
    rms, k, d, rvecs, tvecs = cv2.calibrateCamera(obj_points, img_points, size, None, None)
    print(f"\nRMS reprojection error: {rms:.4f} px  ({len(img_points)} views, {size[0]}x{size[1]})")
    for i, (rv, tv) in enumerate(zip(rvecs, tvecs, strict=True)):
        proj, _ = cv2.projectPoints(obj_points[i], rv, tv, k, d)
        err = float(cv2.norm(img_points[i], proj, cv2.NORM_L2) / len(proj))
        print(f"  view {i:>2}: {err:.4f} px")
    if rms > 1.0:
        print("[WARN] RMS > 1.0 px — the solve is poor. Re-shoot with a flat, well-lit board "
              "and more tilt/coverage variety.")
    print(f"\nK = fx {k[0, 0]:.1f}  fy {k[1, 1]:.1f}  cx {k[0, 2]:.1f}  cy {k[1, 2]:.1f}")
    print("D = " + " ".join(f"{v:.5f}" for v in np.asarray(d).ravel()))

    calib = LensCalibration(camera_matrix=np.asarray(k, dtype=np.float64),
                            dist_coeffs=np.asarray(d, dtype=np.float64).ravel(),
                            image_size=(int(size[0]), int(size[1])), rms=float(rms),
                            created_at=datetime.now(UTC).isoformat(),
                            id=calib_id(k, d))
    save(out_path, calib, n_frames=len(img_points), pattern=pattern)
    print(f"\n[OK] lens calibration saved: {out_path}  (id {calib.id})")
    if alpha is not None:
        print(f"     (--alpha {alpha} is a capture-time knob; set config.LENS.alpha to persist it)")
    _invalidate_profiles(calib)
    return 0


def _invalidate_profiles(calib: LensCalibration) -> None:
    """Re-stamp every board profile so nobody has to re-run `calibrate auto` by hand.

    The profiles' K/D now describe the WRONG optics (raw lens on undistorted frames), so
    we write the new optimal K + zero distortion straight into them. Corner geometry
    itself is re-detected per frame from ArUco anyway, and a profile that cannot be
    re-stamped is simply left for `ensure_profile` to regenerate on next use.
    """
    from .calibration import CalibrationProfile

    d = config.DATA.calibration
    if not d.is_dir():
        return
    for p in sorted(d.glob("*.yaml")):
        try:
            prof = CalibrationProfile.load(p)
            stamp_profile(prof, frame_size=calib.image_size)
            prof.save(p)
            print(f"[OK] board profile '{prof.profile}' re-stamped for lens {calib.id}.")
        except Exception as e:  # noqa: BLE001 — never let bookkeeping break the calibration
            log.warning("could not re-stamp board profile %s: %r", p.name, e)


def lens_show(path: str | None = None) -> int:
    """Print the stored lens calibration (or explain that there is none)."""
    p = Path(path) if path else default_path()
    if not p.exists():
        print(f"[FAIL] no lens calibration at {p} — run `chesslab lens calibrate`.")
        return 1
    calib = load(p)
    if calib is None:
        print(f"[FAIL] {p} exists but could not be read.")
        return 1
    print(f"lens calibration: {p}")
    print(f"  id          {calib.id}")
    print(f"  created_at  {calib.created_at or '?'}")
    print(f"  image_size  {calib.image_size[0]}x{calib.image_size[1]}")
    print(f"  rms         {calib.rms:.4f} px" + ("   [WARN] > 1.0" if calib.rms > 1.0 else ""))
    print(f"  fx {calib.camera_matrix[0, 0]:.1f}  fy {calib.camera_matrix[1, 1]:.1f}  "
          f"cx {calib.camera_matrix[0, 2]:.1f}  cy {calib.camera_matrix[1, 2]:.1f}")
    print("  dist        " + " ".join(f"{v:.5f}" for v in calib.dist_coeffs))
    print("\nNOTE: with the 5-50 mm varifocal lens this is only valid at the zoom/focus it was "
          "shot at — re-run `chesslab lens calibrate` after touching the lens.")
    return 0
