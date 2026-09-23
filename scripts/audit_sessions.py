"""Ist eine schlechte Session falsch GELABELT oder nur schwer?

`fold_per_session.py` benotet je Session das Modell, das sie nie gesehen hat — 0,58 bis 0,99.
Das trennt aber nicht, WORAN es liegt. Hier ist der Test: eine Zelle, die in JEDEM Frame
derselben Situation dieselbe falsche Antwort mit hoher Konfidenz bekommt, ist kein schweres
Bild, sondern ein Verdacht auf ein falsches Label. Eine Zelle, die von Frame zu Frame wackelt,
ist schweres Material.

Gruppiert wird nach (Feld, Label) je Session: dieselbe Figur auf demselben Feld ist dieselbe
physische Situation, egal wie viele Frames darauf zeigen.

    uv run python scripts/audit_sessions.py [--dataset ...] [--min-n 20] [--conf 0.7]
"""
import argparse
import collections
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fold_per_session import finished  # noqa: E402

from chesslab import occluded_model
from chesslab.dataset_build import dataset_dir
from chesslab.ioutil import read_jsonl, write_json
from chesslab.training.occlusion import PIECE_VISIBLE_MAX as VMAX
from chesslab.training.packs import open_packed_rows


def share_cells(d: dict) -> str:
    """Eine Aufnahme ohne beurteilte Situation ist nicht zu 0,0 % verdaechtig, sondern ungemessen."""
    tot = d["situations"]
    pct = f"{100 * d['verdaechtig'] / tot:>4.1f}%" if tot else "   —"
    return f"{tot:>6}{d['richtig']:>9}{d['wackelig']:>10}{d['verdaechtig']:>8} ({pct})"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="real13-straight-80-v3-c8d1")
    ap.add_argument("--folds", default="data/models/_folds")
    ap.add_argument("--batch", type=int, default=512)
    ap.add_argument("--min-n", type=int, default=20, help="Frames, die eine Situation tragen muss.")
    ap.add_argument("--conf", type=float, default=0.7, help="Ab hier heisst der Irrtum ueberzeugt.")
    ap.add_argument("--share", type=float, default=0.8,
                    help="Anteil der Frames, die dieselbe falsche Antwort geben muessen.")
    ap.add_argument("--out", default="data/reports/session-audit.json")
    args = ap.parse_args()

    dd = dataset_dir(args.dataset)
    man = read_jsonl(dd / "manifest.jsonl")
    mm, index = open_packed_rows(args.dataset, man)
    by_sess = collections.defaultdict(list)
    for r in man:
        if r["path"] in index and float(r.get("coverage") or 0.0) <= VMAX:
            by_sess[r["session_id"]].append(r)

    report = {}
    for run in sorted(Path(args.folds).iterdir()):
        if not (run / "metrics.jsonl").is_file():
            continue
        if not finished(run):
            print(f"[--] {run.name} ist nicht 0..59 durchgelaufen, uebersprungen")
            continue
        fold = run.name.split("-")[-1]
        split = json.loads((dd / f"split-{fold}.json").read_text(encoding="utf-8"))
        for sess in split["splits"]["test"]:
            rows = by_sess.get(sess, [])
            if not rows:
                continue
            # (Feld, Label) -> Liste (Vorhersage, Konfidenz)
            groups = collections.defaultdict(list)
            for i in range(0, len(rows), args.batch):
                ch = rows[i:i + args.batch]
                reads = occluded_model.all_reads(
                    run, [np.array(mm[index[r["path"]]])[:, :, ::-1] for r in ch])
                for r, rd in zip(ch, reads, strict=True):
                    groups[(r["square"], r["label"])].append(
                        (rd["pred_label"], float(max(rd["probs"]))))
            suspects, shaky, solid = [], 0, 0
            for (sq, lab), reads in groups.items():
                if len(reads) < args.min_n:
                    continue
                votes = collections.Counter(p for p, _ in reads)
                top, cnt = votes.most_common(1)[0]
                share = cnt / len(reads)
                conf = float(np.mean([c for p, c in reads if p == top]))
                if top == lab:
                    solid += 1
                elif share >= args.share and conf >= args.conf:
                    suspects.append({"square": sq, "label": lab, "model": top,
                                     "n": len(reads), "share": round(share, 3),
                                     "conf": round(conf, 3)})
                else:
                    shaky += 1
            report[sess] = {"fold": fold, "situations": solid + shaky + len(suspects),
                            "richtig": solid, "wackelig": shaky,
                            "verdaechtig": len(suspects), "faelle": suspects}
            print(f"  {sess:<32} {fold}  Situationen {solid + shaky + len(suspects):>4}  "
                  f"richtig {solid:>4}  wackelig {shaky:>3}  VERDAECHTIG {len(suspects):>3}",
                  flush=True)

    print(f"\n{'Session':<34}{'Sit.':>6}{'richtig':>9}{'wackelig':>10}{'verdaechtig':>13}")
    for s, d in sorted(report.items(),
                       key=lambda kv: -kv[1]["verdaechtig"] / max(1, kv[1]["situations"])):
        print(f"{s:<34}" + share_cells(d))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    write_json(Path(args.out), report, indent=1)
    print(f"\n[OK] {args.out}")


if __name__ == "__main__":
    main()
