"""Deterministic parameter sweep of tracker knobs over a real recording.

    uv run python scripts/sweep_clip_params.py CLIP.mp4 corners.json configs.json [MARGIN]

`corners.json` is the four board corners in the clip's frame (detect once with
`calibration.detect_board_corners_aruco`); `configs.json` maps a label to a dict of
`MoveTracker` kwargs. `MARGIN` is the fraction by which those corners lie OUTSIDE the
playing field — pass the profile's value (0.06 by default) for ArUco-derived corners, 0
only when the corners already ARE the field corners. Prints the committed move list, the commit times and the evidence
each commit was made on, per config.

Realtime replay drops frames according to machine load, so two runs of the SAME config
give different games — which makes any single-run A/B worthless. This drives the tracker
frame by frame with the fixture generator's virtual clock instead: every frame is seen,
and the wall-clock parameters (motion hold, taint expiry, motion recency) advance by
VIDEO time. Same input, same output, every time.
"""
from __future__ import annotations

import importlib.util
import json
import sys

import cv2

sys.path.insert(0, "src")

_spec = importlib.util.spec_from_file_location("epf", "scripts/emit_parity_fixtures.py")
epf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(epf)


def instrument_latency(mt, clock) -> list[dict]:
    """Record `last motion -> commit` per committed ply. Read-only instrumentation.

    The number a player feels is the wall time between the hand leaving the board and the move
    appearing. `_last_motion_ts` is the timestamp of the last frame whose motion score exceeded
    `motion_thr` (`tracker.py:1673`) — the moment the hand stopped being visible — and the
    virtual clock at the commit call is the other end. Both commit entry points are wrapped:
    `_commit_move` (single) and `_commit_sequence` (fast-play pair / CNN recovery), which is why
    a pair reports one measurement per ply.

    Wrapping the BOUND methods leaves production behaviour untouched; nothing here is read back
    by the tracker.
    """
    out: list[dict] = []

    def _record(kind: str, n: int) -> None:
        now = clock.time()
        last_motion = mt._last_motion_ts
        for _ in range(n):
            out.append({
                "kind": kind,
                "t": round(now - epf.VCLOCK_START, 3),
                # The measurement, and the part of it `motion_hold_s` alone accounts for.
                "since_motion_s": round(now - last_motion, 3) if last_motion else None,
                "hold_s": round(mt._hold_until - last_motion, 3) if last_motion else None,
            })

    orig_move, orig_seq = mt._commit_move, mt._commit_sequence

    def commit_move(move, cur, cur_bgr=None, **kw):
        _record("single", 1)
        return orig_move(move, cur, cur_bgr, **kw)

    def commit_sequence(moves, cur, cur_bgr=None, **kw):
        _record("sequence", len(moves))
        return orig_seq(moves, cur, cur_bgr, **kw)

    mt._commit_move, mt._commit_sequence = commit_move, commit_sequence
    return out


def run(clip: str, corners, board_size: int, fps: float, tracker_kwargs: dict,
        margin: float = 0.0) -> dict:
    from chesslab.move_tracker import tracker as trk

    entry = {
        "file": clip,
        "frame_size": None,  # filled below
        "board_size": board_size,
        "corners": corners,
        "margin": margin,
        "tracker": tracker_kwargs,
    }
    cap = cv2.VideoCapture(clip)
    entry["frame_size"] = (
        int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
    )

    clock = epf._VirtualClock()
    real_time = trk.time
    trk.time = clock
    occluded_at_commit: list[int] = []
    try:
        with epf.ClipDriver(entry, trk, clock) as driver:
            driver.reset_scratch("q")
            mt = driver.mt
            latency = instrument_latency(mt, clock)
            seen = 0
            history: list[tuple[float, str]] = []
            occl_seen: set[str] = set()
            timeline: list = []
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                clock.advance(1.0 / fps)
                driver._video_index = seen
                # BEFORE the step: the commit path resets state, so reading after it measures
                # the aftermath rather than the evidence the decision was made on.
                before = len(mt._occluded_vetoed or [])
                before_state = mt.state
                driver.step(frame)
                seen += 1
                timeline.append((round(seen / fps, 2), mt.state, len(mt._occluded_vetoed or [])))
                occl_seen.update(mt._occluded_vetoed or [])
                if len(mt.board.move_stack) > len(history):
                    for _ in range(len(mt.board.move_stack) - len(history)):
                        history.append((seen / fps, ""))
                        d = mt._debug_snapshot() if hasattr(mt, '_debug_snapshot') else mt.status()["debug"]
                        vals = {k: round(v, 1) for k, v in (d.get("changed_vals") or [])}
                        occluded_at_commit.append({
                            "occl": before, "state": before_state,
                            "cand": d.get("candidate"), "best": d.get("best_score"),
                            "2nd": d.get("second_score"), "z": vals})
            sans = list(mt.status()["history"])
    finally:
        trk.time = real_time
        cap.release()
    return {
        "moves": sans,
        "times": [round(t, 1) for t, _ in history],
        "occluded_ever": len(occl_seen),
        "occluded_at_commit": occluded_at_commit,
        "fen": mt.board.fen(),
        "timeline": timeline,
        "latency": latency,
    }


if __name__ == "__main__":
    clip = sys.argv[1]
    corners = json.load(open(sys.argv[2]))
    fps = cv2.VideoCapture(clip).get(cv2.CAP_PROP_FPS) or 30.0
    configs = json.load(open(sys.argv[3]))
    # 4th arg: the fraction by which `corners` lie OUTSIDE the playing field. Pass it whenever
    # the corners came from `detect_board_corners_aruco` — the markers are printed in the label
    # border, and replaying at 0.0 oversizes the board enough to jam the grid-line gate.
    margin = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
    for name, kw in configs.items():
        out = run(clip, corners, board_size=640, fps=fps, tracker_kwargs=kw, margin=margin)
        print(f"\n### {name}   {kw}")
        print("   moves :", " ".join(out["moves"]))
        print("   times :", out["times"])
        lat = [e["since_motion_s"] for e in out["latency"] if e["since_motion_s"] is not None]
        if lat:
            srt = sorted(lat)
            print("   last motion -> commit (s):", [round(x, 2) for x in lat])
            print(f"      n={len(lat)} min={srt[0]:.2f} median={srt[len(srt) // 2]:.2f} "
                  f"max={srt[-1]:.2f} mean={sum(srt) / len(srt):.2f}")
        print("   occluded squares ever:", out["occluded_ever"],
              "  at each commit:", out["occluded_at_commit"])
        tl = out["timeline"]
        nonzero = [t for t in tl if t[2] > 0]
        print(f"   frames with a live occlusion veto: {len(nonzero)} of {len(tl)}")
        by_state = {}
        for _, st, n in tl:
            d = by_state.setdefault(st, [0, 0])
            d[0] += 1
            if n > 0:
                d[1] += 1
        for st, (tot, hit) in sorted(by_state.items()):
            print(f"      state {st:8s}: {tot:5d} frames, {hit:5d} with a live veto")
        print("   first 12 frames with a veto:", nonzero[:12])
