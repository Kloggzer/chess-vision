"""Turn a filmed game into a reviewable CANDIDATE — never into ground truth.

    uv run python scripts/label_real_game.py VIDEO --profile phone --name game-2026-08-02

writes `data/realgames/<name>/candidate.json` plus `frames/`, both gitignored, and asserts
nothing. The move list in it is the TRACKER's proposal. In the first fully tracked live game
(83 plies, 2026-08-02) 55 of 91 committed moves came through `cnn_recovery` — which
`Commit.kt` defines as "position was LOST — rebuilt by the CNN, not detected" — and the user
corrected three by hand. So the artefact carries `confirmed: false` and only a human, through
the review page (`web/routers/realgames.py`), can flip it. A tracker whose own output could
become a fixture would freeze its mistakes and then assert forever that it keeps making them.

Why this is not `ingest_video_session.py`. That script samples one frame per second into a
session directory, re-detecting a quad per frame and silently skipping the ones that fail. A
regression clip is the opposite artefact: consumed as a VIDEO, at full rate, through ONE fixed
quad. Per-frame detection here is therefore not an input, it is a quality MEASUREMENT — how
well a single static quad can stand for this footage.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import deque
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent))   # sibling scripts

from emit_parity_fixtures import _effective_config  # noqa: E402
from ingest_video_session import raw_corners  # noqa: E402
from replay_clip_cnn import DEFAULT_OBS_S  # noqa: E402
from replay_clip_cnn import run as replay_with_cnn  # noqa: E402

from chesslab import config  # noqa: E402
from chesslab.calibration import compute_homography, load_profile, margins4  # noqa: E402


def realgames_root() -> Path:
    """Where candidates live. Under `data/`, so gitignored — the pack commits none of it."""
    return config.DATA.root / "realgames"


# --- the geometry, measured -----------------------------------------------------------------

def scan_geometry(video: Path, profile, progress_every: int = 300) -> dict:
    """Decode once and record, per frame, the ArUco quad and the presentation timestamp.

    `raw_corners` and not `board_corners_for_frame`: the latter goes through a `MarkerTracker`
    whose dead zone, EMA and seed fallback all assume a static board, and a game filmed over
    minutes is one where the board gets nudged. The tracker then lags by a different amount per
    marker — they sit at different distances from the centre of rotation — and shears the quad by
    a few degrees. Measured on the 2026-07-31 rotation video; the reasoning is written out in
    `ingest_video_session.raw_corners`.
    """
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise SystemExit(f"cannot open video: {video}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    size = (int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
    quads: list[list[list[float]] | None] = []
    stamps: list[float] = []
    while True:
        stamps.append(cap.get(cv2.CAP_PROP_POS_MSEC))
        ok, frame = cap.read()
        if not ok:
            stamps.pop()
            break
        quad = raw_corners(frame, profile)
        quads.append(None if quad is None else [[float(x), float(y)] for x, y in quad])
        if progress_every and len(quads) % progress_every == 0:
            print(f"  ...{len(quads)} frames, {sum(q is not None for q in quads)} with a quad",
                  flush=True)
    cap.release()
    return {"fps": float(fps), "frame_size": size, "quads": quads, "stamps": stamps}


def median_quad(quads) -> list[list[float]] | None:
    """The per-corner median over every frame that detected.

    Median and not mean: one mis-resolved marker throws a corner by hundreds of pixels, and there
    is no reading of "the board sat here" under which such a frame should move the answer at all.
    The four corners are taken independently — the result is not required to be one of the
    observed quads, only to be the central one.
    """
    seen = [q for q in quads if q is not None]
    if not seen:
        return None
    arr = np.asarray(seen, dtype=np.float64)          # (n, 4, 2)
    return [[float(v) for v in pt] for pt in np.median(arr, axis=0)]


def quad_spread(quads, reference, board_size: int, margin) -> np.ndarray:
    """Per-frame corner error against `reference`, in RECTIFIED pixels.

    Rectified and not image pixels, because rectified is the unit the failure is measured in: a
    crop box is `board_size / 8` across, and what matters is how far a frame's real square edge
    sits from where the fixed quad says it is. An image-pixel number cannot be compared to that
    without knowing how much of the frame the board fills.

    Computed through the homography rather than through `alignment`: `alignment` locates the
    board's real GROOVES in a warped frame, which answers a different question (is this quad right
    at all) and needs the pixels. Here both quads are already known, so the deviation is exact —
    map the frame's corners with the reference's homography and see how far they land from the
    corners the reference puts there by construction.

    Returns one worst-corner value per detecting frame.
    """
    h = np.asarray(compute_homography(reference, board_size, margin), dtype=np.float64)
    bs = float(board_size)
    m0, m1, m2, m3 = (v * bs for v in margins4(margin))
    dst = np.array([[-m0, -m0], [bs + m1, -m1], [bs + m2, bs + m2], [-m3, bs + m3]],
                   dtype=np.float64)
    out = []
    for quad in quads:
        if quad is None:
            continue
        pts = cv2.perspectiveTransform(
            np.asarray(quad, dtype=np.float64).reshape(-1, 1, 2), h).reshape(-1, 2)
        out.append(float(np.max(np.linalg.norm(pts - dst, axis=1))))
    return np.asarray(out, dtype=np.float64)


def clock_error(stamps: list[float], fps: float) -> np.ndarray:
    """Per-frame |realised interval - nominal interval| in ms.

    The frame rate is not metadata, it is the CLOCK: `replay_clip_cnn` advances a virtual clock by
    exactly `1.0 / fps` per decoded frame, and every wall-clock knob the tracker owns —
    `motionHoldS`, `motionRecencyS`, `nudgeTimeoutS`, `verifyTimeoutS`, `cnnCooldownS`,
    `observerIntervalS` — is measured against it. A variable-rate source therefore does not make a
    replay slightly wrong; it makes `motionHoldS` mean a different number of seconds in every
    second of the video.
    """
    if len(stamps) < 2:
        return np.zeros(0)
    d = np.diff(np.asarray(stamps, dtype=np.float64))
    return np.abs(d - 1000.0 / fps)


def _dist(v: np.ndarray) -> dict:
    if v.size == 0:
        return {"median": None, "p90": None, "max": None}
    return {"median": round(float(np.median(v)), 3),
            "p90": round(float(np.percentile(v, 90)), 3),
            "max": round(float(v.max()), 3)}


def _histogram(v: np.ndarray, edges, unit: str, indent: str = "    ") -> None:
    for lo, hi in edges:
        n = int(((v >= lo) & (v < hi)).sum())
        label = f">{lo:g}" if hi > 1e8 else f"{lo:g}-{hi:g}"
        bar = "#" * int(40 * n / len(v))
        print(f"{indent}{label:>9} {unit}: {n:5} ({100 * n / len(v):5.1f} %) {bar}")


def report_geometry(scan: dict, spread: np.ndarray, board_size: int) -> dict:
    """Print the distributions and return them. **Nothing here gates anything yet.**

    No real game footage existed in this repository when the pack was written, and the nearest
    numbers on record — the 3.2-6.5 px median square-edge offsets of `docs/data-pipeline.md` 12 —
    measure per-frame quads that were each FITTED, not one static quad's error across a clip. So
    the first runs print the distribution and refuse nothing; a threshold goes in afterwards,
    naming the run it came from. A plausible constant here is how this project ended up with a
    corpus that was 3-6 px mis-aligned for its entire life.
    """
    quads, stamps, fps = scan["quads"], scan["stamps"], scan["fps"]
    detected = sum(q is not None for q in quads)
    rate = detected / len(quads) if quads else 0.0
    cell = board_size / 8.0
    clock = clock_error(stamps, fps)
    print(f"  frames {len(quads)}   quad detected {detected} ({100 * rate:.1f} %)")
    print(f"  quad spread about the median quad (rectified px, one square = {cell:.0f} px):")
    if spread.size:
        d = _dist(spread)
        print(f"    median {d['median']:.2f}   p90 {d['p90']:.2f}   max {d['max']:.2f}")
        _histogram(spread, ((0, 2), (2, 4), (4, 8), (8, 16), (16, 1e9)), "px")
    else:
        print("    nothing measurable — no frame resolved four markers")
    print(f"  clock: nominal {1000.0 / fps:.2f} ms/frame; |realised - nominal|:")
    if clock.size:
        d = _dist(clock)
        print(f"    median {d['median']:.3f} ms   p90 {d['p90']:.3f}   max {d['max']:.3f}")
        _histogram(clock, ((0, 1), (1, 4), (4, 16), (16, 1e9)), "ms")
    else:
        print("    nothing measurable — the container reports no presentation timestamps")
    return {"detection_rate": round(rate, 4), "detected": detected, "frames": len(quads),
            "quad_spread_px": _dist(spread), "clock_error_ms": _dist(clock)}


def ffmpeg_cfr_hint(video: Path, fps: float) -> str:
    """The command to fix a variable-rate source, printed rather than run.

    Not corrected in-process on purpose: re-timing frames is exactly the kind of silent repair
    that makes a replay's numbers un-attributable. ffmpeg is established, the user's standing
    preference, and leaves a file whose rate is a fact rather than an assumption.
    """
    return (f'ffmpeg -i "{video}" -vsync cfr -r {fps:g} -c:v libx264 -crf 18 '
            f'-preset slow -an "{video.with_name(video.stem + "-cfr.mp4")}"')


# --- the replay, and the pictures taken while it runs ----------------------------------------

#: The frame counters `MoveTracker.__init__` picks when a CNN IS attached. `ClipDriver` builds the
#: tracker with `cnn_run=None` and `replay_clip_cnn` attaches the model afterwards, so without
#: these the replay would settle over 4/3/2 frames where the device settles over 3/2/1. Not an
#: override of a tuned threshold — the restoration of the default the device actually ran.
CNN_FRAME_COUNTERS = {"settle_frames": 3, "avg_frames": 2, "confirm_frames": 1}


class _ReviewFrames:
    """JPEGs for every commit frame and a symmetric neighbourhood, written DURING the decode.

    Two reasons not to seek for them later. A single frame at the commit instant usually still
    shows the hand that caused it, so a reviewer needs the neighbours to see the board; and h.264
    seeking by frame index is approximate, so a review page that sought would show a NEARBY frame
    while claiming it is the one. The decode is happening anyway, so this costs nothing and takes
    video decoding out of the request path entirely.

    Keyed by frame INDEX, not by ply: a recovery bridge commits several plies on one frame, and
    those plies share the picture rather than each getting a copy of it.
    """

    def __init__(self, out_dir: Path, context: int, quality: int = 88) -> None:
        self.dir, self.context, self.quality = out_dir, context, quality
        self.dir.mkdir(parents=True, exist_ok=True)
        self._ring: deque[tuple[int, object]] = deque(maxlen=context + 1)
        self._wanted: set[int] = set()          # indices still ahead of the decode
        self._written: set[int] = set()
        self._plies = 0

    def on_frame(self, _now, mt, frame, index: int) -> None:
        self._ring.append((index, frame))
        if index in self._wanted:
            self._wanted.discard(index)
            self._write(index, frame)
        n = len(mt.board.move_stack)
        if n <= self._plies:
            return
        self._plies = n
        for i, f in self._ring:                                     # the context BEFORE, buffered
            self._write(i, f)
        self._wanted |= {index + k for k in range(1, self.context + 1)}   # ... and after

    def _write(self, index: int, frame) -> None:
        if index in self._written:
            return
        self._written.add(index)
        cv2.imwrite(str(self.dir / f"{index:06d}.jpg"), frame,
                    [cv2.IMWRITE_JPEG_QUALITY, self.quality])

    @property
    def written(self) -> int:
        return len(self._written)


def relative_video(video: Path) -> str:
    """The video's path relative to `data/`, refusing anything outside it.

    Stored relative so nothing downstream ever holds an absolute path to a file the web layer
    will later read. The app has no authentication anywhere and `app.py` already mounts the whole
    `data/` tree at `/img`, so a candidate that could name a file outside it would be the one new
    way into the filesystem this pack added.
    """
    root = config.DATA.root.resolve()
    try:
        rel = video.resolve().relative_to(root)
    except ValueError:
        raise SystemExit(
            f"{video} is not under {root}. A candidate stores its video relative to data/; "
            f"move or hard-link the file under data/ (e.g. data/testclip-raw/) and re-run."
        ) from None
    return rel.as_posix()


def build_candidate(video: Path, profile, *, name: str, cnn_run: str, obs_s: float,
                    context: int, start_fen: str | None) -> dict:
    """Measure, replay, and write down what came out **as a proposal**.

    The order matters: the geometry is measured first because `corners` and `margin` are inputs to
    the replay, and a replay through a wrong quad produces a move list that says nothing about the
    tracker. `margin` comes from the PROFILE and never from a constant — ArUco markers sit in the
    label border, so the detected quad lies outside the playing field, and replaying at 0.0
    oversizes the board by 6-8 %: the grid lines then miss `_grid_line_coverage`'s band and the
    tracker sits in `occluded` forever (measured: 2232 of 2996 frames, zero commits).
    """
    from datetime import UTC, datetime

    out_dir = realgames_root() / name
    print(f"scanning {video.name} through profile {profile.profile!r} "
          f"(board_size {profile.board_size}, margin {profile.margin})")
    scan = scan_geometry(video, profile)
    quad = median_quad(scan["quads"])
    if quad is None:
        raise SystemExit("no frame resolved four ArUco markers — is the board's border visible?")
    spread = quad_spread(scan["quads"], quad, profile.board_size, profile.margin)
    geometry = report_geometry(scan, spread, profile.board_size)
    print(f"  if the clock above is not flat, re-encode first:\n    "
          f"{ffmpeg_cfr_hint(video, scan['fps'])}")

    pictures = _ReviewFrames(out_dir / "frames", context)
    print(f"replaying with CNN run {cnn_run!r}, one observation every {obs_s:g} s of video time")
    # Read off the LIVE tracker, because this pass is the only moment it is in hand — and
    # because a fixture must carry it: `trackerConfigOf` reads EVERY field from the fixture and
    # no Kotlin default, proven with `motionHoldS = 5.00` (a value that would freeze the tracker)
    # changing nothing. Whatever a fixture records is what the simulation runs it at forever.
    effective: dict = {}

    def on_event(now, mt, frame, index) -> None:
        if not effective:
            effective.update(_effective_config(mt))
        pictures.on_frame(now, mt, frame, index)

    out = replay_with_cnn(
        clip=str(video), corners=quad, margin=profile.margin, cnn_run=cnn_run, obs_s=obs_s,
        tracker_kwargs=dict(CNN_FRAME_COUNTERS), board_size=profile.board_size,
        start_fen=start_fen, on_event=on_event,
    )
    moves = [{"ply": i + 1, "san": c.san, "frame": c.frame, "t": c.t,
              "decider": c.decider, "alarm": c.alarm, "fen_after": c.fen_after}
             for i, c in enumerate(out["commits"])]
    return {
        "name": name,
        "video": relative_video(video),
        # The one field the whole pack turns on. A tracker whose own output could become a
        # fixture would freeze its mistakes and then assert forever that it keeps making them.
        # Only the review page flips this, and only phase 02's `--adopt` reads it.
        "confirmed": False,
        "created_at": datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": {"cnn_run": cnn_run, "obs_s": obs_s, "profile": profile.profile,
                   "tracker": dict(CNN_FRAME_COUNTERS), "context": context},
        "effective_config": effective,
        "geometry": {"corners": quad, "margin": list(profile.margin),
                     "board_size": int(profile.board_size),
                     "frame_size": list(scan["frame_size"]), **geometry},
        "clock": {"fps": scan["fps"], "error_ms": geometry["clock_error_ms"]},
        "start_fen": start_fen,
        "moves": moves,
        "note": out["note"],
        "observations": out["observations"],
        "frames": out["frames"],
        "frames_written": pictures.written,
    }


def write_candidate(candidate: dict) -> Path:
    """Write `candidate.json`. **This function cannot write a confirmed one.**

    Not a formality: `confirmed` is the only thing standing between the tracker's own output and
    a regression fixture, and 60 % of the motivating game's commits were recoveries. Forcing it
    here means no future edit to `build_candidate` can leak a `true` through by accident — the
    review page is the one writer allowed to set it.
    """
    candidate = {**candidate, "confirmed": False}
    path = realgames_root() / candidate["name"] / "candidate.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(candidate, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, path)
    return path


def report_deciders(moves: list[dict]) -> None:
    """The tally, next to the live figure the pack exists because of.

    They need not match — the live game ran a different model at a different pace on a live
    camera — and a large divergence is a measurement of the REPLAY's fidelity, which is exactly
    what has to be known before a fixture is built on it.
    """
    tally: dict[str, int] = {}
    for m in moves:
        tally[m["decider"]] = tally.get(m["decider"], 0) + 1
    total = len(moves)
    print(f"  committed {total} plies; live reference: 55 of 91 through cnn_recovery")
    for key, n in sorted(tally.items(), key=lambda kv: -kv[1]):
        print(f"    {key:22s} {n:4} ({100 * n / total:5.1f} %)" if total else f"    {key}: {n}")
    print(f"    alarm latched at commit: {sum(m['alarm'] is not None for m in moves)}")


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", nargs="?", help="the filmed game, somewhere under data/")
    ap.add_argument("--profile", default="phone",
                    help="calibration profile — supplies board_size and, critically, MARGIN "
                         "(default: phone)")
    ap.add_argument("--name", default=None,
                    help="candidate directory name (default: the video's stem)")
    ap.add_argument("--cnn-run", default=None,
                    help="model run to attach (default: config.default_tracker_run())")
    ap.add_argument("--obs-s", type=float, default=DEFAULT_OBS_S,
                    help=f"seconds of VIDEO time between CNN observations (default "
                         f"{DEFAULT_OBS_S:g}). That default was measured on the wide GroupNorm "
                         f"model; the shipped id35-80 reads 64 crops in ~16 ms median, so a "
                         f"smaller number models today's device more honestly")
    ap.add_argument("--context", type=int, default=2,
                    help="frames written either side of each commit frame (default 2)")
    ap.add_argument("--start-fen", default=None,
                    help="position at the first frame (default: the standard start position)")
    ap.add_argument("--geometry-only", action="store_true",
                    help="measure and report; write no candidate and run no CNN")
    return ap


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not args.video:
        build_parser().error("a video is required")
    video = Path(args.video)
    profile = load_profile(args.profile)
    if args.geometry_only:
        print(f"scanning {video.name} through profile {args.profile!r} "
              f"(board_size {profile.board_size}, margin {profile.margin})")
        scan = scan_geometry(video, profile)
        quad = median_quad(scan["quads"])
        if quad is None:
            raise SystemExit("no frame resolved four ArUco markers — is the border visible?")
        report_geometry(scan, quad_spread(scan["quads"], quad, profile.board_size,
                                          profile.margin), profile.board_size)
        print(f"  re-encode command, if the clock is not flat:\n    "
              f"{ffmpeg_cfr_hint(video, scan['fps'])}")
        return 0
    cnn_run = args.cnn_run or config.default_tracker_run()
    if not cnn_run:
        raise SystemExit("no model run on disk — a replay without a CNN cannot reach recovery, "
                         "which is the path this candidate exists to expose")
    candidate = build_candidate(video, profile, name=args.name or video.stem, cnn_run=cnn_run,
                                obs_s=args.obs_s, context=args.context, start_fen=args.start_fen)
    path = write_candidate(candidate)
    report_deciders(candidate["moves"])
    print(f"  wrote {path} ({candidate['frames_written']} review frames) — confirmed: false")
    print("  -> review it in the web UI (Dataset -> Sessions -> Real games) before anything "
          "downstream may use it")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
