# 41 — Status

| Phase | State | Note |
|---|---|---|
| 00 — a ruler you can trust | `todo` | absolute, truth-calibrated alignment gate; blocks everything else |
| 01 — find the grid | `todo` | 2D line/lattice detection on real footage, coarse→fine, per-frame allowed |
| 02 — both trackers | `todo` | Python live warp to Android parity; `board_corners_from_lines` wired or deleted |

## Measured before the pack was written

All on `data/testclip-raw/VID_20260802_222741.mp4`, profile `phone` (board_size 800, cell 100 px).

| Measurement | Value |
|---|---|
| Markers decoded per frame, all 9576 | 3 of 4 — ids 0, 1, 3; id 2 (`h1`) never |
| Worst square offset, 3-marker affine quad | 26.9 / 28.0 / 28.5 / 32.5 / 32.5 / 32.7 px |
| Worst square offset after `alignment.correct_quad` | 5.1 / 11.1 / 12.1 / 13.6 / 13.6 / 13.6 px |
| Worst square offset, direct 7x7 lattice refit (inner lines only, 4 iters) | 11.1 / 12.6 / 13.0 / 13.5 / 17.6 / 18.0 px — **worse** |
| Same refit including the pinned outer lines | 14.1 / 14.5 / 17.1 / 17.3 / 18.5 / **31.7** px — worse still, and worse than its own input once |
| Grid lines located, current warp | x **9/9**, y **8/9** |
| Line residual vs the ideal grid | x max 9.4 px (mean -4.9), y max 18.9 px (mean +6.2) |
| Changed squares at t=3.0 s, static board — marker quad | 7, `stuck=too_many_changed` |
| Changed squares at t=3.0 s, static board — grid-corrected quad | 6, `stuck=no_legal_move` |
| Per-corner shift, marker quad -> grid-corrected quad | a8 22.3 · h8 10.2 · h1 27.1 · a1 7.6 px |

## Corrections to earlier records

- **"0-8 of 14 grid lines located"** (`specs/40/STATUS.md`, "Corrections to the spec") is wrong for
  this board. Re-measured: **9/9 and 8/9**. The earlier probe passed a single-channel image to
  `line_positions`, which calls `cvtColor(..., BGR2GRAY)` on it and raises; the failure was read as
  "the lines are not there". The user said the lines were excellent and drew all fourteen by hand,
  which is what prompted the re-measurement.
- `worst_offset` has a known blind spot in this exact direction: `line_positions` pins index 0 and 8
  at 0 and `board_size`, so a uniform SCALE error reads short. Every number above is a lower bound.
