"""Wie steil steigt die Guete noch mit der Zahl der Aufnahmen?

Alle Rezept-Hebel sind ausgereizt (`docs/measurement-floor.md`): das Modell kann 99,93 % seiner
Trainingsdaten und 75,85 % einer neuen Session. Damit ist die offene Frage nicht mehr, OB mehr
Material hilft, sondern wie viel es bringt — und das steht in der Steigung der Lernkurve, nicht
in einer Meinung.

Schreibt `split-lc<k>.json` neben den Datensatz: dieselbe Val-Session, aber nur k Trainings-
Aufnahmen. Die Reihenfolge ist gemischt und fest, damit nicht die Groesse mit der Zahl wandert.

    uv run python scripts/learning_curve.py --dataset real13-straight-80-v3-c8d1 --k 4,8,12,17
"""
import argparse
import json
import random

from chesslab.dataset_build import dataset_dir
from chesslab.ioutil import read_jsonl, write_json


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="real13-straight-80-v3-c8d1")
    ap.add_argument("--k", default="4,8,12,17")
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()

    dd = dataset_dir(a.dataset)
    split = json.loads((dd / "split.json").read_text(encoding="utf-8"))
    train = sorted(split["splits"]["train"])
    order = train[:]
    random.Random(a.seed).shuffle(order)
    print(f"[i] {len(train)} Trainings-Aufnahmen, Reihenfolge Seed {a.seed}")

    counts = {}
    for r in read_jsonl(dd / "manifest.jsonl"):
        counts[r["session_id"]] = counts.get(r["session_id"], 0) + 1

    for k in [int(x) for x in a.k.split(",")]:
        keep = order[:k]
        out = {**split, "splits": {**split["splits"], "train": keep}}
        # Die Klassengewichte gehoeren zum Trainingssatz — `train` rechnet sie fuer
        # Occlusion-Laeufe ohnehin aus den sichtbaren Zeilen neu, also bleiben sie hier stehen.
        p = dd / f"split-lc{k}.json"
        write_json(p, out, indent=1)
        print(f"  k={k:>2}  {sum(counts.get(s, 0) for s in keep):>7} Crops  -> {p.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
