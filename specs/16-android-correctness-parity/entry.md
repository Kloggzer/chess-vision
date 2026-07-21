# 16 — Android correctness parity (port of the 2026-07-21 Python tracker fixes)

> Entry file for the spec pack. The implementing agent reads THIS file completely,
> then exactly one phase file. All phases port **fresh, tested Python reference
> implementations** into the Kotlin app — the Python side is the source of truth
> for behaviour; each phase names its reference commit and function.

## What this is

A 2026-07-21 live-play session on the desktop tracker exposed four correctness
holes; all four were fixed (with regression tests) in the Python tracker the same
day. An audit of `android/` confirmed the Kotlin app has exactly the same holes.
This pack ports them, plus one UX phase.

Python references (all on `main`):

| Commit | What it fixed |
|---|---|
| `165726b` | pair verify was all-or-nothing whole-board → endless discard/re-fire loop under one chronic misread (`tracker.py::_verify_pair_tick`) |
| `de6f84c` | noise model kept LEARNING while the illegal-move alarm was latched → alarm "healed" by drift (`tracker.py` step-4 noise gate) |
| `21cf63c` | quiet re-anchor had no CNN guard → a rejected-but-real move (Bxc3) was silently baked into the reference, permanent desync without alarm (`tracker.py` quiet-re-anchor block) |
| `dba6f29`/`43fa7bb` | a throwing/dying camera read killed the loop instead of reaching the reconnect path |
| `779fb86`/`6e31e35` | UX: accept-CNN-position preview (per-square change list) + exact-CNN-crops debug view |

## Phases and dependencies

| Phase | File | Concern | Module / files | Depends on |
|---|---|---|---|---|
| 00 | `00-pair-verify.md` | pair fast-accept, window-end parity fallback, pair vote guard | app: `cnn/OccupancyVerifier.kt`, `cnn/CnnSafeguard.kt` | — |
| 01 | `01-alarm-noise-freeze.md` | freeze noise/census learning while alarmed | engine: `Detector.kt` | — |
| 02 | `02-reanchor-cnn-veto.md` | quiet re-anchor vetoed by confident CNN occupancy conflict | engine: `Detector.kt`, `TrackerEngine.kt`, app: `service/CnnIntegration.kt` | 01 (same file) |
| 03 | `03-camera-reconnect.md` | CameraState error observer + rebind backoff | app: `camera/TrackerCamera.kt`, `service/TrackerService.kt` | — |
| 04 | `04-alarm-ux.md` | accept-CNN preview action, red board tint, in-app crops/reads debug | app: `ui/TrackingScreen.kt`, `service/*`, `cnn/*` | 02 (uses the conflict plumbing) |

**Execution: one agent, sequential 00 → 01 → 02 → 03 → 04.** 01 and 02 both edit
`engine/Detector.kt` — never run them in parallel. 04 is lowest priority: skip it
(leave `todo` in STATUS.md) if any earlier phase is blocked.

## Protocol for implementing agents

- Work on branch **`android-correctness-parity`**, branched from current `main`.
  Never commit to `main`.
- The implementing agent does **NOT `git commit`** — the supervisor (main session)
  reviews and commits with the names given in each phase's Steps. Leave the working
  tree with all phase changes in place and STATUS.md updated.
- Trust the code over this spec when they disagree — anchors are paired with symbol
  names; line numbers may have drifted. Record every discrepancy in `STATUS.md`.
- If blocked, STOP, write the blocker to `STATUS.md`, do not improvise.
- Update your phase row in `STATUS.md` (`todo → in_progress → done`) and append a
  session-log line when done.
- Do not touch `src/chesslab/**` (Python side is FROZEN reference), `specs/**`
  except `STATUS.md`, `synth/**`, `scripts/**`.

## Build & test contract (memory-constrained; one agent, scoped gates)

- Shell: **PowerShell** for gradle (`cd android; .\gradlew.bat <task>` — git-bash
  mangles the wrapper). First build may need `git submodule update --init` for the
  Stockfish sources (known gotcha).
- Per phase run ONLY the scoped tests, once:
  - engine phases: `.\gradlew.bat :engine:test --tests "com.chesslab.engine.*"`
    (or narrower `--tests` per phase file).
  - app phases: `.\gradlew.bat :app:testDebugUnitTest --tests "<class>"`.
- `assembleDebug` is run ONCE at the very end (after phase 03 or 04), not per phase.
- New unit tests mirror the named Python tests in `tests/test_move_tracker.py` —
  same scenario names, same assertions, Kotlin idioms.

## Static-analysis contract

ktlint + detekt are configured at the android root (`android/build.gradle.kts:8-20`,
config in `android/config/detekt/detekt.yml`). Per phase, at the end:
`.\gradlew.bat :<module>:ktlintFormat` (formatter owns style — never hand-edit
style findings) and `.\gradlew.bat :<module>:detekt`. Zero NEW findings; no
`@Suppress` or baseline additions to get green — fix or record a blocker.

## Git hygiene (binding)

- One branch (`android-correctness-parity`); atomic conventional commits exactly
  as named in Steps (done by the supervisor); no drive-by changes outside the
  phase's declared files; never `git add -A`.
- `android/engine/bin/**` and `android/**/build/**` are build output — must never
  be staged (verify `.gitignore` covers them before the first commit).

## Definition of done (per phase)

Phase file's acceptance criteria all pass, scoped tests green, ktlint/detekt clean
for the touched module, STATUS.md row `done` with a one-line summary. The
supervisor runs the full gate (assembleDebug + full :engine:test + :app:testDebugUnitTest)
after the last phase.
