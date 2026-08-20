"""Camera LENS undistortion — the optical model of the physical lens.

NOT to be confused with `calibration.py`, which is BOARD geometry (ArUco corners,
homography, per-square crops). This module knows only about the lens: it loads an
intrinsics file (`calib.npz`, written by `chesslab lens calibrate-board`) and remaps raw
camera frames so that straight lines in the world stay straight in the image.

**Never remap on replay.** Python stopped opening the live camera on 2026-08-20 (Kotlin
owns it), so nothing here is applied at capture time any more. Everything that replays
ALREADY-RECORDED pixels — `labeling.py`, `ingest.py`, `web/routers/sessions.py` — reads
frames with `cv2.imread`: the frame on disk and the board corners stored next to it were
captured together and stay internally consistent. `active()` hands out the undistorter
for a source that genuinely still needs one.

**Output size is preserved.** We deliberately do NOT crop to the valid ROI returned by
`getOptimalNewCameraMatrix`, so an undistorted frame has exactly the same (w, h) as the
raw one and `frame_size` in profiles/sessions stays invariant. `alpha` only trades black
border against field of view (0 = no black borders, 1 = keep all source pixels).

**Varifocal warning.** The rig's 5–50 mm CS-mount lens changes its intrinsics whenever
zoom or focus is touched. A calibration is only valid for the setting it was shot at —
`DriftMonitor` watches for that and tells the user to re-run `lens calibrate-board`.
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
        """K valid for the UNDISTORTED frames — this is what a profile must be stamped with.

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
    distortion a SECOND time — silent, systematic geometry error. This is the check that
    catches it; the caller regenerates or re-stamps.
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
    distortion — the remap has already removed it. Returns True if the profile's lens stamp
    or intrinsics were actually modified.

    CRUCIAL: the stamp must describe what really happens to frames OF THIS SIZE. A
    calibration exists is not enough — `Undistorter.maps_for` refuses a frame whose aspect
    ratio differs from the calibration's and passes those frames through UNTOUCHED. Frames
    are then fully distorted, so the profile must say `undistorted=False`; claiming
    otherwise makes `profile_is_stale` report clean, `doctor` print PASS, and `collect`
    stamp `undistorted: true` into a session recorded through raw optics — exactly the
    distorted/undistorted mixing this metadata exists to prevent.
    """
    had = (bool(getattr(profile, "undistorted", False)),
           getattr(profile, "lens_calib_id", None))
    und = active(source)
    maps = None
    size = tuple(frame_size or getattr(profile, "frame_size", ()) or ())
    if und is not None and len(size) == 2:
        maps = und.maps_for(int(size[0]), int(size[1]))
    if und is None or maps is None:
        if und is not None:
            log.warning(
                "board profile %r is NOT marked undistorted: the lens calibration cannot be "
                "applied to %s frames.", getattr(profile, "profile", "?"),
                "x".join(str(int(v)) for v in size) or "unknown-size")
        profile.undistorted = False
        profile.lens_calib_id = None
        return had != (False, None)
    k = und.new_camera_matrix
    profile.undistorted = True
    profile.lens_calib_id = und.calib.id
    changed = had != (True, und.calib.id)
    if k is not None:
        profile.camera_matrix = [[float(v) for v in row] for row in np.asarray(k)]
        profile.dist_coeffs = [0.0] * 5
        changed = True
    return changed


_SUBPIX_CRITERIA = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)


# --- `chesslab lens show` -------------------------------------------------------------


def profile_source(profile):
    """The capture source a board profile describes, for the undistortion source policy.

    An explicit `source` (URL / file path) wins; otherwise a local camera index >= 0 IS the
    rig camera. Anything else (index -1 = recorded frames / offline ingest) is deliberately
    returned as a non-numeric string so `should_undistort` takes its file branch.
    """
    src = getattr(profile, "source", None)
    if isinstance(src, str) and src.strip():
        return src.strip()
    idx = getattr(profile, "camera_index", -1)
    idx = -1 if idx is None else int(idx)     # NOT `or -1`: index 0 is a valid camera
    return idx if idx >= 0 else "offline"


def _invalidate_profiles(calib: LensCalibration) -> None:
    """Re-stamp every board profile so nobody has to re-stamp by hand.

    The profiles' K/D now describe the WRONG optics (raw lens on undistorted frames), so
    we write the new optimal K + zero distortion straight into them. Corner geometry
    itself is re-detected per frame from ArUco anyway, and a profile that cannot be
    re-stamped is simply left for `ensure_profile` to regenerate on next use.

    Two things are strictly per-profile here:

    * The SOURCE. This lens belongs to the rig camera; a profile for the phone/IP cam (a
      URL) or for recorded frames is never undistorted, so it must be left completely
      alone. Re-stamping it with the rig's K would corrupt `track --profile phone`.
    * The RESOLUTION. K scales with the frame size, so the stamp must be computed for the
      PROFILE's `frame_size`, not for the size the lens happened to be calibrated at —
      otherwise a 1440p profile gets 4K intrinsics while its `image_corners` stay in 1440p
      pixels, and the two no longer describe the same picture.
    """
    from .calibration import CalibrationProfile

    d = config.DATA.calibration
    if not d.is_dir():
        return
    for p in sorted(d.glob("*.yaml")):
        try:
            prof = CalibrationProfile.load(p)
            src = profile_source(prof)
            if not should_undistort(src):
                log.info("board profile '%s' (source %r) is never undistorted — left untouched.",
                         prof.profile, src)
                continue
            size = tuple(prof.frame_size or ())
            if len(size) != 2 or not all(int(v) > 0 for v in size):
                log.warning("board profile '%s' has no usable frame_size — not re-stamped.",
                            prof.profile)
                continue
            if not stamp_profile(prof, frame_size=size, source=src):
                continue
            prof.save(p, backup=True)
            print(f"[OK] board profile '{prof.profile}' re-stamped for lens {calib.id}.")
        except Exception as e:  # noqa: BLE001 — never let bookkeeping break the calibration
            log.warning("could not re-stamp board profile %s: %r", p.name, e)


# --- `chesslab lens calibrate-board` — zero-interaction calibration from sessions ------
#
# The recorded sessions in `data/sessions/` already ARE a calibration dataset: every real
# session stores per-frame board corners (`[a8, h8, h1, a1]` marker centres) next to the
# frame image, and the physical board is an 8x8 checker whose 7x7 INNER corners are a
# planar calibration grid with precisely known geometry. Different sessions were recorded
# with the camera re-mounted at different heights/angles, so across sessions we get the
# pose variety `calibrateCamera` needs — without the user ever waving a printed pattern.
#
# Detection is ARUCO-GUIDED, not `findChessboardCornersSB`: pieces stand on the board in
# almost every recorded frame, so a full-grid detector fails, while we already know the
# board's exact location from the logged corners. We project the ideal 7x7 lattice through
# the corner homography, refine each intersection with `cornerSubPix`, and keep only the
# points that (a) stayed near their prediction and (b) show real checker contrast in their
# four quadrants — occluded intersections fail one of the two and drop out. Partial grids
# are fine: `calibrateCamera` accepts a different point subset per view.

@dataclass
class BoardGridView:
    """The detected inner-grid corners of ONE session frame — one `calibrateCamera` view.

    `quad` is the logged board quad (marker centres, a8/h8/h1/a1) used for pose gating,
    `img_points` the accepted refined corners (N,1,2 float32), `obj_points` their planar
    board coordinates in CELL units (N,3 float32, z == 0), `grid_idx` the (col, row)
    lattice index of each point (1..7) so bow lines can be regrouped later.
    """

    session_id: str
    frame: str
    image_size: tuple[int, int]
    quad: np.ndarray
    img_points: np.ndarray
    obj_points: np.ndarray
    grid_idx: np.ndarray

    @property
    def n_points(self) -> int:
        return int(len(self.obj_points))


def _lattice_from_quad(quad, margin: float) -> np.ndarray | None:
    """Project the ideal 9x9 board lattice (cell units) through the quad's homography.

    The logged corners are MARKER CENTRES which sit `margin` (fraction of the board edge)
    OUTSIDE the playing field — same convention as `calibration.compute_homography`. The
    returned array is (9, 9, 2) pixel positions of lattice point (col i, row j) at
    `[j, i]`; inner corners are `[1..7, 1..7]`. None for a degenerate quad.
    """
    q = np.asarray(quad, dtype=np.float32).reshape(-1, 2)
    if q.shape != (4, 2) or not np.isfinite(q).all():
        return None
    m = float(margin) * 8.0
    src = np.array([[-m, -m], [8 + m, -m], [8 + m, 8 + m], [-m, 8 + m]], dtype=np.float32)
    try:
        h = cv2.getPerspectiveTransform(src, q)
    except cv2.error:
        return None
    cells = np.array([[[float(i), float(j)] for i in range(9)] for j in range(9)],
                     dtype=np.float32)
    proj = cv2.perspectiveTransform(cells.reshape(-1, 1, 2), h)
    if proj is None or not np.isfinite(proj).all():
        return None
    return proj.reshape(9, 9, 2)


def _patch_mean(gray, pt) -> float | None:
    """Mean intensity of a 3x3 patch at a sub-pixel position (None outside the image)."""
    x, y = float(pt[0]), float(pt[1])
    h, w = gray.shape[:2]
    if not (1.0 <= x <= w - 2.0 and 1.0 <= y <= h - 2.0):
        return None
    return float(cv2.getRectSubPix(gray, (3, 3), (x, y)).mean())


def detect_grid_points(gray, quad, *, margin: float = 0.06, min_points: int = 20,
                       min_contrast: float = 10.0, max_shift_frac: float = 0.3):
    """ArUco-guided detection of the board's inner 7x7 corners in one frame.

    Returns (img_points (N,1,2) f32, obj_points (N,3) f32 in cell units, grid_idx (N,2)
    int) or None when fewer than `min_points` intersections survive validation. Each
    lattice prediction is refined with `cornerSubPix` and kept only if the refinement
    stayed within `max_shift_frac` of a cell AND its four quadrants show checker contrast
    of at least `min_contrast` grey levels — that is what rejects piece-occluded corners.
    """
    lattice = _lattice_from_quad(quad, margin)
    if lattice is None:
        return None
    h, w = gray.shape[:2]
    inner = lattice[1:8, 1:8].reshape(-1, 2)                    # row-major: j outer, i inner
    idx = np.array([(i, j) for j in range(1, 8) for i in range(1, 8)], dtype=np.int32)
    # Local cell size drives the refinement window: big enough to lock onto the true
    # corner despite the distortion residual, small enough not to swallow a neighbour.
    cell_px = float(np.linalg.norm(lattice[0, 1] - lattice[0, 0]) +
                    np.linalg.norm(lattice[1, 0] - lattice[0, 0])) / 2.0
    if not np.isfinite(cell_px) or cell_px < 8.0:
        return None                                             # board too small to refine
    win = int(np.clip(round(cell_px * 0.2), 4, 15))
    inside = ((inner[:, 0] > win + 2) & (inner[:, 0] < w - win - 3) &
              (inner[:, 1] > win + 2) & (inner[:, 1] < h - win - 3))
    inner, idx = inner[inside], idx[inside]
    if len(inner) < min_points:
        return None
    guesses = inner.reshape(-1, 1, 2).astype(np.float32).copy()
    refined = cv2.cornerSubPix(gray, guesses, (win, win), (-1, -1), _SUBPIX_CRITERIA)
    refined = refined.reshape(-1, 2)

    keep_img: list[np.ndarray] = []
    keep_idx: list[np.ndarray] = []
    max_shift = max_shift_frac * cell_px
    for p, p0, (i, j) in zip(refined, inner, idx, strict=True):
        if float(np.linalg.norm(p - p0)) > max_shift:
            continue                                            # ran away → occluded/blurred
        # Grid-aligned quadrant directions from the projected lattice neighbours.
        du = (lattice[j, i + 1] - lattice[j, i - 1]) / 2.0
        dv = (lattice[j + 1, i] - lattice[j - 1, i]) / 2.0
        means = [_patch_mean(gray, p + 0.25 * (su * du + sv * dv))
                 for su, sv in ((1, 1), (-1, 1), (-1, -1), (1, -1))]
        if any(v is None for v in means):
            continue
        if abs((means[0] + means[2]) / 2.0 - (means[1] + means[3]) / 2.0) < min_contrast:
            continue                                            # no checker X → piece on top
        keep_img.append(p)
        keep_idx.append(np.array([i, j], dtype=np.int32))
    if len(keep_img) < min_points:
        return None
    img_pts = np.asarray(keep_img, dtype=np.float32).reshape(-1, 1, 2)
    grid_idx = np.asarray(keep_idx, dtype=np.int32)
    obj_pts = np.zeros((len(grid_idx), 3), dtype=np.float32)
    obj_pts[:, 0] = grid_idx[:, 0]
    obj_pts[:, 1] = grid_idx[:, 1]
    return img_pts, obj_pts, grid_idx


def view_line_bows(img_points, grid_idx, camera_matrix=None, dist_coeffs=None) -> list[float]:
    """`edge_bow` of every full-enough grid row/column of one view (>= 4 points each).

    With K/D given, the points are undistorted first (P=K keeps pixel scale) — comparing
    the returned bows with and without K/D quantifies how much straighter the solved
    model makes the board's real lines.
    """
    pts = np.asarray(img_points, dtype=np.float64).reshape(-1, 2)
    if camera_matrix is not None and dist_coeffs is not None and len(pts):
        und = cv2.undistortPoints(pts.reshape(-1, 1, 2).astype(np.float64),
                                  np.asarray(camera_matrix, dtype=np.float64),
                                  np.asarray(dist_coeffs, dtype=np.float64),
                                  P=np.asarray(camera_matrix, dtype=np.float64))
        pts = und.reshape(-1, 2)
    idx = np.asarray(grid_idx, dtype=np.int32).reshape(-1, 2)
    bows: list[float] = []
    for axis in (0, 1):                                         # 0: columns (i fixed), 1: rows
        for v in np.unique(idx[:, axis]):
            sel = idx[:, axis] == v
            if int(sel.sum()) < 4:
                continue
            order = np.argsort(idx[sel][:, 1 - axis])
            bows.append(edge_bow(pts[sel][order]))
    return bows


def _view_bow(view: BoardGridView, camera_matrix=None, dist_coeffs=None) -> float:
    """Median line bow of one view (robust against a single mis-refined point)."""
    bows = view_line_bows(view.img_points, view.grid_idx, camera_matrix, dist_coeffs)
    return float(np.median(bows)) if bows else 0.0


def gate_board_views(views, image_size, *, min_views: int = 8, novelty_px: float = 30.0,
                     min_coverage: int = 4):
    """Pose-diversity gate over harvested views: (accepted, coverage, best_tilt, refusal).

    Frames of the SAME mount are near-identical (fixed camera) and add nothing but false
    confidence to `calibrateCamera`, so novelty is measured on the board quad against
    every already-accepted view — effectively one view per distinct camera pose survives.
    `refusal` is None when the accepted set is usable, otherwise a printable reason that
    tells the user exactly what is missing.
    """
    w, h = int(image_size[0]), int(image_size[1])
    cov = CoverageGrid(w, h)
    accepted: list[BoardGridView] = []
    quads: list[np.ndarray] = []
    best_tilt = 0.0
    for v in sorted(views, key=lambda v: -v.n_points):
        if pose_novelty(v.quad, quads) < novelty_px:
            continue
        accepted.append(v)
        quads.append(np.asarray(v.quad, dtype=np.float64).reshape(-1, 2))
        cov.add(v.img_points.reshape(-1, 2))
        best_tilt = max(best_tilt, tilt_score(v.img_points.reshape(-1, 2)))
    refusal = None
    if len(accepted) < min_views:
        refusal = (f"only {len(accepted)} sufficiently distinct board poses (need "
                   f">= {min_views}) — the recorded sessions are near-identical (same "
                   "fixed mount). Record sessions with the camera at different "
                   "heights/angles, or run `chesslab lens calibrate` (pattern waving) once.")
    elif cov.covered < min_coverage:
        refusal = (f"grid points cover only {cov.covered}/{cov.n * cov.n} image regions "
                   f"(need >= {min_coverage}); missing: {', '.join(cov.missing())}. "
                   "Distortion cannot be constrained where the board was never seen — "
                   "record sessions with the board nearer the frame edges, or run "
                   "`chesslab lens calibrate` once.")
    return accepted, cov, best_tilt, refusal


@dataclass
class BoardSolveResult:
    """`calibrateCamera` outcome over accepted board views + held-out validation."""

    rms: float
    camera_matrix: np.ndarray
    dist_coeffs: np.ndarray
    image_size: tuple[int, int]
    n_views: int
    tilt: float
    holdout: str                 # "session/frame" of the validation view
    bow_before: float            # median line bow of the held-out view, raw pixels
    bow_after: float             # same lines after undistorting with the solved model


# Below this apparent tilt the poses are effectively all frontal — focal length and
# principal point are then unobservable and get FIXED to the guess so only the
# distortion coefficients (the thing we are actually after) absorb the residual.
_MIN_TILT_FOR_FULL_SOLVE = 0.06


def solve_board_views(accepted, image_size, *, f_guess: float | None = None) -> BoardSolveResult:
    """Solve K/D from gated board views; the richest view is HELD OUT for validation.

    The distortion model is deliberately restricted for weak pose variety: aspect ratio
    fixed, tangential terms zero, k3 fixed — recorded top-down sessions cannot constrain
    more, and a freed-up parameter would just soak noise into a confidently wrong model.
    """
    w, h = int(image_size[0]), int(image_size[1])
    views = sorted(accepted, key=lambda v: -v.n_points)
    hold, solve_set = views[0], views[1:]
    tilt = max((tilt_score(v.img_points.reshape(-1, 2)) for v in views), default=0.0)

    f = float(f_guess) if f_guess else float(max(w, h))
    k0 = np.array([[f, 0.0, w / 2.0], [0.0, f, h / 2.0], [0.0, 0.0, 1.0]], dtype=np.float64)
    flags = (cv2.CALIB_USE_INTRINSIC_GUESS | cv2.CALIB_FIX_ASPECT_RATIO |
             cv2.CALIB_ZERO_TANGENT_DIST | cv2.CALIB_FIX_K3)
    if tilt < _MIN_TILT_FOR_FULL_SOLVE:
        flags |= cv2.CALIB_FIX_FOCAL_LENGTH | cv2.CALIB_FIX_PRINCIPAL_POINT
    obj = [v.obj_points for v in solve_set]
    img = [v.img_points for v in solve_set]
    rms, k, d, _rv, _tv = cv2.calibrateCamera(obj, img, (w, h), k0, None, flags=flags)
    d = np.asarray(d, dtype=np.float64).ravel()
    if d.size < 5:                                              # normalise to the 5-vector
        d = np.pad(d, (0, 5 - d.size))
    return BoardSolveResult(
        rms=float(rms), camera_matrix=np.asarray(k, dtype=np.float64), dist_coeffs=d,
        image_size=(w, h), n_views=len(solve_set), tilt=float(tilt),
        holdout=f"{hold.session_id}/{hold.frame}",
        bow_before=_view_bow(hold), bow_after=_view_bow(hold, k, d))


def board_solve_acceptable(res: BoardSolveResult, *, max_rms: float = 2.0,
                           max_bow_ratio: float = 0.8,
                           min_bow: float = 2e-4) -> tuple[bool, str]:
    """Should this solve be saved? (ok, reason) — the reason is printed either way.

    Refuses when the held-out board lines do not get meaningfully STRAIGHTER (bow_after
    must drop below `max_bow_ratio` x bow_before), when there was nothing to fix in the
    first place (bow_before < `min_bow` — saving would replace 'no model' with noise), or
    when the reprojection RMS says the solve itself is poor.
    """
    if res.rms > max_rms:
        return False, (f"reprojection RMS {res.rms:.3f} px > {max_rms} — the solve is "
                       "poor (bad detections or too little pose variety).")
    if res.bow_before < min_bow:
        return False, (f"held-out board lines are already straight (bow "
                       f"{res.bow_before:.5f} < {min_bow}) — no distortion left to "
                       "correct, nothing saved.")
    if res.bow_after >= res.bow_before * max_bow_ratio:
        return False, (f"undistortion does not straighten the held-out board lines "
                       f"(bow {res.bow_before:.5f} -> {res.bow_after:.5f}, need "
                       f"<= {res.bow_before * max_bow_ratio:.5f}) — refusing to save a "
                       "model that would not fix anything.")
    return True, (f"held-out bow {res.bow_before:.5f} -> {res.bow_after:.5f} "
                  f"({(1 - res.bow_after / res.bow_before) * 100.0:.0f}% straighter), "
                  f"RMS {res.rms:.3f} px.")


def _session_margin(profile_name: str, cache: dict) -> float:
    """The board-corner margin of a session's profile (default 0.06 when unknown)."""
    if profile_name not in cache:
        margin = 0.06
        try:
            from .calibration import CalibrationProfile
            p = config.DATA.calibration / f"{profile_name}.yaml"
            if p.exists():
                margin = float(CalibrationProfile.load(p).margin)
        except Exception as e:  # noqa: BLE001 — a broken profile must not kill the harvest
            log.warning("could not read margin from profile %r (%r) — using 0.06.",
                        profile_name, e)
        cache[profile_name] = margin
    return cache[profile_name]


