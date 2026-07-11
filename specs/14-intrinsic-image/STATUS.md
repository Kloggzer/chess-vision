# STATUS — specs/14 intrinsic-image

Branch: `feat/14-intrinsic-image` (create from `main` at or after commit `b381890`).

| Phase | File | State | Depends on |
|---|---|---|---|
| 00 | `00-python-reference.md` | descoped (app-only; golden JSON only) | — |
| 01 | `01-kotlin-port.md` | done | 00 |
| 02 | `02-android-integration.md` | done | 01 |

Phases are strictly sequential (01 consumes 00's golden JSON; 02 wires 01's class).

## Orchestrator gate (after all phases, NOT per phase)

- `uv run pytest -q` and `uv run pytest -q -m clips` (incl. the new intrinsic
  shadowsweep clip test)
- `uv run ruff check src tests synth`
- `cd android && ./gradlew :engine:test :app:testDebugUnitTest :app:assembleDebug`
- repo-wide ktlint/detekt/Android lint (zero new findings)
- On-device smoke test: DEFERRED — board packed away (2026-07-11); toggle stays
  default-off, so shipping without live validation is acceptable. First live
  session: enable toggle, wait for `intrinsic calibrated:` diag line, verify a
  hand-shadow sweep produces no `changed` squares, then play the castle + Be7
  regression moves.

## Discrepancies found by implementing agents

- **Phase 00 descoped (user decision, 2026-07-11):** no Python changes at all
  (`src/chesslab/**` untouched). Only the golden artifact
  `tests/data/intrinsic_golden.json` was produced, generated python-independently
  from the closed-form math in entry.md (throwaway script, not committed). The
  JSON stores the formula AND the explicit channel order (BGR: B=(x*23+y*7)%251,
  G=(x*17+y*29)%251, R=(x*37+y*11)%251) so the Kotlin test cannot misread it.
  Commit message adapted to `test(android): intrinsic golden values
  (python-independent reference)`. A future Python phase 00 must match
  the JSON (±1 u8) and the Kotlin `calibrate()` (NumPy-style linear-interpolation
  percentiles, population std, Scott bins over the P1..P99 band) — Kotlin is
  currently the de-facto calibration reference.
- **App unit tests have no native OpenCV** (`grep "Mat(" android/app/src/test` →
  no hits; opencv dep is the Android AAR): `IntrinsicGray` implemented as
  ByteArray+width/height core (fully tested on JVM) with thin `Mat` adapters for
  `apply`/`calibrate` (untested on JVM, exercised on-device) — the contingency
  phase 01 named.
- **Phase 01 test spec inconsistency:** "calibrate() on the formula image
  reproduces the JSON's angle ±3°" cannot hold — the golden angle 57.0° is an
  arbitrary fixed constant (phase 00 golden spec), not the entropy minimum of the
  formula image. Implemented the phase-00 test-2 design instead: chi points
  synthesized along a known lighting direction φ=40°, back-projected to BGR;
  `calibrate()` recovers θ*=φ+90° within ±3°.
- **Recalibrate hook:** `TrackerService` has no `fun recalibrate`; the
  "Recalibrate / New board" flow is `stopTrackingToPreview()` (per its doc
  comment). The NaN cache reset lives there, gated on `intrinsicGray` being on.
- **Calibration-pending note:** `UiState.note` is engine-owned and not trivially
  reachable from the service → log-only (the `intrinsic calibrated:` chesslabDiag
  line), per the phase 02 allowance. No new UiState field.
- **Commit layout:** the `SettingsRepositoryTest` updates landed in the step-3
  test commit (`test(android): intrinsic settings roundtrip + service gating`)
  rather than the step-1 settings commit, keeping production/test commits atomic.
- ktlintFormat wanted to reformat the untouched `TrackerCamera.kt`
  (pre-existing style debt); reverted as out of scope.

## Session log

- 2026-07-11 — app-only implementation on `feat/14-intrinsic-image`: golden JSON
  (00 artifact), `IntrinsicGray` + golden parity test + `BoardFramePipeline` seam
  (01), settings toggle + NaN calibration cache + one-shot on-device calibration
  in `TrackerService` (02). Targeted tests
  (`:app:testDebugUnitTest --tests '*Intrinsic*' --tests '*SettingsRepository*'`)
  and `:app:ktlintCheck` green. Reset-to-defaults verified to not touch the
  intrinsic fields (its copy() enumerates game/detection tunables only).
