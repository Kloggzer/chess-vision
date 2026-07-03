"""Stufe 7 (Teil 1) — geteilte photometrische Aufbereitung.

**Single Source of Truth** für die deterministische Bildaufbereitung eines Square-Crops. Genau
diese Funktion wird beim Slicen IN die PNGs gebacken (siehe `labeling.py`) UND später von der
Live-Inferenz-App auf jeden Crop angewandt — so ist die Train/Inference-Parität physisch in den
Daten verankert, nicht nur ein Laufzeit-Vertrag, der driften kann.

Bewusst nur **deterministische** Methoden (kein Zufall): das Backen verliert dadurch nichts, und
die Live-App reproduziert exakt dasselbe. Zufällige Augmentation (Brightness/Gamma-Jitter) bleibt
getrennt im Trainings-Transform (`training/torch_data.py`) und liegt obendrauf.

Headless, kein torch. Eingabe/Ausgabe: BGR uint8 (OpenCV-Konvention), Form bleibt erhalten.
"""

from __future__ import annotations

import cv2
import numpy as np

from . import config

PHOTOMETRY_METHODS: tuple[str, ...] = config.PHOTOMETRY_METHODS


def preprocess_crop(bgr: np.ndarray, method: str = "none",
                    params: config.PhotometryDefaults | None = None) -> np.ndarray:
    """Deterministische photometrische Normierung eines BGR-uint8-Crops -> BGR uint8.

    `method`:
      - "none"      : Identität (Baseline).
      - "clahe"     : CLAHE auf dem L-Kanal in LAB (lokaler Kontrast, keine Farbverschiebung).
      - "grayworld" : Gray-World-Weißabgleich (globaler Farb-/Helligkeitsausgleich).
      - "gamma"     : feste Gamma-Aufhellung der Schatten.

    Unbekannte Methode -> ValueError (kein stilles Durchreichen, damit Tippfehler auffallen).
    """
    p = params or config.PHOTOMETRY
    if method == "none":
        return bgr
    if method == "clahe":
        return _clahe(bgr, p.clahe_clip, p.clahe_tile)
    if method == "grayworld":
        return _grayworld(bgr)
    if method == "gamma":
        return _gamma(bgr, p.gamma)
    raise ValueError(f"unbekannte Photometrie-Methode {method!r}; erlaubt: {PHOTOMETRY_METHODS}")


def _clahe(bgr: np.ndarray, clip: float, tile: int) -> np.ndarray:
    """CLAHE nur auf der Luminanz (LAB-L) — Kontrast lokal anheben, Farbton unangetastet."""
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l_ch, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=float(clip), tileGridSize=(int(tile), int(tile)))
    l_ch = clahe.apply(l_ch)
    return cv2.cvtColor(cv2.merge((l_ch, a, b)), cv2.COLOR_LAB2BGR)


def _grayworld(bgr: np.ndarray) -> np.ndarray:
    """Gray-World: je Kanal so skalieren, dass die Kanalmittel angeglichen werden."""
    means = bgr.reshape(-1, 3).mean(axis=0)            # [B, G, R]
    gray = float(means.mean())
    if gray < 1e-6:
        return bgr
    gains = gray / np.maximum(means, 1e-6)
    out = bgr.astype(np.float32) * gains.reshape(1, 1, 3)
    return np.clip(out, 0, 255).astype(np.uint8)


def _gamma(bgr: np.ndarray, gamma: float) -> np.ndarray:
    """Gamma-Aufhellung per LUT: out = (in/255)^(1/gamma) * 255. gamma>1 hellt Schatten auf."""
    g = max(float(gamma), 1e-6)
    inv = 1.0 / g
    lut = np.array([((i / 255.0) ** inv) * 255.0 for i in range(256)], dtype=np.float32)
    lut = np.clip(lut, 0, 255).astype(np.uint8)
    return cv2.LUT(bgr, lut)
