"""Die Redundanz EINER Partie als Bild — drei Fragen, drei Felder.

  A  Wie nah liegt ein Crop an seinem naechsten Nachbarn? Die Masse unter der Dubletten-Schwelle
     ist der Teil der Partie, der nichts Neues traegt.
  B  Eine einzelne Standzeit ueber die Zeit: was sich waehrend 200 Frames wirklich aendert, und
     wo die ERSTEN vier gegen vier per Farthest-Point liegen.
  C  Die Deckungskurve: wie weit ist ein durchschnittlicher Crop noch vom naechsten BEHALTENEN,
     je nach Budget k? Das ist das Mass, das Farthest-Point NICHT direkt optimiert — der ehrliche
     Test fuer "klug auswaehlen statt die ersten nehmen".

    uv run python scripts/crop_redundancy_plot.py --pack rg-2026-09-15-16-54-44-128
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # sibling scripts

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from crop_redundancy import farthest_point as farthest  # noqa: E402
from crop_redundancy import runs_of, thumbs  # noqa: E402

from chesslab.ioutil import read_jsonl  # noqa: E402
from chesslab.training.occlusion import PIECE_VISIBLE_MAX  # noqa: E402

PACKS = Path("data/packs")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pack", required=True)
    ap.add_argument("--dup", type=float, default=2.0)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    pack = PACKS / args.pack
    rows = [r | {"_i": i} for i, r in enumerate(read_jsonl(pack / "manifest.jsonl"))
            if float(r.get("coverage") or 0.0) <= PIECE_VISIBLE_MAX]
    runs = {k: v for k, v in runs_of(rows).items() if len(v) >= 8}
    print(f"{args.pack}: {len(rows)} sichtbare Crops, {len(runs)} Standzeiten >= 8")

    nearest_all: list[np.ndarray] = []
    budgets = [1, 2, 4, 8, 16, 32]
    cover_first = np.zeros(len(budgets))
    cover_far = np.zeros(len(budgets))
    show = None
    for key, group in sorted(runs.items()):
        flat = thumbs(pack, group)
        dist = np.abs(flat[:, None, :] - flat[None, :, :]).mean(axis=2)
        raw = dist.copy()
        np.fill_diagonal(dist, np.inf)
        nearest_all.append(dist.min(axis=1))
        for j, k in enumerate(budgets):
            k = min(k, len(group))
            cover_first[j] += raw[list(range(k))].min(axis=0).mean()
            cover_far[j] += raw[farthest(raw, k)].min(axis=0).mean()
        # Fuer B: eine FIGUR, mittellang, mit spuerbarer Spannweite — ein leeres Feld beantwortet
        # die Frage nicht, die der Nutzer gestellt hat.
        span = float(raw.max())
        if show is None and key[1] != "empty" and 120 <= len(group) <= 320 and span > 20:
            show = (key, group, raw)
    per_run = len(runs)
    cover_first /= per_run
    cover_far /= per_run
    nearest = np.concatenate(nearest_all)
    dup_share = 100.0 * float((nearest <= args.dup).mean())

    fig, axes = plt.subplots(1, 3, figsize=(16.5, 4.8))
    fig.suptitle(f"Wie viel einer Partie ist dieselbe Figur zweimal?  —  {args.pack}   "
                 f"({len(rows)} sichtbare Crops, Haende raus)", fontsize=12)

    ax = axes[0]
    ax.hist(np.clip(nearest, 0, 20), bins=80, color="#4C72B0")
    ax.axvline(args.dup, color="#C44E52", lw=2)
    ax.set_yscale("log")
    ax.set_title(f"A  Abstand zum naechsten Nachbarn\n{dup_share:.1f} % liegen unter {args.dup}")
    ax.set_xlabel("mittlerer Pixelabstand (Graustufen)")
    ax.set_ylabel("Crops (log)")
    ax.text(args.dup + 0.4, ax.get_ylim()[1] * 0.3, "Dubletten-Schwelle", color="#C44E52")

    ax = axes[1]
    if show is not None:
        key, group, raw = show
        d0 = raw[0]
        x = np.arange(len(group))
        ax.plot(x, d0, color="#55A868", lw=1.2)
        k = 4
        ax.scatter(x[:k], d0[:k], color="#4C72B0", s=70, zorder=5, label="die ERSTEN 4")
        far = farthest(raw, k)
        ax.scatter(x[far], d0[far], color="#C44E52", s=70, marker="D", zorder=5,
                   label="4 per Farthest-Point")
        ax.set_title(f"B  Eine Standzeit: {key[0]} {key[1]}, {len(group)} Crops\n"
                     f"Abstand zum ERSTEN Bild der Strecke")
        ax.set_xlabel("Crop in der Reihenfolge der Frames")
        ax.set_ylabel("Abstand zum ersten")
        ax.legend(loc="upper left", fontsize=9)
    else:
        ax.set_title("B  keine passende Standzeit gefunden")

    ax = axes[2]
    ax.plot(budgets, cover_first, "o-", color="#4C72B0", label="die ERSTEN k")
    ax.plot(budgets, cover_far, "D-", color="#C44E52", label="k per Farthest-Point")
    ax.set_xscale("log", base=2)
    ax.set_xticks(budgets)
    ax.set_xticklabels([str(b) for b in budgets])
    ax.set_title("C  Deckung: Abstand zum naechsten BEHALTENEN\n(klein ist besser)")
    ax.set_xlabel("behaltene Crops je Standzeit (k)")
    ax.set_ylabel("mittlerer Abstand")
    ax.legend(fontsize=9)
    ax.grid(alpha=0.3)

    out = Path(args.out or f"{args.pack}-redundanz.png")
    fig.tight_layout(rect=(0, 0, 1, 0.93))
    fig.savefig(out, dpi=130)
    print(f"geschrieben: {out}")
    for j, k in enumerate(budgets):
        print(f"   k={k:3d}   erste {cover_first[j]:6.2f}   farthest {cover_far[j]:6.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
