"""Harte Faelle fuer den COVERAGE-Kopf — die Achse, fuer die es bisher kein Mining gab.

`mine_hard_empty.py` sucht Klassenfehler. Der Coverage-Kopf hat seine eigenen, und sie kosten im
Betrieb mehr: ein Feld faelschlich als verdeckt zu melden blendet die Recovery
(`RECOVERY_OCCLUDED_LIMIT` = 0), waehrend eine uebersehene Hand nur einen Read verdirbt.

Wahrheit ist die SAM-Matte in der Manifest-Spalte `coverage`, Schwelle `PIECE_VISIBLE_MAX`.
Gemeldet werden nur ENTSCHIEDENE Widersprueche — beide Seiten deutlich jenseits der Schwelle —,
weil ein Fall knapp daneben nichts lehrt.

    uv run python scripts/mine_hard_coverage.py --dataset <name> [--run <dir>] [--out <jsonl>]
"""
import argparse
import collections
from pathlib import Path

import numpy as np

from chesslab import occluded_model
from chesslab.dataset_build import dataset_dir
from chesslab.ioutil import read_jsonl, write_rows
from chesslab.training.packs import open_packed_rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--run", default="data/models/_ab/c8d1-seed42")
    ap.add_argument("--high", type=float, default=0.40, help="ab hier gilt eine Seite als VERDECKT")
    ap.add_argument("--clear", type=float, default=0.05, help="bis hier gilt eine Seite als FREI")
    ap.add_argument("--batch", type=int, default=512)
    ap.add_argument("--out", default="data/reports/hard_coverage.jsonl")
    args = ap.parse_args()

    dd = dataset_dir(args.dataset)
    man = read_jsonl(dd / "manifest.jsonl")
    mm, index = open_packed_rows(args.dataset, man)
    rows = [r for r in man if r["path"] in index]
    print(f"[i] {len(rows)} Crops, Modell {Path(args.run).name}, verdeckt >{args.high}, frei <{args.clear}")

    hits, stat = [], collections.Counter()
    for i in range(0, len(rows), args.batch):
        chunk = rows[i:i + args.batch]
        reads = occluded_model.all_reads(
            Path(args.run), [np.array(mm[index[r["path"]]])[:, :, ::-1] for r in chunk])
        for r, rd in zip(chunk, reads, strict=True):
            pc = rd.get("coverage")
            if pc is None:
                continue
            # Fehlende `coverage` heisst UN-MATTET, nicht frei ("Coverage Matte Trap"); als
            # 0,0 gelesen wurde jede Modellmeldung ein Phantom.
            if r.get("coverage") is None:
                stat["ohne Matte"] += 1
                continue
            # Bewusst ohne Helligkeit: der Coverage-Kopf lernt auch auf dunklen Zellen
            # (`OcclusionLoss.validation_terms`), `classification_eligible` waere die falsche Menge.
            tc = float(r["coverage"])
            # Zwei getrennte Baender statt eines symmetrischen Randes: die Schwelle liegt bei
            # 0,15, ein symmetrischer Rand klemmt die Untergrenze auf 0 und trifft dann nie.
            if pc > args.high and tc < args.clear:
                kind = "phantom"          # Modell sieht Hand, SAM sieht keine
            elif tc > args.high and pc < args.clear:
                kind = "uebersehen"       # SAM sieht Hand, Modell nicht
            else:
                continue
            stat[kind] += 1
            hits.append({"path": r["path"], "session_id": r["session_id"], "frame": r["frame"],
                         "square": r["square"], "label": r["label"], "kind": kind,
                         "true_cov": round(tc, 3), "pred_cov": round(float(pc), 3)})
        if (i // args.batch) % 40 == 0:
            print(f"    {i + len(chunk)}/{len(rows)}")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_rows(out, hits)
    print(f"\n{len(hits)} entschiedene Widersprueche von {len(rows)} Crops "
          f"({100 * len(hits) / max(len(rows), 1):.3f} %)")
    for k, v in stat.most_common():
        print(f"  {k:<12} {v}")
    for key in ("session_id", "label"):
        c = collections.Counter(x[key] for x in hits)
        print(f"\nnach {key}:")
        for a, b in c.most_common(6):
            print(f"  {a:<32} {b}")
    print(f"-> {out}")


if __name__ == "__main__":
    main()
