"""Vorbereitete Figuren-OBJs (synth_pieces/<Figur>/v1.obj) auf Ziel-Dreieckszahl dezimieren, nur auf
Pipeline-Outputs, nie auf Scan-Originalen. 50k+ je Figur crasht Blender 5.1 auf der RX 7900 XTX.

Usage: uv run python scripts/decimate_pieces.py [--target-tris 35000]
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
        # Taubin VOR dem Dezimieren: nimmt die Scan-Bumps raus, ohne das Volumen zu schrumpfen.
        ms.apply_coord_taubin_smoothing(stepsmoothnum=smooth_steps)
    if before > target_tris:
        has_uv = m.has_wedge_tex_coord() or m.has_vertex_tex_coord()
        if has_uv:
            ms.meshing_decimation_quadric_edge_collapse_with_texture(
                targetfacenum=target_tris, preserveboundary=True)
        else:
            ms.meshing_decimation_quadric_edge_collapse(
                targetfacenum=target_tris, preserveboundary=True, preservenormal=True)
    # Normalen neu MIT exportieren (sonst facettiert), und save_wedge_texcoord EXPLIZIT: sonst gehen
    # die UVs verloren und die Figur rendert strukturlos grau.
    ms.compute_normal_per_vertex(weightmode=2)
    ms.save_current_mesh(str(obj), save_textures=False, save_vertex_normal=True,
                         save_wedge_texcoord=True)
    if (m.has_wedge_tex_coord() or m.has_vertex_tex_coord()) is False:
        print(f"  [WARN] {obj}: Mesh hat keine UV-Koordinaten (Textur wird flach gesampelt)")
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
