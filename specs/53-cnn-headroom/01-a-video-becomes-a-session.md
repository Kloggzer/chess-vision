# Phase 01 — A video becomes a session

> Owns `chesslab realgames export-session` in `src/chesslab/realgames.py` (extends phase 00's
> module per the ownership registry) and the exported artifact `data/sessions/rg-<name>/`.
> Depends on 00 (confirmed candidates). Lands alone: 02 and 03 read its output.

## Why

The corpus's 23 sessions are rig/daylight captures; the evening domain and every occlusion
window exist only in the videos, and no pipeline extracts them (DIRECTION.md findings 2, 5-7).
`candidate.json` already carries everything a session needs — median quad in image pixels
(`geometry.corners`, `[a8,h8,h1,a1]`), the FEN timeline (`moves[].fen_after` + `frame`), fps,
frame size — and `chesslab slice` is the one consumer that must keep working unmodified.

## Design (decided — do not redesign)

```
chesslab realgames export-session <name> [--quiet-margin-s 1.0] [--dirty] [--every 3]
```

Refuses unless `confirmed: true` (phase 00's gate is the whole point).

**Interval model.** Reviewed ply i at frame f_i with `fen_after` F_i defines the interval
[f_i + margin, f_{i+1} − margin) in which the position is KNOWN to be F_i. `--quiet-margin-s`
(default 1.0 s, i.e. 30 frames) is the declared hand margin around commits.

**Two row populations, one log:**

- **Quiet rows** (always): every `--every`-th frame inside the margins. Plain rows —
  `{"frame": "frames/004211.png", "ply": i, "fen": F_i, "ts": …, "corners": <median quad>,
  "corners_source": "realgame-export"}`. These carry the night-domain positives.
- **Dirty rows** (`--dirty`, default ON — the user amendment): every `--every`-th frame INSIDE
  the margins (the commit windows). Same shape PLUS `"dirty": true`. A shadowed piece is still
  that piece, so the FEN label stands; which squares are actually under an occluder is phase
  02's proposal and phase 03's correction — the exporter itself never guesses occlusion.
  `slice` ignores unknown keys in log rows, so `dirty` is inert to it (verify: grep
  `slice_session` in `labeling.py:289` reads only frame/fen/corners/labels/unusable).

**session.yaml**: `session_id: rg-<name>`, `mode: track`, `profile: desktop`,
`frame_size` from `geometry.frame_size`, `notes: "exported from data/realgames/<name>
(specs/53-01)"`, `reviewed: true`. Frames decoded with cv2 sequentially (never seek —
the 2026-08-06 stale-index defect class), written as `frames/NNNNNN.png` (source frame index,
6 digits, matching the review-PNG convention).

**The yield gate.** After export, print and record in STATUS: raw rows, distinct
(square,label) cells, capped estimate at `per_cell_cap=4` and 16 — against DIRECTION.md's
table (~2,300 @cap4 quiet-only was the estimate; dirty rows are additive). No dataset build in
this phase.

## Steps

### 1. Export implementation — commit `feat(realgames): export-session — a confirmed video becomes a session slice can eat`

### 2. Yield report — same commit

`--report-only` flag that computes the table without writing frames (cheap re-runs).

### 3. Tests — commit `test(realgames): the exporter conforms to slice, not the reverse`

## Tests (write, run once, targeted)

`uv run pytest tests/test_realgames.py -q`

- `export_refuses_unconfirmed`.
- `intervals_respect_the_margin`: synthetic candidate with 2 plies, margin 1 s → no quiet row
  within 30 frames of a commit frame.
- `dirty_rows_carry_the_flag_and_the_interval_fen`.
- `slice_runs_unmodified`: build a 3-frame toy session via the exporter's row writer, run
  `slice_session` (`labeling.py:289`) on it → rows land, zero code changes in `labeling.py`
  (the test imports it untouched).

## Acceptance criteria

- `uv run chesslab realgames export-session rec-20260808-003957` produces
  `data/sessions/rg-rec-20260808-003957/{session.yaml,log.jsonl,frames/}` and
  `uv run chesslab slice --session rg-rec-20260808-003957` (exact flag per `run_slice`'s CLI)
  completes with a non-zero row count and **zero modifications** to `src/chesslab/labeling.py`
  (`git diff --stat src/chesslab/labeling.py` empty).
- The yield table is in STATUS.md, raw/unique/capped, quiet vs dirty separated.
- Targeted tests green; no new ruff findings.

## Do NOT

- Do not touch `labeling.py`, `sessions.py`, or slice semantics — the exporter conforms.
- Do not emit `labels:` dicts or any occlusion guess (phase 02/03 own that via corrections).
- Do not build a dataset or train anything.
- Do not decode via frame seeking; sequential only.
