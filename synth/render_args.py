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
    # Per-Szene Welt/Umgebung variieren (World-Farbe + Grund-Ebene hinter dem Brett) → auch der
    # Rand/Hintergrund jenseits des Bretts trägt keine Figur-Info (Rand-/Oblique-Crops).
    randomize_world: bool = True
    # Kamera-Distanz pro View über ein Band variieren (0 = fix): H = base * uniform(1-j .. 1+j).
    # Näher = stärkere Perspektive/Lean + größere Figur; ferner = flacher/kleiner (FixRes/Multi-Scale).
    cam_distance_jitter: float = 0.0
    # Anteil der Views mit einem gerenderten Occluder (Faust/Unterarm, wirft Schatten); verdeckte
    # Felder werden als `occluded` gelabelt. 0 = keine Occluder (Default für Rückwärtskompatibilität).
    occlusion_p: float = 0.0
    # Anteil der Szenen mit einem RANDLOSEN procedural Brett (Checker läuft über die Kante, kein
    # Rahmen) → Randfelder sind von Checker umgeben, das Modell kann nicht am Rahmen abkürzen um
    # eine Randfigur (König/Turm) zu erkennen. 0 = aus.
    borderless_p: float = 0.0
    # Curriculum stage 1: share of scenes rendered on a NON-board randomized ground (no 8x8,
    # no frame) so only the piece itself carries information. 0 = off.
    isolate_p: float = 0.0
    # Ziel-Bildanteil des Bretts (grösste Ausdehnung). Steuert die effektive Auflösung pro
    # Feld: 0.80 ≈ 102 px/Feld bei --res 1024. 0 = Brennweite unverändert lassen.
    frame_frac: float = 0.80


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
    randomize_world = True
    cam_distance_jitter = 0.0
    occlusion_p = 0.0
    borderless_p = 0.0
    isolate_p = 0.0
    frame_frac = 0.80

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
        elif a == "--randomize-world":
            randomize_world = True
        elif a == "--no-randomize-world":
            randomize_world = False
        elif a == "--cam-distance-jitter":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --cam-distance-jitter benötigt einen Wert.")
            cam_distance_jitter = max(0.0, float(args[i]))
        elif a == "--occlusion-p":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --occlusion-p benötigt einen Wert.")
            occlusion_p = min(1.0, max(0.0, float(args[i])))
        elif a == "--borderless-p":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --borderless-p benötigt einen Wert.")
            borderless_p = min(1.0, max(0.0, float(args[i])))
        elif a == "--isolate-p":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --isolate-p benötigt einen Wert.")
            isolate_p = min(1.0, max(0.0, float(args[i])))
        elif a == "--frame-frac":
            i += 1
            if i >= len(args):
                raise SystemExit("ERROR: --frame-frac benötigt einen Wert.")
            frame_frac = min(0.98, max(0.0, float(args[i])))
        else:
            print(f"WARN: unbekanntes Flag ignoriert: {a}", file=sys.stderr)
        i += 1

    if out is None:
        raise SystemExit("ERROR: --out ist Pflicht (Zielverzeichnis).")

    return RenderArgs(out=out, n=n, seed=seed, fens=fens, pieces=pieces, res=res,
                      board_texture=board_texture, views_per_scene=views_per_scene,
                      samples=samples, max_obliqueness=max_obliqueness,
                      fallback_subsurf=fallback_subsurf, piece_scale=piece_scale,
                      randomize_board=randomize_board, randomize_world=randomize_world,
                      cam_distance_jitter=cam_distance_jitter, occlusion_p=occlusion_p,
                      borderless_p=borderless_p, isolate_p=isolate_p,
                      frame_frac=frame_frac)
