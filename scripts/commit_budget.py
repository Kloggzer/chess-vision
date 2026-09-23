"""Where a ply's commit latency goes on the PC replay: truth -> quiet -> dispatch -> commit, from
the retimed `candidate.json`, the replay's `<motiondump>.status.csv` and its log.

    uv run python scripts/commit_budget.py 2026-09-06-20-27-33 tmp/batch/budget/20-27-33.csv tmp/batch/budget/20-27-33.log
"""

from __future__ import annotations

import csv
import json
import math
import re
import statistics as st
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NOTE = re.compile(r"seq=(\d+) note: checking .* via CNN")
FOUND = re.compile(r"^\s+(\S+)\s+label frame\s+(\d+)\s+run frame\s+(\d+)")


def main(name: str, dump: str, log: str) -> int:
    cand = json.loads((ROOT / "data" / "recordings" / name / "candidate.json").read_text(encoding="utf-8"))
    fps = float(cand["clock"]["fps"])
    plies = [m for m in cand["moves"] if m.get("held", 0) > 0]
    rows = list(csv.DictReader(open(f"{dump}.status.csv", encoding="utf-8")))
    waiting = sorted(int(r["index"]) for r in rows if r["state"] == "waiting")
    dispatches, commits = [], {}
    for line in open(log, encoding="utf-8", errors="replace"):
        if m := NOTE.search(line):
            dispatches.append(int(m.group(1)))
        elif m := FOUND.match(line):
            commits[int(m.group(2))] = int(m.group(3))
    dispatches.sort()

    def first_at_or_after(seq: list[int], frame: int) -> int | None:
        return next((s for s in seq if s >= frame), None)

    print(f"{name}: {fps:.1f} fps, {len(plies)} plies, {len(dispatches)} dispatches")
    print("ply  san      truth   quiet  dispatch  commit   settle  dispatch  verify   total")
    parts: dict[str, list[float]] = {"settle": [], "dispatch": [], "verify": [], "total": []}
    for m in plies:
        t = m["frame"]
        c = commits.get(t)
        q = first_at_or_after(waiting, t)
        d = first_at_or_after(dispatches, t)
        if c is None or q is None or d is None or q > c:
            continue
        d = min(max(d, q), c)
        s, dd, v, tot = (q - t) / fps, (d - q) / fps, (c - d) / fps, (c - t) / fps
        for k, val in zip(parts, (s, dd, v, tot), strict=True):
            parts[k].append(val)
        print(f"{m['ply']:>3}  {m['san']:<7} {t:>6}  {q:>6}  {d:>8}  {c:>6}   {s:6.2f}  {dd:8.2f}  {v:6.2f}  {tot:6.2f}")
    if parts["total"]:
        print("\nmedian s:  " + "  ".join(f"{k} {st.median(v):.2f}" for k, v in parts.items()))
        # `int(0.9 * n)` ist bei n = 10 das MAXIMUM, nicht das p90.
        print("p90 s:     " + "  ".join(
            f"{k} {sorted(v)[max(0, math.ceil(0.9 * len(v)) - 1)]:.2f}" for k, v in parts.items()))
    return 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:4]))
