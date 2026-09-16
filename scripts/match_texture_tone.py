"""Farbton einer Figuren-Textur an eine Referenz-Figur angleichen (Reinhard-Transfer in Lab).

Usage: uv run python scripts/match_texture_tone.py synth_pieces/bP/v1.png synth_pieces/bK/v1.png

Fall: eine Scan-Session hatte abweichende Belichtung (bP grau statt braunschwarz wie
bK/bR). Überträgt Mittelwert+Streuung je Lab-Kanal der Referenz auf die Ziel-Textur —
Struktur/Maserung bleiben, nur der Ton wandert. Arbeitet nur auf Pipeline-Kopien.
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np


def match(dst_path: Path, ref_path: Path) -> None:
    dst = cv2.imread(str(dst_path), cv2.IMREAD_COLOR)
    ref = cv2.imread(str(ref_path), cv2.IMREAD_COLOR)
    if dst is None or ref is None:
        raise SystemExit("Bild nicht lesbar")
    d = cv2.cvtColor(dst, cv2.COLOR_BGR2LAB).astype(np.float32)
    r = cv2.cvtColor(ref, cv2.COLOR_BGR2LAB).astype(np.float32)
    for c in range(3):
        dm, ds = d[..., c].mean(), d[..., c].std() + 1e-6
        rm, rs = r[..., c].mean(), r[..., c].std() + 1e-6
        d[..., c] = (d[..., c] - dm) * (rs / ds) + rm
    out = cv2.cvtColor(np.clip(d, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)
    # TODO: `cv2.imwrite` WIRFT NICHT, es gibt `False` zurueck — und geschrieben wird hier die
    # Textur SELBST. Ein stiller Fehlschlag meldete "angeglichen" auf eine unveraenderte Datei.
    if not cv2.imwrite(str(dst_path), out):
        raise SystemExit(f"{dst_path}: nicht geschrieben")
    print(f"{dst_path}: Ton an {ref_path} angeglichen")


if __name__ == "__main__":
    match(Path(sys.argv[1]), Path(sys.argv[2]))
