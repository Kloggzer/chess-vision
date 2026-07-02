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


def parse_render_args(argv: list[str]) -> RenderArgs:
    """Benannte Flags parsen (keine Positionsargumente). --out ist Pflicht."""
    args = list(argv)
    out = None
    n = 200
    seed = 42
    fens = None
    pieces = None
    res = 1024

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
        else:
            print(f"WARN: unbekanntes Flag ignoriert: {a}", file=sys.stderr)
        i += 1

    if out is None:
        raise SystemExit("ERROR: --out ist Pflicht (Zielverzeichnis).")

    return RenderArgs(out=out, n=n, seed=seed, fens=fens, pieces=pieces, res=res)
