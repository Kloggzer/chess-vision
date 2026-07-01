"""FEN-Stellungen für den Renderer erzeugen (läuft im uv-Env mit python-chess, NICHT in Blender).

Plausible Stellungen = K zufällige legale Halbzüge ab Grundstellung. Ausgabe: eine Placement-FEN
je Zeile (der Renderer/Adapter ergänzt den Rest)."""

from __future__ import annotations

import argparse
import random
from pathlib import Path

import chess


def random_fens(n: int, seed: int = 42, max_plies: int = 50) -> list[str]:
    rng = random.Random(seed)
    out = []
    for _ in range(n):
        b = chess.Board()
        for _ in range(rng.randint(0, max_plies)):
            moves = list(b.legal_moves)
            if not moves:
                break
            b.push(rng.choice(moves))
        out.append(b.board_fen())          # nur Placement-Feld
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--n", type=int, default=200)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--max-plies", type=int, default=50)
    a = ap.parse_args()
    fens = random_fens(a.n, a.seed, a.max_plies)
    Path(a.out).write_text("\n".join(fens) + "\n", encoding="utf-8")
    print(f"wrote {len(fens)} fens -> {a.out}")


if __name__ == "__main__":
    main()
