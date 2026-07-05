"""Adapter for the **chesscog** rendered dataset (Wölflein & Bringmann, OSF DOI 10.17605/OSF.IO/XF3KA).

Layout: per sample `<id>.png` + `<id>.json` (in subdirectories `train/val/test`). Each JSON contains:
- `corners`: 4 [x,y] image points of the board corners, **unordered** (chesscog sorts them itself).
- `fen`: full FEN.
- `white_turn`: bool — the render perspective is that of the player to move, i.e. when `True` **White is
  at the bottom** (geometrically top-left = a8), when `False` the board is rotated 180°.

We sort the corners geometrically to `[TL, TR, BR, BL]` and depending on `white_turn` map to our
order `[a8, h8, h1, a1]`. **Verify with `--debug-overlay` before large pretrain** — if the
orientation is wrong (reflected labels), then `white_turn` should be interpreted inversely (one line).
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path

from ..ingest import ImportItem


def sort_corner_points(pts) -> list[list[float]]:
    """4 points → `[top-left, top-right, bottom-right, bottom-left]` (image coordinates, robust via
    sum/difference — rotation-stable for non-degenerate quadrilaterals)."""
    p = [(float(x), float(y)) for x, y in pts]
    tl = min(p, key=lambda q: q[0] + q[1])
    br = max(p, key=lambda q: q[0] + q[1])
    tr = max(p, key=lambda q: q[0] - q[1])
    bl = min(p, key=lambda q: q[0] - q[1])
    return [list(tl), list(tr), list(br), list(bl)]


def order_corners(corners, white_turn: bool) -> list[list[float]]:
    """Geometrically sorted corners → our order `[a8, h8, h1, a1]`.
    White at bottom: `[TL,TR,BR,BL] == [a8,h8,h1,a1]`. Black at bottom: rotated 180°."""
    s = sort_corner_points(corners)            # [TL, TR, BR, BL]
    if white_turn:
        return s
    return s[2:] + s[:2]                        # 180°: [BR, BL, TL, TR] == [a8, h8, h1, a1]


def iter_items(root: Path) -> Iterator[ImportItem]:
    root = Path(root)
    for jf in sorted(root.rglob("*.json")):
        if "__MACOSX" in jf.parts or jf.name.startswith("._"):
            continue                       # skip AppleDouble junk from Mac zips
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
