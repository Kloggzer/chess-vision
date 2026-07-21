"""Self-contained camera library for chesslab — the ONE place that knows how to open a
video source correctly.

Why this exists: `cv2.VideoCapture` on Windows silently caps USB webcams at 640×480,
drivers disagree on backends (DSHOW vs MSMF), `CAP_PROP_FPS` both lies and can collapse
the resolution, and the pixel-format negotiation is order-dependent in a way that is
widely documented BACKWARDS. This module centralizes all of that behind a small interface
so no caller has to think about it again.

Proven facts encoded here (dev machine, ELP-U3CAM4K60-IB / IMX678): a USB 4K cam needs a
DIRECT USB-3 port (an external hub throttled it to 1.4 fps); MSMF never exposes 4K on that
cam (so DSHOW stays the default int-backend on Windows).

MJPG does NOT engage on this cam via DSHOW as the code currently asks for it, and the old
claim that OpenCV "mislabels" the codec was wrong: `CAP_PROP_FOURCC` reads back YUY2
because YUY2 is what runs.

ROOT CAUSE — and it is the FOURCC-first order itself, not driver indifference: OpenCV's
DSHOW backend tries the requested subtype, fails, and silently falls back through a
hardcoded list in `cap_dshow.cpp` where YUY2 (index 4) beats MJPG (index 15) whenever both
offer the resolution. Worse, `setProperty(CAP_PROP_FOURCC)` applies immediately and then
resets `m_fourcc = -1`, so a LATER width/height renegotiates with no FOURCC at all and
discards the MJPG selection. See opencv#7013 (open since 2016). The widely repeated advice
to set FOURCC *before* the resolution is therefore backwards for OpenCV 4.x — measurement
here confirms MJPG engages as soon as FOURCC is set LAST or passed to the open-time params
constructor. The device really can do 4K60 MJPEG (`pygrabber` GetStreamCaps lists
`MJPG 3840x2160 fps 60..10`).

WE STILL DO NOT ENGAGE IT — measured on a normally lit scene (an earlier run with the lens
cap on was confounded: a black scene lets auto-exposure ramp the integration time and throttle
the rate for reasons unrelated to the pixel format). Unique frames, byte-identical duplicates
excluded, `scripts/probe_camera_mjpeg.py`:

    mode     current (YUY2)        MJPG (open-params)     verdict
    4K       22.9 fps @0.93 cores  18.9 fps @1.38 cores   MJPG is SLOWER
    1440p    29.9 fps @0.55        37.3 fps @1.18         +25% for 2x the CPU
    1080p    59.9 fps @0.59        36.7 fps @0.68         MJPG is far SLOWER

Uncapped, YUY2 reaches its datasheet limits (4K 22.9 ≈ 23, 1440p 29.9 ≈ 30, 1080p 59.9 ≈ 60),
so the capture path is already extracting everything the uncompressed mode offers. MJPG never
approaches 60 anywhere — and at 1080p it stalls at 37 while using only 0.68 cores, so it is not
even purely decode-bound there. The device really can emit 4K60 MJPEG (pygrabber GetStreamCaps
lists `MJPG 3840x2160 fps 60..10`); it simply does not survive the trip through OpenCV. Net:
keeping the FOURCC-first order costs nothing at 4K/1080p, loses 25% at 1440p, and saves ~0.6
CPU cores that the CNN and tracker need.

*** NEVER SET `CAP_PROP_FPS` TO 60 *** — measured, in all three modes: the resolution silently
collapses to 640x480 while the fps reads a triumphant 60.0. `config.CAMERA.fps = 30` is safe
(the rows above used it), but any caller passing `CameraSpec(fps=60)` will get VGA. This is a
live trap for the `--res` / UI mode selector: the delivered-vs-requested readout would flag the
mismatch, but the cause would be baffling.

Unexplained and worth knowing: the YUY2 rows come out ~6x darker than the MJPG rows on the same
scene (mean 2.5-2.9 vs 16-17) regardless of resolution or frame rate, so it is not an exposure
side effect of the rate. Possibly a limited-vs-full-range conversion difference. Captured data
looks correctly exposed in practice, so this has not bitten anything — but it makes the
brightness column unsuitable as evidence for anything else.

Also settled: MSMF is a dead end (hard-stuck at 2560x1440 whatever is requested, rejects FOURCC
outright, and its apparent ~60 fps was 27-43% byte-identical duplicate frames).
`CAP_PROP_CONVERT_RGB=0` returns raw JPEG only on V4L2; DSHOW ignores it and MSMF hands back a
raw NV12 buffer that would break every consumer. `CAP_FFMPEG` cannot open a dshow device in
this build (`avdevice: NO`).

Public interface:
    CameraSpec           — declarative "what I want" (source, resolution, fps, controls).
    spec_for_mode(name)  — named mode from `config.CAMERA_MODES` ("1440p", "4k", …) → spec.
    open_capture(spec)   — cv2.VideoCapture-compatible object, quirks handled.
    open_camera(source)  — back-compat convenience (defaults from config.CAMERA).
    open_source(source)  — URL → network grabber, else local index/path.
    Camera(spec)         — rich wrapper: context manager, settings(), measure_fps().
    list_devices()       — enumerate connected cameras (name + index).
    probe(source)        — measure delivered resolution + REAL fps per mode/backend.

URL grabbers (`UrlSnapshotCapture`, `_UrlMjpegCapture`) and the grab-latest wrapper
(`LatestFrame`) live here as their single home; consumers import them from here directly.

Lens undistortion (`chesslab/lens.py`) is applied here and NOWHERE else: `open_capture`
wraps the finished capture in `_UndistortCapture`. Paths that replay already-recorded
pixels — `labeling.py`, `ingest.py`, `web/routers/sessions.py` — read frames via
`cv2.imread` and never go through `open_capture`, so a recorded session can never be
undistorted a second time.
"""

