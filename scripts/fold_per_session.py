"""Je Session die Guete auf dem Modell, das sie NIE gesehen hat.

Der Standard-Split hat zwei Test-Sessions; welche zwei, verschiebt das Ergebnis so stark wie ein
Rezeptwechsel. Die vier Folds halten jede der 20 Sessions genau einmal zurueck — diese Auswertung
laesst je Fold sein Modell ueber SEINE Test-Sessions laufen und stellt die Zahlen nebeneinander.

    uv run python scripts/fold_per_session.py [--dataset ...] [--folds data/models/_folds]
"""
import argparse
import collections
import json
from pathlib import Path

import numpy as np

from chesslab import occluded_model
from chesslab.dataset_build import dataset_dir
from chesslab.training.occlusion import PIECE_VISIBLE_MAX as VMAX
from chesslab.training.pack import load_packed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="real13-straight-80-v3-c8d1")
    ap.add_argument("--folds", default="data/models/_folds")
    ap.add_argument("--batch", type=int, default=512)
    args = ap.parse_args()

    dd = dataset_dir(args.dataset)
    man = [json.loads(x) for x in (dd / "manifest.jsonl").read_text(encoding="utf-8").splitlines()]
    packed = load_packed(args.dataset, manifest_rows=man)
    img, (n, h, w), p2i = packed
    index = p2i or {r["path"]: r["_packed_idx"] for r in man if "_packed_idx" in r}
    mm = np.memmap(img, dtype=np.uint8, mode="r", shape=(n, h, w, 3))
    by_sess = collections.defaultdict(list)
    for r in man:
        if r["path"] in index and float(r.get("coverage") or 0.0) <= VMAX:
            by_sess[r["session_id"]].append(r)

    out = {}
    for run in sorted(Path(args.folds).iterdir()):
        if not (run / "metrics.jsonl").is_file():
            continue
        if len((run / "metrics.jsonl").read_text(encoding="utf-8").splitlines()) < 60:
            print(f"[--] {run.name} laeuft noch, uebersprungen")
            continue
        fold = run.name.split("-")[-1]
        split = json.loads((dd / f"split-{fold}.json").read_text(encoding="utf-8"))
        for sess in split["splits"]["test"]:
            rows = by_sess.get(sess, [])
            if not rows:
                continue
            ok = pieces = ok_p = 0
            for i in range(0, len(rows), args.batch):
                ch = rows[i:i + args.batch]
                reads = occluded_model.all_reads(
                    run, [np.array(mm[index[r["path"]]])[:, :, ::-1] for r in ch])
                for r, rd in zip(ch, reads, strict=True):
                    hit = rd["pred_label"] == r["label"]
                    ok += hit
                    if r["label"] != "empty":
                        pieces += 1
                        ok_p += hit
            out[sess] = (fold, len(rows), ok / len(rows), ok_p / pieces if pieces else float("nan"))
            print(f"  {sess:<32} {fold}  n={len(rows):>6}  visible {ok/len(rows):.4f}  "
                  f"piece {ok_p/pieces if pieces else float('nan'):.4f}")

    if out:
        print(f"\n{'Session':<34}{'Fold':>5}{'visible':>10}{'piece':>9}")
        # TODO: `out[sess]` verschluckt eine Session, die zwei Folds zurueckhalten (die Zusage
        #  "genau einmal" ist nirgends geprueft), und der Sortierschluessel ist `nan`, sobald ein
        #  Testsatz keine sichtbare Figur traegt — `nan` vergleicht gegen alles False, die
        #  Tabelle ist dann nicht mehr sortiert.
        for s, (f, _n, a, p) in sorted(out.items(), key=lambda kv: kv[1][3]):
            print(f"{s:<34}{f:>5}{a:>10.4f}{p:>9.4f}")


if __name__ == "__main__":
    main()
