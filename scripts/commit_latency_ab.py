"""A/B of commit latency from two `trace=` replay batches over the same recordings."""

import argparse
import json
import re
import statistics
from pathlib import Path

SCORE_KEYS = ("found", "missed", "invented", "beyond", "reordered")


def commits(trace):
    rows = [json.loads(line) for line in trace.open(encoding="utf-8")]
    time_at = {row["index"]: row["timeMs"] for row in rows if row["kind"] == "frame"}
    # A decision fires inside the frame's step, before that frame's row is written.
    return {(row["ply"], row["uci"]): time_at[row["index"]]
            for row in rows if row["kind"] == "decision" and row["accepted"]}


def score(log):
    text = log.read_text(encoding="utf-8", errors="replace")
    return {key: int(m.group(1)) if (m := re.search(rf"{key} (\d+)", text)) else None
            for key in SCORE_KEYS}


def compare(base, cand):
    out = []
    for trace in sorted(base.glob("*.jsonl")):
        name = trace.stem
        other = cand / trace.name
        if not other.exists():
            continue
        a, b = commits(trace), commits(other)
        saved = [a[k] - b[k] for k in a if k in b]
        out.append({"recording": name, "base": score(base / f"{name}.log"),
                    "cand": score(cand / f"{name}.log"), "paired": len(saved),
                    "medianSavedMs": statistics.median(saved) if saved else None,
                    "maxSavedMs": max(saved) if saved else None,
                    "minSavedMs": min(saved) if saved else None})
    return out


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("cand", type=Path)
    args = parser.parse_args()
    rows = compare(args.base, args.cand)
    fmt = lambda s: "/".join("-" if s[k] is None else str(s[k]) for k in SCORE_KEYS)  # noqa: E731
    print(f"{'recording':22} {'base f/m/i/b/r':16} {'cand f/m/i/b/r':16} pairs median  max  min")
    for r in rows:
        med = "-" if r["medianSavedMs"] is None else f"{r['medianSavedMs']:6.0f}"
        mx = "-" if r["maxSavedMs"] is None else f"{r['maxSavedMs']:5.0f}"
        mn = "-" if r["minSavedMs"] is None else f"{r['minSavedMs']:5.0f}"
        print(f"{r['recording']:22} {fmt(r['base']):16} {fmt(r['cand']):16} {r['paired']:5} {med} {mx} {mn}")
    print(json.dumps(rows, indent=1), file=open(args.cand / "ab.json", "w", encoding="utf-8"))