from __future__ import annotations

import logging
import ssl
import sys
import threading
import time
import urllib.request
from dataclasses import dataclass, field

import cv2
import numpy as np

from . import config

log = logging.getLogger("chesslab.camera")

# --- Data model -----------------------------------------------------------------------

@dataclass
class CameraSpec:
    """Everything a caller might want to set — all optional. `None` resolution/fps fall
    back to `config.CAMERA` (the single place to switch the default mode, e.g. 1440p↔4K).

    `source`: int index (USB), `http(s)://…` URL (IP cam), or a file path (clip/image).
    `backend`: ``auto`` (Windows→DSHOW, else default) | ``dshow`` | ``msmf`` | ``any``.
    Controls (USB only, best-effort): `exposure` (DSHOW = log2 seconds, e.g. -6 = 1/64 s),
    `gain`, `white_balance` (Kelvin), `focus`, `autofocus`. `extra_props` is an escape
    hatch mapping raw ``cv2.CAP_PROP_*`` → value for anything not modeled here.
    """

    source: int | str = 0
    width: int | None = None
    height: int | None = None
    fps: int | None = None
    fourcc: str | None = "MJPG"
    backend: str = "auto"
    warmup: int = 4
    latest: bool = False
    url_mode: str = "auto"          # auto | snapshot | mjpeg
    # Lens undistortion (see chesslab/lens.py). None = auto by source type: local int
    # index → ON (that's the calibrated rig camera), URL → OFF (phone/IP cam, different
    # lens), file path → OFF (already-captured pixels). True/False override.
    undistort: bool | None = None
    # optics controls
    exposure: float | None = None
    gain: float | None = None
    white_balance: float | None = None
    focus: float | None = None
    autofocus: bool | None = None
    extra_props: dict[int, float] = field(default_factory=dict)


@dataclass
class DeviceInfo:
    """A connected camera. `index` is the OpenCV capture index (the authoritative handle);
    `name` is best-effort (Windows PnP friendly name), `present` = a frame could be read."""

    index: int
    name: str
    present: bool


