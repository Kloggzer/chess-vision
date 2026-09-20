"""Die um ein Ply versetzten Frames ueber `corrections.jsonl` geradeziehen.

`scripts/scan_ply_offset.py` findet Frames, deren Brett die Stellung NACH dem Zug zeigt, waehrend
die FEN die davor traegt — Ursache ist die Commit-Latenz (dort dokumentiert). Betroffen sind nur
die ZWEI Felder, die der Zug bewegt; der Rest des Bretts stimmt. Statt den Frame zu verwerfen
schreibt diese Korrektur genau diese Zellen um.

Drei Sicherungen, weil eine falsche Korrektur schlimmer ist als ein falsches Label:
  * nur Frames mit >= 2 Zellen Gewinn — ein Ply aendert immer zwei Felder, ein Gewinn von 1 ist
    von Modellrauschen nicht zu trennen;
  * je Feld nur, wenn das MODELL der neuen FEN dort zustimmt;
  * niemals ueber eine bestehende Korrektur eines Menschen.

Ohne `--apply` nur ein Bericht.

    uv run python scripts/fix_ply_offset.py [--apply]
"""
import argparse
import collections
import json
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from chesslab import occluded_model
from chesslab.dataset_build import dataset_dir
from chesslab.ioutil import read_jsonl
from chesslab.labeling import load_corrections
from chesslab.training.occlusion import PIECE_VISIBLE_MAX as VMAX
from chesslab.training.pack import open_packed_rows

ROOT = Path("data/recordings")


def board_of(fen: str) -> dict[str, str]:
    out, ranks = {}, fen.split()[0].split("/")
    for ri, row in enumerate(ranks):
        f = 0
        for ch in row:
            if ch.isdigit():
                for _ in range(int(ch)):
                    out[f"{'abcdefgh'[f]}{8 - ri}"] = "empty"
                    f += 1
            else:
                out[f"{'abcdefgh'[f]}{8 - ri}"] = ("w" if ch.isupper() else "b") + ch.upper()
                f += 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="real13-straight-80-v3")
    ap.add_argument("--run", default="data/models/_ab/c8d1-seed42")
    ap.add_argument("--hits", default="data/reports/ply_offset.jsonl")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    hits = read_jsonl(Path(args.hits))
    strong = {(h["session_id"], h["frame"]): h for h in hits
              if h["match_better"] - h["match_own"] >= 2 and h["better_at"] == h["ply"] + 1}

    dd = dataset_dir(args.dataset)
    manifest = read_jsonl(dd / "manifest.jsonl")
    fen_of = {(r["session_id"], int(r["ply"])): r["fen"] for r in manifest}
    rows_of = collections.defaultdict(list)
    for r in manifest:
        rows_of[(r["session_id"], r["frame"])].append(r)

    mm, index = open_packed_rows(args.dataset, manifest)

    human = {}
    for sess in {s for s, _ in strong}:
        load_corrections(ROOT / sess.replace("rg-", "") / "corrections.jsonl", human)

    todo, skipped = collections.defaultdict(list), collections.Counter()
    for (sess, frame), hit in sorted(strong.items()):
        before, after = fen_of.get((sess, hit["ply"])), fen_of.get((sess, hit["ply"] + 1))
        if not before or not after:
            skipped["keine FEN fuer ply+1"] += 1
            continue
        ba, bb = board_of(before), board_of(after)
        moved = [s for s in ba if ba[s] != bb.get(s)]
        cells = [r for r in rows_of[(sess, frame)] if r["square"] in moved and r["path"] in index]
        if not cells:
            skipped["Zellen nicht gepackt"] += 1
            continue
        reads = occluded_model.all_reads(
            Path(args.run), [np.array(mm[index[r["path"]]])[:, :, ::-1] for r in cells])
        for r, rd in zip(cells, reads, strict=True):
            sq = r["square"]
            if (sess, frame, sq) in human:
                skipped["Mensch hat entschieden"] += 1
                continue
            if float(r.get("coverage") or 0.0) > VMAX:
                skipped["Zelle verdeckt"] += 1
                continue
            if rd["pred_label"] != bb[sq]:
                skipped["Modell stimmt neuer FEN nicht zu"] += 1
                continue
            todo[sess].append({"session_id": sess, "frame": frame, "square": sq,
                               "label": bb[sq], "ts": datetime.now(UTC).isoformat(),
                               "why": f"ply-offset {hit['ply']}->{hit['ply']+1} (commit latency)"})

    total = sum(len(v) for v in todo.values())
    print(f"{len(strong)} versetzte Frames -> {total} Zellkorrekturen in {len(todo)} Sessions")
    for s, v in sorted(todo.items(), key=lambda kv: -len(kv[1])):
        print(f"  {s:<32} {len(v)}")
    if skipped:
        print("\nuebersprungen:")
        for k, v in skipped.most_common():
            print(f"  {k:<34} {v}")
    if not args.apply:
        print("\n(Probelauf — mit --apply schreiben)")
        return
    for sess, v in todo.items():
        p = ROOT / sess.replace("rg-", "") / "corrections.jsonl"
        with p.open("a", encoding="utf-8") as fh:
            for row in v:
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")
        print(f"[OK] {len(v)} Zeilen angehaengt -> {p}")


if __name__ == "__main__":
    main()
