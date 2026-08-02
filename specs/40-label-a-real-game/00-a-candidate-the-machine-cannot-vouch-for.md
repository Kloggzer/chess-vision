# 00 — A candidate the machine cannot vouch for

> Owns `scripts/label_real_game.py` (new), the return shape of `scripts/replay_clip_cnn.py::run`,
> and `tests/test_real_game_candidate.py` (new). Land first: phase 01 reviews what this writes.

## Why

To review a game you need a game to review, and the only thing that can propose one from a video is
the tracker. Everything needed to drive it already exists and none of it is wired together:

- `scripts/replay_clip_cnn.py::run` (`:85-140`) replays a clip deterministically **with a real CNN
  attached** — the only offline instrument that can reach `_cnn_tick`, i.e. recovery. Its docstring
  (`:5-12`) exists because `emit_parity_fixtures.py:272` and `sweep_clip_params.py` both hard-code
  `cnn_run=None`, so the paths this pack cares about "have never been replayable off-device". It
  returns `commits` as `(video_time, san, decider)` **per ply** (`:127-131`), already attributing a
  bridge's decider to every move in it.
- `raw_corners` (`scripts/ingest_video_session.py:46-63`) resolves a board quad from one frame's
  ArUco markers alone, with the reason a `MarkerTracker` is wrong here written out at `:49-56`.
- `scripts/check_alignment.py::frame_offsets` / `judge` measures how far a frame's squares sit from
  the grid the quad implies. `src/chesslab/alignment.py` is the band-wise version calibrated against
  analytic truth in `tests/test_alignment.py`; the pre-2026-07-31 metric collapsed each axis and was
  **silent on rotation and shear** — 0.01 px reported for a 3.05 px shear (`CLAUDE.md`, and
  `docs/data-pipeline.md` §12).

What is missing is the step that measures the geometry, runs the replay, and writes down what came
out **as a proposal rather than a result**.

## Design

One script. `data/` in, `data/` out, nothing committed, nothing asserted.

```
uv run python scripts/label_real_game.py data/testclips/game-2026-08-02.mp4 \
    --profile phone --name game-2026-08-02 [--start-fen FEN] [--cnn-run RUN] [--obs-s 0.30]
```

writes `data/realgames/<name>/` containing `candidate.json` and `frames/`.

### The geometry is measured, and the measurement is the gate

Detect the quad on every decoded frame (`raw_corners`, not the `MarkerTracker` — the docstring at
`ingest_video_session.py:49-56` records why a tracker shears a moving board, and a real game is
filmed over tens of minutes during which a board does get nudged). Then:

- **`corners`** is the per-corner **median** across all frames that detected. Median, not mean: a
  single mis-detected marker is a large outlier and there is no reason to let it move the quad.
- **`margin`** comes from the calibration profile, not from a constant. This is the one number that
  jams a real clip silently: ArUco markers sit in the label border, so the detected quad lies
  *outside* the playing field, and replaying at `margin = 0.0` oversizes the board by 6–8 % — the
  grid lines then miss `_grid_line_coverage`'s band and the tracker sits in `occluded` forever,
  **2232 of 2996 frames, zero commits** (`emit_parity_fixtures.py:244-252`, fixed there in
  `721901a`; same note at `replay_clip.py:61-67`).
- **Report, then gate.** The detection rate, and the per-frame quads' spread about the chosen one
  in rectified pixels via `alignment`, printed as a distribution the way
  `ingest_video_session.py::report_alignment` (`:66-100`) already prints one.