@dataclass
class ModeResult:
    """Outcome of requesting one resolution on one backend."""

    backend: str
    requested: tuple[int, int]
    delivered: tuple[int, int]
    codec: str
    fps: float

    @property
    def ok(self) -> bool:
        return self.delivered == self.requested


# --- URL grabbers (single home; imported directly by consumers) -----------------------

class UrlSnapshotCapture:
    """cv2.VideoCapture-compatible grabber for a JPEG snapshot URL (e.g. Android IP Camera
    `/video/snapshot`). `cv2.VideoCapture` fails on self-signed HTTPS — so we fetch the
    bytes via urllib (TLS verification off) and decode with `cv2.imdecode`. One image per
    `read()` (sufficient for calibration/collect preview at a few FPS)."""

    def __init__(self, url: str, timeout: float = 4.0) -> None:
        self.url = url
        self.timeout = timeout
        self._ctx = ssl.create_default_context()
        self._ctx.check_hostname = False
        self._ctx.verify_mode = ssl.CERT_NONE     # accept self-signed cert
        self._ok = True

    def isOpened(self) -> bool:
        return self._ok

    def read(self):
        if not self._ok:
            return False, None
        try:
            data = urllib.request.urlopen(self.url, timeout=self.timeout, context=self._ctx).read()
            img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
            return (img is not None), img
        except Exception:  # noqa: BLE001 — network/timeout: treat like an empty frame
            return False, None

    def release(self) -> None:
        self._ok = False


class _UrlMjpegCapture:
    """cv2.VideoCapture-compatible reader for an MJPEG stream (multipart/x-mixed-replace),
    e.g. Android IP Camera `/video/m.jpeg`. Holds ONE open connection (self-signed HTTPS
    via urllib, TLS verification off) and extracts the next JPEG on each `read()` by looking
    for SOI/EOI markers (0xFFD8 … 0xFFD9) in the buffer — much smoother than snapshots."""

    def __init__(self, url: str, timeout: float = 10.0) -> None:
        self.url = url
        self.timeout = timeout
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        self._stream = urllib.request.urlopen(url, timeout=timeout, context=ctx)
        self._buf = bytearray()
        self._ok = True

    def isOpened(self) -> bool:
        return self._ok

    def read(self):
        if not self._ok:
            return False, None
        try:
            while True:
                a = self._buf.find(b"\xff\xd8")               # JPEG start
                b = self._buf.find(b"\xff\xd9", a + 2) if a != -1 else -1  # JPEG end
                if a != -1 and b != -1:
                    jpg = bytes(self._buf[a:b + 2])
                    del self._buf[:b + 2]
                    img = cv2.imdecode(np.frombuffer(jpg, np.uint8), cv2.IMREAD_COLOR)
                    return (img is not None), img
                chunk = self._stream.read(16384)
                if not chunk:
                    return False, None
                self._buf.extend(chunk)
        except Exception:  # noqa: BLE001 — network/timeout: treat like an empty frame
            return False, None

    def release(self) -> None:
        self._ok = False
        try:
            self._stream.close()
        except Exception:  # noqa: BLE001
            pass


