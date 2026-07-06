"""Argument-Parsing für render_chessboard.py — bpy-frei importierbar/testbar.

Wird von render_chessboard.py (in Blender) und vom CLI (build_blender_cmd) genutzt.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class RenderArgs:
    out: Path          # absolut, PFLICHT
    n: int = 200
    seed: int = 42
    fens: Path | None = None
    pieces: Path | None = None
    res: int = 1024
    board_texture: Path | None = None
    # Szenen-Reuse: gleiche Figurenaufstellung unter mehreren Kamera-/Licht-Views rendern.
    views_per_scene: int = 1
    # EEVEE TAA-Render-Samples (konservativ = sauberere Texturen, höher = langsamer).
    samples: int = 24
    # Max. Kamera-Obliqueness (horizontaler Offset / Höhe); an echte ~0.06-Kamera gematcht.
    max_obliqueness: float = 0.20
    # Subsurf-Level NUR für prozedurale Staunton-Fallback-Figuren (gescannte Meshes: kein Subsurf).
    fallback_subsurf: int = 1
    # Globaler Figuren-Skalierungsfaktor (Crop-Füllung an reale Kamera angleichen).
    piece_scale: float = 1.0
    # Per-Szene Brett-Aussehen (Hue/Value/Saturation/Gloss) variieren → das Brett trägt keine
    # Information über die Figur → CNN muss die Figur lesen (gegen bN=8%-Background-Shortcut).
    randomize_board: bool = True


def parse_render_args(argv: list[str]) -> RenderArgs:
    """Benannte Flags parsen (keine Positionsargumente). --out ist Pflicht."""
    args = list(argv)
    out = None
    n = 200
    seed = 42
    fens = None
    pieces = None
    res = 1024
    board_texture = None
    views_per_scene = 1
    samples = 24
    max_obliqueness = 0.20
    fallback_subsurf = 1
    piece_scale = 1.0
    randomize_board = True

    i = 0
    while i < len(args):
        a = args[i]
        if a == "--out":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --out benötigt einen Pfad.")
            out = Path(args[i]).resolve()
        elif a == "--n":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --n benötigt einen Wert.")
            n = int(args[i])
        elif a == "--seed":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --seed benötigt einen Wert.")
            seed = int(args[i])
        elif a == "--fens":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --fens benötigt einen Pfad.")
            fens = Path(args[i]).resolve()
        elif a == "--pieces":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --pieces benötigt einen Pfad.")
            pieces = Path(args[i]).resolve()
        elif a == "--res":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --res benötigt einen Wert.")
            res = int(args[i])
        elif a == "--board-texture":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --board-texture benötigt einen Pfad.")
            board_texture = Path(args[i]).resolve()
        elif a == "--views-per-scene":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --views-per-scene benötigt einen Wert.")
            views_per_scene = max(1, int(args[i]))
        elif a == "--samples":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --samples benötigt einen Wert.")
            samples = max(1, int(args[i]))
        elif a == "--max-obliqueness":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --max-obliqueness benötigt einen Wert.")
            max_obliqueness = float(args[i])
        elif a == "--fallback-subsurf":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --fallback-subsurf benötigt einen Wert.")
            fallback_subsurf = max(0, int(args[i]))
        elif a == "--piece-scale":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --piece-scale benötigt einen Wert.")
            piece_scale = float(args[i])
        elif a == "--randomize-board":
            randomize_board = True
        elif a == "--no-randomize-board":
            randomize_board = False
        else:
            print(f"WARN: unbekanntes Flag ignoriert: {a}", file=sys.stderr)
        i += 1

    if out is None:
        raise SystemExit("ERROR: --out ist Pflicht (Zielverzeichnis).")

    return RenderArgs(out=out, n=n, seed=seed, fens=fens, pieces=pieces, res=res,
                      board_texture=board_texture, views_per_scene=views_per_scene,
                      samples=samples, max_obliqueness=max_obliqueness,
                      fallback_subsurf=fallback_subsurf, piece_scale=piece_scale,
                      randomize_board=randomize_board)
