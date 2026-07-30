"""Shared camera module for the web UI.

ONE camera instance (`CAMERA`), ONE MJPEG helper (`mjpeg`) and ONE source for
per-frame board geometry (`BoardTracker`: corners + warp). Calibration, collect and inference
all use the same code here — no more duplicated camera/corner/encode code.

The capture is opened via `camera.open_capture` with a `CameraSpec`, so the web UI gets the
same lens undistortion and the same named capture modes as the move tracker.
"""

from __future__ import annotations

import logging
import os
import threading

import cv2

from .. import config
from ..calibration import (
    CalibrationProfile,
    board_corners_for_frame,
    make_tracker,
    warp_from_corners,
)
from ..camera import UrlSnapshotCapture, mode_size, open_capture, spec_for_mode

log = logging.getLogger("chesslab.web")

_BOUNDARY = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"

# Env override: if this variable is set (e.g. an IP cam URL), ALL camera paths in the
# web UI use this source instead of the integer index selected in the UI. This allows
# connecting a phone/network camera without frontend changes. Example:
#   set CHESSLAB_CAMERA_SOURCE=https://<PHONE-IP>:4444/video/snapshot   (Android IP Camera)
CAMERA_SOURCE_ENV = "CHESSLAB_CAMERA_SOURCE"


def normalize_source(source) -> int | str:
    """A UI/API source value → what `open_capture` expects: a digit string becomes an int
    index, anything else (URL, file path) stays a string, empty means index 0."""
    if isinstance(source, int):
        return source
    s = str(source or "").strip()
    if not s:
        return 0
    return int(s) if s.isdigit() else s


def effective_source(source):
    """Effective source for the UI selection: env override (URL) wins, otherwise the UI value.
    Returns a hashable key (URL string or int index).

    The env override deliberately stays authoritative — it is documented as overriding ALL
    camera paths in the web UI. The UI's job is then to SAY it is overridden (see
    `Camera.status`), not to disagree quietly with what is being captured."""
    env = os.environ.get(CAMERA_SOURCE_ENV, "").strip()
    if env:
        return env
    return normalize_source(source)


# Optional HIGH-RESOLUTION capture source: the live preview runs smoothly over the (possibly
# downscaled) stream, but SAVED frames are pulled from this snapshot URL
# (full sensor resolution). Markers are re-detected on the snapshot during capture -> stream and
# capture sources may differ in resolution/orientation. Example:
#   set CHESSLAB_CAMERA_CAPTURE=https://<PHONE-IP>:4444/video/snapshot
CAMERA_CAPTURE_ENV = "CHESSLAB_CAMERA_CAPTURE"


def capture_url(selected: str = "") -> str | None:
    """High-resolution snapshot URL for saving: env override wins, then the UI's Photo field;
    None -> save the live frame. Same precedence as `effective_source`."""
    return os.environ.get(CAMERA_CAPTURE_ENV, "").strip() or str(selected or "").strip() or None


def is_local_index(source) -> bool:
    """True for a local USB index (`0`, `"1"`). ONLY those negotiate a resolution: a URL
    source (the `CHESSLAB_CAMERA_SOURCE` override) sends whatever the phone app sends, so a
    capture mode has nothing to set there and must not be pretended to apply."""
    return isinstance(source, int) or (isinstance(source, str) and source.strip().isdigit())


def requested_size(mode: str) -> tuple[int, int] | None:
    """(w, h) `open_capture` will ASK a local camera for: the named mode's size, or
    `config.CAMERA`'s for `default`/"" (that is what `_open_index` falls back to).

    A request, never a measurement — what the device actually hands back is
    `Camera.delivered`."""
    size = mode_size(mode)
    if size is not None:
        return int(size[0]), int(size[1])
    cam = config.CAMERA
    return (int(cam.width), int(cam.height)) if cam.width and cam.height else None


