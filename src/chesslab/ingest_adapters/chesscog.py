"""Adapter für den **chesscog**-Render-Datensatz (Wölflein & Bringmann, OSF DOI 10.17605/OSF.IO/XF3KA).

Layout: pro Sample `<id>.png` + `<id>.json` (in Unterordnern `train/val/test`). Jede JSON enthält:
- `corners`: 4 [x,y]-Bildpunkte der Brettecken, **ungeordnet** (chesscog sortiert sie selbst).
- `fen`: vollständige FEN.
- `white_turn`: bool — die Render-Perspektive ist die des ziehenden Spielers, d. h. bei `True` steht
  **Weiß unten** (geometrisch oben-links = a8), bei `False` ist das Brett um 180° gedreht.

Wir sortieren die Ecken geometrisch zu `[TL, TR, BR, BL]` und mappen je nach `white_turn` auf unsere
Reihenfolge `[a8, h8, h1, a1]`. **Vor dem großen Pretrain mit `--debug-overlay` prüfen** — sitzt die
Orientierung falsch (gespiegelte Labels), ist `white_turn` invers zu interpretieren (eine Zeile).
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path

from ..ingest import ImportItem


def sort_corner_points(pts) -> list[list[float]]:
    """4 Punkte → `[top-left, top-right, bottom-right, bottom-left]` (Bildkoordinaten, robust über
    Summe/Differenz — rotationsstabil für nicht-degenerierte Vierecke)."""
    p = [(float(x), float(y)) for x, y in pts]
    tl = min(p, key=lambda q: q[0] + q[1])
    br = max(p, key=lambda q: q[0] + q[1])
    tr = max(p, key=lambda q: q[0] - q[1])
    bl = min(p, key=lambda q: q[0] - q[1])
    return [list(tl), list(tr), list(br), list(bl)]


def order_corners(corners, white_turn: bool) -> list[list[float]]:
    """Geometrisch sortierte Ecken → unsere Reihenfolge `[a8, h8, h1, a1]`.
    Weiß unten: `[TL,TR,BR,BL] == [a8,h8,h1,a1]`. Schwarz unten: um 180° gedreht."""
    s = sort_corner_points(corners)            # [TL, TR, BR, BL]
    if white_turn:
        return s
    return s[2:] + s[:2]                        # 180°: [BR, BL, TL, TR] == [a8, h8, h1, a1]


def iter_items(root: Path) -> Iterator[ImportItem]:
    root = Path(root)
    for jf in sorted(root.rglob("*.json")):
        if "__MACOSX" in jf.parts or jf.name.startswith("._"):
            continue                       # AppleDouble-Müll aus Mac-Zips überspringen
        img = jf.with_suffix(".png")
        if not img.exists():
            continue
        try:
            d = json.loads(jf.read_text(encoding="utf-8"))
            corners = d["corners"]
            fen = d["fen"]
            white = bool(d.get("white_turn", True))
        except (KeyError, ValueError, OSError):
            continue
        if not corners or len(corners) != 4:
            continue
        yield ImportItem(image_path=img, corners=order_corners(corners, white), fen=fen,
                         group=f"chesscog-{jf.parent.name}", meta={"white_turn": white})
