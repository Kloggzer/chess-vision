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
from pathlib import Path

import cv2


def lock_settings(cap, exposure=None, gain=None, wb=None, focus=None):
    """Belichtung/WB/Fokus sperren → konstante Optik über ALLE Fotos (Photogrammetrie-Muss)
    und Anti-Flicker: eine feste Belichtungszeit = Vielfaches der Netz-Periode (10 ms @ 50 Hz)
    verhindert die wandernden LED-Streifen. DSHOW-`exposure` ist log2(Sekunden), z. B. -6 = 1/64 s."""
    def _set(prop, val, name):
        cap.set(prop, val)
        got = cap.get(prop)
        print(f"    {name:16} soll={val!s:>7}  ist={got:.3g}")

    # 0.25 = manueller Modus (DSHOW-Konvention), 0.75 = auto
    _set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.25, "auto_exposure")
    if exposure is not None:
        _set(cv2.CAP_PROP_EXPOSURE, exposure, "exposure")
    try:
        _set(cv2.CAP_PROP_AUTO_WB, 0, "auto_wb")
        if wb is not None:
            _set(cv2.CAP_PROP_WB_TEMPERATURE, wb, "wb_temp")
    except Exception:
        pass
    if gain is not None:
        _set(cv2.CAP_PROP_GAIN, gain, "gain")
    try:
        _set(cv2.CAP_PROP_AUTOFOCUS, 0, "autofocus")
        if focus is not None:
            _set(cv2.CAP_PROP_FOCUS, focus, "focus")
    except Exception:
        pass


def open_source(source: str, width: int = 3840, height: int = 2160, timeout: float = 8.0,
                exposure=None, gain=None, wb=None, focus=None):
    if str(source).isdigit():
        import platform
        backend = cv2.CAP_DSHOW if platform.system() == "Windows" else cv2.CAP_ANY
        cap = cv2.VideoCapture(int(source), backend)
        # USB-Webcams liefern hohe Auflösung NUR mit MJPG; ohne das kappt der Treiber bei 640x480.
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        if exposure is not None or gain is not None or wb is not None or focus is not None:
            print("[capture] Optik sperren (konstant über alle Fotos, Anti-Flicker):")
            lock_settings(cap, exposure=exposure, gain=gain, wb=wb, focus=focus)
        for _ in range(8):                # Auto-Exposure/Fokus einschwingen lassen
            cap.read()
        return cap
    from chesslab.web.camera import _UrlSnapshotCapture
    return _UrlSnapshotCapture(source, timeout=timeout)


def grab(cap):
    ok, img = cap.read()
    return img if ok and img is not None else None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True,
                    help="Snapshot-URL (…/video/snapshot) oder Kamera-Index (0).")
    ap.add_argument("--out", required=True, help="Zielordner, z. B. scans/king")
    ap.add_argument("--start", type=int, default=0, help="Startnummer (zum Fortsetzen einer Figur).")
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
    cap = open_source(a.source, a.width, a.height,
                      exposure=a.exposure, gain=a.gain, wb=a.wb, focus=a.focus)

    # Test-Frame
    test = grab(cap)
    if test is None:
        print(f"[FAIL] Kein Bild von {a.source!r}. Cam/TLS/URL prüfen.")
        return
    h, w = test.shape[:2]
    print(f"[capture] Quelle ok ({w}x{h}) -> {out}")
    i = a.start

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
                    if (i - a.start) % 10 == 0:
                        print(f"  {i-a.start} Fotos … ({cw}x{ch})")
                if a.count and i - a.start >= a.count:
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
    print(f"\n[capture] {i - a.start} Fotos in {out.resolve()}  —  jetzt in RealityScan importieren.")


if __name__ == "__main__":
    main()
