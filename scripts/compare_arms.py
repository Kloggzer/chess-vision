"""Arme gepaart je Seed vergleichen, auf dem Mittel der letzten Epochen.

`best` ist als Mass raus (HANDOFF-TRAINING-2026-09-11.md): Maximum ueber 60 verrauschte
Ziehungen, konstruktionsbedingt 2,3-2,9 sd ueber dem Niveau des Laufs. Hier zaehlt der
Schwanz eines vollstaendig gelaufenen Cosine.
"""

from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path

METRICS = ("val_visible_piece_acc", "val_visible_occupied_board_acc",
           "val_coverage_precision", "val_loss")


def tail_mean(run: Path, metric: str, tail: int, epochs: int) -> float | None:
    """Der Schwanzmittelwert — oder None, wenn der Lauf nicht rangfaehig ist.

    Zeilen zaehlen reicht nicht: ein fortgesetzter oder doppelt geschriebener Verlauf kaeme sonst
    als vollstaendig durch. Geprueft werden EINDEUTIGE, LUECKENLOSE Epochenindizes 0..epochs-1.
    Unvollstaendige Laeufe fallen aus der Rangfolge, statt mit einem Sternchen mitzulaufen.
    """
    p = run / "metrics.jsonl"
    if not p.exists():
        return None
    rows = [json.loads(line) for line in p.read_text(encoding="utf-8").splitlines() if line.strip()]
    seen = {r["epoch"] for r in rows if "epoch" in r}
    if seen != set(range(epochs)):
        return None
    vals = [r[metric] for r in rows[-tail:] if metric in r]
    return statistics.fmean(vals) if vals else None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--root", default="data/models/_arch80v6")
    ap.add_argument("--baseline", default="p4a")
    ap.add_argument("--tail", type=int, default=15)
    ap.add_argument("--seeds", default="42,43,44")
    ap.add_argument("--epochs", type=int, default=60,
                    help="Sollzahl der Epochen; wer sie nicht erreicht, wird nicht gerangt.")
    args = ap.parse_args()

    root = Path(args.root)
    seeds = [int(s) for s in args.seeds.split(",")]
    arms = sorted({d.name.rsplit("-s", 1)[0] for d in root.iterdir()
                   if d.is_dir() and "-s" in d.name})
    if args.baseline in arms:
        arms = [args.baseline] + [a for a in arms if a != args.baseline]

    for metric in METRICS:
        print(f"\n=== {metric} (Mittel der letzten {args.tail} Epochen)")
        base: dict[int, float] = {}
        for arm in arms:
            cells, deltas = [], []
            for seed in seeds:
                v = tail_mean(root / f"{arm}-s{seed}", metric, args.tail, args.epochs)
                if v is None:
                    cells.append("   --   ")
                    continue
                cells.append(f"{v:.4f} ")
                if arm == args.baseline:
                    base[seed] = v
                elif seed in base:
                    deltas.append(v - base[seed])
            paired = f"  gepaart {statistics.fmean(deltas):+.4f}" if deltas else ""
            spread = f" (min {min(deltas):+.4f} max {max(deltas):+.4f})" if len(deltas) > 1 else ""
            print(f"  {arm:6s} " + "  ".join(cells) + paired + spread)
    print("\n* = Lauf hat keine 60 Epochen")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
