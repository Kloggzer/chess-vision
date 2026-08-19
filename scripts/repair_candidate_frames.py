"""Re-key a candidate's move frames to the WHOLE recording (pre-roll defect, 2026-08-19).

`drive` handed its own frame counter to the label hook, and that counter starts where the replay
starts — after `skipPreRoll` and the locate walk. Python resolves `moves[].frame` against the whole
recording, so every exported label of an affected session sat up to 41 s ahead of its picture.
`hookIndex` (DesktopMain.kt) fixes new runs; this re-keys the candidates already on disk.

`t` is the survivor: it is each frame's own PTS, so the repair walks the recording's timestamps and
takes the frame each move's time lands on. Nominal fps is not enough — the segments of one
recording differ in rate.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chesslab import config  # noqa: E402
from chesslab.realgames import game_dir, load_candidate, video_path  # noqa: E402
from chesslab.recording import recording_segments  # noqa: E402


def recording_times(video: Path) -> list[float]:
    """Whole-recording ms per frame index, in `ConcatFrameSource`'s own arithmetic.

    A segment contributes its LAST timestamp to the ones after it, which is what the Kotlin source
    sums — matching it here keeps the two within a frame of each other at every boundary.
    """
    times: list[float] = []
    elapsed = 0.0
    for segment in recording_segments(video):
        cap = cv2.VideoCapture(str(segment))
        if not cap.isOpened():
            raise FileNotFoundError(f"cannot open video: {segment}")
        last = 0.0
        try:
            # `POS_MSEC` AFTER the grab is the PTS of the frame just grabbed — probed on
            # 20-41-33, where frame 0 reads 0.00 and frame 1 reads 33.33.
            while cap.grab():
                last = cap.get(cv2.CAP_PROP_POS_MSEC)
                times.append(elapsed + last)
        finally:
            cap.release()
        elapsed += last
    return times


def frame_for(times: list[float], t_s: float) -> int:
    """The frame whose timestamp is nearest [t_s] — bisect over a monotone list."""
    import bisect

    ms = t_s * 1000.0
    i = bisect.bisect_left(times, ms)
    if i == 0:
        return 0
    if i >= len(times):
        return len(times) - 1
    return i if abs(times[i] - ms) < abs(times[i - 1] - ms) else i - 1


def repair(name: str, apply: bool) -> dict:
    candidate = load_candidate(name)
    moves = candidate.get("moves") or []
    if not moves or any(m.get("t") is None for m in moves):
        return {"name": name, "skipped": "no moves, or moves without a timestamp"}
    times = recording_times(video_path(name, candidate))
    shifts = []
    for move in moves:
        want = frame_for(times, float(move["t"]))
        shifts.append(want - int(move["frame"]))
        if apply:
            move["frame"] = want
    if apply and any(shifts):
        path = game_dir(name) / "candidate.json"
        shutil.copy2(path, path.with_suffix(".json.bak.preroll"))
        path.write_text(json.dumps(candidate, indent=2), encoding="utf-8")
    return {"name": name, "frames": len(times), "moves": len(moves),
            "first": shifts[0], "last": shifts[-1], "changed": bool(any(shifts))}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("names", nargs="*", help="candidate names; default: every one on disk")
    ap.add_argument("--apply", action="store_true", help="write (keeps a .bak.preroll beside it)")
    args = ap.parse_args()
    names = args.names or sorted(
        p.parent.name for p in (config.DATA.root / "realgames").glob("*/candidate.json"))
    for name in names:
        print(json.dumps(repair(name, args.apply)))


if __name__ == "__main__":
    main()
