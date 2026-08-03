"""Deterministic replay with a REAL CNN in the loop — the verify ladder's only offline instrument.

    uv run python scripts/replay_clip_cnn.py CLIP.mp4 corners.json MARGIN [OBS_S] [RUN] [KWARGS_JSON]

Why this exists. Neither of the two harnesses that already existed can see the CNN paths:
`scripts/emit_parity_fixtures.py` and `scripts/sweep_clip_params.py` both build the tracker with
`cnn_run=None`, and so does `pytest -m clips`. So `_verify_tick`, `_verify_pair_tick` and
`_cnn_tick` — the whole pre-commit ladder, the pair verify and recovery — have never been
replayable off-device.

The trap this script exists to avoid: driving `ClipDriver` with a model attached but WITHOUT
routing observations does not test the ladder, it just leaves a candidate pending forever and
reports whatever that produces. The routing is the point, and it mirrors `_cnn_worker` exactly::

    if self._pending is not None: self._verify_tick(snap)   # a pending candidate has priority
    elif snap is not None:        self._cnn_tick(snap)      # ... and blocks recovery entirely

Observations are paced like the device: one every `OBS_S` of VIDEO time, delivered one period
after the frame it looked at, because the observer runs off the frame thread and its result
always describes a frame the engine has already decided on. `OBS_S` defaults to 0.30 s, measured
on an SM8650 under active tracking (`chesslabCnn: CNN observation 169-544 ms`, median ~290, plus
two analyzer frames of round trip). Raise it to model a slower device; the whole point is that
the ladder's windows are counted in OBSERVATIONS and their cost in seconds is set by this number.

Everything is deterministic: same clip, same arguments, same game.
"""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from typing import NamedTuple

import cv2

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(_ROOT / "src"))

_spec = importlib.util.spec_from_file_location("epf", str(_ROOT / "scripts" / "emit_parity_fixtures.py"))
epf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(epf)

DEFAULT_OBS_S = 0.30


class Commit(NamedTuple):
    """One committed PLY. A tuple, so `c[0]`, `c[1]`, `c[2]` keep meaning what they meant.

    The tracker commits a BATCH — a recovery bridge pushes up to `recoveryMaxPlies` moves at
    once and writes ONE decision row for the lot (`tracker.py::_record_decision`, and the same
    shape on Android, `Commit.kt`). Everything downstream of a replay wants a per-ply view, so
    this record is expanded per ply and the batch's decider is stamped on every move in it.

    `alarm` and `frame` exist only because this harness drives the loop itself. **No decision row
    on either platform carries an alarm flag** — not `DecisionRecord`, not the persisted
    `DiagnosticsRecords.DecisionRow`, not Python's `_record_decision`. It is polled from
    `status()` at the commit, so it is an observation this pass made, not a property the tracker
    records. Anything that reports it must say so.
    """

    t: float
    san: str
    decider: str
    frame: int
    fen_after: str
    alarm: dict | None


def _fens_after(board, first_ply: int) -> list[str]:
    """The position after EACH ply from `first_ply` on, not just after the batch.

    `board.fen()` at the commit is the position after the LAST move of the batch. Stamping it on
    every ply of a three-move recovery bridge would show a reviewer the wrong board for two of
    them — and telling those three moves apart is the entire job of the review this feeds.
    Replayed on a copy so the live tracker's board is never touched.
    """
    replay = board.copy(stack=True)
    tail = []
    while len(replay.move_stack) > first_ply:
        tail.append(replay.pop())
    out = []
    for move in reversed(tail):
        replay.push(move)
        out.append(replay.fen())
    return out


class _Observer:
    """One observation at a time, paced by video time — `CnnObserver` without the threads."""

    def __init__(self, mt, trk, clock, period_s: float) -> None:
        self.mt, self.trk, self.clock, self.period = mt, trk, clock, period_s
        self.inflight: tuple[float, object] | None = None
        self.next_at = 0.0
        self.count = 0

    def tick(self, frame, now: float) -> None:
        mt = self.mt
        if self.inflight is not None and now >= self.inflight[0]:
            snap = self.inflight[1]
            self.inflight = None
            # `_cnn_worker`: a pending candidate has priority, and while one exists `_cnn_tick`
            # — i.e. CNN RECOVERY — cannot run at all.
            if mt._pending is not None:
                mt._verify_tick(snap)
            else:
                mt._cnn_tick(snap)
        if self.inflight is not None or now < self.next_at or mt._last_corners is None:
            return
        self.next_at = now + self.period
        self.count += 1
        obs = mt.recovery.observe(frame, mt._last_corners)
        # NOTE (2026-08-02, unresolved): this warps at `board_size`, runs `_gray` there and
        # box-downsamples afterwards, which is the pipeline `tracker._cnn_snapshot` explicitly
        # warns against — "a different pipeline than warping at _det_size ... measured on real
        # frames it lands 5-11 squares above z_thr on a physically unchanged board". Cutting it
        # the way `_loop` does (warp straight to `_det_size`, then `_gray`) was tried against the
        # 2026-08-02 real game and produced BYTE-IDENTICAL output, so it is not the cause of that
        # clip's zero commits and the change was reverted rather than shipped unmeasured. It is
        # still a latent divergence from the invariant; fix it in a pack that owns this observer.
        warped = self.trk.warp_from_corners(frame, mt.profile, mt._last_corners)
        gray = None if warped is None else mt._gray(warped)
        if warped is not None and mt.detect_scale < 1.0:
            size = (mt._det_size, mt._det_size)
            warped = cv2.resize(warped, size, interpolation=cv2.INTER_AREA)
            gray = cv2.resize(gray, size, interpolation=cv2.INTER_AREA)
        snap = self.trk.CnnSnapshot(obs=obs, seq=mt._frame_seq, ts=self.clock.time(),
                                    infer_ms=self.period * 1000.0, warped=warped, gray=gray,
                                    fen=mt.board.fen())
        mt._cnn_snap = snap
        self.inflight = (now + self.period, snap)


