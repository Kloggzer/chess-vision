# STATUS — 17 Android rewrite

Branch: `android-rewrite` (from `main`). Execution: **sequential by phase**, parallel
agents inside each phase on strictly disjoint files. The orchestrator (main session)
reviews, runs the gate, and commits between phases. Implementing agents do NOT commit.

Read `entry.md` completely before your phase file.

## Phases

| Phase | File | Agent scope | Status | Notes |
|---|---|---|---|---|
| 00a | `00a-scaffold.md` | legacy move, Gradle scaffold, API seam, lint baselines | todo | |
| 00b | `00b-parity-fixtures.md` | `scripts/emit_parity_fixtures.py` + committed fixtures | todo | |
| 01a | `01a-diff.md` | squares, region boxes, integral, per-square diff, normalize | todo | |
| 01b | `01b-census.md` | census transform + per-square census change | todo | |
| 01c | `01c-shadow-gamut.md` | HSV shadow, BGR→HSV/Lab, colour gamut, occlusion outliers | todo | |
| 01d | `01d-motion-noise.md` | motion score, SquareNoise, baseline occlusion/shadow | todo | |
| 02a | `02a-scoring.md` | LL scoring, pair scoring, prior, touched/destination, confirmer, Game | todo | |
| 02b | `02b-geometry.md` | `:core-geometry` — homography, warps, crops, ArUco, MarkerTracker, grid lines | todo | |
| 02c | `02c-cnn-observation.md` | `:core-cnn` — observation model, recovery search, resync, preprocessing | todo | |
| 03a | `03a-evidence.md` | `EngineState`, guards, evidence, frame loop | todo | owns `EngineState.kt` — 03b/c/d may not edit it |
| 03b | `03b-vetoes.md` | shadow/occlusion vetoes, taint latch, noise learning | todo | |
| 03c | `03c-hypothesis.md` | hypothesis, pair, endpoint, ambiguity, promotion | todo | |
| 03d | `03d-dispatch.md` | dispatch, commit, set-ref, anomaly patcher, `TrackerEngine` wiring | todo | |
| 04a | `04a-verify-single.md` | `_verify_tick` ladder, verdict with replacement move, vote gate | todo | |
| 04b | `04b-verify-pair.md` | `_verify_pair_tick` fast-accept + parity fallback | todo | |
| 04c | `04c-recovery-alarm.md` | `_cnn_tick`, recovery, alarm latch/freeze/release, observer schedule | todo | |
| 05a | `05a-camera.md` | CameraX single owner, reconnect backoff, delivered-resolution truth | todo | |
| 05b | `05b-frame-pipeline.md` | YUV→BGR, two warps, gray pipeline, ROI motion, dark gate, timings | todo | |
| 05c | `05c-onnx.md` | ONNX `SquareClassifier` (QNN→NNAPI→CPU), loud attach, observer thread | todo | |
| 06a | `06a-calibration.md` | ArUco auto + manual corner tap, profile persistence, orientation check | todo | |
| 06b | `06b-tracking-ui.md` | board, move list, alarm card, promotion dialog, overlay | todo | |
| 06c | `06c-service.md` | `TrackerService` single owner, coordinator, settings persistence | todo | |
| 07a | `07a-settings.md` | every knob live-tunable, Python defaults shown, reset actions | todo | |
| 07b | `07b-debug.md` | timings, evidence heatmap, 64-crop grid, CNN reads, decision log | todo | |
| 07c | `07c-analysis.md` | Stockfish + eval bar + move quality | todo | |
| 08a | `08a-games-pgn.md` | game library, PGN export, optional session recording | todo | |
| 08b | `08b-spectator.md` | Ktor LAN spectator + QR, read-only, off by default | todo | |
| 08c | `08c-tts.md` | move announcement | todo | |
| 09 | `09-validation.md` | full gate, clip regression, live game, legacy deletion | todo | orchestrator only |

## Dependencies

- 01* depends on 00.
- 02a depends on 01; 02b and 02c depend on 00 only (may start with 01).
- 03* depends on 01 and 02a. `EngineState.kt` is declared in full by 03a.
- 04* depends on 02c and 03.
- 05* depends on 02b and 02c.
- 06* depends on 05. 07* and 08* depend on 06.
- 09 depends on everything.

## Discrepancies (spec vs code)

_(implementing agents append; the spec is wrong until proven otherwise — trust the Python code)_

### Resolved during authoring (orchestrator, 2026-07-24) — these are already fixed in `entry.md`

- **Module types.** `entry.md` originally called `:core-geometry`/`:core-cnn`
  `java-library`. `org.opencv:opencv:4.10.0` is an **AAR** (it ships
  `org.opencv.android.OpenCVLoader`, used at `android-legacy/.../ChesslabApp.kt:9`), so
  both must be `com.android.library`. Their test task is **`testDebugUnitTest`**, not
  `test`. Any phase file saying `:core-geometry:test` / `:core-cnn:test` means
  `testDebugUnitTest`. `:core-engine` stays `java-library` / `:core-engine:test`.
- **Invariant 5 was too broad** (found by 04a). Python's `_verify_tick` anchors on
  `pending["cur"]` (`tracker.py:2191`), **not** on `snap.gray`. Only the *recovery* path
  (`_cnn_tick`, `:1944-1964` and `:2021-2040`) anchors on the observed frame. `entry.md`
  invariant 5 now states both paths explicitly.
- **`CnnSnapshot.obs: Any` was underspecified** (found by 04a). `:core-engine` cannot
  depend on `:core-cnn` (cycle), so `entry.md` now defines `CnnObservation` /
  `CnnEvaluator` / `ResyncResult` / `IdentityResult` / `DeriveResult` in the api package.
  **Owner is 00a**, not 04a — 04a's "fallback owner" clause is void.
- **`_cnn_occlusion_filter` threshold** (flagged by 03b). `tracker.py:1339` reads
  `getattr(self.recovery, 'conf_thr', 0.9)`, but `CnnRecovery` is always constructed with
  `conf_thr=self.cnn_conf_thr` (`tracker.py:1856`), and its own default is 0.85
  (`cnn_recovery.py:126`). **The 0.9 fallback is dead code — use `cnnConfThr` (0.85).**
- **File-ownership collisions** between 06/07/08 (`SettingsRepository`, the nav host,
  `TrackingScreen`, `AndroidManifest.xml`, `app/build.gradle.kts`) are resolved by the
  **Ownership registry** table in `entry.md`, which overrides any phase file that
  disagrees. Notably: there is no `ui/Nav.kt` (it is `ui/ChesslabNavHost.kt`), and
  `SettingsRepository` lives at `settings/`, not `service/`.
- **Fixture schema authority**: 02b/02c/03* were written in parallel with 00b and name
  fixture keys 00b may not emit. **00b's emitted schema wins**; gaps are recorded here and
  the orchestrator extends the generator. No agent invents a fixture.

## Blockers

_none_

## Session log

_(implementing agent appends one line per finished phase)_
