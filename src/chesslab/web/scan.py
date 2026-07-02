"""Turntable-Scan-Steuerung für die Web-UI (Tab „Scan").

EIN Grab-Thread hält den letzten Frame der gewählten Quelle (Handy-IP-Cam-URL oder USB-Index)
und speichert — wenn „recording" — den per Maus im Frontend gesetzten Crop im gewünschten
Intervall als `scans/<name>/NNN.jpg`. Die Live-Preview zeigt denselben Frame runterskaliert mit
eingezeichnetem Crop. Reiner Photogrammetrie-Input (RealityScan) — unabhängig von Kalibrierung/
Kamera-Singleton der übrigen App, damit ein Scan das Sammeln/Inference nicht stört.
"""

from __future__ import annotations

import os
import threading
import time
from pathlib import Path

import cv2

from .camera import _open_source

# scans/ liegt auf Repo-Ebene (neben data/) — cwd-unabhängig über die Dateilage ankern.
SCANS_ROOT = Path(__file__).resolve().parents[3] / "scans"


def _open(source, width: int, height: int):
    """USB-Index -> DSHOW+MJPG+angeforderte Auflösung (sonst kappt der Treiber bei 640×480);
    URL -> gemeinsamer Snapshot-/MJPEG-Leser aus camera.py (HTTPS/selbstsigniert-tauglich)."""
    s = str(source).strip()
    if s.isdigit():
        import platform
        backend = cv2.CAP_DSHOW if platform.system() == "Windows" else cv2.CAP_ANY
        cap = cv2.VideoCapture(int(s), backend)
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        for _ in range(6):
            cap.read()
        return cap
    return _open_source(s)


def _next_index(out_dir: Path) -> int:
    """Nächste freie NNN-Nummer im Ordner — so hängt „Ring 2" automatisch an Ring 1 an."""
    n = -1
    for p in out_dir.glob("*.jpg"):
        try:
            n = max(n, int(p.stem))
        except ValueError:
            pass
    return n + 1