def harvest_board_views(sessions_dir: Path | None = None, *, profile: str | None = None,
                        max_frames_per_session: int = 6, min_points: int = 20,
                        min_contrast: float = 10.0):
    """Read-only sweep over `data/sessions/`: (views, stats). Never writes anything.

    Skipped entirely: synthetic/ingested sessions (mode 'ingested' or camera_index -1 —
    rendered pixels have no physical lens), sessions recorded through an ACTIVE
    undistortion (their frames are already remapped; calibrating on them would model the
    residual of a corrected image), sessions without readable frames, and — with
    `profile` given — sessions of other board profiles. Within a session at most
    `max_frames_per_session` evenly spaced frames are tried: a fixed camera makes frames
    of one session near-duplicates and the pose gate would drop them anyway.
    """
    from .labeling import read_log, read_session_meta

    root = Path(sessions_dir) if sessions_dir is not None else config.DATA.sessions
    stats = {"sessions": 0, "skipped_synthetic": 0, "skipped_undistorted": 0,
             "skipped_profile": 0, "skipped_no_frames": 0, "frames_tried": 0,
             "frames_detected": 0}
    views: list[BoardGridView] = []
    margins: dict[str, float] = {}
    if not root.is_dir():
        return views, stats
    for sdir in sorted(p for p in root.iterdir() if p.is_dir()):
        try:
            meta = read_session_meta(sdir) or {}
            log_entries = read_log(sdir)
        except Exception:  # noqa: BLE001 — unreadable session = not a candidate
            continue
        stats["sessions"] += 1
        cam_idx = meta.get("camera_index")
        cam_idx = -1 if cam_idx is None else int(cam_idx)
        if meta.get("mode") == "ingested" or cam_idx < 0:
            stats["skipped_synthetic"] += 1
            continue
        if meta.get("undistorted"):
            stats["skipped_undistorted"] += 1
            continue
        prof_name = str(meta.get("profile") or config.DEFAULT_PROFILE)
        if profile is not None and prof_name != profile:
            stats["skipped_profile"] += 1
            continue
        margin = _session_margin(prof_name, margins)
        entries = [e for e in log_entries if e.get("corners") and e.get("frame")]
        if not entries:
            stats["skipped_no_frames"] += 1
            continue
        take = np.unique(np.linspace(0, len(entries) - 1,
                                     min(max_frames_per_session, len(entries))).round().astype(int))
        session_views: list[BoardGridView] = []
        any_frame = False
        for e in (entries[i] for i in take):
            fp = sdir / str(e["frame"])
            frame = cv2.imread(str(fp)) if fp.exists() else None
            if frame is None:
                continue
            any_frame = True
            stats["frames_tried"] += 1
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            det = detect_grid_points(gray, e["corners"], margin=margin,
                                     min_points=min_points, min_contrast=min_contrast)
            if det is None:
                continue
            img_pts, obj_pts, grid_idx = det
            fh, fw = frame.shape[:2]
            session_views.append(BoardGridView(
                session_id=sdir.name, frame=str(e["frame"]), image_size=(fw, fh),
                quad=np.asarray(e["corners"], dtype=np.float64).reshape(-1, 2),
                img_points=img_pts, obj_points=obj_pts, grid_idx=grid_idx))
        if not any_frame:
            stats["skipped_no_frames"] += 1
            continue
        stats["frames_detected"] += len(session_views)
        views.extend(session_views)
    return views, stats


