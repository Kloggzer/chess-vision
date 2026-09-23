"""Weissabgleich + sanfte Ton-Korrektur fuer die Figuren-Texturen in synth_pieces/ (nur
Pipeline-Kopien): Perzentil-Weissabgleich gegen den Kunstlicht-Stich, Gamma-Lift fuer sehr dunkle
Texturen.

Volle Staerke kippt einzelne Figuren ins Blaue/Orange: konservativ (0.3-0.5) und im Render
pruefen; fuer Schwarztoene besser `match_texture_tone.py`.

Usage: uv run python scripts/wb_textures.py [--pieces-dir synth_pieces] [--strength 1.0]"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import PIL.Image


def white_balance(path: Path, strength: float = 1.0) -> None:
    img = PIL.Image.open(path).convert("RGB")
    a = np.asarray(img).astype(np.float32) / 255.0
    lum = a.mean(axis=2)

    thr = np.quantile(lum, 0.95)
    ref = a[lum >= thr].reshape(-1, 3).mean(axis=0)          # mittlere Farbe der Glanzlichter
    target = float(ref.mean())
    gains = target / np.maximum(ref, 1e-4)
    gains = 1.0 + (gains - 1.0) * strength
    out = a * gains

    mean_lum = float(lum.mean())
    note = ""
    if mean_lum < 0.18:
        gamma = 0.82                                          # mild: hebt Mitten/Schatten
        out = np.power(np.clip(out, 0.0, 1.0), gamma)
        note = f", Schatten-Lift (Luminanz {mean_lum:.2f})"

    out = np.clip(out * 255.0 + 0.5, 0, 255).astype(np.uint8)
    PIL.Image.fromarray(out).save(path)
    print(f"  {path}: gains={np.round(gains, 3)}{note}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pieces-dir", default="synth_pieces")
    ap.add_argument("--strength", type=float, default=0.4)
    ap.add_argument("--only", default=None, help="nur diese Figur (z.B. bP)")
    a = ap.parse_args()
    pngs = sorted(Path(a.pieces_dir).glob("*/v*.png"))
    pngs = [p for p in pngs if "preview" not in p.name and "board_texture" not in p.name]
    if a.only:
        pngs = [p for p in pngs if p.parent.name == a.only]
    if not pngs:
        print("keine Texturen gefunden", file=sys.stderr)
        return 1
    for p in pngs:
        white_balance(p, a.strength)
    return 0


if __name__ == "__main__":
    sys.exit(main())
