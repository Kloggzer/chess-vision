"""Commit lag per regression tag: run frame − the frame the position really first stood on.

The reference is `realgames retime --dry-run --json tmp/retime/<recording>.json` (the board itself,
not the label's own lagging commit), so tags from before and after an engine change compare on
what a player feels: how long after the piece landed the engine committed.

    uv run python scripts/commit_lag.py base-20260905 bothends-20260905 lag-interval1-20260906
"""

from __future__ import annotations

import json
import math
import re
import statistics as st
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOUND = re.compile(r"^\s+(\S+)\s+label frame\s+(\d+)\s+run frame\s+(\d+)")


def reference(recording: str) -> tuple[dict[int, int], float] | None:
    path = ROOT / "tmp" / "retime" / f"{recording}.json"
    if not path.is_file():
        return None
    res = json.loads(path.read_text(encoding="utf-8"))
    cand = json.loads((ROOT / "data" / "recordings" / recording / "candidate.json").read_text(encoding="utf-8"))
    # Kein Rueckfall auf 30: elf der 32 Aufnahmen laufen mit ~15 fps, eine erfundene Zeitbasis
    # verdoppelt dort jeden Verzug. Dieselbe Falle wie in `phone_vs_pc` (2026-09-21).
    fps = cand.get("clock", {}).get("fps")
    if not fps:
        raise SystemExit(f"{recording}: candidate.json traegt keine `clock.fps` — ohne Zeitbasis "
                         f"ist kein Verzug in Sekunden zu rechnen")
    by_phone = {p["frame_phone"]: p["frame"] for p in res["plies"] if p["held"] > 0}
    return by_phone, float(fps)


def lags(tag: str) -> dict[str, list[float]]:
    out: dict[str, list[float]] = {}
    for log in sorted((ROOT / "tmp" / "batch" / tag).glob("*.log")):
        ref = reference(log.stem)
        if ref is None:
            continue
        truth, fps = ref
        seconds = []
        for line in log.read_text(encoding="utf-8", errors="replace").splitlines():
            m = FOUND.match(line)
            if not m:
                continue
            label, run = int(m.group(2)), int(m.group(3))
            if label in truth:
                seconds.append((run - truth[label]) / fps)
        if seconds:
            out[log.stem] = seconds
    return out


def main(tags: list[str]) -> int:
    """Nur Tags ueber DENSELBEN Aufnahmen stehen nebeneinander.

    Eine Aufnahme ohne `tmp/retime`-Referenz faellt still aus `lags`. Live gemessen: `fix-verify3`
    traegt zwei davon und meldete 0,55 s Median in derselben Spalte wie `base-20260905` mit zehn
    (0,47 s) — zwei Grundgesamtheiten, und nichts machte es kenntlich.
    """
    je_tag = {tag: lags(tag) for tag in tags}
    bezug = frozenset(je_tag[tags[0]])
    print(f"{'tag':32s} {'recs':>4s} {'plies':>5s} {'median s':>9s} {'p90 s':>7s} {'max s':>7s}")
    abweichend = 0
    for tag in tags:
        per = je_tag[tag]
        allv = sorted(v for vs in per.values() for v in vs)
        if not allv:
            print(f"{tag:32s} no reference or no score lines")
            continue
        if frozenset(per) != bezug:
            abweichend += 1
            nur = ", ".join(sorted(frozenset(per) ^ bezug))
            print(f"{tag:32s} {len(per):4d} {len(allv):5d}   anderer Aufnahmesatz als "
                  f"{tags[0]}: {nur}")
            continue
        print(f"{tag:32s} {len(per):4d} {len(allv):5d} {st.median(allv):9.2f} {allv[max(0, math.ceil(0.9 * len(allv)) - 1)]:7.2f} {allv[-1]:7.2f}")
    return 1 if abweichend else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:] or ["base-20260905"]))
