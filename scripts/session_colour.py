"""Farbtemperatur je Session: ist eine Aufnahme kaelter als der Rest? Dann waere ihre schlechte
Guete Domaenenverschiebung, kein Labelproblem. Gemessen auf den HELLEN Feldern; R/B ueber 1 ist
warm.
"""
import argparse
import collections

import numpy as np

from chesslab.dataset_build import dataset_dir
from chesslab.ioutil import read_jsonl
from chesslab.training.gradcam import _crop_reader


def measure(dataset: str, per_session: int) -> list[tuple]:
    """`(session, n, R, G, B, R/B, Helligkeit)` je Session, nach R/B aufsteigend."""
    take = collections.defaultdict(list)
    for r in read_jsonl(dataset_dir(dataset) / "manifest.jsonl"):
        if (r.get("square_color") == "light" and r["label"] == "empty"
                and len(take[r["session_id"]]) < per_session):
            take[r["session_id"]].append(r)
    read = _crop_reader(dataset, [r for rows in take.values() for r in rows])
    out = []
    for s, rows in take.items():
        px = np.stack([np.asarray(read(r)) for r in rows]).reshape(-1, 3).astype(np.float32)
        r_, g_, b_ = px[:, 0].mean(), px[:, 1].mean(), px[:, 2].mean()
        out.append((s, len(rows), r_, g_, b_, r_ / max(b_, 1e-6), px.mean()))
    return sorted(out, key=lambda x: x[5])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="real13-mix-v7-80")
    ap.add_argument("--per-session", type=int, default=400)
    args = ap.parse_args()

    print(f"{'Session':<34}{'n':>6}{'R':>7}{'G':>7}{'B':>7}{'R/B':>8}{'Helligkeit':>12}")
    for s, k, r_, g_, b_, rb, lum in measure(args.dataset, args.per_session):
        print(f"{s:<34}{k:>6}{r_:>7.1f}{g_:>7.1f}{b_:>7.1f}{rb:>8.3f}{lum:>12.1f}")


if __name__ == "__main__":
    main()