class Camera:
    """Thread-safe, shared camera. `ensure(source, mode, capture)` opens (or switches) the
    source; `read()` returns the latest frame (or None). `markers_*` reflect calibration.

    Opened through `camera.open_capture` (NOT `open_source`), because `open_capture` is the
    one place lens undistortion is installed — routing through `open_source` is why the
    Collect feed used to be the only barrel-distorted view in the app. With no
    `data/lens/calib.npz` present `open_capture` simply does not install the wrapper, so
    undistortion is a no-op instead of a special case here.

    `requested` vs `delivered`: a capture mode is a REQUEST. Drivers answer with something
    else (this rig has seen a 60 fps ask collapse a 4K stream to 640x480), so the delivered
    size is measured from real frames and is the only size the UI is allowed to show.

    `selected` / `capture_selected` hold the UI's choice (index or URL, and the optional
    high-resolution snapshot URL for saved frames). They survive `release()`, so a page
    reload shows what the server is actually set to instead of a fresh default.
    """

    def __init__(self) -> None:
        self.cap = None
        self.index = None
        self.mode = ""                 # named capture mode currently open ("" = config.CAMERA)
        self.requested = None          # (w, h) asked for — None for URL sources
        self.delivered = None          # (w, h) measured on frames; None until one arrives
        self.undistort = False         # lens correction actually active on this source
        self.selected = "0"            # UI source field (index or URL) — survives release()
        self.capture_selected = ""     # UI Photo field (snapshot URL) — survives release()
        self.lock = threading.Lock()
        self.markers_found = False
        self.markers_count = 0
        self.markers_live = 0
        self.markers_held = 0

    def ensure(self, source, mode: str = "", capture: str = "") -> None:
        """Open (or switch) the shared capture for the UI's `source` (a device index or a
        URL) at capture mode `mode` (a name from `camera.camera_modes()`; "" = whatever
        `config.CAMERA` says). `capture`: optional snapshot URL that saved frames come from.

        Reopens whenever the effective SOURCE **or** the requested MODE changes — comparing
        the source alone would keep the old resolution after a mode switch, silently.
        `capture` never reopens anything: it is only read when a frame is SAVED.
        """
        src = effective_source(source)  # Env override (IP cam URL) wins over the UI choice
        mode = str(mode or "").strip().lower()
        if mode == config.DEFAULT_CAMERA_MODE:
            mode = ""                   # same request as "" — do not reopen for a rename
        if not is_local_index(src):
            mode = ""                   # a URL negotiates nothing (see `is_local_index`)
        with self.lock:
            self.selected = str(source or "").strip() or "0"
            self.capture_selected = str(capture or "").strip()
            if self.cap is not None and self.index == src and self.mode == mode:
                return
            if self.cap is not None:
                self.cap.release()
            self.cap = open_capture(spec_for_mode(mode, source=src))
            self.index = src
            self.mode = mode
            self.requested = requested_size(mode) if is_local_index(src) else None
            self.delivered = None
            # Same question `open_capture` just answered (the spec carries no override):
            # is there a calibration AND does this source type get corrected?
            from .. import lens
            self.undistort = lens.active(src) is not None
            self._measure_locked()

    def _measure_locked(self) -> None:
        """Learn the DELIVERED frame size from one real frame (lock held). Best effort: a
        source that needs a moment gets measured by the first `read()` instead."""
        try:
            ok, f = self.cap.read()
        except Exception:  # noqa: BLE001 — measuring must never break opening
            log.debug("camera: could not read a frame to measure the delivered size",
                      exc_info=True)
            return
        if not ok or f is None:
            return
        self.delivered = (int(f.shape[1]), int(f.shape[0]))
        if self.requested and self.delivered != self.requested:
            log.warning("camera %r: requested %dx%d, delivers %dx%d — the driver picked its own "
                        "mode.", self.index, *self.requested, *self.delivered)

    def read(self):
        with self.lock:
            if self.cap is None:
                return None
            ok, f = self.cap.read()
            if not ok or f is None:
                return None
            size = (int(f.shape[1]), int(f.shape[0]))
            if size != self.delivered:      # frames are the only trustworthy source of truth
                self.delivered = size
            return f

    def status(self) -> dict:
        """Camera facts for the UI: the selected source vs the one actually in charge, which
        mode was requested, what the camera really delivers, whether a resolution mode
        applies at all, and whether lens correction is active.

        `matches` is None while no frame has been seen. `env_source`/`env_capture` are the
        env overrides — set means the UI field is NOT in charge, and the page says so.
        Every URL is credential-stripped before it leaves the process."""
        from ..collect import redact_source

        env = os.environ.get(CAMERA_SOURCE_ENV, "").strip()
        env_capture = os.environ.get(CAMERA_CAPTURE_ENV, "").strip()
        with self.lock:
            open_src, mode = self.index, self.mode
            req, dlv, und = self.requested, self.delivered, self.undistort
            sel, sel_cap = self.selected, self.capture_selected
            is_open = self.cap is not None
        eff = effective_source(sel)
        eff_capture = capture_url(sel_cap)
        return {
            "open": is_open,
            "selected": redact_source(sel),             # what the UI source field shows
            "source": redact_source(eff),               # the source actually in charge
            "opened_source": None if open_src is None else redact_source(open_src),
            "env_source": redact_source(env) if env else None,
            "capture_selected": redact_source(sel_cap),  # UI Photo field
            "capture_source": redact_source(eff_capture) if eff_capture else None,
            "env_capture": redact_source(env_capture) if env_capture else None,
            "modes_apply": is_local_index(eff),         # only a local index takes a width
            "mode": mode,
            "requested": list(req) if req else None,
            "delivered": list(dlv) if dlv else None,
            "matches": None if not (req and dlv) else list(req) == list(dlv),
            "undistort": bool(und),
        }

    def grab_capture(self):
        """Get frame FOR SAVING -> (frame, is_hires). If a capture URL is set (UI Photo field
        or `CHESSLAB_CAMERA_CAPTURE`), a single high-resolution snapshot is fetched from there
        (is_hires=True); otherwise the current live frame (is_hires=False). When is_hires, the
        caller MUST re-detect markers/corners on THIS frame (different resolution/orientation
        than the preview)."""
        with self.lock:
            selected = self.capture_selected
        url = capture_url(selected)
        if url:
            ok, f = UrlSnapshotCapture(url, timeout=6.0).read()
            if ok and f is not None:
                return f, True
        return self.read(), False

    def release(self) -> None:
        with self.lock:
            if self.cap is not None:
                self.cap.release()
            self.cap = None
            self.index = None
            self.mode = ""
            self.requested = None
            self.delivered = None
            self.undistort = False

    @property
    def open(self) -> bool:
        return self.cap is not None


