# 15 — Markerless board detection under motion + piece occlusion (Python tracker)

> Entry file for the spec pack. The implementing agent reads THIS file completely,
> then exactly one phase file. Python reference tracker + calibration only
> (`src/chesslab/`); the Android port picks this up in a later pack.

## What this is

User requirement (approved 2026-07-19): locate the chessboard **without ArUco markers on
the board**, working in a **moving environment** (gentle drift AND continuous handheld
motion) **with pieces occluding squares**. ArUco stays available as a recovery/orientation
fallback. Desktop Python/OpenCV first; keep deps OpenCV-only so an Android port stays
feasible.

Today all per-frame geometry is ArUco-only: `board_corners_for_frame`
(`calibration.py:780`) is the sole producer of the `[a8,h8,h1,a1]` corner list, consumed at
exactly one place — `MoveTracker._warp` (`tracker.py:916-931`). A markerless **line**
detector already exists (`board_corners_from_lines`, `calibration.py:646`) with the *same
return contract*, but is **dead code** (no caller, no tests).

Pure per-frame geometric detection tops out ~34–50 % under motion+occlusion+low angle
(chesscog literature). The robust design is **detect-and-track**: lock the board when a
frame allows, then track the rigid board frame-to-frame via optical flow + homography
(occlusion only hides a subset of points), re-detect on loss, and re-anchor orientation
from ArUco/proximity. This pack builds a `BoardGeometryTracker` engine behind the existing
seam so the ArUco path stays the byte-for-byte default.

**The producer contract every detector and the engine must honor** (unchanged):
```
-> list[[x, y], [x, y], [x, y], [x, y]] | None      # 4 points a8,h8,h1,a1 in FRAME pixels, pre-margin
```
`compute_homography` (`calibration.py:290`) fixes the convention: a8=TL, h8=TR, h1=BR, a1=BL.

## Phases and dependencies

| Phase | File | Concern | Depends on | Model |
|---|---|---|---|---|
| 00 | `00-detection-probe.md` | Saddle/SB markerless detector + visual montage probe vs lines/ArUco; **decide the detector stack** | — | (Claude — risk gate) |
| 01 | `01-detect-and-track-engine.md` | `BoardGeometryTracker`: LK tracking + homography update + recovery FSM + MarkerTracker smoothing | 00 | flash |
| 02 | `02-orientation.md` | Bootstrap a8 anchor (ArUco / proximity / operator confirm) + carry via tracking + re-anchor on re-detect | 01 | flash |
| 03 | `03-tracker-wiring.md` | Wire engine into `MoveTracker._warp` as selectable `geometry_source`; config + CLI | 01, 02 | flash |
| 04 | `04-evaluation.md` | Synthetic moving+occluded ground-truth harness; hit/track/RMSE vs ArUco | 03 | flash |

**Sequential.** 00 is the risk gate — its measured hit-rate decides whether 01 leans on SB,
raw saddles, or lines. 01→02→03 all build/edit `board_geometry.py`; 03 also edits
`tracker.py`/`config.py`/`cli.py`. Run in order.

## Protocol for implementing agents

- Work on branch **`markerless-board-geometry`**, branched from current `main`
  (must already contain the camera-lib work — `src/chesslab/camera.py`). Never commit to `main`.
- Trust the code over this spec; anchors carry symbol names because line numbers drift.
  Record any discrepancy in `STATUS.md`.
- If blocked, STOP, write the blocker to `STATUS.md`, do not improvise.
- Delegated agents must NOT `git commit` — the supervisor (Claude) reviews and commits with
  the names in each phase's Steps.
- Do not touch `android/**`, `src/chesslab/web/**`, or other specs. Reading is fine.
- No scratch files in the repo root — use a temp dir. Probe montages go under a gitignored
  path (`data/` or a temp dir), never committed.

## Git hygiene (binding)

Atomic conventional commits exactly as named in the Steps; stage explicitly
(`git add <paths>`), never `git add -A`; never `--no-verify` / force-push / `git reset
--hard`. Commit everything before any external-agent handoff. New module `board_geometry.py`
is the shared file across 01/02/03 — serialize, do not run those phases in parallel.

## Memory-constraint contract (non-negotiable)

- Tests once, targeted:
  `.venv/Scripts/python.exe -m pytest tests/test_board_geometry.py tests/test_move_tracker.py -q`
  (NOT `uv run` from a delegated agent). No full suite, no frontend build, no training code.
- Lint once, scoped:
  `.venv/Scripts/python.exe -m ruff check src/chesslab/board_geometry.py src/chesslab/move_tracker tests/test_board_geometry.py`
  Zero NEW findings; no `# noqa` additions to get green.

## Dependency management

No new dependencies — `cv2` + `numpy` only (both already in `pyproject.toml`). Anything else
= STOP + STATUS.md note. Do NOT hand-edit `uv.lock`.

## Repo rules you will actually hit

- **Corner order is sacred:** every detector/engine output is `[a8,h8,h1,a1]` = `[TL,TR,BR,BL]`
  in frame pixels, pre-margin — the exact shape `board_corners_for_frame` returns. Downstream
  (`warp_from_corners`, `_square_to_col_row`, crop boxes) assumes it; a wrong rotation silently
  transposes all labels (CLAUDE.md pitfall).
- **`white_pov` is NOT orientation of detection** — it only remaps square→cell in
  `_square_to_col_row` (`calibration.py:226`). Board *corner* orientation is a separate concern
  owned by phase 02.
- **Never run detection/inference under `self.lock`** in the tracker (existing invariant).
- `status()` keys are additive only — the web UI polls them.
- Reuse, do not reimplement: `resolve_board_corners` (`calibration.py:415`), `compute_homography`
  (`:290`), `warp_from_corners` (`:823`), `_finish_quad` orientation-by-proximity (`:740`),
  `MarkerTracker` EMA/hold/jump (`:459`); `_corners_jumped` (`tracker.py:2096`),
  `_grid_line_coverage` (`tracker.py:1041`), the `align_every`/`align_scale`/`detect_scale`
  cadence.
- English code/comments; match existing comment density.

## Definition of done (per phase)

Acceptance criteria pass, targeted tests green, scoped ruff clean, STATUS.md updated.
Orchestrator runs the full gate `uv run pytest -q` + `uv run ruff check src tests synth` and
commits.
