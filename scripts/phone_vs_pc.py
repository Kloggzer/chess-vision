"""Same video, same engine, two hosts: per ply, when the phone live and the PC replay saw the board
quiet and committed, in video frames against the board's truth.

    uv run python scripts/phone_vs_pc.py 2026-08-24-22-43-46 tmp/batch/phone-vs-pc/2026-08-24-22-43-46.log
"""

from __future__ import annotations

import bisect
import json
import math
import re
import statistics as st
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

from chesslab.ioutil import read_jsonl

ROOT = Path(__file__).resolve().parents[1]
FOUND = re.compile(r"^\s+(\S+)\s+label frame\s+(\d+)\s+run frame\s+(\d+)")
STATE = re.compile(r"^state: (\w+) -> (\w+) at ([\d,.]+)s(?: frame=(\d+))?")


def fps_of(session: Path, frames: int) -> float:
    total = 0.0
    for video in sorted(session.glob("video*.mp4")):
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)],
                             capture_output=True, text=True).stdout.strip()
        total += float(out or 0)
    # Kein Rueckfall auf 30: jede Zahl hier ist eine Sekundenangabe.
    if not total:
        raise SystemExit(f"{session}: keine messbare Video-Dauer — ohne sie gibt es keine "
                         f"Zeitbasis, nur eine erfundene")
    return frames / total


def pts_table(name: str, session: Path) -> np.ndarray:
    """Every decoded frame's PTS in ms across segments, cached under tmp/retime/<name>.pts.npy: a
    phone recording is VFR.
    """
    cache = ROOT / "tmp" / "retime" / f"{name}.pts.npy"
    if cache.is_file():
        return np.load(cache)
    pts, since = [], 0.0
    for video in sorted(session.glob("video*.mp4")):
        cap = cv2.VideoCapture(str(video))
        cap.set(cv2.CAP_PROP_ORIENTATION_AUTO, 0)
        last, prev = 0.0, 0.0
        while cap.grab():
            prev, last = last, cap.get(cv2.CAP_PROP_POS_MSEC)
            pts.append(since + last)
        # What the decoder WALKED: the next segment continues one interval after the last delivered
        # frame, not after the declared duration.
        since += last + (last - prev)
        cap.release()
    table = np.array(pts)
    cache.parent.mkdir(parents=True, exist_ok=True)
    np.save(cache, table)
    return table


def pc_side(log: Path, pts: np.ndarray, nominal: float) -> tuple[dict[int, int], list[int]]:
    """{label frame: run frame} of the found plies and every moving->waiting frame, as VIDEO frame
    indices (`run frame` = PTS x nominal fps - 1).
    """
    at = lambda seconds: int(np.searchsorted(pts, seconds * 1000.0))  # noqa: E731
    text = log.read_text(encoding="utf-8", errors="replace")
    # Newer binaries print the decoded index itself.
    indexed = " frame=" in text
    commits, settles = {}, []
    for line in text.splitlines():
        if m := FOUND.match(line):
            commits[int(m.group(2))] = int(m.group(3)) if indexed else at((int(m.group(3)) + 1) / nominal)
        elif (m := STATE.match(line)) and m.group(2) == "waiting":
            settles.append(int(m.group(4)) if m.group(4) else at(float(m.group(3).replace(",", "."))))
    return commits, sorted(settles)


def phone_side(session: Path, moves: list[dict], pts: np.ndarray) -> tuple[dict[int, int], dict[int, int]]:
    """{label frame: phone commit/settle frame}, found on the video's own clock via the PTS table —
    not `frame_phone`, which lost one frame interval per segment seam.
    """
    settles, decisions, bases = [], {}, []
    for row in read_jsonl(session / "timeline.jsonl"):
        if row.get("kind") == "state" and row.get("to") == "waiting":
            settles.append(row["elapsedNs"])
        elif row.get("kind") == "decision" and row.get("accepted"):
            decisions[row["ply"]] = row["elapsedNs"]
        elif row.get("kind") == "video_sync" and not row.get("final"):
            bases.append(row["elapsedNs"] - row["durationNs"])
    settles.sort()
    if not bases:
        # Ohne `video_sync` gibt es keine Encoder-Basis; 0,0 verschob jeden Handy-Frame um die ganze
        # Laufzeit.
        raise SystemExit(f"[FAIL] {session}: keine `video_sync`-Zeile ohne `final` — die "
                         f"Zeitbasis des Encoders ist nicht gemessen, die Handy-Spalten waeren "
                         f"erfunden")
    base = float(np.median(bases))
    frame_at = lambda ns: int(np.searchsorted(pts, (ns - base) / 1e6))  # noqa: E731
    commits, quiet = {}, {}
    for move in moves:
        t = decisions.get(move["ply"])
        if t is None:
            continue
        commits[move["frame"]] = frame_at(t)
        i = bisect.bisect_right(settles, t) - 1
        if i >= 0:
            quiet[move["frame"]] = frame_at(settles[i])
    return commits, quiet


def p90(values: list[float]) -> float:
    """`int(0,9 * n)` ist bei n = 10 das MAXIMUM, nicht das p90."""
    s = sorted(values)
    return s[max(0, math.ceil(0.9 * len(s)) - 1)]


def stats(values: list[float]) -> str:
    if not values:
        return "—"
    s = sorted(values)
    return f"median {st.median(s):5.2f} s · p90 {p90(s):5.2f} s · max {s[-1]:5.2f} s (n={len(s)})"


def main(name: str, log: str) -> int:
    rec = ROOT / "data" / "recordings" / name
    session = next(rec.glob("files/sessions/*"))
    cand = json.loads((rec / "candidate.json").read_text(encoding="utf-8"))
    moves = [m for m in cand["moves"] if m.get("held", 0) > 0]
    fps = fps_of(session, int(cand["frames"]))
    pts = pts_table(name, session)
    pc_commit, pc_settles = pc_side(Path(log), pts, float(cand["clock"]["fps"]))
    ph_commit, ph_quiet = phone_side(session, moves, pts)
    pc_lag, pc_quiet_lag, ph_lag, ph_quiet_lag = [], [], [], []
    for move in moves:
        truth = move["frame"]
        if truth in pc_commit:
            pc_lag.append((pc_commit[truth] - truth) / fps)
            i = bisect.bisect_right(pc_settles, pc_commit[truth]) - 1
            if i >= 0:
                pc_quiet_lag.append(max(pc_settles[i] - truth, 0) / fps)
        if truth in ph_commit:
            ph_lag.append((ph_commit[truth] - truth) / fps)
        if truth in ph_quiet:
            ph_quiet_lag.append(max(ph_quiet[truth] - truth, 0) / fps)
    print(f"{name} · {fps:.1f} fps · {len(moves)} plies with a frame of their own")
    print(f"  PC    Stellung -> ruhig  {stats(pc_quiet_lag)}")
    print(f"  PC    Stellung -> Commit {stats(pc_lag)}")
    print(f"  Handy Stellung -> ruhig  {stats(ph_quiet_lag)}")
    print(f"  Handy Stellung -> Commit {stats(ph_lag)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
