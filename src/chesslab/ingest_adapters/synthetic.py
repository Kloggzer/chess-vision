"""Adapter für selbst gerenderte synthetische Boards (`synth/render_chessboard.py`).

Layout: pro Sample `<i>.png` + `<i>.json` mit `{"fen": ..., "corners": [[x,y]×4]}`, wobei die
Ecken **per Konstruktion** schon in unserer Reihenfolge `[a8, h8, h1, a1]` vorliegen (der Renderer
projiziert die bekannten 3D-Brettecken). Daher kein Eck-Rätselraten — Labels sind exakt.

Gruppierung in Blöcke (`synth-NNN`) → mehrere Sessions → sessionbasierter Split funktioniert.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path

from ..ingest import ImportItem

CHUNK = 500   # Samples pro Pseudo-Session


def iter_items(root: Path) -> Iterator[ImportItem]:
    root = Path(root)
    for jf in sorted(root.rglob("*.json")):
        img = jf.with_suffix(".png")
        if not img.exists():
            continue
        try:
            d = json.loads(jf.read_text(encoding="utf-8"))
            corners = d["corners"]
            fen = d["fen"]
        except (ValueError, OSError, KeyError):
            continue
        if not corners or len(corners) != 4:
            continue
        try:
            block = int(jf.stem) // CHUNK
        except ValueError:
            block = 0
        yield ImportItem(image_path=img,
                         corners=[[float(x), float(y)] for x, y in corners],
                         fen=fen, group=f"synth-{block:03d}")
