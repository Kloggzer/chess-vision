# Phase 02 — Android integration: settings toggle, on-device calibration, wiring

Depends on: phase 01 (`IntrinsicGray`, pipeline seam). Sequential — touches
`BoardFramePipeline` consumers and the settings stack.

## Why

The channel must be a user-toggleable EXPERIMENTAL setting (default off, per pack
rule), with a zero-friction calibration path: the user flips the switch, the service
calibrates itself from the next clean board frame, and detection continues on the
invariant channel — no extra screens.

## Design (decided — do not redesign)

Settings (follow the `lockExposure`/`focusDistance` template, commit `b381890`):

- `TrackerSettings.kt`: `val intrinsicGray: Boolean = false` in the
  "Experimental + Debug" block, comment naming specs/14.
- `SettingsRepository.kt`: keys `intrinsic_gray` (boolean), `intrinsic_angle`
  `intrinsic_lo` `intrinsic_hi` (double; the calibration cache — written by the
  SERVICE, not the settings screen). Decode/encode all four; the three calibration
  values live in `TrackerSettings` as `intrinsicAngle/Lo/Hi: Double` with
  default `Double.NaN` = "not calibrated".
- `SettingsScreen.kt`: ONE switch in the Experimental section
  (`R.string.setting_intrinsic_gray` = "Shadow-free diff channel (experimental)").
  No sliders — θ/lo/hi are not user-tunable.
- Reset-to-defaults button (SettingsScreen, `setting_reset_detection` block): must
  NOT touch `intrinsicGray` or the calibration cache (experimental features are
  outside its scope — verify, don't assume).

Service wiring (`TrackerService.kt`):

- `observeSettings` (the `pipeline?.claheClip = next.claheClip` block): derive the
  pipeline's `intrinsic`:
  - toggle OFF → `pipeline?.intrinsic = null`.
  - toggle ON + cached calibration valid (all three finite) →
    `pipeline?.intrinsic = IntrinsicGray(angle, lo, hi)`.
  - toggle ON + no cache → arm a one-shot `@Volatile var intrinsicCalibrationPending = true`.
- Frame loop (`startFrameLoop`, after `pipe.process(...)`): if
  `intrinsicCalibrationPending` and the frame is NOT dark-gated and motion is quiet
  (`ui.debug.motion < settings.motionThr`), run `IntrinsicGray.calibrate(processed.boardBgr)`
  ON A BACKGROUND DISPATCHER (calibration is 180 histogram passes — never block the
  frame loop; launch into `lifecycleScope + Dispatchers.Default`, guard re-entry),
  then persist via `settingsRepo.update { it.copy(intrinsicAngle=…, lo=…, hi=…) }`
  (observeSettings then applies it) and log one `chesslabDiag` line
  `intrinsic calibrated: theta=… lo=… hi=…`.
- Re-calibration: flipping the toggle OFF clears nothing; a NEW calibration is
  forced by `Recalibrate` (board geometry redo) — hook: where `recalibrate` resets
  the profile (find via `grep -n "fun recalibrate\|Recalibrate" android/app/src/main/kotlin/com/chesslab/tracker/service/TrackerService.kt`),
  also reset the three cached values to NaN when `intrinsicGray` is on.

Note text: while calibration is pending, surface `note` "calibrating shadow-free
channel…" via the existing note mechanism ONLY if trivially reachable from the
service (UiState.note is engine-owned; if not trivially reachable, log-only —
record the choice in STATUS.md, do NOT invent a new UiState field for this).

## Steps

### 1. Settings stack — commit `feat(android): intrinsicGray experimental toggle + calibration cache`
TrackerSettings + SettingsRepository + SettingsScreen + strings. Update
`SettingsRepositoryTest` defaults/roundtrip tests (pattern: how `lockExposure`
was added — `grep -n "lockExposure" android/app/src/test -r`).

### 2. Service wiring + one-shot calibration — commit `feat(android): on-device intrinsic calibration + pipeline activation`
Per Design. The calibration coroutine must clone `processed.boardBgr` BEFORE the
frame loop's `finally { processed.boardBgr.release() }` — ownership rule, see
`CnnFrameStore.update`'s clone (service/CnnIntegration.kt).

### 3. Targeted tests — commit `test(android): intrinsic settings roundtrip + service gating`
SettingsRepository roundtrip for the four keys; a coordinator-level test is NOT
required (service frame loop is not unit-tested today — do not build a harness).

## Tests (write, run once, targeted)

`gradlew :app:testDebugUnitTest --tests '*SettingsRepository*' --tests '*Intrinsic*'` ONCE.

## Acceptance criteria

- Toggle defaults OFF; `TrackerSettings().intrinsicGray == false` asserted in test.
- With toggle off, `pipeline.intrinsic` stays null (grep the wiring:
  `grep -n "pipeline?.intrinsic" android/app/src/main/kotlin/com/chesslab/tracker/service/TrackerService.kt`).
- Calibration runs off the frame-loop thread (grep: the calibrate call sits inside
  a `launch(Dispatchers.Default)` block) and persists via `settingsRepo.update`.
- Reset-to-defaults leaves `intrinsicGray` + cache untouched.
- Scoped ktlint/detekt clean.

## Do NOT

- No engine changes; no Python changes (00 owns Python).
- No new UiState fields; no new screens.
- No automatic enabling after calibration of anything else (CLAHE slider etc. stay
  user-owned; CLAHE skip happens inside the pipeline only while intrinsic is active).
- Do not install on a device or run the on-device smoke test (orchestrator/user —
  the board is currently packed away; live validation is explicitly deferred).
