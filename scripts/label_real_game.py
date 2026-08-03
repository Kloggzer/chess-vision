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
quad. Per-frame detection here is therefore both an input and a MEASUREMENT: the sampled quads
are what the static one is the median OF, and their spread is how well that one quad can stand
for the footage.

**Geometry is two stages.** ArUco is the coarse one — it only has to bring the board's grooves
inside a search window — and the board's own grid is the fine one (`alignment.refine_quad`).
Markers alone reconstruct a parallelogram whenever one of the four does not decode, which is the
case in 940 of 958 sampled frames of the 2026-08-02 game: ~30 px of median square-edge error on
a 100 px cell, against 2.0 px once the grid is consulted. See `specs/41-the-board-is-its-own-ruler/`.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter, deque
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent))   # sibling scripts

from emit_parity_fixtures import _effective_config  # noqa: E402
from replay_clip_cnn import DEFAULT_OBS_S  # noqa: E402
from replay_clip_cnn import run as replay_with_cnn  # noqa: E402

from chesslab import config  # noqa: E402
from chesslab.alignment import MAX_OFFSET_FRAC, refine_quad  # noqa: E402
from chesslab.calibration import (  # noqa: E402
    compute_homography,
    detect_board_markers,
    load_profile,
    margins4,
    resolve_board_corners,
)


def realgames_root() -> Path:
    """Where candidates live. Under `data/`, so gitignored — the pack commits none of it."""
    return config.DATA.root / "realgames"


# --- the geometry, measured -----------------------------------------------------------------

