"""Traegt jeder Frame die FEN, die sein Brett zeigt — oder die vom Nachbar-Ply?

ZURUECKGENOMMEN, 2026-08-25: dieses Skript vergleicht gegen `fen`, die Stellung des PLY. Trainiert
wird aber auf `label`, und eine menschliche Korrektur ueberschreibt nur das Label. Auf den 304
Frames, die es hier meldet, stimmt das Modell zu **98 %** mit dem Label ueberein — gegen ~89 % im
Schnitt. Sie sind BESSER gelabelt als der Rest, nicht schlechter. Von 1 889 Abweichungen zwischen
`fen` und `label` im ganzen Datensatz ist keine einzige unerklaert; `tests/test_manifest_fen_label.py`
haelt das fest.

Was das Skript weiterhin richtig misst, ist der Versatz der FEN-SPALTE: 1 004 zu 4 nach vorn, 86 %
der Treffer in den letzten 20 % ihres Ply-Intervalls, 61 % im allerletzten Frame. Ursache ist die
Commit-Latenz — das Intervall endet beim Commit, nicht beim Zug (Median 0,29 s, p75 0,50 s,
`docs/tracker-flow.md`). Das ist eine Inkonsistenz der Metadaten, kein Fehler in den Trainingslabels.

Wer es benutzt, vergleiche also gegen `label`, nicht gegen `fen`.
"""

import argparse
import collections
from pathlib import Path

import numpy as np

from chesslab import occluded_model
from chesslab.dataset_build import dataset_dir
from chesslab.ioutil import read_jsonl, write_rows
from chesslab.training.occlusion import PIECE_VISIBLE_MAX as VMAX
from chesslab.training.pack import open_packed_rows


def board_of(fen: str) -> dict[str, str]:
    """FEN -> {Feld: Klasse}, in der Schreibweise des Manifests (`wP`, `bN`, `empty`)."""
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


def offsets(per_frame: dict, boards: dict, pred: dict) -> tuple[list[dict], int]:
    """Frames, die zu einem Nachbar-Ply besser passen — und wie viele WIRKLICH geprueft wurden.

    Ein Frame ohne 32 sichtbare Zellen oder ohne Nachbar-FEN wird uebersprungen; als geprueft
    gezaehlt schoenten diese Zeilen den Nenner der gemeldeten Quote.
    """
    hits, checked = [], 0
    for (sess, frame, ply), rs in per_frame.items():
        # Nur GEMESSEN sichtbare: `coverage is None` heisst un-mattet, nicht frei. Als 0,0
        # gelesen hob eine ungemattete Zelle den Frame ueber die 32er-Huerde, und der frisch
        # korrigierte Nenner zaehlte ihn danach als WIRKLICH geprueft.
        vis = [r for r in rs
               if r.get("coverage") is not None and float(r["coverage"]) <= VMAX]
        if len(vis) < 32:
            continue
        score = {}
        for d in (-1, 0, 1):
            b = boards.get((sess, ply + d))
            if b:
                score[d] = sum(1 for r in vis if pred[r["path"]] == b.get(r["square"]))
        if 0 not in score or len(score) < 2:
            continue
        checked += 1
        best = max(score, key=score.get)
        if best != 0 and score[best] > score[0]:
            hits.append({"session_id": sess, "frame": frame, "ply": ply, "better_at": ply + best,
                         "match_own": score[0], "match_better": score[best], "visible": len(vis)})
    return hits, checked


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dataset")
    ap.add_argument("--run", default="data/models/_ab/c8d1-seed42")
    ap.add_argument("--batch", type=int, default=512)
    ap.add_argument("--out", default="data/reports/ply_offset.jsonl")
    args = ap.parse_args()

    dd = dataset_dir(args.dataset)
    manifest = read_jsonl(dd / "manifest.jsonl")
    mm, index = open_packed_rows(args.dataset, manifest)
    n, h, w = mm.shape[:3]

    # Die FEN je (Session, Ply) — alle Zeilen eines Ply teilen sie.
    fen_of = {(r["session_id"], int(r["ply"])): r["fen"] for r in manifest}
    boards = {k: board_of(v) for k, v in fen_of.items()}

    rows = [r for r in manifest if r["path"] in index]
    print(f"[i] {len(rows)} Crops, Memmap {n} Zeilen @ {w}px, Modell {Path(args.run).name}")
    pred: dict[str, str] = {}
    for i in range(0, len(rows), args.batch):
        chunk = rows[i:i + args.batch]
        # Die Memmap liegt RGB, `predict_arrays` will BGR — wie im Mining-Reader.
        cells = [np.array(mm[index[r["path"]]])[:, :, ::-1] for r in chunk]
        for r, rd in zip(chunk, occluded_model.all_reads(Path(args.run), cells), strict=True):
            pred[r["path"]] = rd["pred_label"]
        if (i // args.batch) % 40 == 0:
            print(f"    {i + len(chunk)}/{len(rows)}")

    per_frame = collections.defaultdict(list)
    for r in rows:
        per_frame[(r["session_id"], r["frame"], int(r["ply"]))].append(r)

    hits, checked = offsets(per_frame, boards, pred)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_rows(out, hits)

    print(f"\n{checked} von {len(per_frame)} Frames geprueft, "
          f"{len(hits)} passen zu einem NACHBAR-Ply besser")
    if hits:
        d = collections.Counter(h["better_at"] - h["ply"] for h in hits)
        print(f"  Richtung: {dict(d)}   (+1 = Brett ist dem Label VORAUS)")
        s = collections.Counter(h["session_id"] for h in hits)
        for k, v in s.most_common(8):
            print(f"    {k:<32} {v}")
        gain = [h["match_better"] - h["match_own"] for h in hits]
        print(f"  Zellen Gewinn: Median {sorted(gain)[len(gain)//2]}, max {max(gain)}")
    print(f"-> {out}")


if __name__ == "__main__":
    main()
