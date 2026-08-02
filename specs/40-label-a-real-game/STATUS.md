# 40 — Status

| Phase | State | Note |
|---|---|---|
| 00 — a candidate the machine cannot vouch for | `done` | the candidate it writes for the real game has **zero moves**; that is the headline result |
| 01 — the game you review | `done` | built and tested; **never exercised by a human on real data**, because 00 produced nothing to review |
| 02 — the clip the harnesses run | `partial` | `--adopt` + the Kotlin margin defect are done; excerpts and the real manifest entry are **blocked** — there is no confirmable candidate |

## The headline measurement, and it is not the one the pack expected

**The 2026-08-02 game commits nothing.** 9576 frames, 5:19, the shipped `id35-80` twin
(`occ-v10bn35-13c-hn`) attached, the median ArUco quad, the profile's margin, the device's
CNN frame counters — **0 plies committed**, against the live game's 55 recoveries in 91 moves.

Everything that was suspected first was measured and cleared:

| Suspicion | Measurement | Verdict |
|---|---|---|
| the quad is wrong | p90 **0.93** rectified px against the median quad | cleared |
| the board is transposed / not at the start | frame 0 warped and labelled; start position, a8 top-left | cleared |
| `margin` is wrong | checkerboard light/dark separation **131-132** at every margin 0.00-0.10 | cleared, and margin barely bites on this footage |
| the source is variable-rate | p90 **0.000 ms**, one dropped frame in 9576 | cleared |
| the camera is still settling | mean luma flat at ~81 over the first 30 s | cleared |
| `replay_clip_cnn`'s observer cuts the warp the way `_cnn_snapshot` forbids | it does — and fixing it produced **byte-identical** output | real defect, **not** this cause; reverted, recorded |

**What it actually is.** At 3.0 s, on a physically static board before a single move, **7 squares
already read `changed`** — `a2` 9.9, `b1` 9.1, `a1` 4.9, `b2` 4.8 — and `max_changed` is 6. The
diff path is therefore jammed from the first settle, `stuck=too_many_changed` forever, and each
real move then adds its own squares permanently because the reference never re-anchors: 7 → 12 →
15 → 19 → 23 as the game goes on. `cnn_status` reads `mismatch` throughout.

The mechanism is in `SquareNoise`. Its own docstring describes this failure and names one of these
squares: *"a flat square whose census tie-flip noise fires from frame one is excluded from learning,
so the model can never absorb the jitter and it stays hot forever (observed live: empty b1/b8)"*.
The gray channel passes `exclude_alpha_scale = 0.0`, i.e. **a square that fires is excluded from
learning entirely**, so a square hot during the first frames — while `init_std = 6.0` still makes
everything over-sensitive — can never be learned away.

Raising the threshold does not rescue it: `z_thr` 6, `z_thr` 10, and `z_thr` 6 with
`max_changed` 10 all still commit **nothing** over the first 120 s.

**This is the blind spot the pack was written to find, and it is worse than expected.** The
corpus is Blender renders where this cannot happen; the real board cannot start. But note the
asymmetry with the live run: the same board on the phone committed 91 moves. The replay and the
live tracker disagree about the same physical game, and *that* is now the open question.

**No tracker knob was touched and no override was used to manufacture a move list.** The spec is
explicit that a real clip which cannot commit at the defaults is a finding about the defaults or
the footage, "never bought off with an override" — so the candidate on disk has `moves: []`.

## Numbers measured

Video `data/testclip-raw/VID_20260802_222741.mp4`, 1080×1920, 30 fps, 9576 frames, profile
`phone` (board_size 800, margin 0.05, re-created at 1080×1920 on 2026-08-02 20:38).

| Measurement | Where | Value |
|---|---|---|
| ArUco detection rate over a real game video | phase 00 | **9571 / 9576 = 99.9 %** |
| Per-frame quad spread about the median quad (rectified px, cell = 100) | phase 00 | **median 0.57 / p90 0.93 / max 41.20** |
| — distribution | | 98.0 % < 2 px · 0.5 % 2-4 · 0.1 % 4-8 · 0 % 8-16 · **1.4 % > 16** |
| — where the outliers are | | 144 frames over 4 px in **26 runs**; longest 466-530 (65 frames, 15.5-17.7 s), then 15, 10, 7, 4, 4 |
| Nominal vs realised inter-frame interval | phase 00 | **median 0.000 / p90 0.000 / max 33.333 ms** (nominal 33.33) — exactly one dropped frame in 9576 |
| Refusal threshold for quad spread | chosen from the above | **p90 ≤ 4.0 rectified px** (4× the measured p90; under the 3.2-6.5 px band `data-pipeline` §12 calls damaging) |
| Refusal threshold for fps jitter | chosen from the above | **p90 ≤ 10 % of a frame period** (3.33 ms at 30 fps) |
| Replay's `decider` tally vs live 55-of-91 | phase 00 acceptance | **0 commits of any decider**; 958 CNN observations, 0 alarms |
| Lead-in frames an excerpt needs | phase 02 | **not measured — blocked**, no committed move to cut around |
| Real excerpt size against the 11 MB budget | phase 02 | **not measured — blocked**, same reason |