def run(clip: str, corners, margin: float, cnn_run: str, obs_s: float = DEFAULT_OBS_S,
        tracker_kwargs: dict | None = None, board_size: int = 640,
        start_fen: str | None = None, on_event=None, start_frame: int = 0,
        crop: dict | None = None) -> dict:
    """Replay `clip` with a real CNN attached. `commits` comes back as one `Commit` per PLY.

    `on_event(now, mt, frame, index)` fires once per decoded frame, after the engine has seen it.
    It gets the frame and its index because the decode happens ONCE, in order: anything that wants
    a picture of a moment has to take it while the frame is in hand. Seeking back for it later is
    not equivalent — h.264 seeking by index is approximate, so a caller that seeks would hand its
    user a NEARBY frame while claiming it is the one.

    `start_frame` DROPS the leading frames instead of seeking to them — the clock never sees them,
    so the replay is exactly the replay of a trimmed clip and stays deterministic. It exists for
    footage whose opening second is not yet the scene: the 2026-08-02 game changes illumination
    locally over its first ~1 s (the a-file corner gains 32-38 % of its luma between frame 20 and
    30 while h8 loses 20 %, with the whole-board mean unmoved), and the reference taken at frame 0
    then reads a1/a2/b1 as permanently changed for the rest of the video. That is `cut the clip
    where it happened` from `specs/40`, expressed as an argument. It is NOT a threshold override
    and must never be used as one — nothing here touches what the tracker considers a change.
    """
    from chesslab.move_tracker import tracker as trk

    cap = cv2.VideoCapture(clip)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    entry = {
        "file": clip,
        "frame_size": (int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))),
        "board_size": board_size,
        "corners": corners,
        "margin": margin,
        "tracker": tracker_kwargs or {},
        "start_fen": start_fen,
        # The PROFILE's crop params, not `config.CROP`'s: see `ClipDriver.__enter__`. The
        # CNN is served crops cut by these, so a default here is a silent domain shift.
        "crop": crop,
    }
    clock = epf._VirtualClock()
    real_time, trk.time = trk.time, clock
    commits: list[Commit] = []
    try:
        with epf.ClipDriver(entry, trk, clock) as driver:
            driver.reset_scratch("q")
            mt = driver.mt
            # ClipDriver hardcodes cnn_run=None; attaching it here is the whole point. The frame
            # counters (settle/avg/confirm) are CNN-conditional and were fixed at construction,
            # so pass them explicitly in `tracker_kwargs` to model a device with a CNN attached.
            mt.cnn_run, mt.cnn_verify, mt._cnn_failed = cnn_run, True, False
            if mt._ensure_cnn() is None:
                raise RuntimeError(f"CNN run {cnn_run!r} did not load — the replay would prove nothing")
            observer = _Observer(mt, trk, clock, obs_s)
            n_plies = 0
            seen = 0
            for _ in range(max(0, start_frame)):
                if not cap.read()[0]:
                    break
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                clock.advance(1.0 / fps)
                driver._video_index = seen
                driver.step(frame)
                seen += 1
                now = clock.time() - epf.VCLOCK_START
                observer.tick(frame, now)
                if len(mt.board.move_stack) > n_plies:
                    status = mt.status()
                    decider = (mt._decision_log[-1].get("decider") if mt._decision_log else None)
                    fens = _fens_after(mt.board, n_plies)
                    alarm = status["alarm"]
                    for san, fen_after in zip(status["history"][n_plies:], fens, strict=False):
                        commits.append(Commit(round(now, 2), san, decider or "?", seen - 1,
                                              fen_after, alarm))
                    n_plies = len(mt.board.move_stack)
                if on_event is not None:
                    on_event(now, mt, frame, seen - 1)
            return {"commits": commits, "history": list(mt.status()["history"]),
                    "fen": mt.board.fen(), "note": mt.note,
                    "observations": observer.count, "frames": seen,
                    "start_frame": int(max(0, start_frame))}
    finally:
        trk.time = real_time
        cap.release()


if __name__ == "__main__":
    out = run(
        clip=sys.argv[1],
        corners=json.load(open(sys.argv[2])),
        margin=float(sys.argv[3]),
        obs_s=float(sys.argv[4]) if len(sys.argv) > 4 else DEFAULT_OBS_S,
        cnn_run=sys.argv[5] if len(sys.argv) > 5 else "occ-act-f3",
        tracker_kwargs=json.loads(sys.argv[6]) if len(sys.argv) > 6 else None,
    )
    print(f"frames {out['frames']}  observations {out['observations']}")
    for c in out["commits"]:
        print(f"  t={c.t:6.2f}  {c.san:8s} {c.decider}")
    print("committed:", " ".join(out["history"]) or "-")
    print("note:", out["note"])
