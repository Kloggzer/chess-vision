"""Traegt eine Trainingszelle das FEN von VOR dem Zug, obwohl der Zug schon passiert ist?

Nicht die Hand ist das Problem - ein Frame mit Hand hat 50+ einwandfreie Felder, und was verdeckt
ist, nimmt die Coverage ohnehin aus dem Verlust. Das Problem ist der ZEITPUNKT des Zuges: wird er
einen Frame zu frueh oder zu spaet festgeschrieben, tragen die Frames rund um die Ply-Grenze das
falsche Label - aber nur auf den Feldern, die der Zug beruehrt.

`interval-check.jsonl` nennt genau die (`moved`), also ist die Menge klein und pruefbar:

    uv run python scripts/move_timing_audit.py --dataset real13-mix-v7-128 --split train
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

from chesslab.cell_rule import PIECE_VISIBLE_MAX
from chesslab.ioutil import iter_jsonl, read_jsonl
from chesslab.session_store.log import read_log_rows

sys.path.insert(0, str(Path(__file__).resolve().parent))   # sibling scripts
from heldout_label_audit import judged  # noqa: E402

REC = Path("data/recordings")


def session_facts(sid: str, window: int) -> dict:
    """Je (Frame, Feld): liegt es im Zeitfenster eines Zuges? Dazu, was ein Mensch gesichtet hat."""
    rec = REC / sid.removeprefix("rg-")
    # `log.jsonl` schreibt den Frame als Pfad, Manifest und Matte als Stamm.
    frames_of: dict[int, list[str]] = defaultdict(list)
    for r in read_log_rows(rec):
        frames_of[int(r["ply"])].append(Path(str(r["frame"])).stem)
    for v in frames_of.values():
        v.sort()

    risky: dict[str, set[str]] = defaultdict(set)      # frame -> Felder im Zugfenster
    moves = 0
    checks = read_jsonl(rec / "interval-check.jsonl")
    for r in checks:
        moved = [str(s) for s in (r.get("moved") or [])]
        if not moved:
            continue
        moves += 1
        ply = int(r["ply"])
        # Zu spaet festgeschrieben: die letzten Frames des VORGAENGERS zeigen den Zug schon.
        for f in frames_of.get(ply - 1, [])[-window:] if window else frames_of.get(ply - 1, []):
            risky[f].update(moved)
        # Zu frueh: die ersten Frames des Plys zeigen ihn noch nicht.
        for f in frames_of.get(ply, [])[:window] if window else frames_of.get(ply, []):
            risky[f].update(moved)

    return {"risky": risky, "human": judged(rec), "moves": moves,
            "unseen": sum(1 for r in checks if not r.get("seen"))}


def classify(coverage, seen_by_human: bool) -> str:
    """Eine Zelle OHNE Coverage ist ungemessen, nicht sichtbar."""
    if coverage is None:
        return "ungemessen"
    if float(coverage) > PIECE_VISIBLE_MAX:
        return "maskiert"
    return "gesichtet" if seen_by_human else "RISIKO"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dataset", default="real13-mix-v7-128")
    ap.add_argument("--split", default="train")
    ap.add_argument("--split-file", default="split-pin.json")
    ap.add_argument("--window", type=int, default=3,
                    help="Frames je Seite der Ply-Grenze. 0 = der ganze Ply (Obergrenze).")
    ap.add_argument("--examples", type=int, default=10)
    args = ap.parse_args()

    from chesslab.dataset_build import dataset_dir

    dd = dataset_dir(args.dataset)
    split = json.loads((dd / args.split_file).read_text(encoding="utf-8"))
    alle = list(split["splits"][args.split])
    want = {s for s in alle if (REC / s.removeprefix("rg-")).is_dir()}
    ohne_plies = [s for s in want
                  if not (REC / s.removeprefix("rg-") / "interval-check.jsonl").is_file()]
    facts = {s: session_facts(s, args.window) for s in want}
    print(f"{args.dataset}/{args.split}: {len(want)} von {len(alle)} Aufnahmen geprueft "
          f"({len(alle) - len(want)} ohne Aufnahmeordner), Fenster +/-"
          f"{args.window or 'ganzer Ply'} Frames um jede Ply-Grenze")
    if ohne_plies:
        print(f"[WARN] {len(ohne_plies)} davon ohne interval-check.jsonl — dort ist kein Zug "
              f"bekannt, ihre Zellen stehen im Nenner und koennen nie auffallen.")

    per: dict[str, Counter] = defaultdict(Counter)
    examples: list[tuple] = []
    for r in iter_jsonl(dd / "manifest.jsonl"):
        sid = r["session_id"]
        if sid not in facts:
            continue
        per[sid]["train_cells"] += 1
        f, sq = str(r["frame"]), str(r["square"])
        if sq not in facts[sid]["risky"].get(f, ()):
            continue
        per[sid]["im_fenster"] += 1
        bucket = classify(r.get("coverage"), (f, sq) in facts[sid]["human"])
        per[sid][bucket] += 1
        if bucket != "RISIKO":
            continue
        if len(examples) < args.examples:
            examples.append((sid, f, sq, r.get("label"), r.get("ply")))

    tot = Counter()
    for c in per.values():
        tot.update(c)
    print(f"\n{'Aufnahme':32s} {'Train':>8} {'Zuege':>6} {'Fenster':>8} {'maskiert':>9} "
          f"{'gesichtet':>10} {'ungemessen':>11} {'RISIKO':>8}")
    for sid, c in sorted(per.items(), key=lambda kv: -kv[1]["RISIKO"]):
        print(f"{sid:32s} {c['train_cells']:8d} {facts[sid]['moves']:6d} {c['im_fenster']:8d} "
              f"{c['maskiert']:9d} {c['gesichtet']:10d} {c['ungemessen']:11d} {c['RISIKO']:8d}")
    print(f"{'GESAMT':32s} {tot['train_cells']:8d} "
          f"{sum(f['moves'] for f in facts.values()):6d} {tot['im_fenster']:8d} "
          f"{tot['maskiert']:9d} {tot['gesichtet']:10d} {tot['ungemessen']:11d} "
          f"{tot['RISIKO']:8d}")
    print(f"\nungepruefte Zellen im Zugfenster: {tot['RISIKO']} von {tot['train_cells']} "
          f"({100.0 * tot['RISIKO'] / max(1, tot['train_cells']):.3f} % der {len(want)} "
          f"geprueften Aufnahmen, NICHT des ganzen Splits)")
    unseen = sum(f["unseen"] for f in facts.values())
    if unseen:
        print(f"[WARN] {unseen} Plies ohne Settle-Messung (`seen` false) - dort ist der Zeitpunkt "
              f"nicht gemessen, sondern angenommen.")
    if examples:
        print("Beispiele:")
        for sid, f, sq, lab, ply in examples:
            print(f"   {sid} / Frame {f} / {sq} = {lab}  (Ply {ply})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