class LatestFrame:
    """Grab-latest wrapper: continuously reads from a `cv2.VideoCapture`-compatible source
    in the background and keeps only the NEWEST frame in a single-slot buffer. This way a
    slow consumer (move tracker with CNN/encode) always gets the most recent image, instead
    of working through an ever-growing backlog from the socket/JPEG buffer.

    `read()` returns `(ok, frame)` of the latest frame immediately (no network blocking);
    `release()` stops the reader thread and releases the underlying source."""

    def __init__(self, cap, poll: float = 0.001) -> None:
        self._cap = cap
        self._poll = poll
        self._lock = threading.Lock()
        self._cond = threading.Condition(self._lock)
        self._frame = None
        self._ok = False
        self._seq = 0                    # bumps per NEW camera frame (duplicate guard)
        self._read_seq = 0
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def _loop(self) -> None:
        while self._running:
            ok, f = self._cap.read()
            if ok and f is not None:
                with self._cond:
                    self._frame, self._ok = f, True
                    self._seq += 1
                    self._cond.notify_all()
            else:
                # Source (still) empty/broken: wait briefly so the loop doesn't spin hot.
                time.sleep(0.01)

    def isOpened(self) -> bool:
        return getattr(self._cap, "isOpened", lambda: True)()

    def read(self, timeout: float = 0.5):
        """Latest frame, but NEVER the same frame twice: if the consumer loop is faster
        than the camera, a repeated frame would diff to zero and count as 'board stable'
        even while a hand is waving (observed live: stable_count rising during motion).
        Blocks up to `timeout` for a fresh frame, else (False, None)."""
        with self._cond:
            if self._seq == self._read_seq:
                self._cond.wait(timeout)
            if not self._ok or self._frame is None or self._seq == self._read_seq:
                return False, None
            self._read_seq = self._seq
            return True, self._frame.copy()

    def release(self) -> None:
        self._running = False
        if self._thread.is_alive():
            self._thread.join(timeout=1.0)
        if hasattr(self._cap, "release"):
            self._cap.release()


# --- Helpers --------------------------------------------------------------------------

def _is_url(source) -> bool:
    return isinstance(source, str) and "://" in source


def _is_index(source) -> bool:
    return isinstance(source, int) or (isinstance(source, str) and source.strip().isdigit())


def fourcc_to_str(value) -> str:
    """Decode a CAP_PROP_FOURCC float/int into its 4-char code (non-printable → '?')."""
    v = int(value)
    s = "".join(chr((v >> 8 * i) & 0xFF) for i in range(4))
    return "".join(c if c.isprintable() else "?" for c in s).strip()


def _resolve_backend(name: str):
    """Backend name → cv2 flag (or None = OpenCV default). ``auto`` picks DSHOW on Windows
    (the stable choice for USB cams; MSMF caps 4K on our cam), else the platform default."""
    key = (name or "auto").lower()
    if key == "auto":
        if sys.platform.startswith("win") and hasattr(cv2, "CAP_DSHOW"):
            return cv2.CAP_DSHOW
        return None
    return {
        "dshow": getattr(cv2, "CAP_DSHOW", None),
        "msmf": getattr(cv2, "CAP_MSMF", None),
        "any": getattr(cv2, "CAP_ANY", None),
    }.get(key)


def _apply_controls(cap, spec: CameraSpec) -> None:
    """Lock optics for constant capture (photogrammetry / anti-flicker). Best-effort: some
    props aren't supported by every driver, so failures are swallowed per-property."""
    def _try(prop, val):
        try:
            cap.set(prop, val)
        except Exception:  # noqa: BLE001 — driver may not support this control
            pass

    if spec.autofocus is not None:
        _try(cv2.CAP_PROP_AUTOFOCUS, 1 if spec.autofocus else 0)
    if spec.focus is not None:
        _try(cv2.CAP_PROP_AUTOFOCUS, 0)              # off before manual focus
        _try(cv2.CAP_PROP_FOCUS, spec.focus)
    if spec.exposure is not None:
        _try(cv2.CAP_PROP_AUTO_EXPOSURE, 0.25)       # 0.25 = manual (DSHOW convention)
        _try(cv2.CAP_PROP_EXPOSURE, spec.exposure)
    if spec.gain is not None:
        _try(cv2.CAP_PROP_GAIN, spec.gain)
    if spec.white_balance is not None:
        _try(cv2.CAP_PROP_AUTO_WB, 0)
        _try(cv2.CAP_PROP_WB_TEMPERATURE, spec.white_balance)
    for prop, val in (spec.extra_props or {}).items():
        _try(int(prop), val)


