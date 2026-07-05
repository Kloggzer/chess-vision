"""Entfernt die eingebrannte breite Lichtreflexion ("Highlight") aus der Brett-Foto-Textur.

Das Brett wurde unter einer Lichtquelle fotografiert → eine breite, immer gleiche Glanz-/
Helligkeitsreflexion ist in der Textur eingebacken und taucht in JEDEM Render auf. Das ist eine
niederfrequente Ungleich-Ausleuchtung. Fix = Flat-Field-Korrektur: die grob geblurrte
Ausleuchtung (illumination) herausteilen, sodass die Helligkeit übers Brett gleichmäßig wird —
das hochfrequente Schachbrettmuster + Grid + Koordinaten bleiben erhalten. Zusätzlich ein sanfter
Specular-Clamp gegen einzelne helle Glanzstreifen.

Nicht-destruktiv: Original einmalig nach board_texture_raw.png; `--preview` schreibt nur _clean.png.

    uv run python synth/clean_board_texture.py --preview synth_pieces/board_texture.png
"""

from __future__ import annotations

import argparse
import os
import shutil

import cv2
import numpy as np


def clean_board(bgr: np.ndarray, sigma_frac: float = 0.14, gain_lo: float = 0.72,
                gain_hi: float = 1.25, spec_clamp: float = 0.5) -> np.ndarray:
    h, w = bgr.shape[:2]
    img = bgr.astype(np.float32)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)

    # Grobe Ausleuchtung: sehr weicher Blur (~1.4 Felder) fängt die breite Reflexion,
    # nicht das Schachbrettmuster.
    sigma = sigma_frac * max(w, h)
    illum = cv2.GaussianBlur(gray, (0, 0), sigma)
    target = float(np.median(illum))
    gain = np.clip(target / (illum + 1e-3), gain_lo, gain_hi)
    out = img * gain[:, :, None]

    # Sanfter Specular-Clamp: einzelne helle Streifen (deutlich über lokaler Ausleuchtung)
    # anteilig herunterziehen.
    over = np.clip(gray * gain - (target + 35.0), 0, None)
    out -= (over * spec_clamp)[:, :, None]

    return np.clip(out, 0, 255).astype(np.uint8)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--preview", action="store_true")
    a = ap.parse_args()
    bgr = cv2.imread(a.path)
    cleaned = clean_board(bgr)
    stem, ext = os.path.splitext(a.path)
    if a.preview:
        cv2.imwrite(f"{stem}_clean{ext}", cleaned)
        print(f"preview -> {stem}_clean{ext}")
    else:
        raw = f"{stem}_raw{ext}"
        if not os.path.exists(raw):
            shutil.copyfile(a.path, raw)
        cv2.imwrite(a.path, cleaned)
        print(f"cleaned in place -> {a.path} (Original: {raw})")


if __name__ == "__main__":
    main()
