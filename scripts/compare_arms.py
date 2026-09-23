"""Arme gepaart je Seed vergleichen, auf dem Mittel der letzten Epochen.

`best` ist als Mass raus (CLAUDE.md, "`best` taugt nicht zum Vergleich"): Maximum ueber 60 verrauschte
Ziehungen, konstruktionsbedingt 2,3-2,9 sd ueber dem Niveau des Laufs. Hier zaehlt der
Schwanz eines vollstaendig gelaufenen Cosine.
"""

from __future__ import annotations

import argparse
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # sibling scripts
from thin_arms_report import tail_mean  # noqa: E402

METRICS = ("val_visible_piece_acc", "val_visible_occupied_board_acc",
           "val_coverage_precision", "val_loss")


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
            # Das gepaarte Mittel lief je Arm ueber die Seeds, die DIESER Arm hat — ein Arm mit
            # einem Seed stand ohne Vermerk neben einem mit dreien. Die Paarzahl gehoert daneben.
            paired = (f"  gepaart {statistics.fmean(deltas):+.4f} (n={len(deltas)}/{len(seeds)})"
                      if deltas else ("  gepaart —" if arm != args.baseline else ""))
            spread = f" (min {min(deltas):+.4f} max {max(deltas):+.4f})" if len(deltas) > 1 else ""
            print(f"  {arm:6s} " + "  ".join(cells) + paired + spread)
    print(f"\n-- = Lauf hat keine {args.epochs} Epochen und wird nicht gerangt")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
