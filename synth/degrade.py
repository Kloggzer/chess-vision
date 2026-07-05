"""Kamera-Look-Degradation für synthetische Board-Renders (macht sie „webcam-echt").

Der EEVEE-Render ist knackscharf, kühl und kontrastreich; die echte Webcam liefert weiche,
warme, leicht verrauschte JPEGs. Dieser Schritt gleicht genau das an — der größte Sim-to-Real-
Hebel (das Modell konnte Synth sonst trivial an Schärfe/Farbe erkennen). Läuft NACH dem Rendern,
VOR dem Ingest (auf den ~n Board-PNGs, nicht auf den Crops → effizient; Crops erben es via Warp).

Alle Effekte sind mild + fest (kein Statistik-Match, daher hintergrund-robust) und pro Bild
deterministisch zufällig variiert (Seed aus dem Dateinamen) → Domain-Randomization bleibt erhalten.

    uv run python synth/degrade.py <dir>   # bearbeitet <dir>/*.png in place
"""

from __future__ import annotations

import argparse
import glob
import os

import cv2
import numpy as np


def degrade_image(bgr: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    im = bgr.astype(np.float32)
    # 1) Kontrast leicht senken (real ist flacher) um den Mittelwert 128.
    c = rng.uniform(0.82, 0.94)
    im = (im - 128.0) * c + 128.0
    # 2) Warm-Shift (real ist wärmer): R hoch, B runter (BGR: [0]=B, [2]=R).
    im[:, :, 2] *= rng.uniform(1.02, 1.08)
    im[:, :, 0] *= rng.uniform(0.92, 0.98)
    # 3) Defokus / weiche Optik (real ist deutlich unschärfer als EEVEE).
    k = rng.uniform(0.8, 1.8)
    im = cv2.GaussianBlur(im, (0, 0), k)
    # 4) Sensor-Rauschen.
    im = im + rng.normal(0.0, rng.uniform(2.0, 6.0), im.shape)
    im = np.clip(im, 0, 255).astype(np.uint8)
    # 5) JPEG-Artefakte (echte Kamera speichert JPEG).
    q = int(rng.integers(70, 88))
    ok, enc = cv2.imencode(".jpg", im, [int(cv2.IMWRITE_JPEG_QUALITY), q])
    return cv2.imdecode(enc, cv2.IMREAD_COLOR) if ok else im


def _seed_from_name(path: str) -> int:
    stem = os.path.splitext(os.path.basename(path))[0]
    try:
        return int(stem)
    except ValueError:
        return abs(hash(stem)) % (2**31)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("dir", help="Verzeichnis mit gerenderten Board-PNGs (werden in place ersetzt).")
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(a.dir, "*.png")))
    n = 0
    for f in files:
        img = cv2.imread(f)
        if img is None:
            continue
        rng = np.random.default_rng(_seed_from_name(f))
        out = degrade_image(img, rng)
        cv2.imwrite(f, out)
        n += 1
    print(f"degraded {n} images in {a.dir}")


if __name__ == "__main__":
    main()
