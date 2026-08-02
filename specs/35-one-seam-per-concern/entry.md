# 35 — One seam per concern

> Entry file. Read completely, then your phase file. The protocol of
> `specs/34-telemetry-uplink/entry.md` applies verbatim. Branch: **`feat-telemetry-sink`**.
> This pack touches **no engine logic and no model**. It is structural.

## Why

`feat-telemetry-sink` is 93 commits over three days. Under that pace the Android app grew a habit:
when a new screen needed a thing the app already had, it got a **second answer** rather than a
shared one. Four of those doubles are now on the branch, and each one is a place where two pieces
of code must be kept in step by hand:

| the question | answer A | answer B | answer C |
|---|---|---|---|
| where does a screen pick up a service handle? | `SettingsHost` | `TrackerSessionHost` | + four more, byte-identical |
| how is a re-measured quad saved? | `CalibrationViewModel.remeasure` | `toConfirm` + `save` | `autoCalibrate` |
| where does the grid correction come from? | `QuadRefinement.correction` (dead) | `LiveAlign.onGrid` (live) | — |
| how is the analyzer frame drawn under an overlay? | `CalibrationRoute.PreviewWithOverlay` | `CameraRoute.Viewfinder` | — |
| how is a grid offset shown to a human? | `check_alignment` ×2 | `sessions.py` ×2 | (Python, phase 04) |

None of these is a bug today. Every one of them is a bug **the next time somebody edits one side**,
and three of the four already disagree in a detail nobody chose:

- `remeasure` saves an **unrefined** quad; `autoCalibrate` saves a **refined** one. Same board, same
  one-press act, two geometries. `RemeasureTest.kt:92` asserts the difference and gives no reason.
- `Viewfinder` scales the overlay by the **preview bitmap's** size; `PreviewWithOverlay` scales it by
  the **detected frame's** size. Both KDocs state the same invariant ("the overlay maps source pixels
  onto the whole box") and reach it through different numbers.
- `improveQuad` is computed twice per calibration — once at confirm (~80 ms), once again on the first
  live align — and the first result is thrown away.

The cost is not compute. It is that this project's most expensive lesson of the week
(`CLAUDE.md`: *the whole corpus was mis-aligned … and it was the thing holding the margin*) is now
enforced by whichever of three code paths the user happened to press.

## What this pack is NOT

- **Not a DI migration.** Hilt or Koin would own the handle problem, and the honest verdict is still
  no: it adds an annotation processor to `:app`'s build for six eight-line objects, and this repo's
  stated posture is a lean stack. Phase 00 removes the duplication with **zero new dependencies**.
- **Not a rewrite of the camera screen.** The screen is good and its KDoc explains why it is shaped
  the way it is. Phase 02 moves one composable and deletes a copy.
- **Not a behaviour change.** Every phase must be provable as a no-op or as *the strictly better of
  two behaviours that already exist*, and must say which in `STATUS.md`.

## Phases

| Phase | Concern | Depends on | Runs |
|---|---|---|---|
| `00-one-handle-registry.md` | six identical `*Host` singletons → one; fold `CameraLookHost` in | — | ∥ 02, 03 |
| `01-one-calibration-path.md` | three save paths → one; delete the dead correction | — | ∥ 02, 03 |
| `02-one-viewfinder.md` | two copies of the source-aspect overlay contract → one | — | ∥ 00, 01, 03 |
| `03-geometry-public-surface.md` | `:core-geometry` exports 16, `:app` consumes 4 | — | ∥ all |
| `04-one-alignment-toolkit.md` | Python: one grid tile and one offset summary, not four | — | ∥ all |

All five are disjoint by file. Phase 01 and 02 both touch `ui/camera/`, but different files
(`AutoCalibrateResult.kt` vs `CameraRoute.kt`) — coordinate through the registry below. Phase 04 is
Python only and shares nothing with 00–03; it can run on a different machine.

## Ownership registry

**This table overrides any phase file that disagrees.**

| file | owned by | notes |
|---|---|---|
| `android/app/.../settings/SettingsRepository.kt` | 00 | remove `SettingsHost` |
| `android/app/.../ui/tracking/TrackerSession.kt` | 00 | remove `TrackerSessionHost`, add `cameraLook` |
| `android/app/.../ui/debug/DebugSession.kt` | 00 | remove `DebugSessionHost` |
| `android/app/.../service/TrackerStack.kt` | 00 | remove `TrackerRestartHost` |
| `android/app/.../ui/games/GameSessionHost.kt` | 00 | remove `GameSessionHost`; `RecordingSettingsHost` stays |
| `android/app/.../ui/camera/CameraLookHost.kt` | 00 | **deleted** |
| `android/app/.../ui/TrackerServiceBinding.kt` | 00 | publish sites |
| `android/app/.../ui/camera/AutoCalibrateResult.kt` | 01 | |
| `android/app/.../ui/calibration/CalibrationViewModel.kt` | 01 | |
| `android/app/.../geometry/ArucoCalibrator.kt` | 01 | remove `QuadRefinement.correction` |
| `android/app/.../ui/camera/CameraRoute.kt` | 02 | `Viewfinder` deleted, call site rewired |
| `android/app/.../ui/calibration/CalibrationRoute.kt` | 02 | `PreviewWithOverlay` promoted |
| `android/core-geometry/.../geometry/Alignment.kt` | 03 | visibility only |
| `android/core-geometry/.../geometry/GrooveProfile.kt` | 03 | visibility only |
| `android/core-geometry/src/test/.../AlignmentTruthTest.kt` | 03 | reachability after narrowing |
| `src/chesslab/alignment.py` | 04 | additive helpers only, no maths changed |
| `src/chesslab/calibration.py` | 04 | receives `profile_at_warp` |
| `scripts/check_alignment.py` | 04 | |
| `scripts/ingest_video_session.py` | 04 | |
| `scripts/adabn_recalibrate.py` | 04 | `profile_at_warp` only |
| `src/chesslab/web/routers/sessions.py` | 04 | drawing only — never the payload |

