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
from chesslab.ioutil import read_jsonl
from chesslab.training.occlusion import PIECE_VISIBLE_MAX as VMAX
from chesslab.training.packs import open_packed_rows


def finished(run: Path, epochs: int = 60) -> bool:
    """Wie `compare_arms.tail_mean`: EINDEUTIGE, LUECKENLOSE Epochen 0..epochs-1.

    Zeilen zaehlen reicht nicht — ein fortgesetzter Lauf schreibt seine ersten Epochen ein
    zweites Mal und kam so als fertiger Fold in die Tabelle (2 von 307 `metrics.jsonl` auf der
    Platte haben genau diese Form).
    """
    p = run / "metrics.jsonl"
    if not p.is_file():
        return False
    return sorted(r["epoch"] for r in read_jsonl(p) if "epoch" in r) == list(range(epochs))


def missing_sessions(expected, out):
    """Die Zusage ist "jede Session genau einmal" — `duplicate_sessions` prueft nur die eine
    Haelfte. Eine Test-Session ohne sichtbare Zeile fiel per `continue` aus der Tabelle, ohne
    dass irgendwo eine Zahl kleiner wurde."""
    have = {sess for sess, _fold in out}
    return sorted((s, f) for s, f in expected if s not in have)


def duplicate_sessions(out):
    """Zwei Folds mit derselben Test-Session waren stille Ueberschreibung — die Zusage "jede
    Session genau einmal" ist nirgends geprueft, also wird sie hier nachgewiesen statt geglaubt."""
    folds = collections.defaultdict(list)
    for sess, fold in out:
        folds[sess].append(fold)
    return {s: sorted(f) for s, f in folds.items() if len(f) > 1}


def sorted_rows(out):
    """`nan` vergleicht gegen alles False und liess die Tabelle unsortiert — hier ans Ende."""
    rows = [(sess, fold, n, vis, piece) for (sess, fold), (n, vis, piece) in out.items()]
    return sorted(rows, key=lambda r: (r[4] != r[4], r[4] if r[4] == r[4] else 0.0))


def table_line(sess, fold, visible, piece):
    shown = "—".rjust(9) if piece != piece else f"{piece:>9.4f}"
    return f"{sess:<34}{fold:>5}{visible:>10.4f}{shown}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="real13-straight-80-v3-c8d1")
    ap.add_argument("--folds", default="data/models/_folds")
    ap.add_argument("--batch", type=int, default=512)
    args = ap.parse_args()

    dd = dataset_dir(args.dataset)
    man = read_jsonl(dd / "manifest.jsonl")
    mm, index = open_packed_rows(args.dataset, man)
    by_sess = collections.defaultdict(list)
    for r in man:
        if r["path"] in index and float(r.get("coverage") or 0.0) <= VMAX:
            by_sess[r["session_id"]].append(r)

    out, expected = {}, []
    for run in sorted(Path(args.folds).iterdir()):
        if not (run / "metrics.jsonl").is_file():
            continue
        if not finished(run):
            print(f"[--] {run.name} ist nicht 0..59 durchgelaufen, uebersprungen")
            continue
        fold = run.name.split("-")[-1]
        split = json.loads((dd / f"split-{fold}.json").read_text(encoding="utf-8"))
        for sess in split["splits"]["test"]:
            expected.append((sess, fold))
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
            out[(sess, fold)] = (len(rows), ok / len(rows), ok_p / pieces if pieces else float("nan"))
            print(f"  {sess:<32} {fold}  n={len(rows):>6}  visible {ok/len(rows):.4f}  "
                  f"piece {ok_p/pieces if pieces else float('nan'):.4f}")

    gone = missing_sessions(expected, out)
    if gone:
        print("[!] keine sichtbare Zeile, faellt aus der Tabelle: "
              + ", ".join(f"{s} (Fold {f})" for s, f in gone))
    if out:
        dupes = duplicate_sessions(out)
        if dupes:
            print("[!] in mehreren Folds im Test: "
                  + ", ".join(f"{s} ({'/'.join(f)})" for s, f in dupes.items()))
        print(f"\n{'Session':<34}{'Fold':>5}{'visible':>10}{'piece':>9}")
        for sess, fold, _n, visible, piece in sorted_rows(out):
            print(table_line(sess, fold, visible, piece))


if __name__ == "__main__":
    main()
