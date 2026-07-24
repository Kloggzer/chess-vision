# STATUS — 17 Android rewrite

Branch: `android-rewrite` (from `main`). Execution: **sequential by phase**, parallel
agents inside each phase on strictly disjoint files. The orchestrator (main session)
reviews, runs the gate, and commits between phases. Implementing agents do NOT commit.

Read `entry.md` completely before your phase file.

## Phases

| Phase | File | Agent scope | Status | Notes |
|---|---|---|---|---|
| 00a | `00a-scaffold.md` | legacy move, Gradle scaffold, API seam, lint baselines | done | legacy moved, 4 modules green, seam frozen (8 api files incl. `CnnObservation.kt`) |
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

### 00a (scaffold), 2026-07-24

- **D00a-1 — the api package holds 8 files, not the 7 the acceptance criterion lists.**
  Per the ownership registry, 00a also creates `CnnObservation.kt`
  (`CnnObservation`/`CnnEvaluator`/`ResyncResult`/`IdentityResult`/`DeriveResult`).
  The `Get-ChildItem .../api` criterion is superseded by the registry: the correct list is
  `CnnObservation.kt CnnSnapshot.kt FrameInput.kt Images.kt TrackerConfig.kt
  TrackerEngine.kt TrackerEvent.kt TrackerStatus.kt`.
- **D00a-2 — the seam is NOT byte-identical to the `entry.md` code block: ktlint reformats it.**
  ktlint 1.5.0 (`ktlint_official` code style, `class-signature` / `function-signature`)
  forces one parameter per line with a trailing comma on every multi-parameter declaration
  in `Images.kt`, `CnnObservation.kt`, `TrackerEvent.kt`, `TrackerStatus.kt`,
  `TrackerEngine.kt`. `ktlintFormat` owns this; no hand-editing was done. **Semantics,
  names, types, order and defaults are unchanged** — later phases must diff the seam by
  declaration, not by line. For the same reason the end-of-line comments inside parameter
  lists (`// monotonic frame counter`, `// config.DEFAULT_BOARD_SIZE`, …) were moved to
  their own line *above* the parameter they annotate; every comment from `entry.md` is
  still present and still attached to the same member.
- **D00a-3 — detekt `MagicNumber` vs. verbatim defaults.** Three verbatim literals had to
  become named `private companion object` constants inside `TrackerConfig` (values
  unchanged, verified by re-running detekt with the literals inlined):
  `reanchorLlFloor = -4.0` (a NEGATIVE constructor default is a prefix expression, so
  `ignorePropertyDeclaration` does not cover it) and the `3`/`4` in
  `settleFrames`/`avgFrames` (function bodies are never exempt; `1` and `2` are in
  detekt's default `ignoreNumbers`). No `@Suppress`, no baseline, no detekt.yml relaxation.
- **D00a-4 — detekt `UnusedParameter` fires on public TODO stubs.** `style.UnusedParameter`
  is activated by the (kept) legacy config and reports *public* functions too, so
  `onFrame`/`onCnnSnapshot`/`setFen`/`choosePromotion`/`updateConfig` were red with plain
  `TODO("phase 03d")` bodies. Fixed by naming the parameter in the TODO message
  (`TODO("phase 03d: onFrame(seq=${input.seq})")`), and by an `init { check(...) }` in
  `TrackerEngine` that touches both constructor parameters. **Signatures are unchanged.**
  The phase that implements a method should drop the interpolation with the TODO.
- **D00a-5 — Gradle version catalogs cannot express Maven classifiers.** The bytedeco host
  natives (`opencv:4.10.0-1.5.11:windows-x86_64`, `ffmpeg`, `openblas`) are catalog entries
  without a classifier, consumed in `core-geometry/build.gradle.kts` as
  `testRuntimeOnly(variantOf(libs.bytedeco.opencv) { classifier("windows-x86_64") })`.
  This is the only supported way; no coordinates are hand-written in a dependency block.
- **D00a-6 — gate task names.** The phase file's Tests block says
  `:core-geometry:compileKotlin` / `:core-cnn:compileKotlin`; both are Android library
  modules, so the tasks are `compileDebugKotlin` (and their unit-test task is
  `testDebugUnitTest`). Ran per the registry amendment.
- **Note (not a discrepancy):** `:core-geometry` and `:core-cnn` have no sources yet, so
  their `compileDebugKotlin`, `ktlint*SourceSetCheck` and `detekt` tasks report `NO-SOURCE`.
  This is expected until 02b / 02c.
- **Note:** the legacy detekt overrides that were stripped (`TooManyFunctions` 24/20,
  `LongMethod` 80, `CyclomaticComplexMethod` 20) are gone as instructed. `TrackerEngine`
  has exactly 10 functions — one below detekt's default `TooManyFunctions` threshold of 11.
  A later phase adding an 11th public method to the seam will trip it.

## Blockers

_none_

## Session log

_(implementing agent appends one line per finished phase)_

- 2026-07-24 — **00a done**: `android/` -> `android-legacy/` with the stockfish submodule kept at
  `android/third_party/stockfish` (3 verifications pass, `.gitmodules` unchanged); new four-module
  Gradle project (`:core-engine` java-library / `:core-geometry` + `:core-cnn` android-library /
  `:app`), complete version catalog incl. OpenCV + bytedeco host natives + ONNX + Ktor + ZXing,
  strict detekt config with no baselines, the frozen api seam (8 files) with `TrackerEngine` stubs,
  app skeleton + copied CNN assets + unwired Stockfish CMakeLists, `ClasspathPurityTest` (2 tests).
  Gate green: `:core-engine:test` + library compiles, `:app:assembleDebug`, `ktlintCheck detekt`.
  6 discrepancies recorded (D00a-1..6) — the seam is layout-reformatted by ktlint but
  semantically verbatim.
