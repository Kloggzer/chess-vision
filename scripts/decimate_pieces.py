"""Vorbereitete Figuren-OBJs (synth_pieces/<Figur>/v1.obj) auf Ziel-Dreieckszahl dezimieren.

Usage: uv run python scripts/decimate_pieces.py [--target-tris 20000]

Arbeitet NUR auf den Pipeline-Outputs in synth_pieces/ (nie auf den Scan-Originalen).
UVs bleiben erhalten (pymeshlab Quadric Edge Collapse mit Textur-Erhalt).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pymeshlab


def decimate(obj: Path, target_tris: int) -> None:
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(str(obj))
    m = ms.current_mesh()
    before = m.face_number()
    if before <= target_tris:
        print(f"  {obj}: {before} Dreiecke — nichts zu tun")
        return
    has_uv = m.has_wedge_tex_coord() or m.has_vertex_tex_coord()
    if has_uv:
        ms.meshing_decimation_quadric_edge_collapse_with_texture(
            targetfacenum=target_tris, preserveboundary=True)
    else:
        ms.meshing_decimation_quadric_edge_collapse(
            targetfacenum=target_tris, preserveboundary=True, preservenormal=True)
    ms.save_current_mesh(str(obj), save_textures=False)
    print(f"  {obj}: {before} -> {ms.current_mesh().face_number()} Dreiecke")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target-tris", type=int, default=20000)
    ap.add_argument("--pieces-dir", default="synth_pieces")
    a = ap.parse_args()
    objs = sorted(Path(a.pieces_dir).glob("*/*.obj"))
    if not objs:
        print("keine OBJs gefunden", file=sys.stderr)
        return 1
    for o in objs:
        decimate(o, a.target_tris)
    return 0


if __name__ == "__main__":
    sys.exit(main())