class ScanController:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.cap = None
        self.source = ""
        self.thread: threading.Thread | None = None
        self.stop_flag = False

        # Bedarfs-Steuerung: die physische Kamera wird nur gegriffen, wenn Vorschau angezeigt
        # oder aufgenommen wird. `configured` = Quelle ausgewählt (UI-Panel offen); die echte
        # `cap` wird lazy geöffnet/nach `idle_timeout` Sekunden Leerlauf wieder freigegeben.
        self.configured = False
        self._cfg = ("0", 3840, 2160)          # (source, width, height) fürs Lazy-Reopen
        self._last_demand = 0.0                # letzter Preview-Abruf (Aufnahme = Dauerbedarf)
        self.idle_timeout = 12.0

        self.frame = None                 # letzter Full-Res-BGR-Frame
        self.frame_size = (0, 0)          # (w, h) der Quelle
        self.frame_id = 0
        self.error = ""

        self.recording = False
        self.out_name = ""
        self.out_dir: Path | None = None
        self.index = 0                    # nächste Dateinummer
        self.saved_run = 0                # in diesem Aufnahme-Lauf gespeichert
        self._last_save = 0.0

        # Konfig (per Frontend gesetzt)
        self.crop: tuple[int, int, int, int] | None = None   # (x0,y0,x1,y1) Full-Res
        self.interval = 0.8
        self.count = 0                    # 0 = unbegrenzt (bis Stop)
        self.quality = 92

    # -- Quelle öffnen / schließen -------------------------------------------------
    def open(self, source, width: int = 3840, height: int = 2160) -> dict:
        """Quelle AUSWÄHLEN + einmal testen. Danach hält der Loop die Kamera nur bei Bedarf
        (Vorschau/Aufnahme) und gibt sie im Leerlauf automatisch frei."""
        self.close()
        cap = _open(source, width, height)     # Testöffnung: schlägt früh fehl, wenn die Quelle streikt
        ok, img = cap.read()
        if not ok or img is None:
            try:
                cap.release()
            except Exception:  # noqa: BLE001
                pass
            raise RuntimeError(f"Keine Frames von {source!r}. Quelle/URL/App prüfen.")
        with self.lock:
            self.cap = cap                     # bleibt erstmal offen (Vorschau startet sofort)
            self.configured = True
            self._cfg = (str(source), int(width), int(height))
            self.source = str(source)
            self.frame = img
            self.frame_size = (img.shape[1], img.shape[0])
            self.frame_id += 1
            self.error = ""
            self.stop_flag = False
            self._last_demand = time.time()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        return self.status()

    def close(self) -> None:
        self.stop_flag = True
        t = self.thread
        if t is not None:
            t.join(timeout=2.0)
        with self.lock:
            self.recording = False
            self.configured = False
            self._release_cap_locked()
            self.thread = None

    def _release_cap_locked(self) -> None:
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:  # noqa: BLE001
                pass
        self.cap = None

    # -- Grab-/Speicher-Schleife ---------------------------------------------------
    def _loop(self) -> None:
        while not self.stop_flag:
            now = time.time()
            with self.lock:
                demand = self.recording or (now - self._last_demand) < self.idle_timeout
                cap = self.cap
                if not demand and cap is not None:      # Leerlauf -> Kamera freigeben
                    self._release_cap_locked()
                    self.frame = None                   # Vorschau soll nicht altes Bild zeigen
                    cap = None

            if demand and cap is None:                  # Bedarf, aber Kamera frei -> lazy öffnen
                try:
                    new = _open(*self._cfg)
                    ok, img = new.read()
                    if not ok or img is None:
                        new.release()
                        raise RuntimeError("kein Frame")
                except Exception as e:  # noqa: BLE001
                    with self.lock:
                        self.error = f"Reopen fehlgeschlagen: {e}"
                    time.sleep(0.3)
                    continue
                with self.lock:
                    self.cap = new
                    self.error = ""
                cap = new

            if cap is None:                             # geparkt: warten bis wieder Bedarf besteht
                time.sleep(0.15)
                continue

            ok, img = cap.read()
            if not ok or img is None:
                with self.lock:
                    self.error = "kein Frame"
                time.sleep(0.1)
                continue
            with self.lock:
                self.frame = img
                self.frame_size = (img.shape[1], img.shape[0])
                self.frame_id += 1
                self.error = ""
                due = self.recording and (time.time() - self._last_save) >= self.interval
                if due:
                    self._save_locked(img)

    def _save_locked(self, img) -> None:
        """Crop speichern (Aufrufer hält den Lock). Beendet den Lauf, wenn count erreicht."""
        crop = img
        if self.crop is not None:
            x0, y0, x1, y1 = self._clamp(self.crop, img.shape[1], img.shape[0])
            if x1 - x0 >= 8 and y1 - y0 >= 8:
                crop = img[y0:y1, x0:x1]
        assert self.out_dir is not None
        cv2.imwrite(str(self.out_dir / f"{self.index:03d}.jpg"), crop,
                    [cv2.IMWRITE_JPEG_QUALITY, int(self.quality)])
        self.index += 1
        self.saved_run += 1
        self._last_save = time.time()
        if self.count and self.saved_run >= self.count:
            self.recording = False

    @staticmethod
    def _clamp(box, w, h):
        x0, y0, x1, y1 = box
        x0, x1 = sorted((max(0, min(w, int(x0))), max(0, min(w, int(x1)))))
        y0, y1 = sorted((max(0, min(h, int(y0))), max(0, min(h, int(y1)))))
        return x0, y0, x1, y1

    # -- Konfig / Aufnahme ---------------------------------------------------------
    def configure(self, crop=None, interval=None, count=None, quality=None, out=None) -> dict:
        with self.lock:
            if crop is not None:
                self.crop = tuple(int(v) for v in crop) if crop else None
            if interval is not None:
                self.interval = max(0.0, float(interval))
            if count is not None:
                self.count = max(0, int(count))
            if quality is not None:
                self.quality = int(quality)
            if out is not None:
                self.out_name = str(out).strip()
        return self.status()

    def start(self, out: str | None = None) -> dict:
        with self.lock:
            if not self.configured:
                raise RuntimeError("keine Quelle offen — erst Verbinden.")
            name = (out or self.out_name).strip()
            if not name:
                raise RuntimeError("Zielname fehlt (z. B. 'pawn').")
            if self.crop is None:
                raise RuntimeError("kein Crop gesetzt — im Live-Bild einen Rahmen ziehen.")
            self.out_name = name
            self.out_dir = SCANS_ROOT / name
            self.out_dir.mkdir(parents=True, exist_ok=True)
            self.index = _next_index(self.out_dir)     # hängt an bestehende Ringe an
            self.saved_run = 0
            self._last_save = 0.0                       # sofort erstes Foto
            self.recording = True
        return self.status()

    def stop(self) -> dict:
        with self.lock:
            self.recording = False
        return self.status()

    # -- Preview / Status ----------------------------------------------------------
    def preview(self, maxside: int = 900, last_id: int = -1):
        """(bgr_image, frame_id) des letzten Frames, runterskaliert + Crop-Rahmen eingezeichnet.
        Gibt (None, id) zurück, wenn kein neuer Frame vorliegt (Aufrufer wartet dann kurz)."""
        with self.lock:
            self._last_demand = time.time()    # Vorschau-Abruf = Bedarf (hält die Kamera wach)
            img = self.frame
            fid = self.frame_id
            crop = self.crop
            rec = self.recording
        if img is None or fid == last_id:
            return None, fid
        h, w = img.shape[:2]
        sc = min(1.0, maxside / max(w, h))
        small = cv2.resize(img, (int(w * sc), int(h * sc))) if sc < 1.0 else img.copy()
        if crop is not None:
            x0, y0, x1, y1 = self._clamp(crop, w, h)
            col = (0, 200, 0) if rec else (0, 180, 255)
            cv2.rectangle(small, (int(x0 * sc), int(y0 * sc)), (int(x1 * sc), int(y1 * sc)), col, 2)
        return small, fid

    def status(self) -> dict:
        with self.lock:
            total = len(list(self.out_dir.glob("*.jpg"))) if self.out_dir else 0
            return {
                "open": self.configured,        # Quelle ausgewählt (UI-Panel offen)
                "grabbing": self.cap is not None,  # Kamera gerade physisch aktiv (sonst geparkt)
                "source": self.source,
                "frame_size": list(self.frame_size),
                "recording": self.recording,
                "out": self.out_name,
                "crop": list(self.crop) if self.crop else None,
                "interval": self.interval,
                "count": self.count,
                "quality": self.quality,
                "saved_run": self.saved_run,
                "total": total,
                "index": self.index,
                "error": self.error,
                "default_source": os.environ.get("CHESSLAB_CAMERA_SOURCE", "").strip()
                or os.environ.get("CHESSLAB_CAMERA_CAPTURE", "").strip(),
            }


SCANNER = ScanController()
