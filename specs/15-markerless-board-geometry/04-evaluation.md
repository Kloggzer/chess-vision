# Phase 04 — Evaluation: markerless vs ArUco under motion + occlusion

## Why

"Works in a moving environment" needs a number, not a vibe. This phase builds a
ground-truth evaluation harness so the three geometry sources can be compared on the same
moving+occluded sequences, and so future changes (or a later learned-corner model) have a
regression baseline.

## Design (decided — do not redesign)

### 1. Synthetic ground-truth clip generator

`scripts/eval_board_geometry.py` — builds sequences with **known** per-frame corners so
error is exact and free:
- Take one board image (a real empty-board frame if available, else a synthetic warped board
  as in `test_calibration.py`).
- Generate a smooth **time-varying homography** `H_t` (translation + rotation + mild
  perspective wobble; a sinusoidal path over N frames) → warp the board into each frame.
  Ground-truth corners = `H_t` applied to the board's 4 outer corners.
- Composite piece sprites (from `synth_pieces/` renders if present, else opaque rectangles)
  onto K random squares each frame to simulate occlusion; vary K to sweep occlusion level.
- Two regimes: **drift** (slow small motion) and **handheld** (fast large motion) — the two
  the user named.

### 2. Metrics

For each geometry source (`aruco`, `markerless`, `hybrid`) over each clip:
- **lock rate** — fraction of frames returning corners (not None).
- **corner RMSE** — mean pixel distance of returned corners to ground truth, reported as a
  fraction of the cell size (board_size/8).
- **track continuity** — longest run of consecutive locked frames; count of re-detects.
Print a table; write a montage of a few overlaid frames per source (temp/gitignored).

### 3. Real footage smoke (manual, documented — not a pytest)

Document in the script `--help` and STATUS.md: run
`chesslab track --geometry-source hybrid --source <phone-url-or-clip>` on a moving, populated
board; eyeball that the grid overlay stays locked and that ArUco recovery engages when
markerless drops (memory: phone-test-feed).

## Steps

### 1. `scripts/eval_board_geometry.py` (new) — commit `feat(geometry): moving+occluded evaluation harness (markerless vs aruco)`

Clip generator + metrics + montage; `--frames`/`--source` for the seed image, `--regime
drift|handheld`, `--occlusion K`.

### 2. Record the baseline in STATUS.md (no commit) — the lock/RMSE table per source/regime.

## Tests (write, run once, targeted)

Extend `tests/test_board_geometry.py`:
1. `test_eval_harness_ground_truth_consistency` — the generator's reported ground-truth
   corners equal `H_t` applied to the board corners (sanity: the harness itself is correct).
2. `test_eval_runs_all_sources` — run a tiny 3-frame clip through the metric function for all
   three sources without error; assert the returned table has the three source rows and
   numeric lock-rate/RMSE fields.

Run once:
`.venv/Scripts/python.exe -m pytest tests/test_board_geometry.py -q`

## Acceptance criteria

- [ ] `scripts/eval_board_geometry.py` runs, prints the per-source/regime metric table, writes
      a montage.
- [ ] STATUS.md carries the measured baseline (lock rate + corner-RMSE for aruco/markerless/
      hybrid, drift + handheld).
- [ ] Harness self-consistency test passes; scoped ruff clean.

## Do NOT / Out of scope

- Do NOT gate CI on the synthetic numbers (they are a baseline, not a hard threshold).
- Do NOT train any model — the learned-corner CNN is a deferred future lever (noted in the
  plan's risks), not this pack.
- Do NOT commit montage/clip artifacts.
