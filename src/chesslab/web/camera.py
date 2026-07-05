"""Shared camera module for the web UI.

ONE camera instance (`CAMERA`), ONE MJPEG helper (`mjpeg`) and ONE source for
per-frame board geometry (`BoardTracker`: corners + warp). Calibration, collect and inference
all use the same code here — no more duplicated camera/corner/encode code.
"""

from __future__ import annotations

import os
import ssl
import threading
import time
import urllib.request

import cv2
import numpy as np

from ..calibration import (
    CalibrationProfile,
    board_corners_for_frame,
    make_tracker,
    open_camera,
    warp_from_corners,
)

_BOUNDARY = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"

# Env override: if this variable is set (e.g. an IP cam URL), ALL camera paths in the
# web UI use this source instead of the integer index selected in the UI. This allows
# connecting a phone/network camera without frontend changes. Example:
#   set CHESSLAB_CAMERA_SOURCE=https://<PHONE-IP>:4444/video/snapshot   (Android IP Camera)
CAMERA_SOURCE_ENV = "CHESSLAB_CAMERA_SOURCE"


class _UrlSnapshotCapture:
    """cv2.VideoCapture-compatible frame grabber for a JPEG snapshot URL (e.g. Android IP Camera
    `/video/snapshot`). `cv2.VideoCapture` fails on self-signed HTTPS — so we fetch the bytes
    ourselves via urllib (TLS verification off) and decode with `cv2.imdecode`. Polls one
    image per `read()` (sufficient for calibration/collect preview at a few FPS)."""

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
    for SOI/EOI markers (0xFFD8 … 0xFFD9) in the buffer — much smoother than single snapshots."""

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
    """Grab-latest wrapper: continuously reads from a `cv2.VideoCapture`-compatible
    source in the background and keeps only the NEWEST frame in a single-slot buffer. This way
    a slow consumer (move tracker with CNN/encode) always gets the most recent image, instead of
    working through an ever-growing backlog from the socket/JPEG buffer.

    `read()` returns `(ok, frame)` of the latest frame immediately (no network blocking);
    `release()` stops the reader thread and releases the underlying source."""

    def __init__(self, cap, poll: float = 0.001) -> None:
        self._cap = cap
        self._poll = poll
        self._lock = threading.Lock()
        self._frame = None
        self._ok = False
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def _loop(self) -> None:
        while self._running:
            ok, f = self._cap.read()
            if ok and f is not None:
                with self._lock:
                    self._frame, self._ok = f, True
            else:
                # Source (still) empty/broken: wait briefly so the loop doesn't spin hot.
                time.sleep(0.01)

    def isOpened(self) -> bool:
        return getattr(self._cap, "isOpened", lambda: True)()

    def read(self):
        with self._lock:
            if not self._ok or self._frame is None:
                return False, None
            return True, self._frame.copy()

    def release(self) -> None:
        self._running = False
        if self._thread.is_alive():
            self._thread.join(timeout=1.0)
        if hasattr(self._cap, "release"):
            self._cap.release()


def _is_url(source) -> bool:
    return isinstance(source, str) and "://" in source


def open_source(source):
    """Open source: URL -> MJPEG stream reader or snapshot grabber (both HTTPS/self-signed-
    capable); otherwise local index/path via `open_camera` (DSHOW on Windows). If the URL
    contains 'snapshot' -> single-image poll, otherwise multipart MJPEG stream (smoother)."""
    if _is_url(source):
        if "snapshot" in source.lower():
            return _UrlSnapshotCapture(source)
        return _UrlMjpegCapture(source)
    return open_camera(source)


_open_source = open_source  # backward-compat alias (move_tracker used this before phase 06)


def effective_source(index):
    """Effective source for a UI-selected index: env override (URL) wins, otherwise the index.
    Returns a hashable key (URL string or int)."""
    env = os.environ.get(CAMERA_SOURCE_ENV, "").strip()
    if env:
        return env
    return index


# Optional HIGH-RESOLUTION capture source: the live preview runs smoothly over the (possibly
# downscaled) stream, but SAVED frames are pulled from this snapshot URL
# (full sensor resolution). Markers are re-detected on the snapshot during capture -> stream and
# capture sources may differ in resolution/orientation. Example:
#   set CHESSLAB_CAMERA_CAPTURE=https://<PHONE-IP>:4444/video/snapshot
CAMERA_CAPTURE_ENV = "CHESSLAB_CAMERA_CAPTURE"


def capture_url() -> str | None:
    """High-resolution snapshot URL for saving, if set; otherwise None (-> use live frame)."""
    return os.environ.get(CAMERA_CAPTURE_ENV, "").strip() or None


class Camera:
    """Thread-safe, shared camera. `ensure(index)` opens (or switches) the source;
    `read()` returns the latest frame (or None). `markers_*` reflect the calibration status."""

    def __init__(self) -> None:
        self.cap = None
        self.index = None
        self.lock = threading.Lock()
        self.markers_found = False
        self.markers_count = 0
        self.markers_live = 0
        self.markers_held = 0

    def ensure(self, index) -> None:
        src = effective_source(index)   # Env override (IP cam URL) wins over the UI index
        with self.lock:
            if self.cap is not None and self.index == src:
                return
            if self.cap is not None:
                self.cap.release()
            self.cap = _open_source(src)
            self.index = src

    def read(self):
        with self.lock:
            if self.cap is None:
                return None
            ok, f = self.cap.read()
            return f if ok else None

    def grab_capture(self):
        """Get frame FOR SAVING -> (frame, is_hires). If a capture URL is set
        (`CHESSLAB_CAMERA_CAPTURE`), a single high-resolution snapshot is fetched from there
        (is_hires=True); otherwise the current live frame (is_hires=False). When is_hires, the
        caller MUST re-detect markers/corners on THIS frame (different resolution/orientation
        than the preview)."""
        url = capture_url()
        if url:
            ok, f = _UrlSnapshotCapture(url, timeout=6.0).read()
            if ok and f is not None:
                return f, True
        return self.read(), False

    def release(self) -> None:
        with self.lock:
            if self.cap is not None:
                self.cap.release()
            self.cap = None
            self.index = None

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

    def gen():
        for img in frames:
            if img is None:
                time.sleep(idle)
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
