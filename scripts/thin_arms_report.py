"""Die Arme des Ausduenn-Versuchs gegeneinander, gepaart je Seed.

Vergleiche laufen ueber das MITTEL der letzten 20 Epochen, nicht ueber `best`: das ist das
Maximum ueber 60 verrauschte Ziehungen und liegt konstruktionsbedingt 2,3-2,9 sd ueber dem
Niveau des Laufs (`docs/training-speed.md`).

    uv run python scripts/thin_arms_report.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from chesslab.ioutil import read_jsonl

MODELS = Path("data/models")
ARMS = {
    "farthest": "thin16-s{seed}",
    "zufall": "thin16rand-s{seed}",
    "kern": "thin16core-s{seed}",
}
SEEDS = (42, 43, 44)
METRIC = "val_visible_piece_acc"
TAIL = 20
#: Das Rezept aller Arme; ein Lauf mit weniger Epochen ist nicht rangfaehig.
EPOCHS = 60


def tail_mean(run: Path, metric: str = METRIC, tail: int = TAIL,
              epochs: int = EPOCHS) -> float | None:
    """Mittel der letzten `tail` WERTE — oder None, wenn der Lauf nicht rangfaehig ist.

    Rangfaehig heisst: EINDEUTIGE, LUECKENLOSE Epochen 0..epochs-1 (ein fortgesetzter Lauf schreibt
    seine ersten Epochen doppelt) und mindestens `tail` Werte. `compare_arms` importiert diese.
    """
    if not (run / "metrics.jsonl").is_file():
        return None
    rows = read_jsonl(run / "metrics.jsonl")
    if sorted(r["epoch"] for r in rows if "epoch" in r) != list(range(epochs)):
        return None
    vals = [r[metric] for r in rows if metric in r]
    if len(vals) < tail:
        return None
    return float(np.mean(vals[-tail:]))


def baseline() -> np.ndarray:
    out = []
    for run in sorted((MODELS / "_acc128v7").glob("p4a-s4*")):
        v = tail_mean(run)
        if v is not None:
            out.append(v)
    return np.array(out)


def main() -> int:
    base = baseline()
    print(f"BASIS — volles v7, {len(base)} Seeds: {base.mean():.4f} +- {base.std(ddof=1):.4f}"
          f"  (Spanne {base.min():.4f}..{base.max():.4f})")
    print("   ACHTUNG: nicht direkt vergleichbar — die Arme tragen 8,5 % Aufnahmen statt 50 %.\n")

    table: dict[str, dict[int, float]] = {}
    print(f"{'Arm':12s}" + "".join(f"{f'Seed {s}':>12}" for s in SEEDS) + f"{'Median':>10}{'n':>4}")
    for arm, pattern in ARMS.items():
        row = {}
        for seed in SEEDS:
            v = tail_mean(MODELS / "_thin" / pattern.format(seed=seed))
            if v is not None:
                row[seed] = v
        table[arm] = row
        cells = "".join(f"{row[s]:>12.4f}" if s in row else f"{'—':>12}" for s in SEEDS)
        med = f"{np.median(list(row.values())):.4f}" if row else "—"
        print(f"{arm:12s}{cells}{med:>10}{len(row):>4}")

    ref = table.get("zufall", {})
    if not ref:
        return 0
    print("\nGEPAART gegen den Zufall (derselbe Seed, positiv = besser):")
    for arm, row in table.items():
        if arm == "zufall":
            continue
        pairs = [(s, row[s] - ref[s]) for s in SEEDS if s in row and s in ref]
        if not pairs:
            print(f"   {arm:12s} kein Paar")
            continue
        diffs = np.array([d for _, d in pairs])
        detail = "  ".join(f"s{s}:{d:+.4f}" for s, d in pairs)
        print(f"   {arm:12s} {detail}   Median {np.median(diffs):+.4f}  (n={len(diffs)})")
    if len(ref) < len(SEEDS):
        print("\n   Noch nicht alle Seeds da — ein Seed ist kein Vergleich.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