def _open_url(url: str, url_mode: str = "auto"):
    """URL → snapshot or MJPEG grabber. ``auto`` = 'snapshot' in the URL → single-image
    poll, otherwise a multipart MJPEG stream (smoother)."""
    mode = (url_mode or "auto").lower()
    if mode == "snapshot" or (mode == "auto" and "snapshot" in url.lower()):
        return UrlSnapshotCapture(url)
    return _UrlMjpegCapture(url)


def _MAX_FPS_FOR_SIZE(width: int | None, height: int | None) -> int:
    """Highest frame rate the uncompressed (YUY2) path actually sustains at this size.

    From the measured matrix, which matches the datasheet's YUY2 column: 4K 23, 1440p 30,
    1080p and below 60. Asking for more does not get more — it makes the DSHOW driver fall back
    to a mode that can sustain the rate, i.e. 640x480, without telling anyone. Deliberately
    conservative: an unknown/None size falls into the permissive bucket, since the guard only
    exists to catch the obviously-impossible request.
    """
    px = (width or 0) * (height or 0)
    if px >= 3840 * 2160:
        return 23
    if px >= 2560 * 1440:
        return 30
    return 60


def _open_index(index: int, spec: CameraSpec):
    """Open a local USB index with the driver quirks handled: resolution FIRST (setting FOURCC
    before it is exactly what collapses MSMF to 640x480 — opencv#7013; the common advice is
    backwards for 4.x, see config.py notes), then fps (clamped to what the size can do), then
    optics controls, then warm-up reads to let auto-exposure/focus settle. YUY2 stays the
    deliberate pixel format — MJPG only shifts the bottleneck to JPEG decode."""
    cam = config.CAMERA
    width = spec.width if spec.width is not None else cam.width
    height = spec.height if spec.height is not None else cam.height
    fps = spec.fps if spec.fps is not None else cam.fps
    fourcc = spec.fourcc if spec.fourcc is not None else cam.fourcc
    backend_name = spec.backend if spec.backend and spec.backend != "auto" else cam.backend

    backend = _resolve_backend(backend_name)
    cap = cv2.VideoCapture(index, backend) if backend is not None else cv2.VideoCapture(index)

    if not cap.isOpened():
        # Make a failed open self-explanatory instead of a bare OpenCV
        # "backend ... can't be used to capture by index" line. The most common cause on this
        # rig is the device being busy (a second handle on the same USB cam) or bandwidth-starved
        # on a USB2 port at a high mode — the caller (tracker reconnect) escalates from here.
        log.warning("camera: could not open index %d on backend '%s' (device busy, unplugged, or "
                    "another handle already has it?).", index, backend_name)
        return cap

    if fourcc:
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*fourcc))
    if width:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, int(width))
    if height:
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, int(height))
    if fps:
        # Guard the 640x480 trap: on this DSHOW driver a high fps request makes the driver
        # renegotiate to a mode that can actually sustain it — and it picks VGA, silently, while
        # reporting a triumphant 60.0 fps. Measured in ALL modes (4K/1440p/1080p). Requesting a
        # rate the chosen resolution cannot deliver is never what the caller meant, so clamp to
        # what the mode supports rather than hand back a quarter-size frame.
        max_fps = _MAX_FPS_FOR_SIZE(width, height)
        if fps > max_fps:
            log.warning("camera: %d fps is not attainable at %dx%d (driver would silently drop to "
                        "640x480) — requesting %d instead.", fps, width or 0, height or 0, max_fps)
            fps = max_fps
        cap.set(cv2.CAP_PROP_FPS, int(fps))
    _apply_controls(cap, spec)
    for _ in range(max(0, spec.warmup)):
        cap.read()
    return cap


# --- Lens undistortion wrapper --------------------------------------------------------

