"""Same video, same frames: does the phone stay in `moving` where the PC's motion score is already quiet?

Per retimed ply: the PC's last `moving -> waiting` before its commit (replay log, decoded index) against
the phone's last one before its own commit (timeline `state` rows, placed like `phone_vs_pc` does: the ply's
`frame_phone` minus the timeline seconds between the settle and the decision). Over the frames the phone
kept waiting and the PC did not, the PC's combined motion (the `.status.csv` beside `motiondump=`) says
whether the pixels still moved.

    uv run python scripts/settle_compare.py 2026-09-06-20-27-33 tmp/batch/budget/20-27-33.csv tmp/batch/budget/20-27-33.log
"""

from __future__ import annotations

import bisect
import csv
import json
import statistics as st
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from phone_vs_pc import ROOT, fps_of, pc_side, pts_table  # noqa: E402

MOTION_THR = 0.25


def main(name: str, dump: str, log: str) -> int:
    rec = ROOT / "data" / "recordings" / name
    session = next(rec.glob("files/sessions/*"))
    cand = json.loads((rec / "candidate.json").read_text(encoding="utf-8"))
    moves = [m for m in cand["moves"] if m.get("held", 0) > 0 and "frame_phone" in m]
    fps = fps_of(session, int(cand["frames"]))
    pc_commit, pc_settles = pc_side(Path(log), pts_table(name, session), float(cand["clock"]["fps"]))
    settles, decisions = [], {}
    for line in (session / "timeline.jsonl").read_text(encoding="utf-8").splitlines():
        row = json.loads(line)
        if row.get("kind") == "state" and row.get("to") == "waiting":
            settles.append(row["elapsedNs"])
        elif row.get("kind") == "decision" and row.get("accepted"):
            decisions[row["ply"]] = row["elapsedNs"]
    settles.sort()
    rows = list(csv.DictReader(open(f"{dump}.status.csv", encoding="utf-8")))
    motion = {int(r["index"]): float(r["motion"]) for r in rows if r["motion"] not in ("", "None", "null")}
    print(f"{name}: {fps:.1f} fps")
    print("ply  san      truth  pcQuiet  phQuiet  gap_s  pcMotion>thr  pcMotionMax")
    gaps, over_share = [], []
    for m in moves:
        t, ply = m["frame"], m["ply"]
        if t not in pc_commit or ply not in decisions:
            continue
        i = bisect.bisect_right(pc_settles, pc_commit[t]) - 1
        j = bisect.bisect_right(settles, decisions[ply]) - 1
        if i < 0 or j < 0:
            continue
        ph_settle = m["frame_phone"] - int(round((decisions[ply] - settles[j]) / 1e9 * fps))
        pc_q, ph_q = max(pc_settles[i], t), max(ph_settle, t)
        gap = (ph_q - pc_q) / fps
        span = [motion[f] for f in range(min(pc_q, ph_q), max(pc_q, ph_q)) if f in motion]
        over = sum(1 for v in span if v > MOTION_THR)
        gaps.append(gap)
        if span:
            over_share.append(over / len(span))
        print(f"{ply:>3}  {m['san']:<7} {t:>6}  {pc_q:>7}  {ph_q:>7}  {gap:5.2f}  {over:>5}/{len(span):<6}  {max(span) if span else 0:.3f}")
    if gaps:
        s = sorted(gaps)
        print(f"\nphone quiet − PC quiet: median {st.median(s):.2f} s · p90 {s[int(len(s) * 0.9)]:.2f} s · n={len(s)}")
        print(f"share of gap frames the PC saw over {MOTION_THR}: median {st.median(over_share):.2f}")
    return 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:4]))
