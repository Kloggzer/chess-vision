"""Turntable scan controller for the web UI (tab "Scan").

ONE grab thread keeps the latest frame from the selected source (phone IP cam URL or USB index)
and saves — when "recording" — the mouse-set crop from the frontend at the desired
interval as `scans/<name>/NNN.jpg`. The live preview shows the same frame downscaled with
the crop overlaid. Pure photogrammetry input (RealityScan) — independent of calibration/
camera singleton of the rest of the app, so scanning doesn't disturb collect/inference.
"""

from __future__ import annotations

import os
import threading
import time
from pathlib import Path

import cv2

from ..camera import CameraSpec, mode_size, open_capture, open_source, spec_for_mode

# scans/ lives at the repo level (next to data/) — anchored via file location, independent of cwd.
SCANS_ROOT = Path(__file__).resolve().parents[3] / "scans"


def _open(source, width: int, height: int, mode: str = ""):
    """USB index -> the camera lib (public API) picks backend/FOURCC order/fps clamp; a
    named mode from `camera_modes()` overrides the explicit width×height, otherwise the
    explicit resolution is requested (backward-compatible default). URL -> shared
    snapshot/MJPEG reader (HTTPS/self-signed-capable).

    `undistort=False` on purpose: RealityScan solves its own lens model from the photos,
    so pre-corrected input would only fight its bundle adjustment."""
    s = str(source).strip()
    if s.isdigit():
        if mode and mode_size(mode) is not None:
            spec = spec_for_mode(mode, source=int(s), warmup=6, undistort=False)
        else:
            spec = CameraSpec(source=int(s), width=int(width), height=int(height),
                              warmup=6, undistort=False)
        return open_capture(spec)
    return open_source(s)


def _open_snapshot(url: str):
    """Single-image snapshot reader for the save path, via the public opener (`url_mode=
    "snapshot"` forces one clean JPEG per read; undistort off — see `_open`)."""
    return open_capture(CameraSpec(source=url, url_mode="snapshot", undistort=False))