## The invariant every phase must preserve

**One picture, one mapping.** Wherever the app draws a quad, a grid or a marker over a camera frame,
the numbers that scale it must come from the frame the quad was **measured in**, not from whatever
bitmap happens to be on screen. `CalibrationProfile.forResolution()` was deleted in `a7dab73` for
producing a silently wrong grid by rescaling; nothing this pack does may reintroduce that shape.

## Protocol for implementing agents

- Work on `feat-telemetry-sink`. One atomic conventional commit per numbered step, exactly as the
  phase names them. Stage explicitly; never `git add -A` across scopes.
- **Trust the code over the spec.** Line numbers drift. If a cited anchor is wrong, find it by
  symbol and **record the discrepancy in `STATUS.md`**.
- **If blocked, STOP** and write the blocker into `STATUS.md`. Do not invent a workaround that
  changes a contract another phase codes against.
- Never `--no-verify`, never `--force`, never amend a pushed or another agent's commit.
- **A deletion needs a grep, not a hunch.** Before removing any declaration, grep all of `android/`
  (excluding `*/bin/` and `*/build/`, which hold stale source copies) and paste the result into
  `STATUS.md`. detekt's unused rules see only `private` scope in this repo — an `internal` or
  `public` function nobody calls is invisible to every gate, which is exactly why these accumulated.

## Memory-constraint contract

Run tests **once**, **targeted**, scoped to your module:

- `gradlew.bat :app:testDebugUnitTest` (phases 00, 01, 02)
- `gradlew.bat :core-geometry:testDebugUnitTest` (phase 03)
- `.venv/Scripts/python.exe -m pytest -q tests/test_alignment.py` (phase 04) — never the bare suite

**Do NOT run** the full gate, `assembleDebug`, `npm run build`, `vulture`, or a repo-wide lint
sweep. That is the orchestrator's job and its result is the only one that counts.

## Static analysis

- `gradlew.bat :<module>:ktlintFormat` **first** — the formatter owns style — then
  `:<module>:ktlintCheck :<module>:detekt`, once, scoped. Zero NEW findings.
  **No `@Suppress` and no baseline entry to go green**: fix it, or record a blocker.
- Phase 04: `.venv/Scripts/python.exe -m ruff check <your files>`. `vulture` is the orchestrator's
  — and note it is a weaker gate than CLAUDE.md implies: `pyproject.toml` sets
  `min_confidence = 80`, above the 60 % at which vulture reports unused *functions*, and
  `paths` excludes `scripts/` entirely. Do not read "vulture is silent" as "nothing is dead".
- `LongParameterList` is 6 and `TooManyFunctions` is 15 (`android/config/detekt/detekt.yml`). A
  signature that trips them and gets "fixed" by inventing a holder type is a smell to surface, not
  a design.

## Dependency management

**This pack authorises no new dependency of any kind.** Not Hilt, not Koin, not
`androidx.lifecycle.viewmodel.compose`, not a serialization library. Every phase is achievable with
what is on the classpath, and a phase that believes otherwise has misread its brief — write the
argument into `STATUS.md` instead of adding the dependency.

## Repo rules you will hit

- **`:core-engine` is pure and must stay pure** (`ClasspathPurityTest`). No phase here touches it.
- **`:core-geometry` may not depend on `:app`.** Phase 03 narrows visibility inside the module; if a
  narrowing would break `:app`, the declaration stays public and that is the answer.
- **The analyzer thread has a 66 ms budget** (`AnalysisGate.FRAME_BUDGET_MS`). Phase 01 removes work
  from it; nothing may add any.
- **`android/*/bin/` and `android/*/build/` hold stale copies of the source tree.** They are
  gitignored. Exclude them from every grep or you will read and "fix" a file that is not compiled.

## Definition of done, per phase

Your phase's tests pass (targeted, once), your module's ktlint/detekt is clean with zero new
findings, your commits are atomic and named as specced, and `STATUS.md` carries your session entry
including every discrepancy and every grep that justified a deletion. **The orchestrator runs the
full gate on the merged tree** —
`gradlew.bat :app:ktlintCheck :app:detekt :app:testDebugUnitTest :core-engine:test
:core-geometry:testDebugUnitTest` and `assembleDebug`.

**A phase that finds its premise wrong is a complete deliverable.** Writing "these two are not
actually duplicates, here is the difference and why it is load-bearing" into `STATUS.md` and
stopping is a success, not a failure.
