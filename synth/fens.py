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


# Gewichte pro Figurentyp: Leicht­figuren (N/B/R) stark überrepräsentiert, weil genau die von oben
# verwechselt werden und in zufälligen Partie-Stellungen (random_fens) selten sind. Bauern niedrig
# (sonst dominieren sie), Q/K moderat. Farbe wird zufällig gewählt.
_MINOR_WEIGHTS = {"N": 5, "B": 5, "R": 4, "Q": 2, "P": 2, "K": 1}


def _placement_from_grid(grid: list[list[str | None]]) -> str:
    rows = []
    for r in range(8):
        s, empty = "", 0
        for c in range(8):
            p = grid[r][c]
            if p is None:
                empty += 1
            else:
                if empty:
                    s += str(empty); empty = 0
                s += p
        if empty:
            s += str(empty)
        rows.append(s)
    return "/".join(rows)


def minor_heavy_fens(n: int, seed: int = 42, density: float = 0.5) -> list[str]:
    """Dichte, absichtlich ILLEGALE Aufbauten mit N/B/R überrepräsentiert (Label-Quelle je Feld —
    Legalität egal). Jedes Feld wird mit Wahrscheinlichkeit `density` besetzt; der Typ nach
    `_MINOR_WEIGHTS`, die Farbe zufällig. So sieht das Modell viele Leichtfiguren pro Bild."""
    rng = random.Random(seed)
    types = list(_MINOR_WEIGHTS)
    weights = [_MINOR_WEIGHTS[t] for t in types]
    out = []
    for _ in range(n):
        grid: list[list[str | None]] = [[None] * 8 for _ in range(8)]
        for r in range(8):
            for c in range(8):
                if rng.random() < density:
                    t = rng.choices(types, weights=weights, k=1)[0]
                    grid[r][c] = t if rng.random() < 0.5 else t.lower()  # Großbuchstabe = weiß
        out.append(_placement_from_grid(grid))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--n", type=int, default=200)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--max-plies", type=int, default=50)
    ap.add_argument("--mode", choices=["random", "minor"], default="random",
                    help="random = plausible Partie-Stellungen; minor = dichte Aufbauten mit N/B/R überrepräsentiert.")
    ap.add_argument("--density", type=float, default=0.5, help="Feld-Besetzungswahrscheinlichkeit (nur --mode minor).")
    a = ap.parse_args()
    if a.mode == "minor":
        fens = minor_heavy_fens(a.n, a.seed, a.density)
    else:
        fens = random_fens(a.n, a.seed, a.max_plies)
    Path(a.out).write_text("\n".join(fens) + "\n", encoding="utf-8")
    print(f"wrote {len(fens)} fens ({a.mode}) -> {a.out}")


if __name__ == "__main__":
    main()
