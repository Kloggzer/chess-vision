"""Stage 7 (Part 1) — shared photometric preprocessing.

**Single Source of Truth** for deterministic image preprocessing of a square crop. Exactly
this function is baked INTO the PNGs during slicing (see `labeling.py`) AND later applied by the
live inference app to every crop — thus train/inference parity is physically anchored in the
data, not merely a runtime contract that can drift.

Intentionally only **deterministic** methods (no randomness): baking loses nothing, and
the live app reproduces exactly the same. Random augmentation (brightness/gamma jitter) stays
separate in the training transform (`training/torch_data.py`) and is applied on top.

Headless, no torch. Input/output: BGR uint8 (OpenCV convention), shape preserved.
"""

from __future__ import annotations

import cv2
import numpy as np

from . import config

PHOTOMETRY_METHODS: tuple[str, ...] = config.PHOTOMETRY_METHODS


def preprocess_crop(bgr: np.ndarray, method: str = "none",
                    params: config.PhotometryDefaults | None = None) -> np.ndarray:
    """Deterministic photometric normalization of a BGR uint8 crop -> BGR uint8.

    `method`:
      - "none"      : Identity (baseline).
      - "clahe"     : CLAHE on the L channel in LAB (local contrast, no color shift).
      - "grayworld" : Gray-world white balance (global color/brightness adjustment).
      - "gamma"     : fixed gamma brightening of shadows.

    Unknown method -> ValueError (no silent pass-through so typos are caught).
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
    raise ValueError(f"unknown photometry method {method!r}; allowed: {PHOTOMETRY_METHODS}")


def _clahe(bgr: np.ndarray, clip: float, tile: int) -> np.ndarray:
    """CLAHE on luminance only (LAB-L) — boost local contrast, leave hue untouched."""
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l_ch, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=float(clip), tileGridSize=(int(tile), int(tile)))
    l_ch = clahe.apply(l_ch)
    return cv2.cvtColor(cv2.merge((l_ch, a, b)), cv2.COLOR_LAB2BGR)


def _grayworld(bgr: np.ndarray) -> np.ndarray:
    """Gray-world: scale each channel so that channel means are equalized."""
    means = bgr.reshape(-1, 3).mean(axis=0)            # [B, G, R]
    gray = float(means.mean())
    if gray < 1e-6:
        return bgr
    gains = gray / np.maximum(means, 1e-6)
    out = bgr.astype(np.float32) * gains.reshape(1, 1, 3)
    return np.clip(out, 0, 255).astype(np.uint8)


def _gamma(bgr: np.ndarray, gamma: float) -> np.ndarray:
    """Gamma brightening via LUT: out = (in/255)^(1/gamma) * 255. gamma>1 brightens shadows."""
    g = max(float(gamma), 1e-6)
    inv = 1.0 / g
    lut = np.array([((i / 255.0) ** inv) * 255.0 for i in range(256)], dtype=np.float32)
    lut = np.clip(lut, 0, 255).astype(np.uint8)
    return cv2.LUT(bgr, lut)