def scan_geometry(video: Path, profile, progress_every: int = 100, every: int = 10) -> dict:
    """Decode once and record, per sampled frame, the MEASURED quad and its alignment verdict.

    **Markers are the coarse stage, the board's own grid is the fine one.** `raw_corners` refuses
    below four markers, which is right for a source whose geometry is markers and nothing else —
    but this video only ever decodes three (its fourth is clipped by the right image border), so
    that path answers "no geometry" for footage a human can read the grid off instantly. Here the
    ArUco quad only has to bring the grooves inside the first search window; `refine_quad` fits the
    board's 18 lines and supplies the accuracy, including the perspective a three-marker affine
    reconstruction cannot have. Measured over the whole video, worst square offset in rectified px
    on a 100 px cell: ArUco alone median 29.8 / p90 36.5 / max 38.4, after the grid fit median
    2.00 / p90 2.45, and 939 of 958 sampled frames pass the absolute gate.

    No `MarkerTracker`: its dead zone, EMA and seed fallback all assume a static board, and a game
    filmed over minutes is one where the board gets nudged. The tracker then lags by a different
    amount per marker — they sit at different distances from the centre of rotation — and shears
    the quad by a few degrees. Measured on the 2026-07-31 rotation video.

    `every` samples the geometry: the fit costs ~75 ms a frame at `board_size` 800, so a full pass
    over 9576 frames is half an hour and adds nothing — the output is ONE static quad, and a
    thousand samples fix its median far below the measurement noise. Timestamps are still read for
    every frame, because the clock check is about the frames that exist, not the ones measured.
    """
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise SystemExit(f"cannot open video: {video}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    size = (int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
    quads: list[list[list[float]] | None] = []
    index: list[int] = []
    worst: list[float] = []
    unread: list[int] = []
    stamps: list[float] = []
    # How many markers DECODED, per sampled frame — not how many quads came back. A quad from three
    # markers is an affine parallelogram standing in for a perspective view, and the 2026-08-02
    # video is exactly that case. This histogram is what says which stage did the work.
    seen = Counter()
    i = 0
    while True:
        stamps.append(cap.get(cv2.CAP_PROP_POS_MSEC))
        ok, frame = cap.read()
        if not ok:
            stamps.pop()
            break
        if i % max(1, every) == 0:
            found = detect_board_markers(frame, profile.marker_dict, corner="center")
            seen[len(found)] += 1
            coarse = resolve_board_corners(found, board_size=profile.board_size)
            quad, verdict = ((None, None) if coarse is None
                             else refine_quad(frame, coarse[0], profile))
            index.append(i)
            quads.append(None if not (verdict and verdict.ok)
                         else [[float(x), float(y)] for x, y in quad])
            worst.append(float("nan") if verdict is None else verdict.worst)
            unread.append(-1 if verdict is None else verdict.unread)
            if progress_every and len(quads) % progress_every == 0:
                print(f"  ...{i} frames, {sum(q is not None for q in quads)} of {len(quads)} "
                      f"sampled passed the alignment gate", flush=True)
        i += 1
    cap.release()
    return {"fps": float(fps), "frame_size": size, "quads": quads, "stamps": stamps,
            "markers_seen": dict(seen), "index": index, "worst": worst, "unread": unread,
            "every": int(max(1, every))}


def median_quad(quads) -> list[list[float]] | None:
    """The per-corner median over every frame that PASSED the alignment gate.

    Median and not mean: one mis-resolved marker throws a corner by hundreds of pixels, and there
    is no reading of "the board sat here" under which such a frame should move the answer at all.
    The four corners are taken independently — the result is not required to be one of the
    observed quads, only to be the central one.

    Passing frames only, and that is not a detail: on the 2026-08-02 game 18 of 19 rejected frames
    are a HAND over the board, where the grid fit is fitting to whatever grooves the hand left
    visible. Those frames have nothing to say about where the board is.
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


#: Refuse a video whose per-frame quads disagree with the chosen one by more than this at p90,
#: in rectified pixels (one square is `board_size / 8`, i.e. 100 px on the phone profile).
#:
#: **This is not a correctness gate and must never be read as one.** It compares each frame's quad
#: against the MEDIAN OF THE SAME QUADS, so a consistently wrong quad scores beautifully: the
#: 2026-08-02 game read median 0.57 / p90 0.93 with 98 % of frames under 2 px while every quad in
#: it was 27-33 px out. Precision reported as accuracy, and it cost a day. What it does measure,
#: and the only thing it is kept for, is whether ONE static quad can stand for the whole clip —
#: i.e. whether the board was nudged mid-game. Correctness is `ALIGN_PASS_MIN` below.
QUAD_SPREAD_P90_MAX = 4.0

#: Refuse a video where fewer than this fraction of sampled frames pass `alignment.alignment_of` —
#: an ABSOLUTE verdict against the board's own grid, not against the other frames.
#:
#: Measured on the 2026-08-02 game (9576 frames, every 10th sampled, `phone` profile): 939 of 958
#: pass, 98.0 %. Of the 19 that do not, 18 are a HAND over the board and one sees a single ArUco
#: marker. So a hand is what failure looks like on good footage, and a game is roughly 2 % hands.
#: 0.85 leaves room for a slower game with more hand time while still refusing footage where the
#: grid genuinely cannot be found — at 0.85 this video would have to get seven times handsier
#: before it stopped qualifying.
ALIGN_PASS_MIN = 0.85

#: Refuse a video whose realised inter-frame interval strays from the nominal one by more than
#: this FRACTION of a frame period at p90. Expressed as a fraction because the tolerance scales
#: with the clock it is a tolerance on: 10 % of a period is 3.3 ms at 30 fps and 8.3 ms at 12 fps.
#:
#: Gated at p90 and not at max on purpose. The 2026-08-02 game is exactly constant-rate — median
#: and p90 both 0.000 ms — except for ONE frame whose gap is a whole extra period (33.333 ms),
#: i.e. a single dropped frame in 9576. A max gate would refuse a video that is, for every
#: purpose the virtual clock has, perfectly CFR.
CLOCK_P90_PERIOD_FRAC = 0.10


def spread_runs(index, quads, spread: np.ndarray, thr: float,
                gap: int = 15) -> list[tuple[int, int, int]]:
    """Contiguous frame ranges whose spread exceeds `thr`, as `(first, last, count)`.

    The distribution alone cannot tell a nudged board from an occluded marker, and the two want
    opposite responses: a board that moved halfway through means the clip should be CUT there,
    while a hand over a marker for a few frames means nothing at all — the fixture carries one
    quad and the replay never re-detects, so those frames are warped through the good quad anyway.
    `gap` bridges short recoveries so one clean frame does not split a run in two; 15 frames is
    half a second at 30 fps.
    """
    idx = [index[i] for i, q in enumerate(quads) if q is not None]
    bad = [idx[k] for k in range(len(idx)) if spread[k] > thr]
    runs: list[tuple[int, int, int]] = []
    for i in bad:
        if runs and i - runs[-1][1] <= gap:
            first, _last, n = runs[-1]
            runs[-1] = (first, i, n + 1)
        else:
            runs.append((i, i, 1))
    return runs


def align_runs(scan: dict, gap: int = 15) -> list[tuple[int, int, int]]:
    """Contiguous frame ranges that FAILED the alignment gate, as `(first, last, count)`.

    Where the spread runs say "the board moved", these say "the board could not be seen". On the
    2026-08-02 game they land exactly on the moves, because what stops the grid being measurable
    is the hand making them.
    """
    runs: list[tuple[int, int, int]] = []
    for k, q in enumerate(scan["quads"]):
        if q is not None:
            continue
        i = scan["index"][k]
        if runs and i - runs[-1][1] <= gap * scan["every"]:
            first, _last, n = runs[-1]
            runs[-1] = (first, i, n + 1)
        else:
            runs.append((i, i, 1))
    return runs


def report_geometry(scan: dict, spread: np.ndarray, board_size: int) -> dict:
    """Print the distributions, name where the outliers are, and return the numbers.

    Two different questions, reported separately because conflating them cost this pack its first
    day. `alignment` is ABSOLUTE — how far is each frame's real square edge from where its quad
    says it is, measured against the board's own grooves. `quad spread` is RELATIVE — do the
    frames agree with each other, which answers whether the board was nudged and answers nothing
    at all about whether any of them is right.
    """
    quads, stamps, fps = scan["quads"], scan["stamps"], scan["fps"]
    passed = sum(q is not None for q in quads)
    rate = passed / len(quads) if quads else 0.0
    cell = board_size / 8.0
    clock = clock_error(stamps, fps)
    worst = np.asarray([w for w in scan["worst"] if np.isfinite(w)], dtype=np.float64)
    print(f"  frames {len(stamps)}, geometry sampled every {scan['every']} -> {len(quads)}")
    print(f"  markers decoded per sampled frame: {dict(sorted(scan['markers_seen'].items()))}")
    print(f"  ALIGNMENT, absolute, against the board's own grid "
          f"(rectified px, one square = {cell:.0f} px):")
    if worst.size:
        d = _dist(worst)
        print(f"    worst square offset: median {d['median']:.2f}   p90 {d['p90']:.2f}   "
              f"max {d['max']:.2f}   (limit {MAX_OFFSET_FRAC * cell:.2f})")
        _histogram(worst, ((0, 2), (2, 4), (4, 8), (8, 16), (16, 1e9)), "px")
    print(f"    PASSED the gate: {passed} of {len(quads)} ({100 * rate:.1f} %) "
          f"(gate: >= {100 * ALIGN_PASS_MIN:.0f} %)")
    runs = align_runs(scan)
    if runs:
        top = sorted(runs, key=lambda r: -r[2])[:6]
        print(f"    {len(runs)} run(s) of failing frames; the longest — expect hands here:")
        for first, last, n in top:
            print(f"      frames {first}-{last} ({n} sampled, {first / fps:.1f}-{last / fps:.1f} s)")
    print("  quad spread about the median quad — a BOARD-MOVEMENT check, not a correctness one:")
    if spread.size:
        d = _dist(spread)
        print(f"    median {d['median']:.2f}   p90 {d['p90']:.2f}   max {d['max']:.2f}"
              f"   (gate: p90 <= {QUAD_SPREAD_P90_MAX:g})")
        _histogram(spread, ((0, 2), (2, 4), (4, 8), (8, 16), (16, 1e9)), "px")
        sruns = spread_runs(scan["index"], quads, spread, QUAD_SPREAD_P90_MAX)
        if sruns:
            top = sorted(sruns, key=lambda r: -r[2])[:6]
            print(f"    {sum(r[2] for r in sruns)} frames over {QUAD_SPREAD_P90_MAX:g} px, in "
                  f"{len(sruns)} runs; the longest:")
            for first, last, n in top:
                print(f"      frames {first}-{last} ({n} frames, "
                      f"{first / fps:.1f}-{last / fps:.1f} s)")
    else:
        print("    nothing measurable — no sampled frame passed the alignment gate")
    print(f"  clock: nominal {1000.0 / fps:.2f} ms/frame; |realised - nominal|:")
    if clock.size:
        d = _dist(clock)
        limit = CLOCK_P90_PERIOD_FRAC * 1000.0 / fps
        print(f"    median {d['median']:.3f} ms   p90 {d['p90']:.3f}   max {d['max']:.3f}"
              f"   (gate: p90 <= {limit:.2f} ms)")
        _histogram(clock, ((0, 1), (1, 4), (4, 16), (16, 1e9)), "ms")
    else:
        print("    nothing measurable — the container reports no presentation timestamps")
    return {"align_pass_rate": round(rate, 4), "aligned": passed, "sampled": len(quads),
            "frames": len(stamps), "sample_every": scan["every"],
            "markers_seen": dict(sorted(scan["markers_seen"].items())),
            "worst_offset_px": _dist(worst),
            "quad_spread_px": _dist(spread), "clock_error_ms": _dist(clock)}


def refuse_reasons(geometry: dict, fps: float) -> list[str]:
    """Why this footage must not become a candidate, or an empty list.

    Refuse rather than warn, because the failure is silent downstream: a quad that does not stand
    for the clip produces crops that straddle their grooves, and every count in the pipeline looks
    healthy while it happens (2026-07-31, when the whole corpus turned out to be 3-6 px out). And
    a variable rate does not skew the replay a little, it makes every wall-clock knob mean a
    different number of seconds in every second of the video.
    """
    out = []
    rate = geometry["align_pass_rate"]
    if not geometry["aligned"]:
        out.append("no sampled frame's grid could be measured — is the board in shot, and is the "
                   "profile's board_size and margin right for this camera?")
    elif rate < ALIGN_PASS_MIN:
        out.append(f"only {100 * rate:.1f} % of sampled frames align to the board's own grid "
                   f"(need {100 * ALIGN_PASS_MIN:.0f} %). Hands over the board are the normal "
                   f"cause; a rate this low means the grid itself is not being found.")
    p90 = geometry["quad_spread_px"]["p90"]
    if p90 is not None and p90 > QUAD_SPREAD_P90_MAX:
        out.append(f"quad spread p90 {p90:.2f} px > {QUAD_SPREAD_P90_MAX:g} px: one static quad "
                   f"does not stand for this footage. Did the board move? Cut the clip where it "
                   f"did, or re-film.")
    clock_p90 = geometry["clock_error_ms"]["p90"]
    limit = CLOCK_P90_PERIOD_FRAC * 1000.0 / fps
    if clock_p90 is not None and clock_p90 > limit:
        out.append(f"frame interval p90 off by {clock_p90:.2f} ms > {limit:.2f} ms: the source is "
                   f"not constant-rate, and fps is the replay's CLOCK. Re-encode first.")
    return out


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


def scalar_margin(profile) -> float:
    """The profile's margin as ONE number, refusing a per-corner profile with the reason.

    Both consumers are scalar: `ClipDriver` does `float(entry.get("margin", 0.0))` and
    `test_clips.py` the same, because a clip manifest entry has always carried a single value.
    The four-value form exists on a profile because the markers are glued on by hand and a re-stick
    moves each independently — which is a real thing that can happen, and would need a manifest
    change to carry. Refuse loudly rather than silently averaging: a margin that is 6-8 % wrong
    jams the grid-line gate and the tracker sits in `occluded` forever, 2232 of 2996 frames.
    """
    values = [round(float(v), 6) for v in margins4(profile.margin)]
    if len(set(values)) != 1:
        raise SystemExit(
            f"profile {profile.profile!r} has per-corner margins {values}. A clip manifest entry "
            f"carries ONE margin, so this profile cannot become a fixture without widening the "
            f"entry format first — see tests/test_clips.py and emit_parity_fixtures.ClipDriver.")
    return values[0]


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
                    context: int, start_fen: str | None, every: int = 10,
                    start_frame: int = 0) -> dict:
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
    margin = scalar_margin(profile)
    print(f"scanning {video.name} through profile {profile.profile!r} "
          f"(board_size {profile.board_size}, margin {margin:g})")
    scan = scan_geometry(video, profile, every=every)
    quad = median_quad(scan["quads"])
    if quad is None:
        raise SystemExit("no sampled frame aligned to the board's grid — is the board in shot?")
    spread = quad_spread(scan["quads"], quad, profile.board_size, margin)
    geometry = report_geometry(scan, spread, profile.board_size)
    refusals = refuse_reasons(geometry, scan["fps"])
    if refusals:
        raise SystemExit("this footage cannot become a candidate:\n  - "
                         + "\n  - ".join(refusals)
                         + f"\n\n  to re-encode:\n    {ffmpeg_cfr_hint(video, scan['fps'])}")

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
        clip=str(video), corners=quad, margin=margin, cnn_run=cnn_run, obs_s=obs_s,
        tracker_kwargs=dict(CNN_FRAME_COUNTERS), board_size=profile.board_size,
        start_fen=start_fen, on_event=on_event, start_frame=start_frame,
        # The PROFILE's crop, never `config.CROP`'s. The default `pad_side` is 0.10 and this rig
        # is 0.05, i.e. a 120 px crop box where the model is trained and served at 110 — measured
        # on this video, that alone makes the CNN disagree with the untouched start position on
        # a7/c7/b8/h8, latch the illegal-move alarm in three seconds, and commit nothing.
        crop=profile.crop.to_dict(),
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
                   "tracker": dict(CNN_FRAME_COUNTERS), "context": context,
                   "start_frame": int(start_frame), "crop": profile.crop.to_dict()},
        "effective_config": effective,
        "geometry": {"corners": quad, "margin": margin,
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


# --- adopt: a confirmed game becomes a manifest entry ----------------------------------------

MANIFEST = Path(__file__).resolve().parents[1] / "tests" / "data" / "testclips" / "manifest.yaml"


def adopt_entry(candidate: dict, *, file_name: str) -> dict:
    """The manifest entry for a CONFIRMED candidate. Refuses an unconfirmed one.

    **The `tracker` map is empty, and that is the decision this pack turns on.** Every one of the
    twenty committed Blender clips sets `min_grid_line_coverage: 0.0` (plus `overhang: 0.0` and
    `census_thr: 40.0`) — the grid gate is switched OFF across the entire regression corpus,
    because "the clips were shot on a different board than the live setup the defaults are tuned
    for". A real ArUco clip that inherited that recipe would be permanently exempt from the one
    gate real geometry exists to exercise, and would re-create the blind spot this pack was
    written to close. If a real clip cannot commit at the defaults, that is a finding about the
    defaults or the footage and it is recorded as `known_failure` — never bought off here.

    `deterministic: true` is not optional either: the realtime replay drops frames according to
    machine load, so two runs give different games, and a pin has to be reproducible.
    """
    import chess

    if not candidate.get("confirmed"):
        raise SystemExit(
            f"{candidate.get('name')!r} is not confirmed. A tracker's own output must not become "
            f"a fixture by any path — review it in the web UI and confirm it first.")
    sans = [m["san"] for m in candidate.get("moves") or []]
    board = chess.Board(candidate.get("start_fen") or chess.STARTING_FEN)
    positions, ucis = [board.fen()], []
    for san in sans:
        move = board.parse_san(san)          # confirmed, so this cannot raise
        ucis.append(move.uci())
        board.push(move)
        positions.append(board.fen())
    geom = candidate["geometry"]
    return {
        "file": file_name,
        "source": "real",
        "start_fen": positions[0],
        "erwartete_zugliste": sans,
        "positions": positions,
        "moves_uci": ucis,
        "corners": geom["corners"],
        "margin": geom["margin"],
        "frame_size": list(geom["frame_size"]),
        "board_size": int(geom["board_size"]),
        "deterministic": True,
        "tracker": {},
    }


def append_entry(entry: dict, manifest: Path = MANIFEST) -> None:
    """Append to the clip manifest, refusing to redefine an existing `file`."""
    import yaml

    data = yaml.safe_load(manifest.read_text(encoding="utf-8")) or {}
    clips = data.setdefault("clips", [])
    if any(c.get("file") == entry["file"] for c in clips):
        raise SystemExit(f"{manifest} already has an entry for {entry['file']!r}.")
    clips.append(entry)
    manifest.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True),
                        encoding="utf-8")


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
    ap.add_argument("--start-frame", type=int, default=0,
                    help="drop this many leading frames before the replay starts. For footage "
                         "whose opening second is not yet the scene — this video's a-file corner "
                         "gains 32-38 %% of its luma between frame 20 and 30 while h8 loses 20 %%, "
                         "and a reference taken before that reads a1/a2/b1 as permanently changed. "
                         "It is 'cut the clip where it happened', not a threshold override")
    ap.add_argument("--geometry-every", type=int, default=10,
                    help="fit the board's grid on every Nth frame (default 10). The output is "
                         "ONE static quad, so a thousand samples fix its median far below the "
                         "measurement noise; a full pass costs ~75 ms a frame")
    ap.add_argument("--adopt", metavar="NAME", default=None,
                    help="turn a CONFIRMED candidate into an entry in the clip manifest. "
                         "Refuses an unconfirmed one.")
    ap.add_argument("--clip-file", default=None,
                    help="--adopt: the video file name the manifest entry points at "
                         "(default: the candidate's own video, by basename)")
    return ap


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.adopt:
        path = realgames_root() / args.adopt / "candidate.json"
        if not path.exists():
            raise SystemExit(f"no candidate at {path}")
        candidate = json.loads(path.read_text(encoding="utf-8"))
        entry = adopt_entry(candidate, file_name=args.clip_file
                            or Path(candidate["video"]).name)
        append_entry(entry)
        print(f"appended {entry['file']!r} to {MANIFEST} — {len(entry['erwartete_zugliste'])} "
              f"moves, tracker overrides: {entry['tracker'] or 'none (the shipped defaults)'}")
        print("  -> drop the video into data/testclips/ (gitignored) or commit an excerpt")
        print("  -> then: uv run pytest -m clips")
        return 0
    if not args.video:
        build_parser().error("a video is required")
    video = Path(args.video)
    profile = load_profile(args.profile)
    if args.geometry_only:
        margin = scalar_margin(profile)
        print(f"scanning {video.name} through profile {args.profile!r} "
              f"(board_size {profile.board_size}, margin {margin:g})")
        scan = scan_geometry(video, profile, every=args.geometry_every)
        quad = median_quad(scan["quads"])
        if quad is None:
            raise SystemExit("no sampled frame aligned to the board's grid — is it in shot?")
        geometry = report_geometry(
            scan, quad_spread(scan["quads"], quad, profile.board_size, margin),
            profile.board_size)
        for reason in refuse_reasons(geometry, scan["fps"]):
            print(f"  WOULD REFUSE: {reason}")
        print("  re-encode command, if the clock is not flat:\n    "
              + ffmpeg_cfr_hint(video, scan["fps"]))
        return 0
    cnn_run = args.cnn_run or config.default_tracker_run()
    if not cnn_run:
        raise SystemExit("no model run on disk — a replay without a CNN cannot reach recovery, "
                         "which is the path this candidate exists to expose")
    candidate = build_candidate(video, profile, name=args.name or video.stem, cnn_run=cnn_run,
                                obs_s=args.obs_s, context=args.context, start_fen=args.start_fen,
                                every=args.geometry_every, start_frame=args.start_frame)
    path = write_candidate(candidate)
    report_deciders(candidate["moves"])
    print(f"  wrote {path} ({candidate['frames_written']} review frames) — confirmed: false")
    print("  -> review it in the web UI (Dataset -> Sessions -> Real games) before anything "
          "downstream may use it")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
