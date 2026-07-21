# Phase 01 — hard alarm latch: freeze noise learning while alarmed

## Why

While the illegal-move alarm is latched, `Detector.computeEvidence` keeps calling
`state.noise.update(...)` and `state.censusNoise.update(...)` unconditionally
(`android/engine/src/main/kotlin/com/chesslab/engine/Detector.kt:104-106`, plus the
census disturbance-learning path at `:138-140`). The persistent deltas of the illegal
position get adapted into the EMA — desensitizing exactly the squares that prove the
desync — and the alarm "heals" by drift instead of by user correction. Python
reference: commit `de6f84c` (`tracker.py`, search `EXCEPT while the illegal-move
alarm is latched`).

## Design (decided — do not redesign)

Gate every noise-model `update` in the detector on `state.alarm == null`:

- `Detector.kt:104-106` (step-4 learning): wrap both updates in
  `if (state.alarm == null) { ... }`.
- `Detector.kt:138-140` (census channel-local disturbance learning): same gate on the
  `censusNoise.update(cens)` calls (Python gates this identically).

Nothing else changes; the alarm's commit/reference freezes already exist
(`TrackerEngine.kt::raiseAlarm`, `Detector.kt::quietHandled:310-313`).

## Steps

### 1. `engine/Detector.kt` — gate the updates — commit `fix(android-engine): freeze noise/census learning while the illegal-move alarm is latched`

### 2. Test — commit `test(android-engine): alarm freezes noise learning`
Mirror `test_alarm_latch_discards_candidates_and_freezes_learning` from
`tests/test_move_tracker.py` (the noise-mean assertion): drive an engine into the
alarmed state (see existing alarm tests — `grep -rn "alarm" android/engine/src/test`
for the fixture pattern), feed a frame with square changes, assert the noise model's
means are unchanged. Run once, scoped:
`.\gradlew.bat :engine:test --tests "com.chesslab.engine.*"`.

## Acceptance criteria

- `grep -n "alarm == null" android/engine/src/main/kotlin/com/chesslab/engine/Detector.kt`
  hits ≥ 2 (step-4 gate + census disturbance gate).
- New test green; all pre-existing `:engine` tests green.
- ktlint/detekt clean for `:engine`.

## Do NOT

- Do not gate the SHADOW-veto's raw census computation — only the `update` (learning)
  calls. Detection must keep seeing while alarmed; it must only stop LEARNING.
- Do not touch `quietHandled` here (phase 02 owns it).
