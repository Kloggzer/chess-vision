# 02 — Both trackers, and the dead code decided

Only after 00 and 01 have a passing gate and a committing replay.

## Python

`MoveTracker._warp` goes through `board_corners_for_frame` — markers only, no grid anywhere. The
grid work exists (`alignment.improve_quad`, `square_offsets`, `correct_quad`) and is wired into the
web session-repair path and offline scripts alone. Bring the live warp to at least Android's
standard.

Watch the cadence knobs that already exist rather than adding new ones: `live_align`, `align_every`
(3), `align_scale` (0.5).

## Android

`LiveAlign.correction` already fits a rectified-space grid correction once per pose, with
`fittedAt` guarding it against the pose moving underneath. Whatever 01 produces has to land here
too, and the KDoc's reasoning about per-pose validity is load-bearing — read it before changing it.

Constraints that are not negotiable: `:core-engine` stays pure (chesslib + Kotlin stdlib, single
thread, no wall clock, no `synchronized`/`Atomic*`/`Mutex`/`@Volatile` — `ClasspathPurityTest`
enforces it by regex). Geometry lives in `:app`/`:core-geometry`, not in the engine.

## The dead detector, decided either way

`board_corners_from_lines` (Python) and its port `BoardDetector` (Android) are called by NOTHING.
vulture reports the Python one as `unused function` at confidence 60; the configured gate runs at
80 and cannot see it. Only `scripts/dump_warp.py` touches it.

Two honest outcomes, no third:

- **Wire it** as the cold-start source, in both, so a board can be found without markers at all.
  Its own docstring says lines cannot tell 90° from 180°, so it needs an orientation anchor — see
  `specs/15-markerless-board-geometry` and the two candidates in the markerless memory note
  (brightness mean of the start position; CNN colour+occupancy).
- **Delete it**, in both, and say in `CLAUDE.md` that markers are the geometry source. Dead code in
  two languages that everybody believes is working is worse than no code.

The project rule applies: delete rather than hide behind a flag.

## Acceptance

- Both trackers refuse or loudly flag a quad reconstructed from fewer than four markers. The Python
  script path is done (`raw_corners`, 2026-08-03); the live paths are not.
- The 18 Blender clips replay with **zero divergence**. That harness caught five real bugs and is
  the thing that says a geometry change did not move anything it should not have.
- The Android gate green with `--rerun-tasks`: `:app:ktlintCheck :app:detekt :core-engine:detekt
  :core-engine:ktlintCheck :core-engine:test :app:testDebugUnitTest`. Gradle reports green on stale
  tasks; a gate without `--rerun-tasks` is not a gate.
- `uv run pytest -q`, `uv run ruff check src tests synth`, `uv run vulture` all clean.
