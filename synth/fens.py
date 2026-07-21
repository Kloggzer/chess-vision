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


# Gewichte pro Figurentyp. Ziel: die Typ-Verwechsler N/B/R/Q/K auf ~gleiche Klassenzahl bringen
# (in einem frischen Satz ergeben gleiche Gewichte gleiche Counts). Historisch waren Q/K massiv
# unterrepräsentiert (K ~14.5k, Q ~18k vs N/B/R ~40k) — deshalb jetzt auf Parität mit N/B/R.
# Bauern niedrig (sonst dominieren sie; echte Bauern-Verteilung kommt aus dem Finetune auf real).
# Farbe wird zufällig gewählt. `empty` entsteht aus der Feld-Dichte (density), nicht aus Gewichten.
_MINOR_WEIGHTS = {"N": 4, "B": 4, "R": 4, "Q": 4, "K": 4, "P": 2}


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


def minor_heavy_fens(n: int, seed: int = 42, density: float = 0.25,
                     full_p: float = 0.30, full_density: float = 0.68) -> list[str]:
    """Absichtlich ILLEGALE Aufbauten mit N/B/R/Q/K auf Parität (Label-Quelle je Feld — Legalität
    egal). Jedes Feld wird mit Wahrscheinlichkeit `density` besetzt; der Typ nach `_MINOR_WEIGHTS`,
    die Farbe zufällig.

    Dichte-Mix (gegen 3D-Überhang ins Nachbarfeld): der Anteil `full_p` der Bretter ist VOLL
    (`full_density`, ~44 Figuren), der Rest ist SPÄRLICH (`density`≈0.25 → ~16 Figuren, saubere
    Crops ohne Überhang). So sieht das Modell beide Regimes."""
    rng = random.Random(seed)
    types = list(_MINOR_WEIGHTS)
    weights = [_MINOR_WEIGHTS[t] for t in types]
    out = []
    for _ in range(n):
        dens = full_density if rng.random() < full_p else density
        grid: list[list[str | None]] = [[None] * 8 for _ in range(8)]
        for r in range(8):
            for c in range(8):
                if rng.random() < dens:
                    t = rng.choices(types, weights=weights, k=1)[0]
                    grid[r][c] = t if rng.random() < 0.5 else t.lower()  # Großbuchstabe = weiß
        out.append(_placement_from_grid(grid))
    return out


# Gewichte für die Bleed-Streifen: die Dame (Noppenkrone = der Top-Fehlleser) doppelt,
# die übrigen hohen Figuren gleich; Bauern niedrig (ihre Kugelköpfe erzeugen die kleinen
# Ecken-Intrusionen, sind aber nicht die Hauptquelle).
_BLEED_WEIGHTS = {"Q": 4, "K": 2, "B": 2, "R": 2, "N": 2, "P": 1}


def bleed_fens(n: int, seed: int = 42, occupy_p: float = 0.9) -> list[str]:
    """Gezielte Nachbar-Bleed-Aufbauten: hohe Figuren in STREIFEN (jede zweite Reihe oder
    Spalte besetzt), dazwischen garantiert LEERE Linien — jedes leere Feld hat damit 1–2
    hohe orthogonale Nachbarn, deren Kopf/Krone per pad_side + Perspektiven-Lean in den
    leeren Crop ragt. Genau der gemessene Fehlermodus des deployten Modells (leeres Feld
    neben Dame → bQ@0.99). Streifen-Orientierung und -Offset wechseln pro Brett, Farben
    sind pro Figur zufällig → über die Liste ist jedes Feld mal leer-mit-Nachbar, mal
    besetzt, in beiden Feldfarben, inkl. aller Randlagen. `occupy_p` < 1 reißt Lücken in
    die Streifen (leere Felder AUF einer Streifenlinie, seitlicher statt vertikaler Bleed).
    Wie `minor_heavy_fens` absichtlich illegal — die FEN ist nur Label-Quelle."""
    rng = random.Random(seed)
    types = list(_BLEED_WEIGHTS)
    weights = [_BLEED_WEIGHTS[t] for t in types]
    out = []
    for _ in range(n):
        horizontal = rng.random() < 0.5
        offset = rng.randrange(2)
        grid: list[list[str | None]] = [[None] * 8 for _ in range(8)]
        for r in range(8):
            for c in range(8):
                line = r if horizontal else c
                if line % 2 == offset and rng.random() < occupy_p:
                    t = rng.choices(types, weights=weights, k=1)[0]
                    grid[r][c] = t if rng.random() < 0.5 else t.lower()
        out.append(_placement_from_grid(grid))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--n", type=int, default=200)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--max-plies", type=int, default=50)
    ap.add_argument("--mode", choices=["random", "minor", "bleed"], default="random",
                    help="random = plausible Partie-Stellungen; minor = Aufbauten mit N/B/R/Q/K auf Parität; "
                         "bleed = hohe Figuren in Streifen neben garantiert leeren Feldern (Nachbar-Bleed).")
    ap.add_argument("--density", type=float, default=0.25, help="Feld-Besetzung spärlicher Bretter (~0.25 -> ~16 Figuren; nur --mode minor).")
    ap.add_argument("--full-p", type=float, default=0.30, help="Anteil VOLLER Bretter im Mix (nur --mode minor).")
    ap.add_argument("--full-density", type=float, default=0.68, help="Feld-Besetzung voller Bretter (~0.68 -> ~44 Figuren; nur --mode minor).")
    a = ap.parse_args()
    if a.mode == "minor":
        fens = minor_heavy_fens(a.n, a.seed, a.density, a.full_p, a.full_density)
    elif a.mode == "bleed":
        fens = bleed_fens(a.n, a.seed)
    else:
        fens = random_fens(a.n, a.seed, a.max_plies)
    Path(a.out).write_text("\n".join(fens) + "\n", encoding="utf-8")
    print(f"wrote {len(fens)} fens ({a.mode}) -> {a.out}")


if __name__ == "__main__":
    main()