class _UndistortCapture:
    """Transparent decorator that lens-undistorts every frame `read()` returns.

    Installed by `open_capture` only when a lens calibration actually exists, so the
    zero-calibration case carries zero overhead (the wrapper is not created at all). The
    remap preserves the frame size, so nothing downstream sees a geometry change.
    """

    def __init__(self, cap, undistorter) -> None:
        self._cap = cap
        self._und = undistorter

    def read(self, *args, **kwargs):
        # *args/**kwargs: LatestFrame.read() takes a `timeout` — forward it verbatim.
        ok, frame = self._cap.read(*args, **kwargs)
        if not ok or frame is None:
            return ok, frame
        return True, self._und.apply(frame)

    def isOpened(self) -> bool:
        return bool(getattr(self._cap, "isOpened", lambda: True)())

    def release(self) -> None:
        if hasattr(self._cap, "release"):
            self._cap.release()

    def get(self, prop):
        return self._cap.get(prop)

    def set(self, prop, val):
        return self._cap.set(prop, val)

    def __getattr__(self, name):
        return getattr(self._cap, name)


# --- Public openers -------------------------------------------------------------------

def open_capture(spec: CameraSpec):
    """Open `spec.source` and return a cv2.VideoCapture-compatible object.

    - int / numeric-string → local USB index (backend + MJPG + resolution + controls).
    - `http(s)://…`        → network grabber (snapshot or MJPEG).
    - other string         → file path, opened plainly (no resolution forcing).
    Wrapped in `LatestFrame` if `spec.latest` is set, then — if a lens calibration exists
    and `spec.undistort` allows it — in the undistort decorator ON TOP of that. Order
    matters: `LatestFrame`'s thread throws most frames away, so remapping below it would
    burn CPU on frames nobody ever consumes.

    This is the ONE place lens undistortion happens. Replay/ingest paths (`labeling.py`,
    `ingest.py`, `web/routers/sessions.py`) load recorded frames with `cv2.imread` and
    never call `open_capture`, so recorded sessions are never undistorted twice.
    """
    src = spec.source
    if _is_url(src):
        cap = _open_url(str(src), spec.url_mode)
    elif _is_index(src):
        cap = _open_index(int(src), spec)
    else:
        cap = cv2.VideoCapture(str(src))          # file path / clip — leave untouched
    if spec.latest:
        cap = LatestFrame(cap)
    # Lazy: `lens.active` only touches the calibration file here, never at import time.
    from . import lens
    und = lens.active(src, override=spec.undistort)
    if und is not None:
        cap = _UndistortCapture(cap, und)
    return cap


def spec_for_mode(mode: str | None, source: int | str = 0, **kwargs) -> CameraSpec:
    """Named capture mode (`config.CAMERA_MODES`) → `CameraSpec`. Pure — no I/O.

    ``default``/``None``/an unknown name all leave width+height at `None`, which makes
    `open_capture` fall back to `config.CAMERA`. Any extra `CameraSpec` field can be passed
    through as a keyword. NOTE the returned spec says what was REQUESTED; cameras routinely
    deliver something else (see `mode_size`/`probe`)."""
    size = config.CAMERA_MODES.get(str(mode or config.DEFAULT_CAMERA_MODE).lower())
    width, height = size if size else (None, None)
    return CameraSpec(source=source, width=width, height=height, **kwargs)


def mode_size(mode: str | None) -> tuple[int, int] | None:
    """Requested (width, height) of a named mode, or `None` for ``default``/unknown."""
    return config.CAMERA_MODES.get(str(mode or config.DEFAULT_CAMERA_MODE).lower())


def camera_modes() -> list[dict]:
    """The selectable capture modes as plain dicts (for the web API / UI dropdown)."""
    return [{"name": name,
             "width": None if size is None else size[0],
             "height": None if size is None else size[1],
             "label": name if size is None else f"{name} ({size[0]}×{size[1]})"}
            for name, size in config.CAMERA_MODES.items()]


