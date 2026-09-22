"""Turntable-Aufnahme für Photogrammetrie — pro ENTER ein High-Res-Snapshot von der (IP-)Cam.

Aufruf (im EIGENEN Terminal, damit die ENTER-Eingabe funktioniert):
    uv run python synth/capture_turntable.py --source https://<PHONE-IP>:4444/video/snapshot --out scans/king

ENTER  = Foto aufnehmen (du drehst den Teller ~15°, dann ENTER)
r      = neuen Ring markieren (nur Hinweis; Kamera-Höhe ändern)
q      = fertig

Tipps: Kamera FIX, Figur + gemusterte Unterlage drehen sich MIT, Hintergrund schlicht, Fokus/Belichtung
sperren. ~24 Fotos/Ring × 2–3 Ringe (flach / halbhoch / steil von oben — Top-Ring ist wichtig!)."""

from __future__ import annotations

import argparse
import ssl
import urllib.request
from pathlib import Path

import cv2
import numpy as np


class _SnapshotUrl:
    """`cv2.VideoCapture`-compatible grabber for a JPEG snapshot URL (Android IP Camera
    `/video/snapshot`). `cv2.VideoCapture` fails on the app's self-signed HTTPS, so the bytes
    come over urllib with verification off and are decoded here."""

    def __init__(self, url: str, timeout: float = 8.0) -> None:
        self.url, self.timeout = url, timeout
        self._ctx = ssl.create_default_context()
        self._ctx.check_hostname = False
        self._ctx.verify_mode = ssl.CERT_NONE

    def read(self):
        try:
            data = urllib.request.urlopen(self.url, timeout=self.timeout, context=self._ctx).read()
        except Exception as exc:
            print(f"[capture] {self.url}: {exc}")
            return False, None
        img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        return img is not None, img

    def release(self) -> None:
        pass


def open_source(source: str, width: int = 3840, height: int = 2160, timeout: float = 8.0,
                exposure=None, gain=None, wb=None, focus=None):
    """URL → snapshot grabber; USB index → 4K with the optics locked (constant exposure/WB/focus
    over ALL photos = photogrammetry must + anti-flicker). DSHOW `exposure` is log2(seconds),
    e.g. -6 = 1/64 s. Self-contained since `chesslab.camera` was retired on 2026-08-20."""
    if not str(source).isdigit():
        return _SnapshotUrl(source, timeout=timeout)
    cap = cv2.VideoCapture(int(source), cv2.CAP_DSHOW)
    # FOURCC BEFORE the resolution: set the other way round the 4K cam accepts MJPG and silently
    # keeps YUY2 (opencv#7013), which caps the rate and the size.
    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
    for prop, value, auto in ((cv2.CAP_PROP_EXPOSURE, exposure, cv2.CAP_PROP_AUTO_EXPOSURE),
                              (cv2.CAP_PROP_GAIN, gain, None),
                              (cv2.CAP_PROP_WB_TEMPERATURE, wb, cv2.CAP_PROP_AUTO_WB),
                              (cv2.CAP_PROP_FOCUS, focus, cv2.CAP_PROP_AUTOFOCUS)):
        if value is None:
            continue
        if auto is not None:
            cap.set(auto, 0)
        cap.set(prop, float(value))
    if any(v is not None for v in (exposure, gain, wb, focus)):
        print("[capture] Optik gesperrt (konstant ueber alle Fotos, Anti-Flicker).")
    for _ in range(8):                          # warmup: the first frames come out under-exposed
        cap.read()
    return cap


def grab(cap):
    ok, img = cap.read()
    return img if ok and img is not None else None


