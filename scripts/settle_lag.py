"""Why the engine stays in `moving` after the piece landed: board motion or the ROI around it?

Reads a replay's `motiondump=<file>` (ROI score per processed frame) and the `<file>.status.csv`
beside it (engine state, combined motion, stuck reason per frame), and for every retimed ply
walks from the frame its position first stood on to the first `waiting`, counting which signal
kept the score over `motionThr`.

    uv run python scripts/settle_lag.py 2026-08-30-16-20-19 tmp/batch/motion/2026-08-30-16-20-19.csv
"""

from __future__ import annotations

import csv
import json
import statistics as st
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main(name: str, dump: str, thr: float = 0.25) -> int:
    cand = json.loads((ROOT / "data" / "recordings" / name / "candidate.json").read_text(encoding="utf-8"))
    plies = [m for m in cand["moves"] if m.get("held", 0) > 0]
    roi = {int(r["frame"]): float(r["motion"]) for r in csv.DictReader(open(dump, encoding="utf-8"))}
    rows = list(csv.DictReader(open(f"{dump}.status.csv", encoding="utf-8")))
    by_index = {int(r["index"]): r for r in rows}
    print(f"{name}: {len(rows)} frames, thr {thr}")
    print("ply   san      truth  quiet  lag_s  frames>thr  board>thr  roi-only>thr  stuck")
    lags, board_only, roi_only = [], 0, 0
    fps = float(cand["clock"]["fps"])
    for m in plies:
        truth = m["frame"]
        quiet = next((i for i in range(truth, truth + 600) if i in by_index and by_index[i]["state"] == "waiting"), None)
        if quiet is None:
            continue
        over = board = roi_alone = 0
        stucks = set()
        for i in range(truth, quiet):
            r = by_index.get(i)
            if r is None:
                continue
            try:
                combined = float(r["motion"])
            except ValueError:
                continue
            roi_i = roi.get(int(r["frame"]), 0.0)
            if combined > thr:
                over += 1
                if combined - roi_i > 1e-9 and combined > roi_i:
                    board += 1
                elif roi_i > thr:
                    roi_alone += 1
            if r["stuck"]:
                stucks.add(r["stuck"])
        lag = (quiet - truth) / fps
        lags.append(lag)
        board_only += board
        roi_only += roi_alone
        print(f"{m['ply']:>3}   {m['san']:<7} {truth:>6} {quiet:>6} {lag:6.2f}  {over:>10}  {board:>9}  {roi_alone:>12}  {','.join(sorted(stucks))}")
    if lags:
        s = sorted(lags)
        print(f"\nlag to quiet: median {st.median(s):.2f} s · p90 {s[int(len(s) * 0.9)]:.2f} s · frames over thr: board-led {board_only}, roi-only {roi_only}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
