"""Bereinigt eingebrannte Glanzlichter + weiße Schnipsel aus den Figuren-Scan-Texturen.

Die Photogrammetrie-Texturen (synth_pieces/<piece>/<var>.png) haben vom Scan-Licht
eingebrannte Specular-Highlights (helle, oft cyan-weiße Streifen — v. a. auf den glänzenden
schwarzen Figuren) und kleine weiße Artefakt-Schnipsel. Beides ist im Render als falscher
Glanz/Fleck sichtbar. Dieser Schritt zieht Highlights auf den diffusen Grundton herunter,
entsättigt sie (Glanz ist farblos) und übermalt (inpaint) die weißen Schnipsel.

Nicht-destruktiv: das Original wird EINMALIG nach <stem>_raw.png gesichert; danach wird
<stem>.png durch die bereinigte Version ersetzt. `--preview` schreibt stattdessen nur
<stem>_clean.png (Original unangetastet) zum Ansehen.

    uv run python synth/clean_piece_textures.py --preview synth_pieces/bN/v1.png
    uv run python synth/clean_piece_textures.py --all        # alle, mit Backup, in place
"""

from __future__ import annotations

import argparse
import glob
import os
import shutil

import cv2
import numpy as np


def clean_texture(bgr: np.ndarray, spec_thr: float = 10.0,
                  speck_L: int = 185, speck_S: int = 30) -> np.ndarray:
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    L, A, B = lab[:, :, 0], lab[:, :, 1], lab[:, :, 2]

    # Diffuser Grundton (ohne Highlights): Median auf kleiner Skala, dann hochskaliert.
    small = cv2.resize(L, (256, 256), interpolation=cv2.INTER_AREA).astype(np.uint8)
    base_s = cv2.medianBlur(small, 21).astype(np.float32)
    baseL = cv2.resize(base_s, (L.shape[1], L.shape[0]), interpolation=cv2.INTER_LINEAR)

    # Highlights = L deutlich über Grundton → weich herunterziehen.
    over = np.clip(L - baseL - spec_thr, 0, None)
    L2 = L - over * 0.95
    # Glanz ist farblos → Chroma der starken Highlights Richtung neutral ziehen.
    hl = np.clip(over / 40.0, 0, 1)
    A2 = 128 + (A - 128) * (1 - 0.6 * hl)
    B2 = 128 + (B - 128) * (1 - 0.6 * hl)

    lab2 = np.clip(np.stack([L2, A2, B2], axis=2), 0, 255).astype(np.uint8)
    out = cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)

    # Weiße Schnipsel: hell + wenig Chroma → Maske, leicht wachsen, inpainten.
    sat = np.sqrt((A - 128) ** 2 + (B - 128) ** 2)
    speck = ((L > speck_L) & (sat < speck_S)).astype(np.uint8) * 255
    speck = cv2.dilate(speck, np.ones((3, 3), np.uint8), iterations=1)
    if speck.any():
        out = cv2.inpaint(out, speck, 3, cv2.INPAINT_TELEA)
    return out


def process(path: str, preview: bool) -> None:
    bgr = cv2.imread(path)
    if bgr is None:
        print(f"skip (unreadable): {path}")
        return
    cleaned = clean_texture(bgr)
    stem, ext = os.path.splitext(path)
    if preview:
        cv2.imwrite(f"{stem}_clean{ext}", cleaned)
        print(f"preview -> {stem}_clean{ext}")
    else:
        raw = f"{stem}_raw{ext}"
        if not os.path.exists(raw):
            shutil.copyfile(path, raw)      # Original EINMALIG sichern
        cv2.imwrite(path, cleaned)
        print(f"cleaned in place -> {path}  (Original: {raw})")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*", help="Textur-PNG(s).")
    ap.add_argument("--preview", action="store_true", help="Nur <stem>_clean.png schreiben (Original bleibt).")
    ap.add_argument("--all", action="store_true", help="Alle synth_pieces/*/v*.png (ohne _raw/_clean/_preview).")
    a = ap.parse_args()
    paths = list(a.paths)
    if a.all:
        for p in glob.glob("synth_pieces/*/*.png"):
            b = os.path.basename(p)
            if any(t in b for t in ("_raw", "_clean", "_preview", "board_texture")):
                continue
            paths.append(p)
    for p in paths:
        process(p, a.preview)


if __name__ == "__main__":
    main()