def lens_calibrate_board(sessions: str | None = None, out: str | None = None,
                         force: bool = False, min_views: int = 8,
                         novelty_px: float = 30.0, min_coverage: int = 4,
                         min_points: int = 20, max_frames_per_session: int = 6,
                         profile: str | None = None, size: str | None = None,
                         max_rms: float = 2.0) -> int:
    """`chesslab lens calibrate-board` — calibrate the lens from recorded sessions.

    Zero interaction: harvest board views from disk, gate for pose diversity, solve,
    VALIDATE on a held-out frame (board lines must get straighter) and only then save
    through the same `save()`/re-stamp path as the interactive calibration.
    """
    out_path = Path(out) if out else default_path()
    if out_path.exists() and not force:
        print(f"[FAIL] {out_path} already exists — pass --force to overwrite.")
        return 1

    views, stats = harvest_board_views(
        sessions_dir=Path(sessions) if sessions else None, profile=profile,
        max_frames_per_session=max_frames_per_session, min_points=min_points)
    print(f"harvest: {stats['sessions']} sessions "
          f"({stats['skipped_synthetic']} synthetic/ingested, "
          f"{stats['skipped_undistorted']} already-undistorted, "
          f"{stats['skipped_profile']} other-profile, "
          f"{stats['skipped_no_frames']} without usable frames skipped), "
          f"{stats['frames_tried']} frames tried, {stats['frames_detected']} with a "
          "detectable grid.")
    if not views:
        print("[FAIL] no usable board views found — record real sessions first (collect/"
              "track), or run `chesslab lens calibrate` (pattern waving).")
        return 1

    # One calibration is only valid for ONE capture resolution — group and pick.
    by_size: dict[tuple[int, int], list[BoardGridView]] = {}
    for v in views:
        by_size.setdefault(v.image_size, []).append(v)
    for sz, group in sorted(by_size.items(), key=lambda kv: -len(kv[1])):
        print(f"  {sz[0]}x{sz[1]}: {len(group)} views from "
              f"{len({g.session_id for g in group})} sessions")
    if size:
        try:
            w, h = (int(x) for x in size.lower().split("x"))
        except ValueError:
            print(f"[FAIL] --size {size!r} is not WxH.")
            return 1
        if (w, h) not in by_size:
            print(f"[FAIL] no views at {w}x{h} — see the sizes listed above.")
            return 1
        image_size = (w, h)
    else:
        image_size = max(by_size, key=lambda s: len(by_size[s]))
    group = by_size[image_size]
    print(f"calibrating for {image_size[0]}x{image_size[1]} ({len(group)} candidate views).")

    accepted, cov, best_tilt, refusal = gate_board_views(
        group, image_size, min_views=min_views + 1,   # +1: one view is held out
        novelty_px=novelty_px, min_coverage=min_coverage)
    print(f"pose gate: {len(accepted)} distinct views, coverage "
          f"{cov.covered}/{cov.n * cov.n} regions, best tilt {best_tilt:.2f}.")
    if refusal:
        print(f"[REFUSED] {refusal}")
        return 1

    res = solve_board_views(accepted, image_size)
    if res.tilt < _MIN_TILT_FOR_FULL_SOLVE:
        print(f"[note] all poses are near-frontal (tilt {res.tilt:.2f}) — focal length "
              "and principal point were FIXED to a guess; only the distortion "
              "coefficients were solved (that is what straightens the grid).")
    ok, reason = board_solve_acceptable(res, max_rms=max_rms)
    if not ok:
        print(f"[REFUSED] {reason}")
        return 1

    k, d = res.camera_matrix, res.dist_coeffs
    print(f"\nRMS reprojection error: {res.rms:.4f} px  ({res.n_views} views, "
          f"{image_size[0]}x{image_size[1]}, held out: {res.holdout})")
    print(f"K = fx {k[0, 0]:.1f}  fy {k[1, 1]:.1f}  cx {k[0, 2]:.1f}  cy {k[1, 2]:.1f}")
    print("D = " + " ".join(f"{v:.5f}" for v in d))
    print(f"validation: {reason}")

    calib = LensCalibration(camera_matrix=k, dist_coeffs=d, image_size=image_size,
                            rms=res.rms, created_at=datetime.now(UTC).isoformat(),
                            id=calib_id(k, d))
    save(out_path, calib, n_frames=res.n_views, pattern=(7, 7))
    print(f"\n[OK] lens calibration saved: {out_path}  (id {calib.id})")
    _invalidate_profiles(calib)
    return 0


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
