"""Replay every labelled test clip WITH a CNN attached, and score the move lists.

`tests/test_clips.py` drives the same clips with `cnn_run=None`, so the whole pre-commit ladder —
`_verify_tick`, `_verify_pair_tick`, `_cnn_tick` and CNN recovery — has never been exercised against
the labelled material. That is the gap this fills: the classic frame-diff-plus-legality tracker is
what commits moves, and the CNN is what vetoes and rescues, and only together are they the thing
that runs on the phone.

Scoring is the manifest's own: a clip passes when the committed SAN sequence equals
`erwartete_zugliste` exactly. Clips carrying `known_failure` are scored against ground truth anyway
and reported separately — pinning them is right for a regression gate and wrong for a benchmark,
where the question is how close we are, not whether we moved.

    uv run python scripts/bench_clips_cnn.py --run occ-v8bn-warm
    uv run python scripts/bench_clips_cnn.py --run none          # baseline, no model

`--obs-s` paces the CNN like the device does. The default 0.30 s is the SM8650 measurement for the
GroupNorm graph under active tracking; a BatchNorm model at 7.9 ms against 30 ms should be paced
faster, which is the point of being able to set it.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_ROOT / "src"))
sys.path.insert(0, str(_ROOT / "scripts"))

CLIPS = _ROOT / "tests" / "data" / "testclips"
LOCAL = _ROOT / "data" / "testclips"
MANIFEST = CLIPS / "manifest.yaml"


def clip_path(entry: dict) -> Path | None:
    """The clip file, or None when this machine does not have it.

    Two directories, like `tests/test_clips.py`: the committed 640x640 Blender renders sit next to
    the manifest, while the real 30 fps phone recordings are too large to commit and live in the
    gitignored `data/testclips/` with only their manifest entry checked in.
    """
    for base in (CLIPS, LOCAL):
        p = base / entry["file"]
        if p.exists():
            return p
    return None


def entries() -> list[dict]:
    """The manifest's clip list. There is ONE manifest, not a sidecar per clip — reading it any
    other way silently finds nothing and reports a clean sweep of zero clips."""
    import yaml

    if not MANIFEST.exists():
        return []
    data = yaml.safe_load(MANIFEST.read_text(encoding="utf-8")) or {}
    return [e for e in data.get("clips", []) if clip_path(e) is not None]


def replay_entry(e: dict, cnn: str | None, obs_s: float | None) -> dict:
    """One clip, through the harness its manifest asks for.

    `deterministic: true` exists because the realtime replay drops frames according to machine
    load, so two runs of the same clip give different games — measured here on
    `live-1244-fastplay`, which produced ten committed moves on one pass and seven on the next.
    A benchmark that reports either number as a result is reporting machine load. Those entries go
    through the virtual-clock harness instead, and `replay_clip_cnn` is the only one of the two that
    can drive a model, which is exactly the combination this script needs.
    """
    from replay_clip import replay
    from replay_clip_cnn import DEFAULT_OBS_S
    from replay_clip_cnn import run as replay_det

    promotion = next((u[4] for u in (e.get("moves_uci") or []) if len(u) == 5), "q")
    if e.get("deterministic"):
        if cnn is None:
            # Without a model the suite's own deterministic path is the parameter sweeper; going
            # through replay_clip_cnn with cnn_run=None would drive a different code path than the
            # baseline it is being compared against.
            import cv2
            from sweep_clip_params import run as sweep_run
            fps = cv2.VideoCapture(str(clip_path(e))).get(cv2.CAP_PROP_FPS) or 30.0
            out = sweep_run(str(clip_path(e)), e["corners"], board_size=e.get("board_size") or 640,
                            fps=fps, tracker_kwargs=e.get("tracker") or {},
                            margin=float(e.get("margin") or 0.0),
                            start_fen=e.get("start_fen"), promotion=promotion)
            return {"history": out["moves"], "note": out["note"]}
        out = replay_det(clip=str(clip_path(e)), corners=e["corners"],
                         margin=float(e.get("margin") or 0.0),
                         obs_s=obs_s or DEFAULT_OBS_S, cnn_run=cnn,
                         tracker_kwargs=e.get("tracker") or None)
        return {"history": out["history"], "note": out["note"]}
    return replay(str(clip_path(e)), cnn_run=cnn, realtime=True,
                  start_fen=e.get("start_fen"), tracker_kwargs=e.get("tracker") or {},
                  corners=e.get("corners"), frame_size=e.get("frame_size"),
                  board_size=e.get("board_size"), promotion=promotion,
                  margin=float(e.get("margin") or 0.0))


def main() -> int:

    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--run", required=True, help="model run directory name, or 'none'")
    ap.add_argument("--only", default=None, help="substring filter on the clip file name")
    ap.add_argument("--obs-s", type=float, default=None)
    args = ap.parse_args()
    cnn = None if args.run.lower() == "none" else args.run

    rows = []
    for e in entries():
        if args.only and args.only not in e["file"]:
            continue
        expected = e.get("erwartete_zugliste")
        if expected is None or e.get("marker") is False:
            continue
        t0 = time.time()
        try:
            res = replay_entry(e, cnn, args.obs_s)
        except Exception as exc:  # noqa: BLE001 — a crashed clip is a result, not a stop
            rows.append((e["file"], list(expected), ["CRASH: " + str(exc)[:60]],
                         bool(e.get("known_failure")), time.time() - t0))
            continue
        rows.append((e["file"], list(expected), list(res["history"]),
                     bool(e.get("known_failure")), time.time() - t0))

    ok = [r for r in rows if r[2] == r[1]]
    known = [r for r in rows if r[3]]
    print(f"\nmodel: {cnn or 'none'}   clips: {len(rows)}   exact: {len(ok)}"
          f"   ({len(known)} of them carry `known_failure`)\n")
    print(f"{'clip':<34}{'exp':>5}{'got':>5}  verdict")
    print("-" * 78)
    for name, exp, got, kf in ((r[0], r[1], r[2], r[3]) for r in rows):
        mark = "OK " if got == exp else ("kf " if kf else "XX ")
        print(f"{name:<34}{len(exp):>5}{len(got):>5}  {mark}", end="")
        if got != exp:
            print(f" got {got}", end="")
            print(f"  want {exp}", end="")
        print()
    print("-" * 78)
    fresh_fail = [r for r in rows if r[2] != r[1] and not r[3]]
    print(f"exact {len(ok)}/{len(rows)}   unexpected failures {len(fresh_fail)}"
          f"   wall {sum(r[4] for r in rows):.0f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
