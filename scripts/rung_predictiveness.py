"""Wie gut sagt eine frueher Epoche die Endplatzierung voraus — auf den Laeufen, die da sind.

Die Zahl entscheidet, ob ein Sweep ueberhaupt frueh abbrechen darf. Sie ist NICHT konstant:
auf weit auseinanderliegenden Armen sagt schon Epoche 5 alles, auf eng beieinanderliegenden
sagt Epoche 20 nichts. Der Entwurf dazu steht in `docs/plan-98/03-autotuning.md`.

    uv run python scripts/rung_predictiveness.py
    uv run python scripts/rung_predictiveness.py --roots data/models/_arch80v6 --tail 20
"""

from __future__ import annotations

import argparse
import itertools
import statistics
from pathlib import Path

from chesslab.ioutil import read_jsonl

METRIC = "val_visible_piece_acc"
DEFAULT_ROOTS = ("data/models/_arch/real13-mix-v4", "data/models/_arch/real13-mix-v4-128",
                 "data/models/_arch80v6-frac1", "data/models/_arch128v6-frac1",
                 "data/models/_arch80v6")


def _series(run: Path, metric: str) -> list[float] | None:
    p = run / "metrics.jsonl"
    if not p.exists():
        return None
    rows = read_jsonl(p)
    return [r[metric] for r in rows if metric in r]


def _mean(vals: list[float], lo: int, hi: int | None) -> float | None:
    part = vals[lo:hi]
    return statistics.fmean(part) if part else None


def _spearman(a: list[float], b: list[float]) -> float:
    def ranks(x: list[float]) -> list[float]:
        order = sorted(range(len(x)), key=lambda i: x[i])
        out = [0.0] * len(x)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and x[order[j + 1]] == x[order[i]]:
                j += 1
            for k in range(i, j + 1):
                out[order[k]] = (i + j) / 2 + 1
            i = j + 1
        return out

    ra, rb = ranks(a), ranks(b)
    ma, mb = statistics.fmean(ra), statistics.fmean(rb)
    num = sum((ra[i] - ma) * (rb[i] - mb) for i in range(len(a)))
    den = (sum((x - ma) ** 2 for x in ra) * sum((x - mb) ** 2 for x in rb)) ** 0.5
    return num / den if den else float("nan")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--roots", nargs="*", default=list(DEFAULT_ROOTS))
    ap.add_argument("--metric", default=METRIC)
    ap.add_argument("--tail", type=int, default=15, help="Epochen, ueber die das ENDergebnis mittelt.")
    ap.add_argument("--window", type=int, default=8, help="Epochen VOR der Sprosse, ueber die sie mittelt.")
    ap.add_argument("--epochs", type=int, default=60, help="Nur Laeufe mit so vielen Epochen zaehlen.")
    ap.add_argument("--rungs", default="10,15,20,25,30,40")
    ap.add_argument("--min-runs", type=int, default=6, help="Kleinere Kohorten tragen keine Rangfolge.")
    args = ap.parse_args()

    rungs = [int(x) for x in args.rungs.split(",")]
    cohorts: dict[str, dict[str, list[float]]] = {}
    for root in args.roots:
        d = Path(root)
        if not d.is_dir():
            continue
        runs = {}
        for run in sorted(p for p in d.iterdir() if p.is_dir()):
            s = _series(run, args.metric)
            if s and len(s) >= args.epochs:
                runs[run.name] = s
        if len(runs) >= args.min_runs:
            cohorts[d.name] = runs
        elif runs:
            print(f"[--] {d.name}: nur {len(runs)} volle Laeufe, uebersprungen")
    if not cohorts:
        print("keine Kohorte gross genug")
        return 1

    print("\nKohorten: " + ", ".join(f"{k} (n={len(v)})" for k, v in cohorts.items()))
    print(f"Endmass: Mittel der letzten {args.tail} Epochen von {args.metric}\n")

    print("## Aufloesung einer Sprosse: ordnet sie Paare richtig, nach Endabstand")
    buckets: dict[str, list[int]] = {}
    for r in rungs:
        for runs in cohorts.values():
            fin = {n: _mean(v, -args.tail, None) for n, v in runs.items()}
            rung = {n: _mean(v, max(0, r - args.window), r) for n, v in runs.items()}
            for a, b in itertools.combinations(runs, 2):
                gap = abs(fin[a] - fin[b])
                key = "<0,01" if gap < 0.01 else "0,01-0,02" if gap < 0.02 else \
                      "0,02-0,04" if gap < 0.04 else ">=0,04"
                cell = buckets.setdefault(f"r={r:<3d} {key}", [0, 0])
                cell[0] += (fin[a] > fin[b]) == (rung[a] > rung[b])
                cell[1] += 1
    for key in sorted(buckets):
        hit, tot = buckets[key]
        print(f"  {key:16s} {hit:3d}/{tot:<3d} richtig ({100 * hit / tot:3.0f} %)")

    print("\n## Ueberlebt die spaetere Top-3 einen Schnitt an der Sprosse?")
    print("  r   | " + " | ".join(f"behalte {f:.2f}" for f in (0.75, 0.5, 0.33)) + " | rho")
    for r in rungs:
        cells, rhos = [], []
        for frac in (0.75, 0.5, 0.33):
            hit = tot = 0
            for runs in cohorts.values():
                fin = {n: _mean(v, -args.tail, None) for n, v in runs.items()}
                rung = {n: _mean(v, max(0, r - args.window), r) for n, v in runs.items()}
                k = max(1, round(len(runs) * frac))
                keep = set(sorted(runs, key=lambda n: -rung[n])[:k])
                for winner in sorted(runs, key=lambda n: -fin[n])[:3]:
                    tot += 1
                    hit += winner in keep
            cells.append(f"{hit}/{tot}")
        for runs in cohorts.values():
            names = list(runs)
            rhos.append(_spearman([_mean(runs[n], max(0, r - args.window), r) for n in names],
                                  [_mean(runs[n], -args.tail, None) for n in names]))
        print(f"  {r:3d} | " + " | ".join(f"{c:11s}" for c in cells)
              + f" | {statistics.fmean(rhos):+.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