def _next_index(out_dir: Path) -> int:
    """Next free NNN number in the folder — so "Ring 2" automatically appends to Ring 1."""
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

        # Separate CAPTURE source: the live preview runs over the smooth stream
        # (`source`, usually …/video/m.jpeg), but SAVED photos are pulled from this
        # snapshot URL (…/video/snapshot, clean single images). Empty -> photos
        # come from the live frame. The crop drawn on the preview is scaled to the
        # snapshot resolution (if it differs from the stream).
        self.capture_source = ""
        self.capture_cap = None

        # Demand control: the physical camera is only grabbed when preview is shown
        # or recording is active. `configured` = source selected (UI panel open); the real
        # `cap` is opened lazily / released after `idle_timeout` seconds of inactivity.
        self.configured = False
        self._cfg = ("0", 2880, 2160, "")      # (source, width, height, mode) for lazy re-open
        self.mode = ""                         # named camera mode ("" = explicit width×height)
        self._last_demand = 0.0                # last preview fetch (recording = continuous demand)
        self.idle_timeout = 12.0

        self.frame = None                 # last full-res BGR frame
        self.frame_size = (0, 0)          # (w, h) of the source
        self.frame_id = 0
        self.error = ""

        self.recording = False
        self.out_name = ""
        self.out_dir: Path | None = None
        self.index = 0                    # next file number
        self.saved_run = 0                # saved in this recording run
        self._last_save = 0.0

        # Config (set via frontend)
        self.crop: tuple[int, int, int, int] | None = None   # (x0,y0,x1,y1) full-res
        self.interval = 0.8
        self.count = 0                    # 0 = unlimited (until stop)
        self.quality = 92

    # -- Source open / close -------------------------------------------------
    def open(self, source, width: int = 2880, height: int = 2160, capture_source: str = "",
             mode: str = "") -> dict:
        """SELECT source + test once. After that the loop only holds the camera on demand
        (preview/recording) and releases it automatically when idle.

        `capture_source` (optional): snapshot URL from which images are saved during recording —
        the preview stays on the smooth `source` stream.
        `mode` (optional): named camera mode (`camera_modes()`); overrides width×height for a
        USB source. Empty = explicit resolution (previous behavior)."""
        self.close()
        mode = str(mode or "").strip()
        cap = _open(source, width, height, mode)  # Test open: fails early if the source is broken
        ok, img = cap.read()
        if not ok or img is None:
            try:
                cap.release()
            except Exception:  # noqa: BLE001
                pass
            raise RuntimeError(f"No frames from {source!r}. Check source/URL/app.")
        cap_src = str(capture_source or "").strip()
        capture_cap = None
        if cap_src:
            probe = _open_snapshot(cap_src)        # Test snapshot once -> early, clear error
            ok_s, _ = probe.read()
            if not ok_s:
                try:
                    cap.release()
                except Exception:  # noqa: BLE001
                    pass
                raise RuntimeError(f"Snapshot source {cap_src!r} does not deliver an image. Check URL.")
            capture_cap = probe
        with self.lock:
            self.cap = cap                     # stays open initially (preview starts immediately)
            self.configured = True
            self._cfg = (str(source), int(width), int(height), mode)
            self.mode = mode
            self.source = str(source)
            self.capture_source = cap_src
            self.capture_cap = capture_cap
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
            if self.capture_cap is not None:
                try:
                    self.capture_cap.release()
                except Exception:  # noqa: BLE001
                    pass
            self.capture_cap = None
            self.thread = None

    def _release_cap_locked(self) -> None:
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:  # noqa: BLE001
                pass
        self.cap = None

    # -- Grab / save loop ---------------------------------------------------
    def _loop(self) -> None:
        while not self.stop_flag:
            now = time.time()
            with self.lock:
                demand = self.recording or (now - self._last_demand) < self.idle_timeout
                cap = self.cap
                if not demand and cap is not None:      # Idle -> release camera
                    self._release_cap_locked()
                    self.frame = None                   # Preview should not show old image
                    cap = None

            if demand and cap is None:                  # Demand but camera released -> lazy open
                try:
                    new = _open(*self._cfg)
                    ok, img = new.read()
                    if not ok or img is None:
                        new.release()
                        raise RuntimeError("no frame")
                except Exception as e:  # noqa: BLE001
                    with self.lock:
                        self.error = f"Re-open failed: {e}"
                    time.sleep(0.3)
                    continue
                with self.lock:
                    self.cap = new
                    self.error = ""
                cap = new

            if cap is None:                             # Parked: wait until demand reappears
                time.sleep(0.15)
                continue

            ok, img = cap.read()
            if not ok or img is None:
                with self.lock:
                    self.error = "no frame"
                time.sleep(0.1)
                continue
            ctx = None
            with self.lock:
                self.frame = img
                self.frame_size = (img.shape[1], img.shape[0])
                self.frame_id += 1
                self.error = ""
                if self.recording and (time.time() - self._last_save) >= self.interval:
                    ctx = (self.crop, self.frame_size, self.out_dir,
                           self.index, self.quality, self.capture_cap)
            if ctx is not None:
                self._save_photo(img, *ctx)     # Snapshot fetch + write WITHOUT lock

    def _save_photo(self, live_img, crop, prev_size, out_dir, index, quality, capture_cap) -> None:
        """Save one photo. If a snapshot source is set (`capture_cap`), the saved image comes
        from there and the crop drawn on the preview is scaled to the snapshot size; otherwise
        the live frame is saved. Runs deliberately WITHOUT lock (network fetch), counters are
        updated under lock at the end."""
        img = live_img
        sx = sy = 1.0
        if capture_cap is not None:
            ok, snap = capture_cap.read()
            if ok and snap is not None:
                img = snap
                pw, ph = prev_size
                if pw and ph:                    # Crop (preview coords) -> snapshot coords
                    sx, sy = snap.shape[1] / pw, snap.shape[0] / ph
            else:
                with self.lock:
                    self.error = "Snapshot failed — live frame saved"
        out = img
        if crop is not None:
            pw, ph = prev_size
            ap = (pw / ph) if ph else 0.0
            asp = (img.shape[1] / img.shape[0]) if img.shape[0] else 0.0
            # Only relevant for the snapshot path: if the snapshot orientation does not match
            # the preview (e.g. preview landscape, snapshot portrait), the preview crop would be
            # distorted and misplaced. In that case save the full snapshot + warn instead of
            # silently cropping garbage. For the live frame (no capture_cap) the coords always
            # match -> no check needed.
            aspect_mismatch = (capture_cap is not None and ap and asp
                               and abs(ap - asp) > 0.15 * asp)
            if aspect_mismatch:
                with self.lock:
                    self.error = ("Preview/snapshot have different orientations — full snapshot "
                                  "saved. Set both sources to the same resolution/orientation.")
            else:
                box = (crop[0] * sx, crop[1] * sy, crop[2] * sx, crop[3] * sy)
                x0, y0, x1, y1 = self._clamp(box, img.shape[1], img.shape[0])
                if x1 - x0 >= 8 and y1 - y0 >= 8:
                    out = img[y0:y1, x0:x1]
        assert out_dir is not None
        cv2.imwrite(str(out_dir / f"{index:03d}.jpg"), out,
                    [cv2.IMWRITE_JPEG_QUALITY, int(quality)])
        with self.lock:
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

    # -- Config / recording -------------------------------------------------
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
                raise RuntimeError("no source open — connect first.")
            name = (out or self.out_name).strip()
            if not name:
                raise RuntimeError("target name missing (e.g. 'pawn').")
            if self.crop is None:
                raise RuntimeError("no crop set — draw a box on the live image.")
            self.out_name = name
            self.out_dir = SCANS_ROOT / name
            self.out_dir.mkdir(parents=True, exist_ok=True)
            self.index = _next_index(self.out_dir)     # appends to existing rings
            self.saved_run = 0
            self._last_save = 0.0                       # first photo immediately
            self.recording = True
        return self.status()

    def stop(self) -> dict:
        with self.lock:
            self.recording = False
        return self.status()

    # -- Preview / Status ---------------------------------------------------
    def preview(self, maxside: int = 900, last_id: int = -1):
        """(bgr_image, frame_id) of the latest frame, downscaled + crop box drawn.
        Returns (None, id) when no new frame is available (caller then waits briefly)."""
        with self.lock:
            self._last_demand = time.time()    # preview fetch = demand (keeps camera alive)
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
                "open": self.configured,        # source selected (UI panel open)
                "grabbing": self.cap is not None,  # camera currently physically active (otherwise parked)
                "source": self.source,
                "capture_source": self.capture_source,
                "mode": self.mode,
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
                "default_source": os.environ.get("CHESSLAB_CAMERA_SOURCE", "").strip(),
                "default_capture": os.environ.get("CHESSLAB_CAMERA_CAPTURE", "").strip(),
            }


SCANNER = ScanController()