Both thresholds are gated at **p90 and not at max**, deliberately. The quad's 41 px worst frame is
one of 137 in short runs where a hand covers a marker, and the fixture warps every frame through
the one static quad regardless; the clock's 33.333 ms outlier is exactly one frame period. A max
gate would refuse footage that is, for every purpose the virtual clock has, perfectly good. The
run listing is printed so a *nudged board* (one long run — cut the clip there) can be told from an
*occluded marker* (many short ones — ignore), which the distribution alone cannot do.

## Corrections to the spec

- **`ClipDriver` takes a SCALAR margin, and a profile carries four.** `emit_parity_fixtures`
  does `float(entry.get("margin", 0.0))`, which raises `TypeError` on the profile's
  `[0.05, 0.05, 0.05, 0.05]`. The spec's `--profile`-supplies-margin design is right but needed
  `scalar_margin`, which refuses a genuinely per-corner profile rather than averaging it — a
  manifest entry has never been able to express four.
- **The spread cannot be measured "via `alignment`".** `alignment` locates the board's physical
  GROOVES, and this board has none that it can find: 0-8 of 14 lines located, and its numbers on
  this footage (13-20 px median) are unreliable fallbacks. Both quads are known here, so the
  deviation is exact arithmetic through the reference homography instead.
- **`fen_after` per commit cannot be `mt.board.fen()`.** That is the position after the LAST move
  of a batch, and a recovery bridge pushes several; stamping it on every ply shows the wrong board
  for all but one. `_fens_after` replays the batch on a copy.
- **The `..` traversal test cannot be an HTTP test.** An HTTP client collapses `..` before the
  request is sent (`GET /api/realgames/..` arrives as `GET /api`, 200 from the SPA catch-all), so
  a route-level assertion passes with no check present at all. Asserted on `_game_dir`, with the
  percent-encoded forms — which do survive — covered over HTTP.
- **The coordinator's diagnosis of `replay_clip.py` was wrong in mechanism, right in outcome.**
  `live_align = False` there fires only when a caller passes `corners=`; the CLI passes none, so
  that run had live alignment ON. The zero-move outcome nevertheless reproduces on this pack's
  entirely different path.

## Confirmed from the spec

- `frame_labels` has one consumer (`truthFenOf`) feeding `ObsAudit`, which asserts nothing.
- **20 of the 21 committed manifest entries set `min_grid_line_coverage: 0.0`** — the grid gate is
  off across the whole corpus, exactly as the pack claims.
- `ClipPipeline` built `BoardGeometry(boardSize = clip.boardSize)` with `margin` defaulting to
  `margins4(0.0)`. Fixed.

## What a human must do by hand

**No test in this project composes a UI.** The gates say nothing about whether the page renders.

1. `uv run chesslab web`, Dataset → Sessions, scroll past the session table to **Real games**.
2. `game-2026-08-02` is there and will show *"The tracker committed no moves on this video"*.
   That is the correct display of the real result, and it is all the real data can currently show.
3. To exercise the review view properly, a candidate with moves is needed — which needs the
   zero-commit cause fixed first.

**What would tell you the review view is lying:** the board picture and the frame picture
disagreeing about which move just happened (the board is drawn from the replayed line, the JPEG
from the recorded frame index — they are independent, so a mismatch means the `frame` stamps are
wrong); a ply badged `impossible` that is not the FIRST unreplayable one; `Confirm` succeeding
while any move is red; or the tier counts not summing to the ply count.

## Not this pack's, and noticed

- `replay_clip_cnn._Observer` warps at `board_size`, greys there and downsamples after — the
  pipeline `tracker._cnn_snapshot` warns costs "5-11 squares above z_thr on a physically unchanged
  board". Measured here: fixing it changes nothing on this clip. Left commented, not fixed.
- `/api/sessions/{sid}/slice` and `/api/reslice` reach the filesystem with no `_safe_id`
  (pre-existing, carried over from the spec's own note).
- A `tracker: {}` manifest entry and the recorded `effectiveConfig` **disagree about
  `settle/avg/confirm_frames`**: the Python harness builds with `cnn_run=None` (4/3/2) while the
  candidate records the CNN-attached 3/2/1. Nothing depends on it yet — no real entry exists —
  but the first one will.