def open_camera(source: int | str, *, spec: CameraSpec | None = None):
    """Back-compat convenience opener (replaces the old `calibration.open_camera`).

    `int` index → USB with `config.CAMERA` defaults (DSHOW + MJPG + resolution on Windows);
    `str` URL/path → network grabber / file. Pass `spec` for full control, or just a source
    for sane defaults. Returns the raw capture (callers may use `.get()/.set()`)."""
    if spec is None:
        spec = CameraSpec(source=source)
    else:
        spec.source = source
    return open_capture(spec)


def open_source(source):
    """URL → network reader (HTTPS/self-signed-capable); otherwise local index/path via
    `open_camera`. Kept as a named seam because the move tracker and web UI patch it."""
    if _is_url(source):
        return _open_url(str(source))
    return open_camera(source)


# --- Rich wrapper ---------------------------------------------------------------------

class Camera:
    """Convenience wrapper around an open capture — the code-reachable interface.

    Usage:
        with Camera(CameraSpec(source=1, width=2560, height=1440)) as cam:
            ok, frame = cam.read()
            print(cam.settings(), cam.measure_fps())
    """

    def __init__(self, spec: CameraSpec | int | str = 0) -> None:
        self.spec = spec if isinstance(spec, CameraSpec) else CameraSpec(source=spec)
        self.cap = open_capture(self.spec)

    # -- context manager --
    def __enter__(self) -> Camera:
        return self

    def __exit__(self, *exc) -> None:
        self.release()

    # -- capture pass-through --
    def isOpened(self) -> bool:
        return bool(self.cap.isOpened())

    def read(self):
        return self.cap.read()

    def get(self, prop):
        return self.cap.get(prop)

    def set(self, prop, val) -> bool:
        return bool(self.cap.set(prop, val))

    def release(self) -> None:
        if self.cap is not None and hasattr(self.cap, "release"):
            self.cap.release()

    # -- introspection --
    @property
    def frame_size(self) -> tuple[int, int]:
        """Actual (width, height) the source reports."""
        return (int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))

    def settings(self) -> dict:
        """Actual delivered settings (width/height/codec/fps as the driver reports them —
        note `codec`/`fps` are unreliable on DSHOW; use `measure_fps` for the truth)."""
        w, h = self.frame_size
        return {
            "width": w,
            "height": h,
            "codec": fourcc_to_str(self.cap.get(cv2.CAP_PROP_FOURCC)),
            "fps": float(self.cap.get(cv2.CAP_PROP_FPS)),
        }

    def measure_fps(self, n: int = 60, warmup: int = 5) -> float:
        """Real framerate by timing `n` grabs (the only reliable number on DSHOW)."""
        for _ in range(max(0, warmup)):
            self.cap.read()
        t0 = time.time()
        got = 0
        for _ in range(max(1, n)):
            ok, _f = self.cap.read()
            if ok:
                got += 1
        dt = time.time() - t0
        return got / dt if dt > 0 else 0.0


# --- Enumeration + probing ------------------------------------------------------------

# High → low; superset of the modes typical UVC cams advertise. Used by probe()/the CLI.
DEFAULT_PROBE_MODES: tuple[tuple[int, int], ...] = (
    (3840, 2160),   # 4K UHD
    (2560, 1440),   # QHD / 1440p
    (1920, 1080),   # 1080p
    (1280, 720),    # 720p
    (640, 480),     # VGA
)


def _pnp_camera_names() -> list[str]:
    """Windows only: friendly names of connected cameras via PowerShell PnP, in enumeration
    order (best-effort mapping to OpenCV indices). Empty list on failure / non-Windows."""
    if not sys.platform.startswith("win"):
        return []
    import subprocess
    try:
        cp = subprocess.run(
            ["powershell.exe", "-NoProfile", "-Command",
             "Get-PnpDevice -Class Camera -Status OK | Select-Object -ExpandProperty FriendlyName"],
            capture_output=True, text=True, timeout=10,
        )
        return [ln.strip() for ln in cp.stdout.splitlines() if ln.strip()]
    except Exception:  # noqa: BLE001 — PowerShell missing / blocked
        return []