def next_index(out: Path, start: int | None) -> int:
    """Wo die Nummerierung weitergeht — ohne `--start` HINTER dem letzten Foto des Ordners.

    `scans/` sind Ground-Truth ohne Backup (307 Fotos je Figur, `000.jpg` aufwaerts); ein zweiter
    Ring ohne `--start` schrieb sie der Reihe nach still neu.
    """
    taken = sorted(int(p.stem) for p in Path(out).glob("[0-9][0-9][0-9].jpg") if p.stem.isdigit())
    if start is None:
        return taken[-1] + 1 if taken else 0
    if (Path(out) / f"{start:03d}.jpg").exists():
        raise SystemExit(f"ERROR: {out}/{start:03d}.jpg existiert schon — --start {taken[-1] + 1} "
                         f"setzt hinter das letzte Foto.")
    return start


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True,
                    help="Snapshot-URL (…/video/snapshot) oder Kamera-Index (0).")
    ap.add_argument("--out", required=True, help="Zielordner, z. B. scans/king")
    ap.add_argument("--start", type=int, default=None,
                    help="Startnummer. Leer = hinter dem letzten Foto des Ordners weiter.")
    ap.add_argument("--quality", type=int, default=95, help="JPEG-Qualität.")
    ap.add_argument("--crop", default="", help="x0,y0,x1,y1 — schneidet statischen Hintergrund weg "
                                               "(nur Figur + mitdrehende Unterlage behalten).")
    ap.add_argument("--interval", type=float, default=0.0,
                    help="Sekunden zwischen Auto-Aufnahmen (z. B. 0.2). 0 = Tastendruck-Modus.")
    ap.add_argument("--count", type=int, default=0, help="Max. Fotos im Intervall-Modus (0 = bis Strg+C).")
    ap.add_argument("--width", type=int, default=3840, help="USB-Cam: angeforderte Breite (Default 4K).")
    ap.add_argument("--height", type=int, default=2160, help="USB-Cam: angeforderte Höhe (Default 4K).")
    ap.add_argument("--exposure", type=float, default=None,
                    help="Feste Belichtung sperren (DSHOW=log2 s, z. B. -6=1/64s). Anti-Flicker + "
                         "konstante Optik. Leer = Auto (nicht empfohlen fürs Scannen).")
    ap.add_argument("--gain", type=float, default=None, help="Feste Verstärkung sperren.")
    ap.add_argument("--wb", type=float, default=None, help="Feste Weißabgleich-Temperatur (z. B. 4600).")
    ap.add_argument("--focus", type=float, default=None, help="Fester Fokuswert (Autofokus wird aus).")
    a = ap.parse_args()
    box = [int(v) for v in a.crop.split(",")] if a.crop else None

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    start = next_index(out, a.start)
    cap = open_source(a.source, a.width, a.height,
                      exposure=a.exposure, gain=a.gain, wb=a.wb, focus=a.focus)

    # Test-Frame
    test = grab(cap)
    if test is None:
        print(f"[FAIL] Kein Bild von {a.source!r}. Cam/TLS/URL prüfen.")
        return
    h, w = test.shape[:2]
    print(f"[capture] Quelle ok ({w}x{h}) -> {out}")
    i = start

    def save(img):
        nonlocal i
        if box:
            img = img[box[1]:box[3], box[0]:box[2]]
        cv2.imwrite(str(out / f"{i:03d}.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, a.quality])
        i += 1
        return img.shape[1], img.shape[0]

    if a.interval > 0:
        import time
        print(f"INTERVALL: alle {a.interval}s ein Foto. Teller GLEICHMÄSSIG + langsam drehen.")
        print("Strg+C = stop.\n")
        try:
            while True:
                t0 = time.time()
                img = grab(cap)
                if img is not None:
                    cw, ch = save(img)
                    if (i - start) % 10 == 0:
                        print(f"  {i-start} Fotos … ({cw}x{ch})")
                if a.count and i - start >= a.count:
                    break
                dt = a.interval - (time.time() - t0)
                if dt > 0:
                    time.sleep(dt)
        except KeyboardInterrupt:
            print("\n  gestoppt.")
    else:
        print("ENTER = Foto · 'r' = neuer Ring · 'q' = fertig\n")
        ring = 1
        while True:
            cmd = input(f"[Ring {ring} | {i:03d}] ENTER=Foto > ").strip().lower()
            if cmd == "q":
                break
            if cmd == "r":
                ring += 1
                print(f"  -> Ring {ring}: Kamera-Höhe ändern, weiter mit ENTER")
                continue
            img = grab(cap)
            if img is None:
                print("  !! kein Bild — nochmal ENTER")
                continue
            cw, ch = save(img)
            print(f"  gespeichert {i-1:03d}.jpg ({cw}x{ch})")

    rel = getattr(cap, "release", None)
    if callable(rel):
        cap.release()
    print(f"\n[capture] {i - start} Fotos in {out.resolve()}  —  jetzt in RealityScan importieren.")


if __name__ == "__main__":
    main()