**The refusal thresholds are not known and must not be invented.** No real game footage exists in
this repository to calibrate against, and the nearest numbers on record — the 3.2–6.5 px median
square-edge offsets of `docs/data-pipeline.md` §12 — measure a different quantity (per-frame quads
that were each fitted, not one static quad's error across a clip). So: **the first run prints the
distribution and gates on nothing.** Record the numbers in `STATUS.md`, then choose a threshold in a
follow-up commit and say in the code comment which run it came from. A plausible constant here
would be the fourth time this project has shipped a number nobody measured.

### The frame rate is the clock, so it is checked

Read `CAP_PROP_FPS` and also walk the per-frame `CAP_PROP_POS_MSEC`. If the realised inter-frame
intervals disagree with the nominal rate beyond a tolerance, **refuse and print the ffmpeg command**
that re-encodes to constant rate. Do not correct it in-process: the virtual clock advances a fixed
`1.0/fps` per frame (`replay_clip_cnn.py:121`) and every wall-clock knob the tracker has is measured
against that, so a VFR source does not produce a slightly-off replay, it produces a replay whose
`motionHoldS` means something different in every second of the video.

Same honesty as above: **the tolerance is a measurement.** First run prints the observed spread.

### The replay is the existing one, extended by what it already has in hand

`replay_clip_cnn.run` returns `commits`, `history`, `fen`, `note`, `observations`, `frames`
(`:132-134`). Three additions, all read off state the function is already holding:

1. **`fen_after` per commit.** `mt.board.fen()` at the commit, so a reviewer can be shown the
   position without re-deriving it — and so a candidate whose line does not replay is still
   *displayable*.
2. **`alarm` per commit.** Polled from `mt.status()["alarm"]` at the commit. This is the tier the
   ranking needs and **no decision row on either platform carries it** — not `DecisionRecord`
   (`EngineState.kt:444-473`), not the persisted `DiagnosticsRecords.DecisionRow` (`:100-128`), not
   Python's record (`tracker.py:2799-2826`). It is available here only because this harness drives
   the loop itself. Name it in the artefact for what it is: an observation this pass made.
3. **`frame` per commit**, the decoded index. `commits` currently carries video seconds; the review
   page wants a picture, and an index addresses one exactly where a time does not.

`run` already takes an `on_event(now, mt)` hook (`:83, 130-131`) — use it rather than widening the
loop. Keep the existing tuple entries in place and append; `replay_clip_cnn.py`'s `__main__`
(`:139-155`) must keep printing what it prints today.

### The frames are written during the pass, and there is no seek anywhere

While decoding — which happens once, in order — write a JPEG for every commit frame and for a small
symmetric neighbourhood around it (`--context`, default 2, i.e. five frames per move). Two reasons:
a single frame at the commit instant often shows the hand that caused it, and h.264 seeking by
frame index is approximate, so a review page that seeks would show the reviewer a *nearby* frame
while claiming it is the one. Writing during the pass costs nothing — the decode is happening
anyway — and removes video decoding from the request path entirely.

For an 83-ply game at five frames per move that is ~450 JPEGs. Under `data/`, gitignored.

### The artefact says it is unconfirmed

`candidate.json`:

```json
{
  "name": "game-2026-08-02",
  "video": "testclips/game-2026-08-02.mp4",
  "confirmed": false,
  "created_at": "2026-08-02T21:14:03Z",
  "source": {"cnn_run": "...", "obs_s": 0.30, "profile": "phone", "tracker": {}},
  "effective_config": {"...": "as the tracker actually ran it"},
  "geometry": {"corners": [[x,y],[x,y],[x,y],[x,y]], "margin": 0.06,
               "board_size": 640, "frame_size": [w, h],
               "detection_rate": 0.0, "quad_spread_px": {"median": 0.0, "p90": 0.0, "max": 0.0}},
  "clock": {"fps": 30.0, "nominal_vs_realised": {"median_ms": 0.0, "max_ms": 0.0}},
  "start_fen": "...",
  "moves": [
    {"ply": 1, "san": "e4", "uci": "e2e4", "frame": 44, "t": 1.47,
     "decider": "cnn_occupancy", "alarm": null, "fen_after": "..."}
  ],
  "note": "...",
  "observations": 0,
  "frames": 0
}
```

`confirmed` is `false` and this script never writes anything else. Only phase 01 flips it, and only
phase 02's `--adopt` reads it. `video` is stored **relative to `data/`** so nothing downstream ever
holds an absolute path from a file the web layer will later read.

`effective_config` is the config the tracker actually ran with — `_effective_config(mt)` already
exists at `emit_parity_fixtures.py:629`. Record it here because this is the only moment `mt` is in
hand, and because it is what a fixture must carry: `trackerConfigOf` (`SimClips.kt:205-252`) reads
**every** field from the fixture and no Kotlin default, so whatever a fixture records is what the
simulation runs it at forever. Phase 02 says which values belong in it and why.

**`frame_labels` is absent, and that is the decision, not an omission.** Its only consumer is
`truthFenOf` (`SimClips.kt:168-173`) feeding `ObsAudit`, which has no assertion in it
(`ObsAudit.kt:23-174`) — see `entry.md`. Writing a per-frame truth for a real game would mean
knowing the exact frame each piece landed on, which is precisely the trajectory labelling the
suite does not ask for and the human should not be made to do.

## Steps

1. **`refactor(replay): the CNN replay reports the frame, the position and the alarm`** — extend
   `replay_clip_cnn.run`'s per-commit record with `frame`, `fen_after` and `alarm`, through the
   existing `on_event` hook. `__main__`'s output is unchanged.
2. **`feat(scripts): measure a real game's geometry and clock`** — `label_real_game.py` doing the
   per-frame quad detection, the median quad, the spread report and the CFR check. Prints the
   distributions; gates on nothing yet.
3. **`feat(scripts): the tracker's proposal, written down as a proposal`** — run the replay, write
   `candidate.json` with `confirmed: false` and the review frames.

## Tests

Marked `clips` where footage is needed, so `uv run pytest -q` is unaffected
(`pyproject.toml:96`), and skipping cleanly when the video is absent the way `test_clips.py:26-38`
does.

Unmarked, no footage required — these are the ones that matter:

- The median quad of a set of per-frame quads with one gross outlier equals the quad without the
  outlier, to within a stated tolerance. (Synthetic input; this is why it is a median.)
- A candidate written by the script always has `confirmed: false`. Assert on the written file, not
  on an in-memory object — the invariant belongs to the artefact.
- `video` in a written candidate is relative and contains no `..` and no drive letter.
- The CFR check refuses a synthetic timestamp series with a large jitter and accepts a uniform one.
- A candidate whose moves do not replay legally from `start_fen` is still written. **The script does
  not judge the line** — that is phase 01's job and the human's, and a candidate that refused to
  record an illegal line would hide the single most useful signal there is.

Marked `clips`:

- End to end on one real video: the candidate has as many `moves` entries as `history` has SANs, and
  every entry has a `frame` that indexes a JPEG that exists on disk.

## Acceptance

- `uv run python scripts/label_real_game.py <video> --profile phone --name <n>` writes
  `data/realgames/<n>/candidate.json` plus `frames/`, and prints the detection rate, the quad
  spread and the fps check.
- Running it twice on the same video with the same arguments produces byte-identical
  `candidate.json` apart from `created_at`. If it does not, the replay is not deterministic and the
  cause is a finding — record it, do not add a sort.
- On the 2026-08-02 game (or the first real video available), the candidate's `decider` tally is
  recorded in `STATUS.md` beside the live figure of 55 recoveries in 91 moves. **These need not
  match** — the live run had a different model, a different pacing and a live camera. A large
  divergence is a measurement about the replay's fidelity and is exactly what this pack wants to
  know before it builds a fixture on it.
- `uv run ruff check src tests synth scripts` and `uv run vulture` clean; `uv run pytest -q` green.

## Do NOT

- **Do not touch `scripts/ingest_video_session.py`.** It builds a session directory of sampled
  frames; a clip is consumed as a video at full rate through one fixed quad. See `entry.md`.
- **Do not modify `src/chesslab/move_tracker/tracker.py`.** The one-row-per-bridge shape
  (`tracker.py:2141`, `:2556`) is a real defect and porting `specs/37` phase 00 to Python is a
  separate pack. `replay_clip_cnn.py:127-131` already gives a decider per ply and that is what this
  pack consumes.
- **Do not touch `scripts/emit_parity_fixtures.py` or `scripts/sweep_clip_params.py`.** Every
  committed parity fixture must stay byte-identical; `ClipReplayParityTest` is only meaningful
  against them (`SimClips.kt:38-48`).
- **Do not choose a refusal threshold for the quad spread or the fps jitter in this phase.** Print
  the distribution, record it, decide next. A constant nobody measured is how this project got a
  corpus that was 3–6 px mis-aligned for its entire life.
- **Do not write `frame_labels`, `phase` or `position_index`.** Nothing reads them; see `entry.md`.
- Do not commit anything under `data/`.