def list_devices(max_index: int = 8) -> list[DeviceInfo]:
    """Enumerate connected cameras: try OpenCV indices 0..max_index-1 and, on Windows, label
    them with PnP friendly names in order. The OpenCV index is authoritative; names are a
    convenience and may not line up 1:1 with indices if a device is offline."""
    names = _pnp_camera_names()
    out: list[DeviceInfo] = []
    live = 0
    for idx in range(max_index):
        backend = _resolve_backend("auto")
        cap = cv2.VideoCapture(idx, backend) if backend is not None else cv2.VideoCapture(idx)
        try:
            opened = cap.isOpened()
            present = False
            if opened:
                ok, frame = cap.read()
                present = bool(ok and frame is not None)
        finally:
            cap.release()
        if not opened:
            continue
        name = names[live] if live < len(names) else f"camera {idx}"
        out.append(DeviceInfo(index=idx, name=name, present=present))
        live += 1
    return out


def probe(source, modes=DEFAULT_PROBE_MODES, backends=("dshow", "msmf"),
          grab: int = 20, warmup: int = 4) -> list[ModeResult]:
    """Measure what `source` REALLY delivers per (backend, mode): opens with MJPG forced,
    grabs `grab` frames, times them for real fps, and reads back the delivered resolution +
    codec label. This is the ground truth behind the `chesslab cameras` table."""
    results: list[ModeResult] = []
    avail = [b for b in backends if _resolve_backend(b) is not None]
    for backend in avail:
        for (w, h) in modes:
            spec = CameraSpec(source=source, width=w, height=h, backend=backend, warmup=warmup)
            cap = open_capture(spec)
            try:
                if not cap.isOpened():
                    results.append(ModeResult(backend, (w, h), (0, 0), "", 0.0))
                    continue
                aw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                ah = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                codec = fourcc_to_str(cap.get(cv2.CAP_PROP_FOURCC))
                t0 = time.time()
                got = 0
                for _ in range(max(1, grab)):
                    ok, _f = cap.read()
                    if ok:
                        got += 1
                dt = time.time() - t0
                fps = got / dt if dt > 0 else 0.0
            finally:
                cap.release()
            results.append(ModeResult(backend, (w, h), (aw, ah), codec, fps))
    return results


# --- CLI helper (used by `chesslab cameras`) ------------------------------------------

def cli_cameras(index: int | None = None, do_probe: bool = True, grab: int = 20) -> int:
    """List connected cameras and (unless disabled) print a per-index probe table of the
    real resolutions/fps. `index` restricts probing to one device. Returns a process code."""
    print(f"OpenCV {cv2.__version__}\n")
    devices = list_devices()
    if not devices:
        print("No cameras found (indices 0..7). On Windows, close any app using the camera.")
        return 1

    print("Detected cameras (names best-effort — may not line up with the index; the probe")
    print("table below is the reliable identifier, e.g. only the 4K cam delivers 2160p):")
    for d in devices:
        flag = "" if d.present else "  (opens but no frame)"
        print(f"  [{d.index}] {d.name}{flag}")
    print()

    if not do_probe:
        return 0

    targets = [index] if index is not None else [d.index for d in devices]
    for idx in targets:
        print(f"=== index {idx} — real delivered modes (timing {grab} frames) ===")
        print(f"{'backend':>7}  {'requested':>12}  {'delivered':>12}  {'codec':>6}  {'real fps':>8}")
        for r in probe(idx, grab=grab):
            hit = "  <-- 4K@30!" if (r.delivered[0] >= 3840 and r.fps >= 24) else ""
            req = f"{r.requested[0]}x{r.requested[1]}"
            got = f"{r.delivered[0]}x{r.delivered[1]}"
            print(f"{r.backend:>7}  {req:>12}  {got:>12}  {r.codec:>6}  {r.fps:>8.1f}{hit}")
        print()
    return 0
