"""Adapter für **ChessReD2K** (Masouris & van Gemert, 4TU, CC-BY-4.0) — die ~2.078 ECHTEN Fotos mit
Eck-Annotation (Teilmenge von ChessReD mit 100 Spielen / 10.800 Bildern).

`annotations.json` (COCO-artig, gegen den echten Download verifiziert):
- `images`: `[{id, path:"images/0/G000_IMG000.jpg", game_id, ...}]`
- `annotations.pieces`: `[{image_id, category_id, chessboard_position:"a8", bbox}]`
- `annotations.corners`: `[{image_id, corners:{top_left,top_right,bottom_right,bottom_left}}]`
  (genau **2078** Einträge = das 2K-Subset; Punkte als `[x,y]`-Pixel relativ zur Weiß-Sicht)
- `categories`: 13 × `{id, name}` ("white-pawn" … "empty")
- `splits`: `{train,val,test, chessred2k:{train,val,test}}`

Eck-Mapping (Weiß-Sicht): `top_left→a8, top_right→h8, bottom_right→h1, bottom_left→a1`.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterator
from pathlib import Path

from ..ingest import ImportItem, fen_from_squares

_TYPE = {"pawn": "P", "knight": "N", "bishop": "B", "rook": "R", "queen": "Q", "king": "K"}


def category_to_letter(name: str) -> str | None:
    """'white-pawn'→'P', 'black-knight'→'n', 'empty'→None (FEN-Buchstabe, Farbe per Groß/Klein)."""
    n = name.strip().lower()
    if "empty" in n:
        return None
    color_white = "white" in n or n.startswith("w")
    for word, letter in _TYPE.items():
        if word in n:
            return letter if color_white else letter.lower()
    return None


def _find_annotations(root: Path) -> Path:
    root = Path(root)
    for cand in (root / "annotations.json", *sorted(root.rglob("annotations*.json"))):
        if cand.exists():
            return cand
    raise FileNotFoundError(f"annotations.json unter {root} nicht gefunden (ChessReD2K entpackt?).")


def named_corners_to_order(c: dict) -> list[list[float]] | None:
    """Benannte Ecken (`top_left`/`top_right`/`bottom_right`/`bottom_left`, auch mit `-`/ohne
    Trenner) → unsere Reihenfolge `[a8, h8, h1, a1]`."""
    def pick(*keys):
        for k in keys:
            for kk in (k, k.replace("_", "-"), k.replace("_", "")):
                if kk in c:
                    return c[kk]
        return None
    tl = pick("top_left"); tr = pick("top_right")
    br = pick("bottom_right"); bl = pick("bottom_left")
    if None in (tl, tr, br, bl):
        return None
    return [[float(tl[0]), float(tl[1])], [float(tr[0]), float(tr[1])],
            [float(br[0]), float(br[1])], [float(bl[0]), float(bl[1])]]


def _corner_index(corners: list) -> dict[int, list[list[float]]]:
    """`annotations.corners` (Liste `{image_id, corners:{top_left,…}}`) → `{image_id: [a8,h8,h1,a1]}`.
    Nur diese ~2078 Einträge bilden das 2K-Subset (mit Eck-Annotation)."""
    out: dict[int, list[list[float]]] = {}
    for entry in corners:
        if not isinstance(entry, dict):
            continue
        named = entry.get("corners")
        order = named_corners_to_order(named) if isinstance(named, dict) else None
        if order is not None and "image_id" in entry:
            out[int(entry["image_id"])] = order
    return out


def iter_items(root: Path) -> Iterator[ImportItem]:
    root = Path(root)
    ann_path = _find_annotations(root)
    ann = json.loads(ann_path.read_text(encoding="utf-8"))
    base = ann_path.parent

    cat = {int(c["id"]): c["name"] for c in ann["categories"]}
    images = {int(im["id"]): im for im in ann["images"]}

    raw_corners = ann.get("annotations", {}).get("corners") or ann.get("corners")
    if not raw_corners:
        raise ValueError(
            "Keine Eck-Annotationen (`annotations.corners`) gefunden — liegt die annotations.json aus "
            "ChessReD/ChessReD2K vor? Ecken gibt es nur fürs 2K-Subset (~2078 Bilder).")
    corner_by_img = _corner_index(raw_corners)

    pieces_by_img: dict[int, dict[str, str]] = {}
    for p in ann["annotations"]["pieces"]:
        letter = category_to_letter(cat.get(int(p["category_id"]), ""))
        if letter is None:
            continue
        sq = str(p["chessboard_position"]).strip().lower()
        pieces_by_img.setdefault(int(p["image_id"]), {})[sq] = letter

    for img_id, corners in corner_by_img.items():
        im = images.get(img_id)
        if im is None:
            continue
        rel = im["path"]
        game = im.get("game_id")
        if game is None:
            m = re.search(r"[Gg]\d+", str(rel))
            game = m.group(0) if m else (Path(rel).parent.name or "all")
        fen = fen_from_squares(pieces_by_img.get(img_id, {}))
        yield ImportItem(image_path=base / rel, corners=corners, fen=fen, group=f"chessred-{game}")
