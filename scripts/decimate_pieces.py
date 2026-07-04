"""Vorbereitete Figuren-OBJs (synth_pieces/<Figur>/v1.obj) auf Ziel-Dreieckszahl dezimieren.

Usage: uv run python scripts/decimate_pieces.py [--target-tris 35000]

35k je Figur ist das empirisch höchste stabile Budget: 50k+ (×32 Figuren) crasht
Blender 5.1 auf der RX 7900 XTX (nativer C++-Crash beim Board-Render, 2026-07-04).

Arbeitet NUR auf den Pipeline-Outputs in synth_pieces/ (nie auf den Scan-Originalen).
UVs bleiben erhalten (pymeshlab Quadric Edge Collapse mit Textur-Erhalt).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pymeshlab


def decimate(obj: Path, target_tris: int, smooth_steps: int = 0) -> None:
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(str(obj))
    m = ms.current_mesh()
    before = m.face_number()
    if before <= target_tris and smooth_steps <= 0:
        print(f"  {obj}: {before} Dreiecke — nichts zu tun")
        return
    if smooth_steps > 0:
        # Taubin-Glättung VOR dem Dezimieren: nimmt die Scan-„Bumps" raus, ohne das
        # Volumen zu schrumpfen (der naive Laplace zieht die Figur zusammen). UVs
        # bleiben unberührt (nur Vertex-Positionen bewegen sich).
        ms.apply_coord_taubin_smoothing(stepsmoothnum=smooth_steps)
    if before > target_tris:
        has_uv = m.has_wedge_tex_coord() or m.has_vertex_tex_coord()
        if has_uv:
            ms.meshing_decimation_quadric_edge_collapse_with_texture(
                targetfacenum=target_tris, preserveboundary=True)
        else:
            ms.meshing_decimation_quadric_edge_collapse(
                targetfacenum=target_tris, preserveboundary=True, preservenormal=True)
    # Smooth-Shading: Vertex-Normalen nach der Dezimierung neu berechnen und MIT
    # exportieren — sonst rendern Viewer die Figur facettiert.
    ms.compute_normal_per_vertex(weightmode=2)      # 2 = by angle (glatteste Übergänge)
    ms.save_current_mesh(str(obj), save_textures=False, save_vertex_normal=True)
    print(f"  {obj}: {before} -> {ms.current_mesh().face_number()} Dreiecke")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target-tris", type=int, default=35000)
    ap.add_argument("--smooth", type=int, default=0,
                    help="Taubin-Glättungsschritte gegen Scan-Bumps (0 = aus; 10 mild, 30 deutlich)")
    ap.add_argument("--pieces-dir", default="synth_pieces")
    a = ap.parse_args()
    objs = sorted(Path(a.pieces_dir).glob("*/*.obj"))
    if not objs:
        print("keine OBJs gefunden", file=sys.stderr)
        return 1
    for o in objs:
        decimate(o, a.target_tris, smooth_steps=a.smooth)
    return 0


if __name__ == "__main__":
    sys.exit(main())
