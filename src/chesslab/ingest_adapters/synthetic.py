"""Adapter fuer selbst gerenderte Boards (`synth/render_chessboard.py`): je Sample `<i>.png` +
`<i>.json`, die Ecken per Konstruktion schon in `[a8, h8, h1, a1]`.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path

from ..ingest import ImportItem

# Synth-Frames sind UNABHAENGIG: kleine Chunks geben viele Pseudo-Sessions und damit einen fast
# zufaelligen Split (bei 500 landete die Haelfte in 2 Train-Sessions).
CHUNK = 100


def _safe_sub(rel: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "-" for c in rel)


def iter_items(root: Path) -> Iterator[ImportItem | None]:
    root = Path(root)
    for jf in sorted(root.rglob("*.json")):
        # Neuere Renders sind JPEG (q90), Alt-Renders PNG.
        img = jf.with_suffix(".jpg")
        if not img.exists():
            img = jf.with_suffix(".png")
        # `None` heisst VERWORFEN: ein stilles `continue` machte `run_ingest`s `skipped` zu 0.
        if not img.exists():
            yield None
            continue
        try:
            d = json.loads(jf.read_text(encoding="utf-8"))
            corners = d["corners"]
            fen = d["fen"]
        except (ValueError, OSError, KeyError):
            yield None
            continue
        if not corners or len(corners) != 4:
            yield None
            continue
        try:
            block = int(jf.stem) // CHUNK
        except ValueError:
            block = 0
        # Unterordner (`shard-0/`) MUESSEN in die Gruppe: jeder Shard nummeriert ab 000000, und
        # gleiche Session-ID + Frame-Key gaebe einem Shard die Pixel eines anderen.
        sub = jf.parent.relative_to(root).as_posix()
        prefix = f"{_safe_sub(sub)}-" if sub != "." else ""
        # Occluder-Footprint des Renderers; fehlt der Key (Alt-Renders), keine.
        occ = d.get("occluded_squares") or []
        amb = d.get("ambiguous_squares") or []
        meta = {}
        if occ:
            meta["occluded_squares"] = [str(s) for s in occ]
        if amb:
            meta["ambiguous_squares"] = [str(s) for s in amb]
        yield ImportItem(image_path=img,
                         corners=[[float(x), float(y)] for x, y in corners],
                         fen=fen, group=f"synth-{prefix}{block:03d}", meta=meta)
