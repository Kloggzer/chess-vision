"""Shared camera module for the web UI.

ONE camera instance (`CAMERA`), ONE MJPEG helper (`mjpeg`) and ONE source for
per-frame board geometry (`BoardTracker`: corners + warp). Calibration, collect and inference
all use the same code here — no more duplicated camera/corner/encode code.
"""

from __future__ import annotations

import os
import threading

import cv2

from ..calibration import (
    CalibrationProfile,
    board_corners_for_frame,
    make_tracker,
    warp_from_corners,
)
from ..camera import UrlSnapshotCapture, open_source

_BOUNDARY = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"

# Env override: if this variable is set (e.g. an IP cam URL), ALL camera paths in the
# web UI use this source instead of the integer index selected in the UI. This allows
# connecting a phone/network camera without frontend changes. Example:
#   set CHESSLAB_CAMERA_SOURCE=https://<PHONE-IP>:4444/video/snapshot   (Android IP Camera)
CAMERA_SOURCE_ENV = "CHESSLAB_CAMERA_SOURCE"


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
            self.cap = open_source(src)
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
