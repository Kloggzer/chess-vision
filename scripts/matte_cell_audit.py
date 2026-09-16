"""Feldweise statt frameweise: wo die Matte ein Feld frei nennt, das die Rillen verdeckt melden.

`matte_audit.py` fand nur Frames, in denen SAM GAR NICHTS sah. Der haeufigere Fall ist der
halbe Treffer — die Hand ist erkannt, ein verdecktes Feld fehlt trotzdem in der Coverage, und
diese Zelle zaehlt danach als sichtbar. Der Rillen-Sensor ist dabei kein Filter, sondern
Vorschlagsgeber: er verwechselt eine fehlende Rille mit einer Verdeckung, taugt also nur als
Kandidatenquelle fuer die Matte, nicht als Urteil.

    uv run python scripts/matte_cell_audit.py [--out data/reports/matte-cell-audit.jsonl]
"""

from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from pathlib import Path

import cv2

from chesslab.grid_occlusion import hand_squares, missing_edges
from chesslab.labeling import (
    MATTE_DIRTY,
    _profile_for_session,
    read_matte,
    read_session_meta,
    usable_board,
)
from chesslab.sessions import read_log

#: Ab hier gilt eine Zelle der Matte als verdeckt (`PIECE_VISIBLE_MAX` ist die Verlustmaske).
COVERED = MATTE_DIRTY


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--recordings", default="data/recordings")
    ap.add_argument("--limit", type=int, default=0, help="Matten je Session (0 = alle).")
    ap.add_argument("--out", default="data/reports/matte-cell-audit.jsonl")
    args = ap.parse_args()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    stats = Counter()
    per_session: Counter = Counter()
    # TODO: `open("w")` KUERZT den veroeffentlichten Bericht beim Start; ein abgebrochener Lauf
    # liess ihn halb da, und `sensor_montage.py` liest ihn zeilenweise mit `json.loads`.
    tmp = out.with_name(out.name + ".tmp")
    with tmp.open("w", encoding="utf-8") as sink:
        for rec in sorted(Path(args.recordings).iterdir()):
            mj = rec / "matte.jsonl"
            if mj.is_dir() or not mj.exists():
                continue
            profile = _profile_for_session(read_session_meta(rec), None)
            log = {Path(r["frame"]).stem: r for r in read_log(rec)}
            metadata = {r["frame"]: r for r in
                        (json.loads(x) for x in mj.read_text(encoding="utf-8").splitlines()
                         if x.strip())}
            rows = [{**metadata[stem], "frame": stem, "coverage": coverage}
                    for stem, coverage in read_matte(rec).items()]
            if args.limit:
                rows = rows[:args.limit]
            for r in rows:
                entry = log.get(r["frame"])
                if (entry is None or not usable_board(entry, profile)
                        or not entry.get("board_straightened")):
                    stats["unsupported geometry"] += 1
                    continue
                board = cv2.imread(str(rec / entry["board"]))
                if board is None:
                    stats["unreadable board"] += 1
                    continue
                gray = cv2.cvtColor(board, cv2.COLOR_BGR2GRAY)
                flagged = hand_squares(missing_edges(
                    gray, board_size=entry["board_size"], pad=entry["board_border"],
                    white_pov=profile.white_pov,
                ))
                if not flagged:
                    stats["ohne Rillen-Flag"] += 1
                    continue
                cov = r.get("coverage") or {}
                missed = sorted(s for s in flagged if s in cov and cov[s] <= COVERED)
                stats["flags with unknown coverage"] += len(flagged - cov.keys())
                stats["mit Rillen-Flag"] += 1
                stats["Flags gesamt"] += len(flagged)
                stats["Flags ohne Coverage"] += len(missed)
                if missed:
                    per_session[rec.name] += len(missed)
                    sink.write(json.dumps({"session": rec.name, "frame": r["frame"],
                                           "ply": entry.get("ply"), "missed": missed,
                                           "flagged": sorted(flagged),
                                           "concepts": r.get("concepts")}) + "\n")
    os.replace(tmp, out)
    for k, v in stats.most_common():
        print(f"  {k:22s} {v:7d}")
    # TODO: `max(1, …)` machte aus "nichts gemessen" ein gemessenes 0,0 % — dieselbe Zeile
    # erschien, ob nie ein Feld geflaggt wurde oder jedes Flag seine Coverage hatte.
    if not stats["Flags gesamt"]:
        print("\n  kein Feld vom Rillen-Sensor geflaggt — nichts gemessen")
    else:
        share = 100 * stats["Flags ohne Coverage"] / stats["Flags gesamt"]
        print(f"\n  {share:.1f} % der geflaggten Felder haben in der Matte keine Coverage")
    print("  am staerksten: " + "  ".join(f"{k} {v}" for k, v in per_session.most_common(6)))
    print(f"  -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