# A single instance for the whole app.
CAMERA = Camera()


def encode_jpeg(img, quality: int = 80) -> bytes | None:
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, int(quality)])
    return buf.tobytes() if ok else None


def mjpeg(frames, idle: float = 0.05):
    """`frames`: iterator of BGR images (np.ndarray) or None (= no frame -> wait briefly).
    Wraps JPEG encode + multipart boundary + StreamingResponse — the caller only provides images."""
    from fastapi.responses import StreamingResponse

    from ..serve import SHUTDOWN
    from ..serve import sleep as _serve_sleep

    def gen():
        for img in frames:
            if SHUTDOWN.is_set():          # server stopping: end the stream at once
                break
            if img is None:
                if not _serve_sleep(idle):  # idle, but interruptible by shutdown
                    break
                continue
            data = encode_jpeg(img)
            if data is not None:
                yield _BOUNDARY + data + b"\r\n"

    return StreamingResponse(gen(), media_type="multipart/x-mixed-replace; boundary=frame")


class BoardTracker:
    """Per-stream: marker tracker seeded from the profile + last known corners.

    ``process(frame)`` -> (warped | None, corners | None). Exactly **one** place for
    corner detection and unwarping — collect and inference share this logic, and the
    last live-shown corners (``last_corners``) are what gets saved during capture.

    Thread-safe: ``last_corners`` is written under its own lock; ``corners()`` returns
    a copy.
    """

    def __init__(self, profile: CalibrationProfile) -> None:
        self.profile = profile
        self.tracker = make_tracker(profile)
        self._lock = threading.Lock()
        self.last_corners = None

    def process(self, frame):
        corners = board_corners_for_frame(frame, self.profile, self.tracker)
        if corners is not None:
            with self._lock:
                self.last_corners = corners
        warped = warp_from_corners(frame, self.profile, corners) if corners is not None else None
        return warped, corners

    def corners(self):
        """Copy of the last known corners (thread-safe)."""
        with self._lock:
            return list(self.last_corners) if self.last_corners is not None else None
