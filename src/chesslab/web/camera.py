"""Geteiltes Kamera-Modul der Web-UI.

EINE Kamera-Instanz (`CAMERA`), EIN MJPEG-Helfer (`mjpeg`) und EINE Quelle für die
pro-Frame-Brettgeometrie (`BoardTracker`: Ecken + Warp). Kalibrieren, Sammeln und Inference
nutzen alle dasselbe hier — kein kopierter Kamera-/Ecken-/Encode-Code mehr.
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

# Env-Override: ist diese Variable gesetzt (z.B. eine IP-Cam-URL), nutzen ALLE Kamera-Pfade der
# Web-UI diese Quelle statt des per UI gewählten Integer-Index. So lässt sich eine Handy-/Netzwerk-
# Kamera ohne Frontend-Änderung anschließen. Beispiel:
#   set CHESSLAB_CAMERA_SOURCE=https://192.168.178.23:4444/video/snapshot   (Android IP Camera)
CAMERA_SOURCE_ENV = "CHESSLAB_CAMERA_SOURCE"


class _UrlSnapshotCapture:
    """cv2.VideoCapture-kompatibler Frame-Holer für eine JPEG-Snapshot-URL (z.B. Android IP Camera
    `/video/snapshot`). `cv2.VideoCapture` scheitert an selbstsigniertem HTTPS — daher die Bytes
    selbst per urllib (TLS-Prüfung aus) holen und mit `cv2.imdecode` dekodieren. Pollt je `read()`
    ein Einzelbild (für Kalibrier-/Sammel-Preview mit ein paar FPS ausreichend)."""

    def __init__(self, url: str, timeout: float = 4.0) -> None:
        self.url = url
        self.timeout = timeout
        self._ctx = ssl.create_default_context()
        self._ctx.check_hostname = False
        self._ctx.verify_mode = ssl.CERT_NONE     # selbstsigniertes Zert akzeptieren
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
        except Exception:  # noqa: BLE001 — Netz/Timeout: wie ein leerer Frame behandeln
            return False, None

    def release(self) -> None:
        self._ok = False


class _UrlMjpegCapture:
    """cv2.VideoCapture-kompatibler Leser für einen MJPEG-Stream (multipart/x-mixed-replace),
    z.B. Android IP Camera `/video/m.jpeg`. Hält EINE offene Verbindung (selbstsigniertes HTTPS
    via urllib, TLS-Prüfung aus) und schneidet je `read()` das nächste JPEG anhand der SOI/EOI-
    Marker (0xFFD8 … 0xFFD9) aus dem Puffer — deutlich flüssiger als Einzel-Snapshots."""

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
                a = self._buf.find(b"\xff\xd8")               # JPEG-Start
                b = self._buf.find(b"\xff\xd9", a + 2) if a != -1 else -1  # JPEG-Ende
                if a != -1 and b != -1:
                    jpg = bytes(self._buf[a:b + 2])
                    del self._buf[:b + 2]
                    img = cv2.imdecode(np.frombuffer(jpg, np.uint8), cv2.IMREAD_COLOR)
                    return (img is not None), img
                chunk = self._stream.read(16384)
                if not chunk:
                    return False, None
                self._buf.extend(chunk)
        except Exception:  # noqa: BLE001 — Netz/Timeout: wie leerer Frame
            return False, None

    def release(self) -> None:
        self._ok = False
        try:
            self._stream.close()
        except Exception:  # noqa: BLE001
            pass


class LatestFrame:
    """Grab-Latest-Wrapper: liest im Hintergrund permanent von einer `cv2.VideoCapture`-
    kompatiblen Quelle und hält nur den NEUESTEN Frame in einem Ein-Slot-Puffer. So bekommt
    ein langsamer Konsument (Move-Tracker mit CNN/Encode) immer das aktuellste Bild, statt
    einen mit der Zeit anwachsenden Rückstand aus dem Socket-/JPEG-Puffer abzuarbeiten.

    `read()` gibt sofort `(ok, frame)` des letzten Frames zurück (kein Blockieren auf Netz);
    `release()` stoppt den Reader-Thread und gibt die zugrunde liegende Quelle frei."""

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
                # Quelle (noch) leer/kaputt: kurz warten, damit die Schleife nicht heißdreht.
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
    """Quelle öffnen: URL -> MJPEG-Stream-Leser bzw. Snapshot-Holer (beide HTTPS/selbstsigniert-
    tauglich); sonst lokaler Index/Pfad über `open_camera` (DSHOW unter Windows). Enthält die URL
    'snapshot' -> Einzelbild-Poll, sonst Multipart-MJPEG-Stream (flüssiger)."""
    if _is_url(source):
        if "snapshot" in source.lower():
            return _UrlSnapshotCapture(source)
        return _UrlMjpegCapture(source)
    return open_camera(source)


_open_source = open_source  # backward-compat alias (move_tracker used this before phase 06)


def effective_source(index):
    """Wirksame Quelle für einen per UI gewählten Index: Env-Override (URL) gewinnt, sonst der Index.
    Rückgabe ist ein hashbarer Schlüssel (URL-String oder int)."""
    env = os.environ.get(CAMERA_SOURCE_ENV, "").strip()
    if env:
        return env
    return index


# Optionale HOCHAUFLÖSENDE Capture-Quelle: die Live-Vorschau läuft flüssig über den (ggf.
# runterskalierten) Stream, aber GESPEICHERTE Frames werden aus dieser Snapshot-URL gezogen
# (volle Sensorauflösung). Marker werden beim Capture auf dem Snapshot NEU erkannt -> Stream- und
# Capture-Quelle dürfen sich in Auflösung/Orientierung unterscheiden. Beispiel:
#   set CHESSLAB_CAMERA_CAPTURE=https://192.168.178.23:4444/video/snapshot
CAMERA_CAPTURE_ENV = "CHESSLAB_CAMERA_CAPTURE"


def capture_url() -> str | None:
    """Hochauflösende Snapshot-URL fürs Speichern, falls gesetzt; sonst None (-> Live-Frame)."""
    return os.environ.get(CAMERA_CAPTURE_ENV, "").strip() or None


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

    def ensure(self, index) -> None:
        src = effective_source(index)   # Env-Override (IP-Cam-URL) gewinnt über den UI-Index
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
        """Frame fürs SPEICHERN holen -> (frame, is_hires). Ist eine Capture-URL gesetzt
        (`CHESSLAB_CAMERA_CAPTURE`), wird daraus ein einzelner hochaufgelöster Snapshot geholt
        (is_hires=True); sonst der aktuelle Live-Frame (is_hires=False). Bei is_hires MUSS der
        Aufrufer die Marker/Ecken auf DIESEM Frame neu bestimmen (andere Auflösung/Orientierung
        als die Vorschau)."""
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

    ``process(frame)`` -> (warped | None, corners | None). Genau **eine** Stelle für die
    Ecken-Erkennung und das Entzerren — Sammeln und Inference teilen sich diese Logik, und die
    zuletzt live gezeigten Ecken (``last_corners``) sind das, was beim Capturen gespeichert wird.

    Thread-sicher: ``last_corners`` wird unter eigenem Lock geschrieben; ``corners()`` liefert
    eine Kopie.
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
        """Kopie der zuletzt bekannten Ecken (thread-sicher)."""
        with self._lock:
            return list(self.last_corners) if self.last_corners is not None else None
