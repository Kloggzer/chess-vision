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

# Samples pro Pseudo-Session. Synth-Frames sind UNABHÄNGIG (jeder Frame: eigenes zufälliges
# FEN/Kamera/Brett/World) → keine Session-Korrelation wie bei echten Aufnahmen. Kleine Chunks →
# viele Pseudo-Sessions → der session-basierte Split nähert sich einem sauberen 70/15/15-Random-Split
# (bei 500 landete bei 1600 Bildern die Hälfte in nur 2 Train-Sessions). View-Paare einer Szene
# (views_per_scene) bleiben durch die gerade Chunk-Größe zusammen.
CHUNK = 100   # Samples pro Pseudo-Session


def _safe_sub(rel: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "-" for c in rel)


def iter_items(root: Path) -> Iterator[ImportItem | None]:
    root = Path(root)
    for jf in sorted(root.rglob("*.json")):
        # Neuere Renders sind JPEG (q90, ~5x kleiner + Webcam-Domaene); Alt-Renders PNG.
        img = jf.with_suffix(".jpg")
        if not img.exists():
            img = jf.with_suffix(".png")
        # `None` heisst VERWORFEN. Stilles `continue` machte `run_ingest`s `skipped` beweisbar
        # zu 0, und die Fehlermeldung nannte die Null als gemessene Tatsache.
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
        # Unterordner (z.B. shard-0/ aus `synth render --shards`) MUESSEN in die Gruppe: jeder
        # Shard nummeriert ab 000000, der nackte Stem kollidiert also ueber Shards hinweg —
        # gleiche Session-ID + gleicher Frame-Key => ein Shard bekaeme die Pixel eines anderen
        # unter seinem Label (silent label corruption im fused Build).
        sub = jf.parent.relative_to(root).as_posix()
        prefix = f"{_safe_sub(sub)}-" if sub != "." else ""
        # Vom Renderer als `occluded` gelabelte Felder (Occluder-Footprint) → meta durchreichen,
        # slice_session überschreibt damit das FEN-Label. Fehlt der Key (Alt-Renders) → keine.
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
