"""Wo der Korpus duenn ist - und ob das an der Stellung liegt oder am Licht.

Der Unterschied entscheidet, was eine Aufnahme ueberhaupt holen kann. Eine Zelle ohne Belege ist
entweder NIE AUFGEBAUT worden (dann hilft eine Stellung) oder unter dieser Beleuchtung physisch
nicht erreichbar (dann hilft nur anderes Licht). Unterschieden wird empirisch: kommt die
Kombination aus Feldfarbe und Helligkeitsband im ganzen Korpus fuer IRGENDEINE Klasse haeufig vor,
ist sie erreichbar.

    uv run python scripts/coverage_gaps.py --dataset real13-mix-v7-128 --json data/reports/coverage-gaps.json
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

#: Helligkeitsbaender des Zell-Mittelwerts. Die Grenzen folgen dem Lichtgradienten des Bretts
#: (h3 bei 156, a7 bei 20 auf 20-41-33), nicht einer runden Zahl.
BANDS = ((0, 40, "sehr dunkel"), (40, 80, "dunkel"), (80, 130, "mittel"),
         (130, 180, "hell"), (180, 256, "sehr hell"))
PIECES = ("wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")
#: Ab hier gilt eine Zelle als belegt. 200 sichtbare Crops sind rund drei Verweil-Episoden.
THIN = 200
#: Ein Band, das ueber ALLE Klassen so selten ist, ist unter diesem Licht nicht erreichbar.
UNREACHABLE = 500


def band_of(value: float | None) -> str:
    """`None` ist NICHT dunkel. Alle 376 640 Komposit-Zeilen tragen keine `brightness`, und ein
    `or 0.0` warf sie geschlossen ins dunkelste Band - der Rest des Codes nimmt umgekehrt 255.0
    an (`training/data.py:186`). Beides waere geraten, also bekommen sie ein eigenes Band."""
    if value is None:
        return "unbekannt"
    for lo, hi, name in BANDS:
        if lo <= value < hi:
            return name
    return "?"


def tally(dataset: str) -> Counter:
    from chesslab.dataset_build import dataset_dir
    from chesslab.training.occlusion import PIECE_VISIBLE_MAX

    seen: Counter = Counter()
    with (dataset_dir(dataset) / "manifest.jsonl").open(encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            if r["label"] == "empty" or float(r.get("coverage") or 0.0) > PIECE_VISIBLE_MAX:
                continue
            b = r.get("brightness")
            seen[(r["label"], str(r.get("square_color") or "?"),
                  band_of(None if b is None else float(b)))] += 1
    return seen


def gaps(seen: Counter) -> list[dict]:
    names = [n for _, _, n in BANDS]
    reach = Counter()
    for (_, sq, b), n in seen.items():
        reach[(sq, b)] += n
    out = []
    for piece in PIECES:
        for sq in ("light", "dark"):
            for b in names:
                have = seen[(piece, sq, b)]
                if have >= THIN:
                    continue
                lit = reach[(sq, b)] >= UNREACHABLE
                out.append({"piece": piece, "square_color": sq, "band": b, "have": have,
                            "fix": "Stellung" if lit else "Licht",
                            "corpus_in_band": reach[(sq, b)]})
    return sorted(out, key=lambda g: (g["fix"] != "Stellung", g["have"]))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dataset", default="real13-mix-v7-128")
    ap.add_argument("--json", default="data/reports/coverage-gaps.json")
    args = ap.parse_args()

    seen = tally(args.dataset)
    g = gaps(seen)
    by_fix = Counter(x["fix"] for x in g)
    print(f"{args.dataset}: {len(g)} duenne Zellen von {len(PIECES) * 2 * len(BANDS)} "
          f"({by_fix['Stellung']} ueber eine Stellung erreichbar, {by_fix['Licht']} nur ueber Licht)")
    print(f"\n{'Figur':6s} {'Feld':6s} {'Band':12s} {'vorhanden':>10s} {'Korpus im Band':>15s}  Hebel")
    for x in g[:20]:
        print(f"{x['piece']:6s} {x['square_color']:6s} {x['band']:12s} {x['have']:10d} "
              f"{x['corpus_in_band']:15d}  {x['fix']}")
    out = Path(args.json)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"dataset": args.dataset, "thin_below": THIN, "gaps": g},
                              indent=1), encoding="utf-8")
    print(f"\n[OK] {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
