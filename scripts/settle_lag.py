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
import math
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
    lags, board_only, roi_only, unmeasured, never = [], 0, 0, 0, []
    fps = float(cand["clock"]["fps"])
    for m in plies:
        truth = m["frame"]
        quiet = next((i for i in range(truth, truth + 600) if i in by_index and by_index[i]["state"] == "waiting"), None)
        if quiet is None:
            never.append(m["ply"])
            continue
        over = board = roi_alone = blind = 0
        stucks = set()
        for i in range(truth, quiet):
            r = by_index.get(i)
            if r is None:
                continue
            try:
                combined = float(r["motion"])
            except ValueError:
                continue
            # Ein Frame ohne ROI-Zeile ist NICHT GEMESSEN und zaehlt als `blind`; als 0,0 gelesen
            # fiel er auf die Seite des Bretts — die Achse, die hier entschieden wird.
            roi_i = roi.get(int(r["frame"]))
            if combined > thr:
                over += 1
                if roi_i is None:
                    blind += 1
                elif combined - roi_i > 1e-9:
                    board += 1
                elif roi_i > thr:
                    roi_alone += 1
            if r["stuck"]:
                stucks.add(r["stuck"])
        lag = (quiet - truth) / fps
        lags.append(lag)
        board_only += board
        roi_only += roi_alone
        unmeasured += blind
        print(f"{m['ply']:>3}   {m['san']:<7} {truth:>6} {quiet:>6} {lag:6.2f}  {over:>10}  {board:>9}  {roi_alone:>12}  {','.join(sorted(stucks))}")
    if lags:
        s = sorted(lags)
        # p90 wie in `commit_lag.py`: `int(n * 0.9)` ist bei n = 10 der Index 9, also das Maximum.
        print(f"\nlag to quiet: median {st.median(s):.2f} s · "
              f"p90 {s[max(0, math.ceil(0.9 * len(s)) - 1)]:.2f} s · frames over thr: "
              f"board-led {board_only}, roi-only {roi_only}, ohne ROI-Messung {unmeasured}")
    if never:
        # Die laengsten Lags fallen sonst still aus dem Median — er waere eine Untergrenze.
        print(f"[!] {len(never)} von {len(plies)} Plies nie `waiting` binnen 600 Frames, "
              f"nicht im Median: Plies {', '.join(map(str, never))}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
