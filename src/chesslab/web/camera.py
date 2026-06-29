"""Geteiltes Kamera-Modul der Web-UI.

EINE Kamera-Instanz (`CAMERA`), EIN MJPEG-Helfer (`mjpeg`) und EINE Quelle für die
pro-Frame-Brettgeometrie (`BoardTracker`: Ecken + Warp). Kalibrieren, Sammeln und Inference
nutzen alle dasselbe hier — kein kopierter Kamera-/Ecken-/Encode-Code mehr.
"""

from __future__ import annotations

import threading
import time

import cv2

from ..calibration import (
    CalibrationProfile, board_corners_for_frame, make_tracker, open_camera, warp_from_corners,
)

_BOUNDARY = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"


class Camera:
    """Thread-sichere, geteilte Kamera. `ensure(index)` öffnet (oder wechselt) die Quelle,
    `read()` liefert den letzten Frame (oder None). `markers_*` spiegeln den Kalibrier-Status."""

    def __init__(self) -> None:
        self.cap = None
        self.index = None
        self.lock = threading.Lock()
        self.markers_found = False
        self.markers_count = 0
        self.markers_live = 0
        self.markers_held = 0

    def ensure(self, index: int) -> None:
        with self.lock:
            if self.cap is not None and self.index == index:
                return
            if self.cap is not None:
                self.cap.release()
            self.cap = open_camera(index)
            self.index = index

    def read(self):
        with self.lock:
            if self.cap is None:
                return None
            ok, f = self.cap.read()
            return f if ok else None

    def release(self) -> None:
        with self.lock:
            if self.cap is not None:
                self.cap.release()
            self.cap = None
            self.index = None

    @property
    def open(self) -> bool:
        return self.cap is not None


# Eine einzige Instanz für die ganze App.
CAMERA = Camera()


def encode_jpeg(img, quality: int = 80) -> bytes | None:
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, int(quality)])
    return buf.tobytes() if ok else None


def mjpeg(frames, idle: float = 0.05):
    """`frames`: Iterator von BGR-Bildern (np.ndarray) oder None (= kein Frame -> kurz warten).
    Kapselt JPEG-Encode + multipart-Boundary + StreamingResponse — der Aufrufer liefert nur Bilder."""
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
    """Pro Stream: aus dem Profil geseedeter Marker-Tracker + zuletzt bekannte Ecken.

    `process(frame)` -> (warped | None, corners | None). Genau **eine** Stelle für die
    Ecken-Erkennung und das Entzerren — Sammeln und Inference teilen sich diese Logik, und die
    zuletzt live gezeigten Ecken (`last_corners`) sind das, was beim Capturen gespeichert wird.
    """

    def __init__(self, profile: CalibrationProfile) -> None:
        self.profile = profile
        self.tracker = make_tracker(profile)
        self.last_corners = None

    def process(self, frame):
        corners = board_corners_for_frame(frame, self.profile, self.tracker)
        if corners is not None:
            self.last_corners = corners
        warped = warp_from_corners(frame, self.profile, corners) if corners is not None else None
        return warped, corners
