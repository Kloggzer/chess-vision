"""Farbtemperatur je Session — ist eine Aufnahme kaelter als der Rest?

Der Nutzer sah es am Brett (2026-08-25): `00-39-57` wirkt kuehler. Wenn das stimmt, ist ihre
schlechte Guete eine Domaenenverschiebung und kein Labelproblem — und die Abhilfe waere
Farb-Augmentierung oder `--crop-norm per-crop`, nicht mehr Daten.

Gemessen auf den HELLEN Feldern, weil die die Beleuchtung tragen; dunkle Felder sind fast
farblos. R/B ueber 1 ist warm, unter 1 kalt.
"""
import argparse
import collections

import numpy as np

from chesslab.dataset_build import dataset_dir
from chesslab.ioutil import read_jsonl
from chesslab.training.pack import load_packed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="real13-straight-80-v3")
    ap.add_argument("--per-session", type=int, default=400)
    args = ap.parse_args()

    dd = dataset_dir(args.dataset)
    man = read_jsonl(dd / "manifest.jsonl")
    img, (n, h, w), p2i = load_packed(args.dataset, manifest_rows=man)
    index = p2i or {r["path"]: r["_packed_idx"] for r in man if "_packed_idx" in r}
    mm = np.memmap(img, dtype=np.uint8, mode="r", shape=(n, h, w, 3))

    take = collections.defaultdict(list)
    for r in man:
        if (r.get("square_color") == "light" and r["label"] == "empty"
                and r["path"] in index and len(take[r["session_id"]]) < args.per_session):
            take[r["session_id"]].append(index[r["path"]])

    print(f"{'Session':<34}{'n':>6}{'R':>7}{'G':>7}{'B':>7}{'R/B':>8}{'Helligkeit':>12}")
    rows = []
    for s, idxs in take.items():
        px = np.stack([np.array(mm[i]) for i in idxs]).reshape(-1, 3).astype(np.float32)
        r_, g_, b_ = px[:, 0].mean(), px[:, 1].mean(), px[:, 2].mean()
        rows.append((s, len(idxs), r_, g_, b_, r_ / max(b_, 1e-6), px.mean()))
    for s, k, r_, g_, b_, rb, lum in sorted(rows, key=lambda x: x[5]):
        print(f"{s:<34}{k:>6}{r_:>7.1f}{g_:>7.1f}{b_:>7.1f}{rb:>8.3f}{lum:>12.1f}")


if __name__ == "__main__":
    main()
