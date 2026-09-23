"""Wie steil steigt die Guete noch mit der Zahl der Aufnahmen? Schreibt `split-lc<k>.json`: dieselbe
Val-Session, k Trainingsaufnahmen in fester gemischter Reihenfolge.

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

    ks = [int(x) for x in a.k.split(",")]
    # `order[:k]` kuerzt still: zu grosse k gaeben einen waagerechten Abschnitt der Kurve.
    if max(ks) > len(train):
        raise SystemExit(f"k={max(ks)} ueber {len(train)} Trainings-Aufnahmen — kein Punkt")

    for k in ks:
        keep = order[:k]
        out = {**split, "splits": {**split["splits"], "train": keep}}
        # `train` rechnet die Gewichte fuer Occlusion-Laeufe ohnehin neu.
        p = dd / f"split-lc{k}.json"
        write_json(p, out, indent=1)
        print(f"  k={k:>2}  {sum(counts.get(s, 0) for s in keep):>7} Crops  -> {p.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
