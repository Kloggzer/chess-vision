"""Die Verteilung hinter `motionThr`, aus `:desktop replay ... motiondump=<datei>`.

Der Score ist der Prozentsatz stark geaenderter Pixel gegenueber dem VORIGEN Frame, also
"Bewegung pro Frame-Periode". Zwei Fragen, eine beantwortbar, eine nicht:

* **Wo liegt die Schwelle?** Nicht ablesbar. Gemessen ist ein Gipfel bei exakt 0 und danach eine
  stetige Rampe -- kein Tal, keine zweite Mode. Ein stilles Brett liefert 0 (Rauschen ueberschreitet
  `motionPxThr` nach dem Blur nie), alles darueber ist bereits etwas. Der absolute Wert bleibt ein
  Sweep gegen die Kette.
* **Wie skaliert sie mit der Bildrate?** Messbar. Dieselbe Aufnahme mit Stride 1 und Stride 2, dann
  die Quantile ins Verhaeltnis: 1,0 heisst "haengt nicht an der Periode", 2,0 heisst "linear".

    uv run python scripts/motion_stats.py <30fps.csv> [15fps.csv]
"""

from __future__ import annotations

import csv
import sys

#: Log-artige Kanten, damit der Nullgipfel und die Rampe bis 34 auf einen Schirm passen.
EDGES = [0, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 13, 34, 100]

QUANTILES = (0.5, 0.9, 0.99, 0.999)


def load(path: str) -> list[float]:
    with open(path, newline="") as handle:
        return [float(row["motion"]) for row in csv.DictReader(handle) if row.get("motion")]


def quantile(values: list[float], p: float) -> float:
    if not values:
        return float("nan")
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, max(0, round(p * (len(ordered) - 1))))]


def histogram(name: str, values: list[float], threshold: float) -> None:
    zero = sum(1 for v in values if v == 0.0)
    print(f"\n== {name}: n={len(values)}, exakt 0: {zero} ({zero / len(values):.1%})")
    for low, high in zip(EDGES, EDGES[1:], strict=False):
        count = sum(1 for v in values if low <= v < high)
        bar = "#" * (count * 60 // max(1, len(values)))
        gate = "  <- motionThr" if low <= threshold < high else ""
        print(f"  {low:>6.2f} .. {high:<8.2f} {count:>6}  {bar}{gate}")
    line = "  ".join(f"p{p:g} {quantile(values, p):.3f}" for p in QUANTILES)
    print(f"  {line}  max {max(values):.3f}")


def ratio(a: list[float], b: list[float]) -> None:
    """Nur ueber den bewegten Teil: der Nullgipfel hat kein Quantil, das sich vergleichen liesse."""
    moving_a = sorted(v for v in a if v > 0)
    moving_b = sorted(v for v in b if v > 0)
    print("\n== Verhaeltnis B/A ueber die Frames mit Bewegung — 1,0 = periodenunabhaengig, 2,0 = linear")
    parts = []
    for p in (0.25, 0.5, 0.75, 0.9, 0.99):
        low, high = quantile(moving_a, p), quantile(moving_b, p)
        parts.append(f"p{int(p * 100):02d} {high / low:.2f}" if low > 0 else f"p{int(p * 100):02d} —")
    print("  " + "  ".join(parts))


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    first = load(argv[0])
    histogram(argv[0], first, threshold=0.25)
    if len(argv) > 1:
        second = load(argv[1])
        histogram(argv[1], second, threshold=0.25)
        ratio(first, second)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
