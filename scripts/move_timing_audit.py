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
from collections import Counter, defaultdict
from pathlib import Path

from chesslab.training.occlusion import PIECE_VISIBLE_MAX

REC = Path("data/recordings")


def _jsonl(path: Path):
    if not path.exists():
        return
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                yield json.loads(line)


def session_facts(sid: str, window: int) -> dict:
    """Je (Frame, Feld): liegt es im Zeitfenster eines Zuges? Dazu, was ein Mensch gesichtet hat."""
    rec = REC / sid.removeprefix("rg-")
    # `log.jsonl` schreibt den Frame als Pfad (`frames/001473.png`), Manifest und Matte als Stamm.
    frames_of: dict[int, list[str]] = defaultdict(list)
    for r in _jsonl(rec / "log.jsonl"):
        frames_of[int(r["ply"])].append(Path(str(r["frame"])).stem)
    for v in frames_of.values():
        v.sort()

    risky: dict[str, set[str]] = defaultdict(set)      # frame -> Felder im Zugfenster
    moves = 0
    for r in _jsonl(rec / "interval-check.jsonl"):
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

    human: set[tuple[str, str]] = set()
    for name in ("reviewed.jsonl", "corrections.jsonl"):
        for r in _jsonl(rec / name):
            human.add((Path(str(r["frame"])).stem, str(r["square"])))
    return {"risky": risky, "human": human, "moves": moves,
            "unseen": sum(1 for r in _jsonl(rec / "interval-check.jsonl") if not r.get("seen"))}


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
    want = {s for s in split["splits"][args.split]
            if (REC / s.removeprefix("rg-")).is_dir()}
    facts = {s: session_facts(s, args.window) for s in want}
    print(f"{args.dataset}/{args.split}: {len(want)} Aufnahmen, Fenster +/-"
          f"{args.window or 'ganzer Ply'} Frames um jede Ply-Grenze")

    per: dict[str, Counter] = defaultdict(Counter)
    examples: list[tuple] = []
    with (dd / "manifest.jsonl").open(encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            sid = r["session_id"]
            if sid not in facts:
                continue
            per[sid]["train_cells"] += 1
            f, sq = str(r["frame"]), str(r["square"])
            if sq not in facts[sid]["risky"].get(f, ()):
                continue
            per[sid]["im_fenster"] += 1
            if float(r.get("coverage") or 0.0) > PIECE_VISIBLE_MAX:
                per[sid]["maskiert"] += 1
                continue
            if (f, sq) in facts[sid]["human"]:
                per[sid]["gesichtet"] += 1
                continue
            per[sid]["RISIKO"] += 1
            if len(examples) < args.examples:
                examples.append((sid, f, sq, r.get("label"), r.get("ply")))

    tot = Counter()
    for c in per.values():
        tot.update(c)
    print(f"\n{'Aufnahme':32s} {'Train':>8} {'Zuege':>6} {'Fenster':>8} {'maskiert':>9} "
          f"{'gesichtet':>10} {'RISIKO':>8}")
    for sid, c in sorted(per.items(), key=lambda kv: -kv[1]["RISIKO"]):
        print(f"{sid:32s} {c['train_cells']:8d} {facts[sid]['moves']:6d} {c['im_fenster']:8d} "
              f"{c['maskiert']:9d} {c['gesichtet']:10d} {c['RISIKO']:8d}")
    print(f"{'GESAMT':32s} {tot['train_cells']:8d} "
          f"{sum(f['moves'] for f in facts.values()):6d} {tot['im_fenster']:8d} "
          f"{tot['maskiert']:9d} {tot['gesichtet']:10d} {tot['RISIKO']:8d}")
    print(f"\nungepruefte Zellen im Zugfenster: {tot['RISIKO']} von {tot['train_cells']} "
          f"({100.0 * tot['RISIKO'] / max(1, tot['train_cells']):.3f} % des Trainings)")
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
