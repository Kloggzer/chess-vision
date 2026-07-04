"""Weißabgleich + sanfte Ton-Korrektur für die Figuren-Texturen in synth_pieces/.

Usage: uv run python scripts/wb_textures.py [--pieces-dir synth_pieces] [--strength 1.0]

Die RealityScan-Texturen tragen den Farbstich der Aufnahme-Beleuchtung (Kunstlicht:
helles Holz gelbstichig, dunkles Holz säuft grau-schwarz ab). Korrektur:
1. Percentile-Weißabgleich: Kanal-Gains so, dass das 95. Helligkeits-Perzentil
   neutral (grau) wird — entfernt den Gelbstich, erhält die Holztöne.
2. Schatten-Lift für sehr dunkle Texturen (mittlere Luminanz < 0.18): milde
   Gamma-Aufhellung, damit Schwarz als dunkles BRAUN lesbar bleibt statt Grau/Schwarz.
Arbeitet NUR auf den Pipeline-Kopien (v1.png), nie auf den Scan-Originalen.

ACHTUNG (Erfahrung 2026-07-04): Volle Stärke (1.0) überdreht — der Perzentil-Abgleich
rät pro Figur an den Glanzlichtern, einzelne Figuren kippen ins Blaue/Orange und die
Sets werden UNEINHEITLICH. Konservativ einsetzen (--strength 0.3–0.5), Ergebnis im
Render prüfen; `synth prepare` stellt die Original-Texturen jederzeit wieder her.
Für einheitliche Schwarztöne besser scripts/match_texture_tone.py (Referenz-Figur).
"""

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

    # 1. Kanal-Gains am hellen Ende (95. Perzentil der Luminanz als Referenzregion).
    thr = np.quantile(lum, 0.95)
    ref = a[lum >= thr].reshape(-1, 3).mean(axis=0)          # mittlere Farbe der Glanzlichter
    target = float(ref.mean())
    gains = target / np.maximum(ref, 1e-4)
    gains = 1.0 + (gains - 1.0) * strength                   # Stärke skalierbar
    out = a * gains

    # 2. Schatten-Lift nur für insgesamt sehr dunkle Texturen (schwarze Figuren).
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
