# STATUS — 17 Android rewrite

Branch: `android-rewrite` (from `main`). Execution: **sequential by phase**, parallel
agents inside each phase on strictly disjoint files. The orchestrator (main session)
reviews, runs the gate, and commits between phases. Implementing agents do NOT commit.

Read `entry.md` completely before your phase file.

## Phases

| Phase | File | Agent scope | Status | Notes |
|---|---|---|---|---|
| 00a | `00a-scaffold.md` | legacy move, Gradle scaffold, API seam, lint baselines | done | legacy moved, 4 modules green, seam frozen (8 api files incl. `CnnObservation.kt`) |
| 00b | `00b-parity-fixtures.md` | `scripts/emit_parity_fixtures.py` + committed fixtures | done | 18 clips, 38.73 MB, byte-stable; schema + tolerance contract in `parity/README.md` |
| 01a | `01a-diff.md` | squares, region boxes, integral, per-square diff, normalize | done | 5 src + 2 test files, 18 tests green; contract signatures landed verbatim (2 additive deviations, D01a-2/3) |
| 01b | `01b-census.md` | census transform + per-square census change | done | `Census.kt` + 2 test files, 11 tests green; 5 discrepancies (D01b-1..5) — **01d must drop the `boardSize` argument at its `perSquareCensusChange` call site** |
| 01c | `01c-shadow-gamut.md` | HSV shadow, BGR→HSV/Lab, colour gamut, occlusion outliers | done | 3 src + 3 test files, 13 tests green; OpenCV's integer LUT paths ported (HSV bit-exact, Lab ≤1 LSB) — 7 discrepancies (D01c-1..7) |
| 01d | `01d-motion-noise.md` | motion score, SquareNoise, baseline occlusion/shadow | done | 3 src + 2 test files, 17 tests green; 969 motion / 247 noise / 173 baseline frames asserted (D01d-1..5) |
| 02a | `02a-scoring.md` | LL scoring, pair scoring, prior, touched/destination, confirmer, Game | done | 5 src + 4 test files, 30 tests green (module 100/100); 969 FEN round-trips, 5463 legal-move rows, 2877 loglik + 58 pair rows asserted (D02a-1..10) |
| 02b | `02b-geometry.md` | `:core-geometry` — homography, warps, crops, ArUco, MarkerTracker, grid lines | done | 9 main files, 10 test classes / 58 tests green, natives loaded (0 skipped) |
| 02c | `02c-cnn-observation.md` | `:core-cnn` — observation model, recovery search, resync, preprocessing | done | whole `cnn_recovery.py` ported + preprocessing; 49 tests over all 7 `_cnn` families (34 rows); seam implemented, 8 discrepancies |
| 03a | `03a-evidence.md` | `EngineState`, guards, evidence, frame loop | done | 4 src + 4 test files, 34 tests green (module 134/134); `EngineState.kt` complete incl. the phase-04 fields (D03a-1..12) |
| 03b | `03b-vetoes.md` | shadow/occlusion vetoes, taint latch, noise learning | done | 3 src + 3 test files, 33 tests green; invariant 2 split proven both ways, latch mapped onto the expiry map (D03b-1..10) |
| 03c | `03c-hypothesis.md` | hypothesis, pair, endpoint, ambiguity, promotion | done | 4 src + 3 test files, 31 tests green; step 5 (`scoreViableMoves`) landed here too — **03d must call it** (D03c-2); 204 tier-A frames replayed (D03c-1..10) |
| 03d | `03d-dispatch.md` | dispatch, commit, set-ref, anomaly patcher, `TrackerEngine` wiring | done | 3 src + `TrackerEngine.kt` filled in + 4 test files, 41 tests green (module 239/239); **full-clip replay: 18/18 clips, 969 frames, ZERO diverging frames** (D03d-1..12) |
| 04a | `04a-verify-single.md` | `_verify_tick` ladder, verdict with replacement move, vote gate | done | `VerifySingle.kt` + `PendingVote.kt` + `onCnnSnapshot` routing + 2 test files, 19 tests green; `ResyncResult` extended with `move`/`agreement` (D04a-1) — without it `cnn_overrule` is inexpressible |
| 04b | `04b-verify-pair.md` | `_verify_pair_tick` fast-accept + parity fallback | done | `VerifyPair.kt` + 2 test files, 10 tests green; seam gaps recorded (D04b-1..6), `cnnAgreement` not expressible |
| 04c | `04c-recovery-alarm.md` | `_cnn_tick`, recovery, alarm latch/freeze/release, observer schedule | done | 3 src + 3 test files, 32 tests green (module 280/280 incl. zero-divergence clip replay); entry point `EngineState.cnnTick(cnn, snap)` for 04a (D04c-1..10) |
| 04x | — (orchestrator) | cross-module seam reconciliation: FEN seam, `move`/`agreement` forwarding, `attachCnn`, `acceptCnnPosition`, first REAL-evaluator integration test | done | see "04x" below (D04x-1..7); 412 tests, 0 failures, clip replay still 18/18 / 969 frames / zero divergence |
| 05a | `05a-camera.md` | CameraX single owner, reconnect backoff, delivered-resolution truth | done | 4 src (356 LOC total, max 184) + 3 test files, 9 tests green; single `getInstance` call site, `ImageAnalysis` only (D05a-1..7) |
| 05b | `05b-frame-pipeline.md` | YUV→BGR, two warps, gray pipeline, ROI motion, dark gate, timings | done | 7 src (845 LOC) + 5 test files, 23 tests green; OpenCV-backed steps behind the `FrameStages` seam and untested on the JVM (D05b-2) |
| 05c | `05c-onnx.md` | ONNX `SquareClassifier` (QNN→NNAPI→CPU), loud attach, observer thread | done | 5 src + 4 test files, 19 tests green; the REAL bundled model runs 64 crops through ORT on the host CPU EP (D05c-8) |
| 06a | `06a-calibration.md` | ArUco auto + manual corner tap, profile persistence, orientation check | done | 9 src (1113 LOC, max 207) + 4 test files, 18 tests green; zero camera types under `ui/`, `getInstance` still 1; needed `android/.editorconfig` + a detekt `FunctionNaming` exemption for Compose (D06a-1) |
| 06b | `06b-tracking-ui.md` | board, move list, alarm card, promotion dialog, overlay | done | 16 src (1606 LOC, max 170) + 4 test files, 17 tests green; nav host + service binding wired, alarm-accept preview is status-derived only (D06b-3) |
| 06c | `06c-service.md` | `TrackerService` single owner, coordinator, settings persistence | done | 14 src (1189 LOC, max 172 vs the legacy 970-in-one) + 5 test files, 23 tests green; one camera owner, one engine thread, 12 live knobs (D06c-1..14) |
| 07a | `07a-settings.md` | every knob live-tunable, Python defaults shown, reset actions | done | 8 src (965 LOC, max 209) + 4 test files, 33 tests green; 46/46 knobs exposed, exactly 12 live; **tracker restart wired later, see "Restart + app-settings wiring"** (D07a-1/-11 closed) |
| 07b | `07b-debug.md` | timings, evidence heatmap, 64-crop grid, CNN reads, decision log | done | 17 src (1774 LOC, max 178) + 2 test files, 21 tests green; `DebugPayload` filled in, decision ring capped at 64, rejections logged, `:core-engine:test` still 18/18 clips zero divergence (D07b-1..12) |
| 07c | `07c-analysis.md` | Stockfish + eval bar + move quality | done | native build WIRED and proven (42 s, 2 ABIs, `assembleDebug` 57 s); 11 src (985 LOC, max 219) + 7 test files, 31 tests green; own lowest-priority thread, off by default (D07c-1..9) |
| 08a | `08a-games-pgn.md` | game library, PGN export, optional session recording | done | 17 src (1701 LOC, max 199) + 8 test files, 41 tests green; all 18 named tests present; recording wired to the service's raw frames via the binder, off by default (D08a-1..12) |
| 08b | `08b-spectator.md` | Ktor LAN spectator + QR, read-only, off by default | done | 7 src (661 LOC, max 190) + 5 test files, 21 tests green; two GET routes, Wi-Fi-only bind on 8420, +0.08 MB APK (Ktor+ZXing themselves cost 5.8 MB, already paid at `dc6b38a`); 6 discrepancies (D08b-1..6) |
| 08c | `08c-tts.md` | move announcement | done | 6 src (698 LOC, max 143) + 3 test files, 30 tests green; off by default, silent while alarmed, queue capped at 3; `TextToSpeech` behind the `Tts` seam and untested on the host (D08c-1..6) |
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

### Orchestrator decision on D00b-17 (settle/avg/confirm overrides) — RESOLVED

`TrackerConfig` now carries `settleFramesOverride` / `avgFramesOverride` /
`confirmFramesOverride` (`Int?`, default `null`), and the three accessor functions fall back
to the CNN-conditional counts only when the override is `null`. This is faithful to Python,
where `settle_frames`/`avg_frames`/`confirm_frames` are constructor params defaulting to
`None` (`tracker.py:675-707`) before the CNN-conditional fallback at `:739-742`.

Seam changed by the orchestrator (00a owns the file); `entry.md` updated to match.
**Phases 03* must read all three from `effectiveConfig`**, not from Kotlin defaults — the
`ParityEffectiveConfig.toTrackerConfig()` helper populates the override fields.

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

### 00b (parity fixtures), 2026-07-24

Generator: `scripts/emit_parity_fixtures.py`. Output:
`android/core-engine/src/test/resources/parity/` (18 clips, **40 934 285 B = 40.93 MB** of
the 41 943 040 B budget). Loader + tolerance contract:
`android/core-engine/src/test/kotlin/com/chesslab/engine/parity/ParityFixtures.kt`.
Schema documentation: `android/core-engine/src/test/resources/parity/README.md` — **that
file is the normative schema reference for phases 01–03.**

#### Fixture-key mapping (00b's schema wins — patch the consuming specs to match)

| Consuming spec | It asks for | 00b actually emits |
|---|---|---|
| 01a | fixture gray pair "at `detSize = 800`"; `squareRegion` for `boardSize ∈ {800,1600}`, `whitePov ∈ {t,f}`, `extendUp ∈ {0,0.25}` | `detSize = 320` (`meta.detSize` is authoritative); the full region/center cross-product for `boardSize ∈ {320,640,800,1600}` lives in `parity/_geometry/meta.json → squareRegions[]`, and one clip-native copy in `tierA.squareRegion` on the first tier-A frame |
| 01a | `normalizeDiffs` input vector | `tierA.perSquareDiff` (raw) → `tierA.normalizedDiffs` |
| 01b | census codes on "the fixture gray", `rows` band | `tierA.censusCodeCrop` (16×16 crop at `square_region("e2")[0:2]`) + full planes via `ParityClip.gray()`; **no `rows` band is emitted** — derive the band from `tierA.vetoCandidates` exactly as `_apply_vetoes` does |
| 01b | per-square census change | `tierA.censusRaw` **and** `tierA.censusNormalized` (invariant 8) |
| 01c | "colour-space fixture … 0..255 sweep patch plus a real board crop" | `parity/_colorspace/planes/{sweep,board}.{bgr,hsv,lab}.bin.gz` (sweep = every 8th level per channel, 32³ px; board = a 320×320 warp), raw-gzipped, `ParityFixtures.colorSpacePlane()` |
| 01c | gamut fixture with "input image and Python's features" | `tierA.gamut = {fromFrames, mu, inv, feats}` on the frame where it was rebuilt + `tierA.activeGamutFrames`; image = the planes those frames average to |
| 01c | `occlusionColorSquares` "hand-over-board frame, `thr = 3.0`" | `tierA.occlusionColorSquares` (quiet frames, always empty) **and** `baselineOcclusion.chromaOutliers` over `baselineOcclusion.strongCandidates` (the hand frames — this is the non-empty one). **`thr` is 1.5, not 3.0** — see D00b-3 |
| 01d | motion pairs (still / wobble / hand) | `tierB.motionScore` on **every** frame + the consecutive planes; `frame.motionRoiScore` is the separate ROI channel |
| 01d | "recorded diff sequence … with the recorded exclude sets" | `tierA.normalizedDiffs` + `tierA.censusNormalized` + `tierA.noiseExclude` (= `changed ∪ shadowVeto`), and `noiseZ`/`censusNoiseZ` **before**, `noiseMean/Std` + `censusNoiseMean/Std` **after** the update |
| 01d | `baselineOcclusion` three sets | `frame.baselineOcclusion.{occludedDilated,shadowDilated,core}` (+ `absThr`, `occlCensusThr`, `colorThr`); also `tierA.baselineOcclusion` for the averaged pair |
| 02a | `fixtures/scoring_touched.jsonl` | `tierA.moveTouchedSquares` + `tierA.moveDestinationSquares` (all legal moves) with `frame.fen` |
| 02a | `fixtures/scoring_loglik.jsonl` | `tierA.loglikScores` (top 12, Python's order) with `frame.fen`, `tierA.zFused`, `meta`-level `zThr = 3.0` / `llK = 1.0` (clip defaults) |
| 02a | `fixtures/scoring_pair.jsonl` | `tierA.loglikPairScores` (top 12) — `soft = zThr * 0.5` |
| 02a | `fixtures/scoring_prior.jsonl` | `tierA.movePrior` |
| 02b | `fixtures/geometry_cropbox.jsonl` | `parity/_geometry/meta.json → cropBoxes[]` (`boardSize × padUp × padSide × whitePov × clamp`, each with all 64 boxes and `cropBorderPx`) |
| 02b | `fixtures/geometry_homography.jsonl` | `parity/_geometry/meta.json → homographies[]` |
| 02b | `fixtures/geometry_resolve_corners.jsonl` | `parity/_geometry/resolve_corners.jsonl` — synthetic marker point sets, rows `{name, pointsById, boardSize, corners, nUsed}`, 17 cases covering 4/3/2/1/0 markers |
| 02b | `fixtures/geometry_grid_coverage.jsonl` (+ PNGs) | `parity/_geometry/grid_coverage.jsonl` + raw gray planes under `_geometry/planes/` (rows `{name, plane, width, height, coverage}`) — self-contained, no PNG decoder needed. Additionally `parity/<clip>/natives/meta.json → frames[].gridLineCoverage` for the Tier-C path |
| 02c | `fixtures/cnn_observation.jsonl` | `parity/_cnn/cnn_observation.jsonl` — plus `confident`, `labelConfident` and `occupied` maps per row |
| 02c | `fixtures/cnn_derive.jsonl` | `parity/_cnn/cnn_derive.jsonl` (`mode: identity\|deep`, `maxPlies`, `beam`, `seq`, `best`, `second` + the three acceptance thresholds) |
| 02c | `fixtures/cnn_resync.jsonl` | `parity/_cnn/cnn_resync.jsonl` (+ `hasOccupancyConflict`) |
| 02c | (not named) `score_moves` / `verify_move` / `board_matches_identity` / `guess_illegal_move` | `parity/_cnn/cnn_score.jsonl`, `cnn_verify.jsonl`, `cnn_identity.jsonl`, `cnn_guess.jsonl` |
| 03a/03d | a `TrackerConfig` to run the replay with | `meta.json → effectiveConfig` + `ParityEffectiveConfig.toTrackerConfig()`. **Never Kotlin defaults** — see D00b-3 and D00b-17 |
| 03d | which clips belong in the strict full-clip gate | `meta.tierBComplete` / `index.json → tierBComplete` (currently all 18) |
| 03a/03b/03c | `parity/steps/` (one JSON per frame: `seq, refFen, corners, diffs{}, census{}, censRaw{}, z{}, state, changed[], note`) | `parity/<clip>/frames/NNNN.json`: `seq`, `fen`, `tierA.normalizedDiffs`, `tierA.censusNormalized`, `tierA.censusRaw`, `tierA.zFused`, `tierB.state`, `tierB.changed`, `tierB.note`. There is **no `corners`** (the clip warp is frozen; corners are in `natives/meta.json`) and **no `refFen`** (base truth is always `frame.fen` while `tierB.detectionRan`) |
| 03c | `bestLl`, `secondLl`, `candidate` | `tierB.bestLl`, `tierB.secondLl`, `tierB.candidateUci` (`tierB.bestUci` is the same value) |
| 03d | `parity/clips/<clip>/` with `frames.bin` + `index.json` and per-frame `corners`, `motionRoiScore`, `gridLineCoverage`, `lumaPreClahe`, `timestampMs`; `decisions.jsonl`; tolerance 1e-6 | `parity/<clip>/` with `planes/NNNN.{gray,bgr}.bin.gz` + `meta.json`; per frame `motionRoiScore` and `lumaPreClahe` are present, **`corners` / `gridLineCoverage` / `timestampMs` are not** (frozen geometry; grid gate off via `min_grid_line_coverage: 0.0`; time = `frame / meta.fps`). `decisions.jsonl` → the per-frame `tierB` block. **Tolerance is 1e-4 relative (`ParityFixtures.assertClose`), not 1e-6.** Clip names are `blender-*`, not `clip01/clip03` |
| all | `ParityFixtures.kt` helpers `assertClose/assertCloseMap/assertExact` | present, plus `assertExactList`, `assertConsumed`, `parityClose`, `PARITY_REL_TOL`, `PARITY_ABS_FLOOR` |

#### Discrepancies

- **D00b-1 — one fixture tree, not four.** Everything lives under
  `android/core-engine/src/test/resources/parity/`. `:core-geometry` (02b) and `:core-cnn`
  (02c) must read it from there (or the orchestrator copies `_geometry/` /
  `natives/` into their resources); no `fixtures/*.jsonl` files exist anywhere.
- **D00b-2 — CNN fixtures are SYNTHETIC, not model-derived (blocker withdrawn).** The clip
  replay runs with `cnn_run=None`, so nothing CNN-shaped can come out of it. Instead
  `parity/_cnn/` is built from hand-constructed probability arrays over real FENs:
  `observation_from_probs`, `score_moves`, `verify_move`, `verify_move_identity`,
  `board_matches_identity`, `derive_moves_identity`, `derive_moves_deep`, `resync_check`,
  `has_occupancy_conflict` and `guess_illegal_move` are pure given probabilities and a
  board. Determinism: the leftover mass `1 - conf` is spread with weights from
  `random.Random("<seed>:<square>")`, seed **20260724** (`_cnn/meta.json → seed`), so the
  output does not depend on iteration order. 7 JSONL families, 34 rows, ~1.0 MB. This is
  strictly better than pinning to a run under `data/runs/`: deterministic, tiny, and it
  tests the logic instead of the weights.
- **D00b-3 — `occlusion_color_thr` is 1.5 in every fixture, not the 3.0 of
  `TRACK_DEFAULTS`.** `MoveTracker.__init__` defaults to `1.5` (`tracker.py:696`), and
  neither `scripts/replay_clip.py` nor `tests/data/testclips/manifest.yaml` overrides it —
  so the live-tuned clip behaviour, and therefore the fixtures, are at **1.5**. `entry.md`'s
  rule that `TRACK_DEFAULTS` wins still governs `TrackerConfig`'s default; the fixture value
  is emitted explicitly as `tierA.occlusionColorThr` / `baselineOcclusion.colorThr` and
  **must be read from there**. 01c's "`thr = 3.0`" instruction is wrong for these fixtures.
- **D00b-4 — `detSize` is 320, not 800.** The blender clips are `board_size: 640` at
  `detect_scale = 0.5`. 01a/01b's "at `detSize = 800`" means `meta.detSize`.
- **D00b-5 — planes are delta-encoded (`meta.planeEncoding = "delta-u8"`), not raw.**
  Each plane file holds `cur - prev` (mod 256) against the previous *emitted* frame's plane,
  gzipped level 6 with `mtime=0`. Raw planes cost ~244 kB/frame and only ~165 frames fit in
  40 MiB — far too few for a whole-clip Tier-B replay. Delta coding costs ~35 kB/frame (4×),
  which is what makes 18 clips fit. `ParityClip.gray()/bgr()` decode the chain.
- **D00b-6 — the tracker is driven over the SAMPLED frame stream, not full-rate with
  holes.** Otherwise the averaging buffer (`_RunningMean(avg_frames)`) and the settle
  counters inside the fixture would not match what a Kotlin replay of the emitted planes
  sees, and Tier B could not be the whole-clip equality test the phase file demands. Two
  consequences, both required by measurement, not preference:
  1. A `WARMUP_FRAMES = 8` consecutive block was added to the sampling rule. With only the
     phase file's rule (`±10` around commits + every 5th elsewhere) `blender-opening`
     replayed to `['Nc3']` instead of `['d4','e5','Nc3']`: `stable_count` never reached
     `settle_frames = 4` before the first hand entered, so the first baseline was captured
     *after* `d4` had already been played and `d4` was baked into the reference.
  2. The virtual clock advances by **video time** `(idx - prev) / fps`, not a flat `1/fps`
     per emitted frame. That reproduces `tests/test_clips.py`'s `realtime=True`, the mode
     the expected move lists were tuned under, and keeps `motion_hold_s` / `motion_recency_s`
     meaningful across a sampling gap.
  Final rule (constants at the top of the script): frames `0..7`, plus `[m-8, m+4]` around
  every commit frame from the full-rate scout pass, plus every 8th frame.
- **D00b-7 — `tierA` is `null` where the tracker computed no detection evidence.** The
  phase file says "`tierA` and `tierB` are always both present". On motion / occluded /
  pre-baseline frames there is no `cur`/`ref` pair, and manufacturing one would be fake
  ground truth. `tierB` **is** on every frame. 253 tier-A frames over 18 clips, ≥6 per clip.
  The acceptance criterion "every `frames/*.json` has non-null `tierA.perSquareDiff`
  (64 keys)" therefore reads: every frame with `tierA != null` has 64 keys (asserted by
  `ParityFixturesTest`), and every clip has at least one.
- **D00b-8 — `blender-italian` and `blender-opera` are not emitted.** 534 and 1146 frames
  with 10 and ~20 moves do not fit the 40 MiB budget. All **13 required clips are present**;
  `index.json → skipped` lists the two. The allocator is deterministic: the shared
  pure-function fixtures first (they are cheap and high-value and are never dropped for clip
  frames), then required clips in manifest order, then optional ones while
  `total + estimate + 800 kB reserve <= 40 MiB`.
- **D00b-9 (RESOLVED) — `blender-scholars` was a generator artifact, not Python behaviour.**
  Diagnosed as instructed: `uv run pytest -q -m clips
  "tests/test_clips.py::test_clip_erwartete_zugliste[blender-scholars.mp4]"` → **1 passed**
  (the real harness gets all 7 moves), and the emitter's own full-rate scout pass also gets
  7/7 — only the decimated stream lost the last two. Fixed by a **sampling escalation
  ladder**: `(denseBefore, denseAfter, sparseStep)` in
  `((8,4,8), (14,8,4), (20,12,2))`, taking the cheapest rung that reproduces the manifest
  move list and still fits the remaining budget. `blender-scholars` now emits at rung
  `(14,8,4)` (191 frames, 5.91 MB) and reproduces all 7 moves. **Every emitted clip is now
  18/18 san-match**; the chosen rung is recorded in `meta.sampling`. The degradation escape
  hatch stays in place: `meta.tierBComplete` / `index.json → tierBDegraded` flag any clip
  that ever fails, so a silently-degraded clip can never look like a passing one.
- **D00b-10 — `ensure_profile` opens the REAL camera 0.** A freshly written temp profile is
  lens-*stale* when the source is numeric, and `ensure_profile` then auto-recalibrates via
  `open_camera(src)` — **not** the patched `trk.open_source` — for up to 30 read attempts.
  The emitter avoids it by using a non-numeric source (`"parity-clip"`) and lens-stamping
  the temp profile for that source. `scripts/replay_clip.py` has the same hole (frozen, not
  fixed): its `tests/test_clips.py` runs depend on whether the dev box has a webcam.
- **D00b-11 — `_loop` steps that cannot run synchronously and are skipped:** camera
  `read()` + reconnect/backoff/downshift, `_note_frame_size` (frame size is constant per
  clip), the overlay JPEG encode + viewer throttle, the CNN worker spawn
  (`_observer_due`/`_cnn_worker` — `cnn_run` is None anyway), the perf log, and every
  `time.sleep`. Everything else is mirrored **in `_loop`'s order**, including the FPS EMA,
  the `prev_gray` seeding, `max(frame motion, roi motion)`, the
  `_baseline_occlusion_and_shadow` state gate with its 0.1 s expiry maps, the motion/stable
  branches, the grid gate + its "gate just cleared" double hold, the running means, and the
  raw-core `>2` gate before `_try_detect`.
- **D00b-12 — the intermediate evidence is captured by wrapping `_compute_evidence` and
  `_apply_vetoes` at runtime** (`_install_evidence_probe`), not by editing `tracker.py`.
  That is the only way to see the post-taint `z` and the pre-veto candidate set that the
  decision was actually made on. `src/chesslab/**` is untouched.
- **D00b-13 — keys beyond the phase file's schema** (all documented in `parity/README.md`):
  `frame.fen`, `frame.lumaPreClahe`, `frame.motionRoiScore`, `frame.baselineOcclusion`
  (incl. `strongCandidates` / `chromaOutliers` — without them the occlusion-colour veto is
  empty in every fixture, because it never fires on quiet detection frames);
  `tierA.curFrames` / `refFrames` / `activeGamutFrames` (which emitted frames average to
  `cur` / `ref` / the active gamut — this is what makes Tier A reconstructible from the
  planes), `tierA.noiseExclude`, `tierA.vetoCandidates`, `tierA.censusNoiseZ`,
  `tierA.occlusionColorThr` / `baselineAbsThr` / `occlCensusThr`; `tierB.detectionRan`,
  `tierB.motionScore`, `tierB.promotionPending`; `parity/index.json` (a classpath has no
  directory listing, so `ParityFixtures.clips()` reads it); `parity/_geometry/`;
  `parity/_colorspace/`; `<clip>/natives/meta.json`.
- **D00b-14 — `meta.json.requiresNatives` is `false` at clip level.** Tier A and Tier B are
  consumable without any native library; the phase file's `"requiresNatives": true` lives in
  `<clip>/natives/meta.json`, next to the Tier-C payload it describes.
- **D00b-15 — `tierB` fields are sticky.** They are the tracker's live debug state, so
  `changed` / `bestLl` / `note` keep the last computed values on frames where
  `detectionRan == false`. That is Python's behaviour and a port carries the same state;
  compare frame by frame, do not special-case it.
- **D00b-17 — `TrackerConfig` cannot express a `settleFrames`/`avgFrames`/`confirmFrames`
  override.** Found by the new `effectiveConfig` self-check: the seam declares these three as
  CNN-conditional *functions* (`settleFrames(cnnOn)`), but in Python they are ordinary
  constructor arguments and **`blender-castle` sets `confirm_frames: 3`** in
  `tests/data/testclips/manifest.yaml` (every other clip uses 2, which coincides with the
  no-CNN default). A `TrackerConfig` built from `toTrackerConfig()` therefore reports
  `confirmFrames(cnnOn = false) == 2` for that clip while the fixture ran at 3.
  **Phases 03a/03c/03d must read these three from `meta.effectiveConfig`, not from
  `TrackerConfig`.** `ParityFixturesTest` asserts the derived value only for clips without an
  override, and asserts the override is reflected in `effectiveConfig` otherwise. Whether the
  seam should gain three explicit `Int?` overrides is an **orchestrator decision** (00a owns
  `TrackerConfig.kt`; 00b did not touch it).
- **D00b-18 — `meta.json → effectiveConfig` added (orchestrator instruction).** All 43
  settable `TrackerConfig` fields plus the 4 derived members, camelCase, read off the LIVE
  `MoveTracker` after construction (never re-derived from a kwargs dict). The generator
  aborts with a loud `SystemExit` if `_effective_config()` and the hardcoded
  `TRACKER_CONFIG_FIELDS` list (copied from `entry.md`) disagree in either direction, so a
  knob added to the seam cannot silently go unfixtured. `ParityEffectiveConfig` +
  `toTrackerConfig()` in `ParityFixtures.kt` make the construction mechanical, and the README
  states the rule: **parity tests build `TrackerConfig` from `effectiveConfig`, never from
  Kotlin defaults.**
- **D00b-19 — clip-level `meta.trackerKwargs` keeps the RAW override dict** (python
  snake_case, original types). It is now purely informational — `effectiveConfig` is the
  authority. It is still needed to detect the D00b-17 override case.
- **D00b-16 — ktlint reformats `ParityFixtures.kt`** (one parameter per line + trailing
  commas), same as D00a-2, and `standard:no-consecutive-comments` forbids a file-level KDoc
  immediately followed by an `//` banner — the file header is a `//` block for that reason.
  No `@Suppress`, no baseline entries.

### 01a (squares / region boxes / integral / gray diff / normalize), 2026-07-24

Files created (all `internal`, package `com.chesslab.engine`):
`Squares.kt`, `SquareRegion.kt`, `Integral.kt`, `SquareDiff.kt`, `Normalize.kt`,
`SquareDiffParityTest.kt` (5 tests), `SquareGeometryTest.kt` (13 tests).

#### 01a contract change — none to the published names/types

Every signature 01b/01c/01d were told to compile against is landed **verbatim**:
`Squares.{FILES, ALL, index, colRow, colOf, rowOf, maskToSet, setToMask}`,
`SquareBoxes(x0,y0,x1,y1,area)`, `squareBoxes(boardSize, whitePov, extendUp = 0.0)`,
`squareRegion(square, boardSize, whitePov, inset, extendUp = 0.0)`,
`squareCenter(square, boardSize, whitePov)`,
`integral(data, width, height)`, `integralAbsDiff(a, b, width, height)`,
`regionMeans(ii, width, boxes, out)`,
`perSquareDiff(grayA, grayB, boxes, out)`, `normalizeDiffs(values, out)`.
The two items below are **additive** (new members / new overloads), not renames.

- **D01a-1 — `inset`'s default literal is a named constant.** detekt `MagicNumber` fires on
  a default parameter value, so the declaration reads
  `inset: Double = SQUARE_REGION_INSET` with `internal const val SQUARE_REGION_INSET = 0.16`
  in `SquareRegion.kt`. **The default value is unchanged (0.16)**; callers see the identical
  signature. Same class of finding as D00a-3. No `@Suppress`, no baseline.
- **D01a-2 — the reuse buffer is a function, not a class (additive).** The phase file only
  blesses "an internal size-keyed scratch holder inside `Integral.kt`". A `class
  IntegralScratch` there trips detekt `MatchingDeclarationName` (single top-level class in a
  file named `Integral.kt`), and a *shared* scratch would silently alias two live integrals —
  a real hazard for 01c, which converts three colour planes. Landed instead:
  - `integral(data, width, height)` / `integralAbsDiff(a, b, width, height)` **allocate a
    fresh `LongArray`** — safe, no aliasing, exactly as published;
  - added overloads `integral(data, width, height, out)` / `integralAbsDiff(a, b, width,
    height, out)` writing into a caller-owned buffer, plus
    `integralBuffer(width, height, reuse: LongArray? = null): LongArray` to size/reuse one;
  - `perSquareDiff` uses a file-private buffer via `integralBuffer`, so the hot path is
    allocation-free per frame (5.1 MB/call avoided at 800x800) and the buffer is fully
    consumed inside the call.
  **01b/01c/01d: if you integrate every frame, keep a `LongArray` field and call the `out`
  overload; do NOT hold two results of the same no-`out` call at once.**
- **D01a-3 — `Squares` carries two extra constants (additive).** `Squares.N = 8` and
  `Squares.COUNT = 64` so no downstream file needs a bare `64`/`8` literal (detekt
  `MagicNumber` fires in function bodies). `colRow`'s packing constants stay private.
- **D01a-4 — `Squares.colRow` trims and lowercases, `Squares.index` does not.** Python's
  `_square_to_col_row` does `square.strip().lower()` before validating (`calibration.py:334`),
  so `colRow` mirrors that. `index()` is a strict lookup into `ALL` and returns -1 for
  anything else (including `"E4"`), per the phase file's "-1 if unknown".
- **D01a-5 — fixture keys (00b's schema wins, per the amendment).**
  - "the fixture gray pair at `detSize = 800`" → `meta.detSize` is **320** (D00b-4). The test
    reads `detSize` and `overhang` from `meta.effectiveConfig` via `toTrackerConfig()`, never
    from Kotlin defaults; **`overhang` is 0.0 on several clips**, so hard-coding 0.25 would
    have been wrong.
  - "`squareRegion` for `boardSize ∈ {800, 1600}`" → `_geometry/meta.json → squareRegions[]`
    holds all 16 sets (`boardSize ∈ {320,640,800,1600}` × `whitePov` × `extendUp ∈ {0,0.25}`,
    `inset` 0.16). The test asserts **all 16** (a superset of what the phase file asks for),
    exactly, ints — plus `squareBoxes` box-by-box against the same fixture, plus the
    clip-native `tierA.squareRegion` (18 clips) at `detSize`/`overhang`.
  - `squareCenter` is asserted from `_geometry/meta.json → squareRegions[].centers`.
- **D01a-6 — Tier-A reconstruction, and the `refFrames == null` case.** `perSquareDiff` parity
  is run over the real planes: `cur` = mean of `tierA.curFrames`, `ref` = mean of
  `tierA.refFrames`, using Python's `_RunningMean.mean_uint8` semantics
  (`(sum / n)` **truncated**, not rounded). `tierA == null` frames are skipped (D00b-7), and
  frames where `refFrames` is null (`_maybe_patch_anomaly` mutated `ref_gray` in place) are
  skipped too — they are not reconstructible from the planes. **Currently 0 of 247 tier-A
  frames are in that case**, so all 247 are compared; the guard is future-proofing.
- **Coverage actually asserted:** 16 × 64 geometry regions + 16 × 64 centers + 18 × 64
  clip-native regions, and **247 tier-A frames** (all 18 clips) for both `perSquareDiff` and
  `normalizeDiffs`, at the 1e-4-relative fixture tolerance. Max observed error on the Python
  side of the same reconstruction was 5e-7.

### 02c (`:core-cnn` — observation model, recovery search, resync, preprocessing), 2026-07-25

Files created (package `com.chesslab.cnn`, module `:core-cnn`):
`CnnConfig.kt`, `Expected.kt`, `OccupancyObservation.kt`, `Observations.kt`, `Recovery.kt`,
`DeepSearch.kt`, `Resync.kt`, `AlarmGuess.kt`, `Preprocess.kt`, `SquareClassifier.kt`; tests
`MiniJson.kt`, `CnnFixtures.kt`, `FixtureAccess.kt`, `FixtureModels.kt`,
`FakeSquareClassifier.kt` + `ObservationTest` (6), `RecoveryTest` (7), `DeriveIdentityTest`
(6), `DeepSearchTest` (8), `ResyncTest` (7), `AlarmGuessTest` (6), `PreprocessTest` (6),
`FakeSquareClassifierTest` (3) — **49 tests**. `build.gradle.kts` was NOT touched (00a owns it;
the phase file's "java-library + kotlin-jvm" text is superseded by the android-library
amendment). All 7 `_cnn` families are consumed with an asserted row count
(7/3/4/3/10/3/4 = 34 rows).

#### How the frozen seam is implemented

`OccupancyObservation` implements `CnnObservation`; `CnnRecovery` implements `CnnEvaluator`.
Three seam methods are **narrower than Python**, so each has a Python-faithful companion as a
top-level extension (the seam itself is untouched):

| Seam member | Python | Companion in `:core-cnn` |
|---|---|---|
| `resyncCheck -> ResyncResult(match, conflicts, checked)` | `{match, conflicts, move, agreement}` | `CnnRecovery.resyncCheckFull -> ResyncCheck(match, conflicts, move, agreement)`; the seam's `checked` is filled with the number of occupancy-confident squares |
| `boardMatchesIdentity -> IdentityResult(match, inconclusive, conflicts)` | `{match, conflicts, n, inconclusive}` | `CnnRecovery.boardMatchesIdentityFull -> IdentityCheck(..., n, ...)` |
| `deriveMovesDeep -> DeriveResult(moves, agreement, inconclusive)` | `(seq, best, second)` | `CnnRecovery.deriveMovesDeepFull -> DerivedMoves(moves, best, second)`; seam mapping is `agreement = best`, `inconclusive = moves.isEmpty()`, `second` not expressible |

#### Discrepancies

- **D02c-1 — the seam's `board: Any` is a chesslib `Board`, and `CnnObservation` an
  `OccupancyObservation`.** Both seam entry points `require(...)` the concrete type. There is
  no coupling to 02a's `Game`/`MoveSquares` (which does not exist yet): `cnn_recovery.py`
  itself works on `chess.Board` and carries its **own private** `_move_touched_squares`
  (`:87`, "without circular import"), so the port keeps that internal
  (`Recovery.kt moveTouchedSquares`). `:core-geometry` is likewise unused — `Preprocess`
  takes `BgrImage` (the 00a seam type), never `Crops`. **02c therefore has no 02a/02b
  coupling to resolve.**
- **D02c-2 — `top_unique` is not emitted; `deep_four_ply` is a real transposition tie.**
  The phase file's `cnn_derive.jsonl` schema names `top_unique`; 00b's rows carry
  `{name, fen, classes, confThr, mode, maxPlies, beam, minAgreement, marginSquares,
  minConfidentRecovery, seq, best, second}`. 9 of the 10 rows reproduce `seq` **exactly**.
  `deep_four_ply` returns `[e2e4, e7e5, g1f3, b8c6]` where Python has
  `[g1f3, b8c6, e2e4, e7e5]` — the **same 4 plies reaching the same placement with the same
  hit count**, i.e. the transposition the algorithm deliberately collapses into ONE `finals`
  entry. The winner is decided by the legal-move enumeration order, and chesslib generates
  pawn moves first while python-chess does not; the phase file already calls this out
  ("ties across the two implementations are not order-comparable"). Handled by
  `assertSequenceEquivalent`: exact where equal, otherwise **same length AND same
  placement-only FEN**, with `best`/`second` compared numerically on every row. No tolerance
  was loosened.
- **D02c-3 — `parity/_cnn` is read off the file system, not the classpath** (D00b-1: one
  fixture tree, in `:core-engine`'s test resources). `CnnFixtures` walks up from `user.dir`
  to `core-engine/src/test/resources/parity/_cnn`. `:core-cnn`'s build file has no JSON
  dependency (00a owns it) and Android unit tests stub `org.json`, so the module's test
  sources carry a local ~90-line `MiniJson` reader. **`ParityFixtures.kt` was neither moved
  nor duplicated** — only the 1e-4-relative tolerance contract is mirrored (`assertClose`).
- **D02c-4 — no `kotlin-test` on the classpath.** 00a's `:core-cnn` test deps are
  `junit.jupiter` + the platform launcher only, so tests use
  `org.junit.jupiter.api.Assertions.*` (the house style of the `:core-engine` tests). Not a
  blocker, no build edit.
- **D02c-5 — `serving.predict_arrays` normalizes with `config.NORMALIZE_MEAN/STD`, not with
  the run config's `normalize` block** (`serving.py:364-366`). The bundled
  `app/src/main/assets/cnn_model/config.json` happens to carry the same ImageNet values.
  `preprocess(crops, outW, outH, mean = IMAGENET_MEAN, std = IMAGENET_STD)` therefore
  defaults to the `config.py` constants and accepts overrides; **parsing the asset JSON is
  05c's job** — `:core-cnn` main sources have no JSON parser. The loud 14-class assertion is
  `requireExpectedClasses(classes)`, which returns the ASSET list so callers keep using it.
- **D02c-6 — `_build_alarm_guess_san` accepts more input than the Kotlin port.**
  `chess.Move.from_uci` also parses the null move `"0000"` (-> `"a1->a1"`); Kotlin's
  `parseGuessSquares` requires two well-formed algebraic squares and returns `null`. The path
  is unreachable from `guessIllegalMove`, which only ever emits real square names.
- **D02c-7 — detekt `TooManyFunctions` (default 11) dictates the file layout.**
  `CnnRecovery` has exactly 10 members, so `boardMatchesIdentityFull` / `resyncCheckFull` /
  `deriveMovesDeepFull` are **top-level extension functions**, not members. Related trap:
  inside the class, `hasOccupancyConflict(...)` / `guessIllegalMove(...)` are called
  **fully qualified** (`com.chesslab.cnn.…`) — the seam member would otherwise shadow the
  top-level function and recurse forever. Same MagicNumber class as D00a-3: `NO_AGREEMENT`,
  `FULL_AGREEMENT`, `NO_HITS`, `MIN_VERIFIED_SQUARES`, `PAIR_PLIES`, `CASTLING_FILE_SPAN`,
  `CHANNELS`, `BYTE_MASK`, `MAX_U8` are named constants with unchanged values. No
  `@Suppress`, no baseline.
- **D02c-8 — `CnnConfig` duplicates knobs that also live in `TrackerConfig`** (00a):
  `confThr`/`cnnConfThr`, `minAgreement`/`cnnMinAgreement`, `marginSquares`/`cnnMarginSquares`,
  `minConfidentBoard`, `minConfidentRecovery`, `recoveryMaxPlies`. Values agree. `beam = 8`
  has **no `TrackerConfig` counterpart** (it is a call-site default in Python too,
  `cnn_recovery.py:286`) — phase 04 must construct `CnnConfig` from `TrackerConfig` and
  leave `beam` at its default, or the orchestrator adds the knob.
- **Note (not a discrepancy):** the whole module is pure — no coroutines, no threads, no
  caching, no ONNX/OpenCV/Android reference (`grep -rni "onnx\|opencv\|android"` over
  `core-cnn/src/main/kotlin` is empty apart from the `com.chesslab.engine.api` imports).
  `DeepSearch.kt` keys `finals` on `board.boardFen()` (placement only) and never calls
  `.fen()`. `minConfidentBoard` appears in `Recovery.kt` only inside
  `boardMatchesIdentityFull`.

### 02b (`:core-geometry` — corners, homography, the two warps, crops, ArUco, grid lines), 2026-07-25

Files created (package `com.chesslab.geometry`, module `:core-geometry`):
main `Corners.kt`, `CropBox.kt`, `Homography.kt`, `Warp.kt`, `Crops.kt`, `Aruco.kt`,
`MarkerTracker.kt`, `GridLines.kt`, `GrayPipeline.kt`; tests `testutil/OpenCvNatives.kt`,
`testutil/GeometryFixtures.kt`, `testutil/SyntheticBoard.kt`, `testutil/SyntheticMarkers.kt`
+ `CornersTest` (8), `CropBoxTest` (6), `MarkerTrackerTest` (9) — Tier A — and
`HomographyTest` (5), `WarpTest` (6), `CropsTest` (6), `ArucoTest` (6),
`BoardCornersForFrameTest` (4), `GridLinesTest` (4), `GrayPipelineTest` (4) — Tier C.
**58 tests, 0 skipped, 0 failures — the OpenCV natives DID load on this machine**, so every
Tier-C class actually ran. `build.gradle.kts` and `libs.versions.toml` were NOT touched
(00a owns both and they were already complete — no dependency was missing).

#### Discrepancies

- **D02b-1 — `cropBorderPx` with the defaults is 20, not the 200 the phase file states.**
  `max(0.1, padSide, padUp) * cell = 0.10 * 200.0 = **20**` at `boardSize = 1600`
  (the phase file's "0.10 * 200.0 = 200" is an arithmetic slip), and `padUp = 0.25` gives
  **50**, not 500. Confirmed by `_geometry/meta.json → cropBoxes[]`, which emits
  `cropBorderPx = 20` for `bs 1600 / padSide 0.1` and `50` for `padUp 0.25`. The hand-written
  test expectations in the phase file's `CropBoxTest` list were corrected accordingly; the
  `a8 = (-20,-20,220,220)` / `h1 x1 = 1620` expectations are right and pass.
- **D02b-2 — `squareRegion` is NOT the "`padUp = padSide = 0` special case of the crop box".**
  The phase file describes it as `round(col*cell) … round((col+1)*cell)`. The real
  `tracker.py:120 square_region` **insets by `inset = 0.16` of a cell**, supports `extendUp`,
  and **truncates** (`int()`), not rounds — `y0` additionally clamped by `max(0, …)`. Ported
  from Python (`squareRegion(square, boardSize, whitePov, inset = 0.16, extendUp = 0.0)`) and
  verified against all 16 `_geometry/meta.json → squareRegions[]` cases (4 board sizes x
  2 povs x `extendUp ∈ {0, 0.25}`), 64 squares each. Phase 03 must pass the tracker's
  `overhang` as `extendUp`.
- **D02b-3 — rounding: `Math.rint`, and the phase file's rationale is inverted.** Python's
  `int(round(x))` on a float is **half-to-EVEN** (banker's), so the faithful JVM primitive is
  `Math.rint`, not "ties away from zero". `kotlin.math.round` is ties-away-from-zero and would
  be WRONG. Implemented as `internal fun pyRound(v) = Math.rint(v).toInt()` in `CropBox.kt` and
  used by `squareToCropBox`, `cropBorderPx`, `resizeKeepAspect` and `GridLines`.
- **D02b-4 — `boardCornersForFrame` lives in `Aruco.kt`, not `MarkerTracker.kt`.** The phase
  file puts it under the `MarkerTracker.kt` heading while simultaneously making
  "`MarkerTracker.kt` stays OpenCV-free" a hard requirement, and the acceptance criterion greps
  `MarkerTracker.kt` for `org.opencv` expecting zero hits. `board_corners_for_frame` needs
  `cv2.resize` + detection, so it went to `Aruco.kt` (which already owns detection). The
  parallelogram completion is a private helper there. `MarkerTracker.kt`, `CropBox.kt` and
  `Corners.kt` have **zero** `org.opencv` references.
- **D02b-5 — the `_geometry/` fixtures are read from the file system, not the classpath.**
  Per D00b-1 there is one fixture tree and it lives in `:core-engine`'s test resources, which
  are not on `:core-geometry`'s test classpath. As instructed, `ParityFixtures.kt` was neither
  moved nor duplicated: `testutil/GeometryFixtures.kt` is a **minimal local loader** that walks
  up from the working directory to `core-engine/src/test/resources/parity` and reads
  `_geometry/meta.json`, `_geometry/resolve_corners.jsonl`, `_geometry/grid_coverage.jsonl` and
  the raw gzipped planes. It carries the same 1e-4-relative tolerance. JSON is parsed with
  **snakeyaml** (already a declared test dependency of the module; JSON is a YAML subset and no
  fixture file uses exponent notation) — no new dependency, no catalog change. If the
  orchestrator later copies `_geometry/` into this module's resources, the loader collapses to
  a resource read.
- **D02b-6 — `OpenCvNatives.available` is a `fun`, not a `val`.** JUnit 5's `@EnabledIf`
  resolves a **method** reference; a Kotlin `val available` compiles to `getAvailable()` and
  would not be found. Same object, same `Loader.load(opencv_java::class.java)` mechanism, same
  `@JvmStatic`. All 7 Tier-C classes carry
  `@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")`; there is no
  `assumeTrue`, no `@Disabled`, no try/catch fallback anywhere in the test sources.
- **D02b-7 — the fixture names in the phase file's Step 7 do not exist** (`fixtures/geometry_*.jsonl`
  under this module's resources). Per the 00b mapping table the real sources are
  `_geometry/meta.json → cropBoxes[] / squareRegions[] / homographies[]`,
  `_geometry/resolve_corners.jsonl` (17 rows) and `_geometry/grid_coverage.jsonl` (7 rows,
  self-contained raw gray planes — no PNG decoder). All are consumed; **no fixture was invented.**
- **D02b-8 — `blanking 3 lines drops coverage to 11/14` is 10/14 in the fixture.**
  `_geometry/grid_coverage.jsonl → synthetic_blanked` is `0.714286 = 10/14`. The fixture wins;
  the Kotlin port reproduces it exactly. The clean synthetic grid (1.0), the flat image (0.0)
  and the 8x8 size guard (1.0) also match.
- **D02b-9 — detekt shaped three implementations** (no `@Suppress`, no baseline, no config
  relaxation): `GridLines` splits its band scan into `litRowFraction`/`litColumnFraction`/
  `anyEdge` (NestedBlockDepth), `Crops.cropSquare` tests the four pads with
  `maxOf(...) > 0` instead of a 4-term `||` (ComplexCondition), and `Homography.pointsMat`
  uses `MatOfPoint2f().fromList(...)` instead of the spread operator (SpreadOperator).
  Behaviour is unchanged in all three.
- **Note (not a discrepancy):** `GrayPipeline` takes `claheClip` as a constructor parameter and
  exposes `toGray(warpedBgr, dst = null)`, per the phase file's own "expose this as a small
  class" instruction, rather than the sketched `toGray(warpedBgr, claheClip, dst)`. CLAHE is
  applied out-of-place into a scratch `Mat` (OpenCV's CLAHE reads its source while writing the
  destination), then copied back; the handle is created once.
- **Note:** `Warp.kt` additionally exposes `toGrayImage`/`toBgrImage` (`Mat` ↔ the OpenCV-free
  seam types) so phase 05b has the module boundary conversion the "Do NOT put OpenCV types in
  the api seam" rule implies.

### 01b (census transform / per-square census change), 2026-07-25

Files created (`internal`, package `com.chesslab.engine`): `Census.kt`,
`CensusParityTest.kt` (4 tests), `CensusUnitTest.kt` (7 tests). Nothing else was touched.

Landed surface: `POPCOUNT8` (`IntArray(256)`), `CENSUS_EPS = 0`, `censusBuffer(width, height,
reuse)`, `censusTransform(gray, yLo, yHi, eps, out)`, `perSquareCensusChange(refCodes, curGray,
boxes, out, rows)`. `eps` stays a parameter defaulting to 0 and no config knob reaches it
(invariant 7); the result is RAW, never normalized here (invariant 8).

- **D01b-1 — detekt `LongParameterList` fires at SIX parameters, not seven.** The message is
  "too many parameters. The current threshold is set to 6" on a 6-parameter function — detekt
  1.23 compares `size >= threshold`, so **5 is the maximum** and the phase file's 7-parameter
  `censusTransform(gray, width, height, yLo, yHi, eps, out)` is unbuildable without a
  `@Suppress`. Landed instead: `censusTransform(gray: GrayImage, yLo = 0, yHi = gray.height,
  eps = CENSUS_EPS, out: ByteArray)` — `GrayImage` is exactly `(data, width, height)`, so no copy
  and no boxing; the semantically load-bearing `eps` parameter is kept as instructed. Callers
  write `censusTransform(img, out = buf)` / `censusTransform(img, yLo = a, yHi = b, out = buf)`.
- **D01b-2 — `perSquareCensusChange` has no `boardSize` parameter (same cap) — ACTION FOR 01d.**
  Python's `board_size` is the edge of the square board warp the call runs on, which is
  `curGray.height`; the function `require`s `width == height` so a non-warp input fails loudly
  instead of silently mis-guarding the band. The phase file's "pass it explicitly" is not
  expressible at 6 parameters. **01d's `BaselineOcclusion.kt:164` still calls the old 6-argument
  form (`..., boardSize, boxes, censValues, rows`) and must drop the `boardSize` argument** —
  I do not own that file. `:core-engine` therefore does not compile as a whole while 01c/01d are
  in flight (01c changed `occlusionColorSquares` to `ColorPlanes`/`PlaneGeometry` bundles for the
  same detekt reason, and 01d's call site is stale against that too).
- **D01b-3 — the phase file's gate could not be run against the shared module.** Because of
  D01b-2 (and 01c/01d mid-flight), `:core-engine:compileKotlin` is red for reasons outside my
  scope. The gate was therefore run in an isolated copy of `android/` containing **only** 00a's
  scaffold + seam, 00b's fixtures, 01a's five files and my three — `:core-engine:test`
  (`CensusParityTest` 4, `CensusUnitTest` 7, all green), `ktlintFormat` (no change to my files),
  `ktlintCheck` + `detekt` (zero findings, no `@Suppress`, no baseline). The orchestrator must
  re-run the gate on the real tree once 01c/01d have landed.
- **D01b-4 — there is no banded golden fixture** (00b's schema wins, mapping table line 162).
  `bandFastPathMatchesPythonBand` therefore builds the band exactly as `_apply_vetoes`
  (`tracker.py:3156-3158`) does — `rows = (min y0 of the candidate boxes - 1, max y1 + 1)` over
  `tierA.vetoCandidates` at `extendUp = overhang` — and asserts the in-band squares against
  Python's full-path `tierA.censusRaw` (that identity IS the property the halo guarantees) and
  exactly `0.0` outside. `bandInteriorEqualsFullTransform` repeats the check against my own full
  path over an unrelated band (`a4`/`h5`), so the two tests cannot fail into each other.
- **D01b-5 — `censusCodeCrop`'s origin uses `extendUp = 0`.** The emitter takes
  `square_region("e2", detSize, whitePov)[0:2]` (`emit_parity_fixtures.py:471`) — the *unextended*
  region, then clamps into the plane — not the `overhang` boxes the channel itself uses. The test
  asserts the fixture's `x0`/`y0` against that formula before comparing the codes.
- **Note (not a discrepancy):** the file keeps two sets of size-keyed scratch buffers (full path
  and band path) rather than one. Both paths run every frame at different heights, and a single
  shared buffer would reallocate on every alternation. Each set is fully consumed inside the call
  that grows it, so nothing can alias a caller's buffer (same reasoning as D01a-2).
- **Coverage actually asserted (247 tier-A frames over all 18 clips, all reconstructible):**
  247 × 256 census-code pixels byte-exact against `tierA.censusCodeCrop`; 247 × 64 squares against
  `tierA.censusRaw` (full path); 229 frames × 64 squares for the candidate-band fast path (the
  other 18 tier-A frames have an empty `vetoCandidates` set, where Python never takes the band
  path either); 247 frames for band-vs-full interior equality. `TrackerConfig` is built from
  `meta.effectiveConfig` throughout (`overhang` is 0.0 on several clips, `detSize` is 320).

### 01d (motion score / SquareNoise / baseline occlusion+shadow), 2026-07-25

Files created (all `internal`, package `com.chesslab.engine`):
`Motion.kt`, `SquareNoise.kt`, `BaselineOcclusion.kt`, `MotionNoiseParityTest.kt` (3 tests),
`BaselineOcclusionUnitTest.kt` (14 tests). No other file was touched.

The three published constants are landed verbatim: `motionScore` returns a **percent**
(`count(|d| > pxThr) / n * 100`, strict `>`); the gray lane is `alpha 0.05 / initStd 6.0 /
stdFloor 3.0` with `excludeAlphaScale 0.0`, the census lane `initStd 8.0 / stdFloor 2.5` with
`0.125`; the deviation is measured against the **pre-update** mean and the `a == 0.0` skip is an
exact `Double` comparison. `BaselineResult`'s third member is the RAW UNDILATED core.

- **D01d-1 — two upstream signatures landed differently; `BaselineOcclusion.kt` was adapted, their
  files were not touched.**
  - 01b: `perSquareCensusChange(refCodes, curGray, boxes, out, rows)` — **no `boardSize`** (it is
    derived from `curGray.height`, which 01b guards with `require(width == height)`). The 01d
    phase file's contract listed exactly this signature, so this only invalidates 01b's own
    interim blocker note, which is now struck.
  - 01c: `occlusionColorSquares(cur: ColorPlanes, geom: PlaneGeometry, gamut, candidates, thr)` —
    the `curLab`/`curHsv`/`width`/`boardSize`/`whitePov`/`extendUp` parameters moved into
    `ColorPlanes` + `PlaneGeometry`. 01d builds
    `PlaneGeometry(width, height, boardSize, whitePov, extendUp = 0.0)` at the call site, which
    reproduces Python's default `extend_up = 0.0` at `tracker.py:427` (base box only).
- **D01d-2 — `baselineOcclusionAndShadow`'s 12-parameter signature is not expressible under the
  detekt gate; the trailing arguments are grouped into two holders (additive, no semantic
  change).** detekt's thresholds are `>=`, so a function fires `LongParameterList` at **6**
  parameters (`ignoreDefaultParameters` is off and the config is frozen). The landed signature is
  `baselineOcclusionAndShadow(curGray, refGray, boxes, params: BaselineParams,
  evidence: BaselineEvidence = BaselineEvidence())` with
  `BaselineParams(boardSize, absThr, whitePov)` and
  `BaselineEvidence(refCodes, occlCensusThr, curLab, curHsv, gamut, colorThr)` — every argument of
  the phase file's signature is present, with the same name, type, order and default. Same class
  of finding as D01a-1/2 and D01b-2. `absThr` is still passed **by the caller** as
  `motionPxThr * 4`, never derived inside. No `@Suppress`, no baseline.
  For the same reason (`ReturnCount` limit 2, `ComplexCondition` limit 4, `LongMethod` 60,
  `CyclomaticComplexMethod` 15) the body is split into `computeMeans` / `censusChannel` /
  `chromaOutliers` / `classify` / `isOccluder` / `dilate`. The arithmetic is a literal transcription
  of `tracker.py:412-453`; no threshold was touched.
- **D01d-3 — the frame-level `baselineOcclusion` fixture needs the reference RECONSTRUCTED, and the
  rule is provable.** The block is computed on the RAW current frame against `self.ref_gray`
  (`tracker.py:1612`), and `refFrames` is only emitted on tier-A frames. `_set_ref` runs **only**
  inside `_try_detect` (a tier-A frame) or at the very first baseline capture, which precedes every
  block — so the reference in force at a block frame is exactly `tierA.refFrames` of the **next**
  tier-A frame, and the active gamut is that frame's `activeGamutFrames`. Verified in Python against
  the emitted sets before the Kotlin test was written: **173/173 blocks reproduce exactly**. 14 of
  the 187 blocks have no later tier-A frame and are skipped (0 have a null `refFrames`).
- **D01d-4 — `censusNoiseZ == null` is a LEARNING event, not just a missing value.** On those frames
  `_compute_evidence`'s channel-local guard (`hot > maxChanged + 2`, `tracker.py:3119-3129`) dropped
  the census channel *after* calling `census_noise.update(cens)` with **full alpha and no
  exclusion**. A port that simply skips the census update on those frames diverges from the next
  frame on. 3 such frames over the 18 clips; the parity test asserts the branch was exercised.
- **D01d-5 — `tierA.baselineOcclusion` (the averaged pair) is empty on every emitted frame**, since
  detection frames are by construction quiet. The load-bearing coverage is the *frame-level*
  `baselineOcclusion` block, which is why the reconstruction of D01d-3 was worth proving.
- **Coverage actually asserted:** `motionScore` on **969 frames** (every emitted frame of all 18
  clips, `max(motionScore, motionRoiScore)` vs `tierB.motionScore`); the `SquareNoise` replay over
  **247 tier-A frames** × 4 maps (`noiseZ`/`censusNoiseZ` before, `noiseMean`/`noiseStd` +
  `censusNoiseMean`/`censusNoiseStd` after) from the constructor state, never reset;
  `baselineOcclusionAndShadow` on **173 frames**, all three sets EXACT, of which **87 carry a
  non-empty raw `core`** and **42 a non-empty `chromaOutliers`** (the chroma branch really fires).
  `TrackerConfig` is built from `meta.effectiveConfig` throughout; `absThr`, `occlCensusThr` and
  `colorThr` are read from the emitted `baselineOcclusion` block (`colorThr` is **1.5**, D00b-3).

### 01c (colour space / HSV shadow veto / colour gamut + Mahalanobis), 2026-07-25

Files created (all `internal`, package `com.chesslab.engine`): `ColorSpace.kt`, `ShadowVeto.kt`,
`Gamut.kt`, `ColorSpaceParityTest.kt` (3 tests), `ShadowGamutParityTest.kt` (5 tests),
`GamutUnitTest.kt` (5 tests). No other file was edited.

Semantics landed verbatim: the Cucchiara constants `vLo 0.35 / vHi 0.97 / hTol 15.0 / sTol 40.0 /
frac 0.5` with the `+1e-3` guard, the circular hue distance and the **required** `mean(Vc) <
mean(Vr)` second condition; the gamut feature `[Lab a*, Lab b*, HSV S]` with **L\* dropped** and
a*/b* left in their +128 encoding; `>= 8` usable squares, `np.cov`'s `n-1` denominator, `+4.0*I`,
analytic 3x3 inverse with a `1e-12` singularity guard; and a **nearest-neighbour** Mahalanobis over
all reference features (never a distance to `mu`), checked on the base box and — only when
`extendUp > 0` — additionally on the extended box.

- **D01c-1 — the phase file's float BGR->Lab formula MISSES its own `<= 1 LSB` acceptance bound;
  OpenCV's integer LUT pipeline was ported instead.** Measured against `parity/_colorspace/`
  (a 32x1024 sweep of every 8th level per channel + a real 320x320 board warp), the textbook
  formula from `01c-shadow-gamut.md` (sRGB gamma -> XYZ/D65 -> `f(t)` -> `saturate(round(...))`,
  in float64) deviates from `cv2.cvtColor(..., COLOR_BGR2LAB)` by **max [1, 2, 1] LSB** on
  `[L, a*, b*]` for **both** patches — 19 sweep pixels and 39 board pixels are off by 2 on a*.
  The bound is `<= 1`, so that implementation could not be accepted.
  `ColorSpace.kt` therefore reproduces OpenCV's actual 8-bit code paths, `RGB2HSV_b` and
  `RGB2Lab_b`: the `sdiv_table`/`hdiv_table180` fixed-point divisions (`hsv_shift = 12`), and
  `sRGBGammaTab_b` (`gamma_shift = 3`) -> integer XYZ coefficients at `lab_shift = 12` ->
  `LabCbrtTab_b` -> `Lscale = 296` / `Lshift = -1336934` at `lab_shift2 = 15`, all with
  `CV_DESCALE`. Result: **HSV is bit-exact (max deviation 0 on every channel of both patches)**
  and Lab is within **1 LSB** (mean deviation `6.1e-5` on the sweep's a*, `4.4e-4` on the board's
  b*; L is exact on both). The residual is OpenCV building its tables in `float` with `cvCbrt`'s
  polynomial approximation, which was not worth emulating. **This is a faster implementation too**
  (three table lookups + nine integer multiplies per pixel, no `pow`/`cbrt` in the loop), so the
  phase file's "precompute the sRGB LUT" performance instruction is satisfied a fortiori.
- **D01c-2 — none of the three published signatures is expressible under the detekt gate; the
  scalar tails are grouped into holders (additive, no semantic change).** detekt compares
  `parameters.size >= threshold`, so **5 is the maximum** for a function (same finding as D01b-1 /
  D01d-2; the config is frozen and `@Suppress`/baselines are forbidden). Landed:
  - `PlaneGeometry(width, height, boardSize, whitePov, extendUp = 0.0)` with
    `region(square, extendUp): IntArray?` — the clipped `square_region`, `null` for Python's
    `reg.size == 0` (skipped, never flagged);
  - `ColorPlanes(lab, hsv)`; `ShadowParams(vLo, vHi, hTol, sTol, frac)`;
  - `hsvShadowSquares(refHsv, curHsv, geom, candidates, params = ShadowParams())`;
  - `boardColorGamut(ref: ColorPlanes, geom: PlaneGeometry)`;
  - `occlusionColorSquares(cur: ColorPlanes, geom, gamut, candidates, thr = 4.0)`;
  - `bgrToHsv/bgrToLab(bgr, width, height, out)` unchanged.
  `ShadowParams` lives in `ColorSpace.kt` next to the other bundles because as the only top-level
  classifier in `ShadowVeto.kt` it tripped `MatchingDeclarationName` (same rule as D01a-2).
  01d already codes against this exact surface (D01d-1).
- **D01c-3 — `colorGamutFromFeatures(feats, n)` added (additive).** The phase file asks for an
  `invCov` test "recomputed from the fixture's own features to isolate the colour-conversion
  error", which `boardColorGamut(image)` cannot express. The statistics half is therefore a
  separate `internal` entry point that `boardColorGamut` delegates to; nothing else changed.
- **D01c-4 — a per-square colour MEAN cannot be held to the 1e-4 fixture tolerance; the `<= 1 LSB`
  conversion exception propagates into it.** `tierA.gamut.feats` are means of 8-bit Lab/HSV
  channels, so the 1-LSB Lab residual (D01c-1) survives averaging. **Worst observed deviation over
  all 18 gamut fixtures: 0.1248 on a feature** (`blender-promocapture/4`, `feats[29][1]`, i.e.
  b\*), `mu` no worse, and **0.549 % relative on `invCov`**. `boardColorGamutMatchesPython`
  therefore asserts `<= 1.0` absolute on features/`mu` (the documented per-channel bound, which a
  mean cannot exceed) and `<= 1e-2` relative on `invCov`, and reports the observed maximum in the
  failure message. The strict 1e-4 tolerance is kept where the phase file actually puts it, in
  `gamutStatisticsFromPythonFeaturesMatchPython`, which feeds Python's own features in — that test
  passes at the full fixture tolerance, so the covariance/inverse math itself is exact.
  **Nothing was tuned to pass: every derived square set matches EXACTLY**, which is the contract
  `parity/README.md` puts on the conversion exception.
- **D01c-5 — the fixtures never exercise the extended-box arm of `occlusionColorSquares`.** Both
  Python call sites (`tracker.py:427` in `_baseline_occlusion_and_shadow` and
  `emit_parity_fixtures.py:484` for Tier A) use the default `extend_up = 0.0`, so the
  `extend_up > 0` branch at `tracker.py:353` is unreachable in today's tracker. It is implemented
  for faithfulness and covered by a hand-written test (`aForeignColourIsAnOutlierOnBothBoxes`)
  that paints only the overhang band above `e4`.
- **D01c-6 — `occlusionColorThr` in the fixtures is 1.5 (D00b-3) and the phase file's
  "`thr = 3.0`" is wrong for them.** Every parity assertion reads the threshold from
  `tierA.occlusionColorThr` / `baselineOcclusion.colorThr`, and every `TrackerConfig` comes from
  `meta.effectiveConfig`. `detSize` is 320 and `overhang` is 0.0 on several clips, so the shadow
  test takes `extendUp` from the config rather than assuming 0.25.
- **D01c-7 — `:core-engine` did not compile while 01b/01d were in flight**, so the tests were first
  brought green in an isolated copy of `android/` (the same workaround 01b used, D01b-3). **The
  gate reported below was subsequently re-run on the real tree**, after 01d landed its fix, and is
  green there. `ktlintFormat` on the real tree reformatted `MotionNoiseParityTest.kt` (01d's file)
  at the same moment 01d was running its own format; the rule set is deterministic and idempotent,
  and `ktlintCheck` is green for the whole module, so nothing was reverted.
- **Coverage actually asserted:** 2 colour patches x 3 channels for HSV and Lab
  (32 768 + 102 400 pixels each); **247 tier-A frames** over all 18 clips for `hsvShadowSquares`
  (of which **109 carry a non-empty shadow set**) and for `occlusionColorSquares` on the averaged
  detection pair; **18 gamut rebuilds** end-to-end and from Python's features (`n == 64` each);
  and **173 frame-level `baselineOcclusion` blocks** for the hand-over-the-board veto (of which
  **42 carry a non-empty `chromaOutliers` set**), using the same "gamut of the next tier-A frame"
  reconstruction 01d proved in D01d-3 (the 14 blocks with no later tier-A frame are skipped).

### 02a (`Game` wrapper / touched+destination squares / LL scoring / prior / confirmer), 2026-07-25

Files created (all `internal`, package `com.chesslab.engine`, module `:core-engine`):
`Game.kt`, `MoveSquares.kt`, `Scoring.kt`, `MovePrior.kt`, `Confirmer.kt`; tests
`MoveSquaresTest.kt` (11), `ScoringTest.kt` (8), `MovePriorTest.kt` (5), `ConfirmerTest.kt` (6)
— **30 tests**. No other file was touched; no build file, no `libs.versions.toml`.

Semantics landed verbatim: `moveTouchedSquares` = from + to + **both** rook squares on castling
+ the **captured pawn's square** on en passant; `moveDestinationSquares` = to-square + the rook's
**to**-square only (f1/f8, d1/d8) — the two are separate functions and were not unified;
`loglikScores` = `sum over touched of clip(k*(z - zThr), -12, +12)`, sorted descending, empty on
no legal move; `loglikPairScores` = order fixed by side-to-move, endpoint gate `z[from] >= soft`
**and** `z[to] >= soft` (endpoints only, `soft = zThr * 0.5`), score over the UNION of both plies'
touched squares; `movePrior` = capture +0.5, check +0.3, forward +0.2, `min(p, 1.0)`.

#### The `Game.kt` chesslib API surface phase 03 codes against

```kotlin
internal const val STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

internal class Game(fen: String = STARTPOS) {
    fun fen(): String                       // board.getFen(true, true) — see D02a-1
    val whiteToMove: Boolean                // board.sideToMove == Side.WHITE
    fun legalMoves(): List<Move>            // MoveGenerator.generateLegalMoves(board)
    fun push(move: Move)                    // board.doMove(move)
    fun pop()                               // board.undoMove()
    fun pieceCharAt(square: String): Char?  // 'P'..'k', null = empty
    fun hasCastlingRights(white: Boolean): Boolean   // board.getCastleRight(side) != NONE
    fun sanSequence(moves: List<Move>): List<String> // MoveList(fen()) + toSanArray()
    fun result(): GameResult                // data class(inCheck, checkmate, over)
}
internal data class GameResult(val inCheck: Boolean, val checkmate: Boolean, val over: Boolean)

// top-level extensions (D02a-5) — call sites read exactly as the phase file specifies
internal fun Game.boardFen(): String        // placement field only
internal fun Game.labelAt(square: String): String   // config.label_from_piece
internal fun Game.san(move: Move): String
internal fun Game.copy(): Game              // via fen(); the move stack is NOT copied
internal fun uciOf(move: Move): String      // "e2e4", "e7e8q"
```

`Square.ordinal` is rank-major from `a1`, i.e. **exactly `Squares.ALL`'s order**, so
`Squares.ALL[mv.from.ordinal]` is the square name and `rank * 8 + file` the index — no string
work in the hot loop. `File`/`Rank` ordinals are 0..7 (`NONE` is last).

Scoring surface: `zArrayOf(Map<String, Double>): DoubleArray`, `logits(z, zThr, k, out)`,
`loglikScores(g, z, zThr, k)` and `loglikPairScores(g, z, zThr, k, soft)` each in a `DoubleArray`
and a `Map<String, Double>` flavour, `moveTouchedIndices(g, mv, out): Int` + `TOUCHED_MAX = 4`,
`movePrior(g, mv)`, `Confirmer(confirmFrames)` with `feed/reset/key/count`, and the constants
`Z_THR_DEFAULT`, `LL_K_DEFAULT`, `LOGIT_CLIP`, `PAIR_SOFT_FACTOR`, `PRIOR_CAPTURE`,
`PRIOR_CHECK`, `PRIOR_FORWARD`, `PRIOR_CAP`.

#### Discrepancies

- **D02a-1 — `Game.fen()` must be `board.getFen(true, true)`; chesslib's plain `getFen()` is
  WRONG for this port.** chesslib always prints the en-passant target square when one exists,
  while python-chess's `Board.fen()` defaults to `en_passant="legal"` and prints it only when a
  legal en-passant capture actually exists. Every double-pawn push would therefore differ:
  `blender-opening/0044.json` is `... b KQkq - 0 1` after 1.d4, chesslib's default would emit
  `d3`. `getFen(includeCounters = true, onlyOutputEnPassantIfCapturable = true)` uses
  `pawnCanBeCapturedEnPassant()`, which is exactly python-chess's `has_legal_en_passant()`
  (pawn attacks the square AND is not pinned). Proven by
  `everyFixtureFenRoundTripsThroughTheGameWrapper`: **all 969 emitted frame FENs of all 18 clips
  round-trip byte-identically**. Phase 03d's `tierB.commit.fenAfter` comparisons depend on this.
- **D02a-2 — the four fixture files the phase file names do not exist (00b's schema wins).**
  There is no `src/test/resources/fixtures/scoring_*.jsonl`. Per the 00b mapping table the real
  sources are `tierA.moveTouchedSquares` / `tierA.moveDestinationSquares` / `tierA.loglikScores`
  (top 12) / `tierA.loglikPairScores` (top 12) / `tierA.movePrior`, with `frame.fen`,
  `tierA.zFused` and `zThr` / `llK` from `meta.effectiveConfig`. All five are consumed with an
  asserted row count. **No fixture was invented.** `top_unique` is likewise not emitted (same as
  D02c-2); uniqueness of the top entry is derived from the fixture's own top-two scores.
- **D02a-3 — the Tier-A scoring block belongs to the POST-frame board, i.e. to `frame.fen`.**
  `emit_parity_fixtures.py:476` takes `board = mt.board` *after* the frame has been processed,
  including a commit made on that very frame, and `frame.fen` is read at the same moment
  (`:788`). So on a commit frame the scores are for the position AFTER the move. The README's
  illustrative frame block (`"fen": "…b KQkq…"` together with `loglikScores [["d2d4", 12.36]]`)
  is self-inconsistent; the real `blender-opening/0044.json` has `[["d7d6", -1.946644], …]`.
  Consumers must build their board from `frame.fen`, which is what all four test classes do.
- **D02a-4 — detekt forbids the literal the acceptance criterion greps for.** `MagicNumber`
  fires on numeric literals in function bodies and on default parameter values (D00a-3 / D01a-1),
  so `Scoring.kt` reads `coerceIn(-LOGIT_CLIP, LOGIT_CLIP)` with
  `internal const val LOGIT_CLIP = 12.0`, and likewise `Z_THR_DEFAULT = 3.0`,
  `LL_K_DEFAULT = 1.0`, `PAIR_SOFT_FACTOR = 0.5`, `PRIOR_CAPTURE/CHECK/FORWARD/CAP`,
  `CASTLING_FILE_SPAN = 2`, `ROOK_FILE_KINGSIDE = 7`, `ROOK_FILE_QUEENSIDE = 0`,
  `ROOK_TARGET_KINGSIDE = 5`, `ROOK_TARGET_QUEENSIDE = 3`. **Every value is unchanged**;
  the acceptance grep `coerceIn(-12.0, 12.0)` must be read as "the clip is +/-12".
  No `@Suppress`, no baseline, no detekt.yml change.
- **D02a-5 — detekt `TooManyFunctions` (fires at >= 11, per class and per file's top level)
  shaped `Game.kt`.** The published surface is 12 members, which is unbuildable. `Game` keeps 8
  functions + the `whiteToMove` property; `boardFen()`, `labelAt()`, `san()` and `copy()` are
  top-level `internal` **extension** functions in the same file, so every call site reads exactly
  as the phase file writes it (`g.boardFen()`, `g.san(mv)`, `g.copy()`). Same precedent as
  D02c-7. Nothing was renamed, removed or given a different signature.
- **D02a-6 — everything is `internal`, not `public`.** `entry.md` hard rule 3 makes
  `com.chesslab.engine.api` the only public surface of `:core-engine`; the phase file's code block
  omits the modifier. The Kotlin JVM plugin associates the `test` compilation with `main`, so the
  tests see them (as 01a-01d already rely on).
- **D02a-7 — additive, for the hot path: `moveTouchedIndices` + the `DoubleArray` scoring
  flavours.** `moveTouchedIndices(g, mv, out: IntArray): Int` fills `Squares.ALL` indices
  (`TOUCHED_MAX = 4`) and is what `loglikScores`/`loglikPairScores` use, so no `Set<String>` is
  allocated per legal move per frame; `moveTouchedSquares` is implemented on top of it and keeps
  its published `Set<String>` signature, including Python's set de-duplication. Likewise
  `zArrayOf(Map): DoubleArray` and `DoubleArray` overloads of both scorers; **the published
  `Map<String, Double>` signatures are kept** as delegating overloads (asserted equal by
  `theMapOverloadsAgreeWithThePrimitiveOnes`), so phases 03/04 may use either.
- **D02a-8 — `givesCheck` and `loglikPairScores` use `push`/`pop`, not Python's
  `board.copy(stack=False)`.** chesslib restores the complete state in `undoMove`, and neither
  legal-move generation nor `isKingAttacked` reads the move stack, so the result is identical
  while a FEN re-parse per legal move is avoided. Consequence for phase 03: both functions
  transiently mutate the `Game` they are handed and restore it before returning — do not call
  them re-entrantly on the same instance. `Game.copy()` exists and is tested for callers that
  need a detached board.
- **D02a-9 — `Confirmer` gained `val key: String?` (additive).** Python reaches into
  `_confirmer._cand[0]` for `TrackerStatus.confirmerKey` (and the fixture's `tierB.confirmerKey`),
  so the port exposes it instead of forcing a later phase to duplicate the field. Reset semantics
  are transcribed exactly: `feed(null)` clears the candidate (`count == 0`, `key == null`) and
  returns false, a DIFFERENT key restarts the streak at **1** (not 0), and `confirmFrames <= 1`
  confirms on the very first feed. A confirmed streak keeps counting while the key stays.
- **D02a-10 — no tie-break was added, and none was needed.** The sort is a stable, purely
  numeric descending comparator (`a < b -> 1`, `a > b -> -1`, else `0`), which mirrors Python's
  `sort(key=lambda t: -t[1])` including its treatment of `-0.0 == 0.0`; Kotlin's
  `sortedByDescending` uses `Double.compareTo` and would order `-0.0` before `0.0`. Because
  chesslib and python-chess enumerate legal moves in different orders (D02c-2), the parity tests
  compare the SCORE sequence element by element (order-independent) plus a per-uci score lookup,
  and pin the top move only where the fixture's top score is strictly separated from the
  runner-up. **In the event every fixture row matched by uci as well** — all 2877 `loglikScores`
  rows and all 58 `loglikPairScores` rows — so 02a needed no equivalence escape hatch at all.
- **Note (not a discrepancy):** the legal-move COUNT is asserted per frame against
  `tierA.moveTouchedSquares` / `tierA.movePrior` (5463 rows over 247 positions), and every
  fixture uci resolves in the port's own list. That pins chesslib's legal-move set, and the
  `uciOf` encoding (incl. lowercase promotion suffixes and `e1g1`-style castling), against
  python-chess's over all 18 clips.
- **Coverage actually asserted:** **969** FEN round-trips (every emitted frame of all 18 clips);
  **247 tier-A frames** x **5463 legal-move rows** for `moveTouchedSquares`,
  `moveDestinationSquares` and `movePrior`, sets EXACT and priors at the 1e-4 fixture tolerance;
  **2877 `loglikScores` rows** over 247 frames and **58 `loglikPairScores` rows** over the 11
  frames that have any, each with a sorted-descending check on the port's full list;
  plus the hand-written branches the quiet clips never reach (both castlings, en passant, q/n
  promotion, capture-promotion, the `>= soft` pair gate at and just below the boundary, the
  shared-square union, the +/-12 clip, an all-zero z-map and a stalemate position).
  `TrackerConfig` is built from `meta.effectiveConfig` throughout (`zThr` / `llK`).

### 03a (`EngineState` / detect guards / evidence / frame loop), 2026-07-25

Files created (all `internal`, package `com.chesslab.engine`, module `:core-engine`):
main `EngineState.kt`, `Guards.kt`, `Evidence.kt`, `FrameLoop.kt`; tests `EngineTestImages.kt`
(shared synthetic-image helpers), `GuardsTest.kt` (8), `EvidenceTest.kt` (10),
`FrameLoopTest.kt` (16) — **34 tests**. No other file was touched; no build file, no
`libs.versions.toml`, no `api/` seam file.

#### 03a contract change — the surface 03b/03c/03d and 04a/04b/04c code against

**Every field the phase file lists is declared, with its Python name in a comment.** Two of them
have a different TYPE than the phase file guessed (the guess predates 01c/02a), and the field set
is a strict SUPERSET — the additions are all Python state that phase 04 provably needs:

| Deviation | Phase file | Landed | Why |
|---|---|---|---|
| `refGamut` | `BoardColorGamut?` | **`ColorGamut?`** | that is 01c's landed type name (`Gamut.kt`) |
| `board` | `Board = Board(startFen)` (chesslib) | **`Game = Game(startFen)`** | 02a's wrapper is the ONLY place that may know chesslib, and `Game.fen()` is `getFen(true, true)` (D02a-1). A raw `Board` would corrupt every double-pawn-push FEN. |
| `censusNoise` | `SquareNoise()` | **`SquareNoise(initStd = 8.0, stdFloor = 2.5)`** | `tracker.py:761`. The phase file's spelling would have run the census lane on the GRAY constants and diverged on frame one. Not a judgement call — see D03a-2. |
| `confirmer` / `recoveryConfirmer` | `Confirmer(1)` | **`Confirmer(config.confirmFrames(cnnOn = false))`** | Python builds both with the resolved `confirm_frames` at construction (`tracker.py:827`/`:855`), and `blender-castle` runs at 3 (D00b-17). `Confirmer(1)` would confirm every candidate on its first frame. |

**Additive fields (all present in Python, none invented):** `lastInputSeq` (invariant 14's
duplicate-frame guard), `occlWhitelist` (`_occl_whitelist`), `occludedSince` (`_occluded_since`),
`cnnBusy` (`_cnn_busy`), `observerStartedTs` (`_observer_started_ts`), `lastCnnTs`
(`_last_cnn_ts`), `alarmSince` (`_alarm["since"]` — the seam's `TrackerEvent.Alarm` carries no
timestamp), `desyncLastSeq` (`_desync_last_seq`, the Spec-11 observation dedup), `detBoxes` +
`evidenceBoxes` + `rebuildBoxes()` (Python rebuilds `_square_boxes` inside every
`per_square_diff`; 01a's contract says the tracker caches one set per `extendUp`).

**Phase-04 fields, as instructed:** `PendingVerify(ucis, uci, fen, cur, curBgr, var frames,
priorUsed, seq, var voteOutcome, var voteCount)` — `voteOutcome`/`voteCount` are Python's
`pending["_outcome"]`/`["_votes"]` (`_pending_voted`, `:2290`); `internal typealias
PendingCandidate = PendingVerify` so either spelling compiles; plus `alarm`/`alarmSince`,
`desyncObs`/`desyncConflicts`/`desyncLastSeq` and `recoveryConfirmer`.

**Function ownership — 03b/03c/03d must NOT redeclare these:** `Guards.kt` owns
`detectGuards()`, `clearRef()`, `cornersJumped()`, `clearStuck()` (`_clear_stuck`, resets the
recovery confirmer) and `markStuck()` (`_mark_stuck`); `Evidence.kt` owns the `Evidence` data
class, `computeEvidence()` and both `refCensusCodes()` overloads; `FrameLoop.kt` owns
`FrameOutcome`, `FrameLoop`, `RunningMeanGray`/`RunningMeanBgr` and the constants
`STATE_WAITING/MOVING/OCCLUDED/MOVE`, `NOTE_WAITING_CLEAR`, `NOTE_GRID_COVERED`,
`NOTE_GEOMETRY_SHIFTED`, `SKIP_DARK/MOVING/SETTLING/OCCLUDED`.

#### Discrepancies

- **D03a-1 — the two type corrections above** (`ColorGamut`, `Game`) are not optional: the phase
  file's `BoardColorGamut` does not exist, and `Board(startFen)` would both break hard rule 3's
  spirit and reintroduce the en-passant FEN bug 02a fixed.
- **D03a-2 — `censusNoise` must carry the census constants.** `tracker.py:761` is
  `SquareNoise(init_std=8.0, std_floor=2.5)`; the phase file writes `SquareNoise()`. Caught by
  `computeEvidenceMatchesPython`, which is red with the gray constants on the very first tier-A
  frame of every clip.
- **D03a-3 — `stageTimingsMs` is never written by the engine.** The phase file's "Record
  `stageTimingsMs["evidence"]`" needs a wall clock, and the determinism ban ("no
  `System.currentTimeMillis`/`Instant.now`/`nanoTime` anywhere in `:core-engine`") forbids one.
  The map stays on `EngineState` as the home of `TrackerStatus.stageTimingsMs`; **`:app` (05b/07b)
  fills it by timing the `onFrame` call from outside.** `grep -rn
  "System.currentTimeMillis\|Instant.now\|nanoTime" android/core-engine/src/main` → 0 hits.
- **D03a-4 — the `:1696-1697` state reset is applied BEFORE a `Detect` is returned, not after
  `_try_detect`; the equivalence is proved, not assumed.** The phase file splits the loop so 03d
  runs `tryDetect` on `FrameOutcome.Detect`, which puts the reset on the wrong side of the call.
  Proof that it does not matter: `grep -n "self\.state" tracker.py` shows the only READS are
  `:1611`, `:1683`, `:1696` and `_cnn_tick`'s `:1879` (observer thread, a separate entry point in
  the port), and `awk 'NR>=2834 && NR<=3460' | grep self.state` is **empty** — `_try_detect` and
  everything it calls up to `_dispatch` never touch `self.state`. The only write on that path is
  `_commit_move`/`_commit_sequence`'s `state = "move"` (`:2417`, `:2615`), which the reset
  preserves. So reset-before ≡ reset-after, and 03d cannot forget a follow-up call.
- **D03a-5 — `FrameLoop` is a class taking `setRef` as a constructor callback**, not the phase
  file's `internal fun FrameLoop.step(input)` extension. `_set_ref` lives in 03d's `Commit.kt`,
  which does not exist yet and which 03a may not edit; a `(GrayImage, BgrImage?) -> Unit`
  dependency keeps the loop compilable and testable on its own. **03d constructs
  `FrameLoop(state, ::setRef)` with the QUIET variant (`fromCommit = false`).**
- **D03a-6 — a live resolution change is treated like `prev_gray is None` instead of throwing.**
  Python's `motion_score` would raise from `cv2.absdiff` on a size mismatch and kill the loop
  thread. Constant per clip, so no parity impact; it removes a crash class on Android where the
  camera renegotiates.
- **D03a-7 — detekt shaped three signatures/bodies** (no `@Suppress`, no baseline, no config
  change): `ReturnCount` caps a function at **2** returns, so `detectGuards()` and
  `cornersJumped()` are single-exit with a result variable and `stableMeans()` collapses five
  returns into one; `LongParameterList` fires at **6**, so the test harness's `feed()` derives its
  BGR plane from the gray one instead of taking both; `LoopWithTooManyJumpStatements` allows one
  `continue` per loop, so `EvidenceTest`'s replay merges its two skip conditions. Same class of
  finding as D00a-3 / D01a-1 / D01b-1 / D01c-2 / D01d-2 / D02a-4 / D02c-7.
- **D03a-8 — ktlint's `no-consecutive-comments` again** (D00b-16): a `// -- section ---` banner
  immediately followed by a KDoc is a violation that `ktlintFormat` cannot auto-correct. Every
  banner in `EngineState.kt` is followed by a blank line for that reason. No hand-styling
  otherwise; the formatter owns the rest.
- **D03a-9 — there is no `parity/steps/`.** The phase file's "step-scoped Tier B fixtures … in
  `core-engine/src/test/resources/parity/steps/`" does not exist; per the 00b mapping table the
  real source is `parity/<clip>/frames/NNNN.json` with `tierA.*` / `tierB.*`, which is what
  `EvidenceTest.computeEvidenceMatchesPython` consumes. **No fixture was invented.**
  `TrackerConfig` is built from `meta.effectiveConfig` via `toTrackerConfig()` throughout
  (`detSize` 320, `overhang` 0.0 on several clips, `occlusionColorThr` 1.5).
- **D03a-10 — one additive test file, `EngineTestImages.kt`.** The phase file names only the three
  test classes, but all three need the same synthetic board images (Python's `_gray_frame`,
  `tests/test_move_tracker.py:765`) and a `testConfig()` whose `detSize` equals its `boardSize`.
  Same precedent as 02b's `testutil/` and 02c's `CnnFixtures.kt`.
- **D03a-11 — the phase file's `EngineState` ctor has no defaults; the landed one defaults
  `startFen = STARTPOS` and `whitePov = true`.** Purely additive (every existing call site is
  unchanged), and it is what makes `EngineState(config)` usable in a test without repeating the
  start position.
- **D03a-12 — `tainted` is `Map<String, Double>` (an expiry), not Python's `dict[str, int]`
  (a frame countdown).** The phase file already declares it that way and it is the right call for
  a `nowS`-driven engine — **but 03b owns the latch and must transcribe `tracker.py`'s frame
  counting onto this representation deliberately, not accidentally.** Flagged here because it is
  the one field whose semantics the port changes.
- **Note (not a discrepancy):** the fusion is `z = max(zGray, w * zCensus)` over ALL 64 squares,
  `_struct_vals` keeps the top 8 with `w * v >= zThr * 0.5` **rounded half-to-even to one
  decimal** (`Math.rint(v*10)/10`, Python's `round(v, 1)`) and sorted with the same
  stable numeric comparator 02a uses (D02a-10), and the channel-local guard's
  `censusNoise.update(cens)` runs with **full alpha and no exclusion** unless the alarm is
  latched — the branch D01d-4 discovered, now asserted from the other side.
- **Coverage actually asserted:** `computeEvidence` replayed over **247 tier-A frames of all 18
  clips** — `normalizedDiffs`, `zFused`, `censusNormalized`, `censusRaw`, `noiseMean` and
  `censusNoiseStd` per frame, with the noise models never reset and the **3 channel-guard frames**
  asserting `cens == null && censRaw == null && structVals.isEmpty()`; plus the hand-written
  scenarios `test_normalize_diffs_isolates_hot_fields`, `test_global_exposure_shift_not_stuck`,
  `test_dark_on_dark_seen_by_census_not_gray`, `test_global_jitter_median_normalized`,
  `test_raw_core_vs_dilated`, `test_mean_equals_stack`, `test_drift_resync_after_64`,
  `test_clear_and_reuse`, `test_detect_scale_half_det_size_and_e2e4`,
  `test_stale_ref_fen_forces_recapture`, `test_valid_move_advances_base_truth_with_fen` and every
  named invariant test the phase file lists (corner jump at 5.9/6.1 px on **all 8 corner axes**,
  raw-vs-normalized census, the guard drop, alarm-frozen learning, `censRaw` cleared when the
  weight is tuned to 0, the pre-CLAHE dark gate, the grid-gate release, `ready` needing both
  conditions, `setRef` only on a null reference, and the duplicate-frame rejection).

### 03c (hypothesis / pair / endpoint / ambiguity / promotion), 2026-07-25

Files created (all `internal`, package `com.chesslab.engine`, module `:core-engine`):
main `Hypothesis.kt`, `PairCandidate.kt`, `EndpointCandidate.kt`, `Ambiguity.kt`; tests
`HypothesisTest.kt` (17), `PairCandidateTest.kt` (7), `EndpointCandidateTest.kt` (7) —
**31 tests**. No other file was touched: no build file, no `libs.versions.toml`, no `api/` seam
file, no file owned by 03a/03b/03d. `EngineState` had every field 03c needs (`board`,
`confirmer`, `bestScore`, `secondScore`, `candidateUci`, `note`, `promoPending`, `shadowBlocked`,
`cnnRun`, `cnnFailed`, `cnnOn`) — **no blocker**.

#### The surface 03d wires (read this before writing `Dispatch.kt`)

```kotlin
// Hypothesis.kt
internal data class Candidate(val moves: List<Move>, val priorUsed: Boolean,
                              val vote: Boolean, val note: String? = null)
internal class ViableMoves(val scored, val viableRaw, val viable, val obsMove, val best, val second)
internal class DetectContext(val changed: Set<String>, val shadowVeto: Set<String>,
                             val blockedN: Int, val cur: GrayImage, val curBgr: BgrImage?)
internal typealias AnomalyPatcher = (Set<String>, Double, GrayImage, BgrImage?) -> Unit
internal val NO_ANOMALY_PATCH: AnomalyPatcher

internal fun EngineState.scoreViableMoves(z: Map<String, Double>, shadowVeto: Set<String>): ViableMoves
internal fun EngineState.generateHypothesis(z, moves: ViableMoves, ctx: DetectContext,
                                            patchAnomaly: AnomalyPatcher = NO_ANOMALY_PATCH): Candidate?
internal const val STUCK_TOO_MANY_CHANGED = "too_many_changed"
internal const val STUCK_NO_LEGAL_MOVE = "no_legal_move"
// PairCandidate.kt
internal const val NO_SCORE = -1e9
internal fun EngineState.pairCandidate(z, bestSingle: Double, shadowVeto: Set<String>): Candidate?
// EndpointCandidate.kt
internal fun EngineState.singleEndpointCandidate(z, scored, shadowVeto): Move?
// Ambiguity.kt
internal class Resolution(val move: Move?, val priorUsed: Boolean)
internal fun EngineState.resolveAmbiguity(moves: ViableMoves, cur, curBgr): Resolution
internal const val NOTE_PROMOTION_PENDING; internal const val NOTE_AMBIGUOUS_PLAIN
```

03d's `_try_detect` calls `scoreViableMoves` (step 5) and then
`generateHypothesis(z, moves, DetectContext(changed, shadowVeto, tainted.size, cur, curBgr),
state::maybePatchAnomaly)` (step 6). Everything else in step 5 — the `if not changed` re-anchor
branch with its `occluded` / `no_legal_move` / `cnn_desync` marks and the `best < 0.0` weak-hold
note (`tracker.py:3013-3058`) — is **03d's**, deliberately not implemented here.

#### Discrepancies

- **D03c-1 — none of the phase file's signatures is expressible under the detekt gate; the
  parameters are grouped into holders (additive, no semantic change).** detekt's
  `LongParameterList` fires at **6** parameters (same finding as D01b-1 / D01c-2 / D01d-2 /
  D02a-5), so `_generate_hypothesis`'s eleven arguments became `ViableMoves` (scored / viableRaw /
  viable / obsMove / best / second) + `DetectContext` (changed / shadowVeto / blockedN / cur /
  curBgr). Every argument of the phase file's signature is present with the same name, type and
  meaning. `ReturnCount` caps a function at **2** returns, so `pairCandidate`,
  `resolveAmbiguity`, `tooMuchChangeGate` and `noSingleFitsGate` are single-exit with a result
  variable, and `generateHypothesis` is a four-stage `?:` chain over a private `Outcome` holder
  (`Outcome(null)` = "frame handled, return null"). No `@Suppress`, no baseline, no config change.
- **D03c-2 — step 5's scoring + viability filter (`tracker.py:2995-3011`) landed in
  `Hypothesis.kt` as `scoreViableMoves`, on the orchestrator's instruction. ACTION FOR 03d: call
  it, do not reimplement it.** It is the block that produces `generateHypothesis`'s `scored` /
  `viable` / `obsMove` / `best` / `second`, and it owns the `bestScore` / `secondScore` /
  `candidateUci` writes, the shadow-blocked uci list and the
  `"…? destination shadow-vetoed — not a move"` note. **It also CLEARS `state.shadowBlocked`**
  (Python does that at `tracker.py:2851`, at the top of `_try_detect`); clearing it again in 03d
  is harmless but redundant. The rest of `_try_detect` step 5 is 03d's (see above).
- **D03c-3 — `_single_endpoint_candidate`'s ambiguity loop is unreachable dead code, in Python
  too.** `cands` is filtered to moves whose destination is in `strong`, and the function has
  already returned unless `len(strong) == 1` — so every candidate shares one destination and
  `mv.to_square != best_mv.to_square` (`tracker.py:3373`) can never be true. Ported faithfully
  anyway (`unambiguousTop`) and pinned from both sides by
  `EndpointCandidateTest.rivalsToTheSameDestinationDoNotBlock`. Nothing was "simplified away".
- **D03c-4 — two golden ties are NOT order-comparable, and no tie-break was added.**
  (a) `test_single_endpoint_candidate_unambiguous`: after 1.e4 with only `c6` hot, `b8c6` and
  `c7c6` score identically (cold origin + hot destination) — chesslib returns `c7c6`, python-chess
  `b8c6`. Python's own assertion is on the DESTINATION square, and the Kotlin test asserts exactly
  that. (b) The four promotion variants tie exactly, so *which* one the CNN branch passes through
  is legal-move-generation order; the test asserts from/to and "is a promotion", not the piece.
  Same class as D02c-2 / D02a-10.
- **D03c-5 — the anomaly patcher is a functional seam, because 03d owns
  `_maybe_patch_anomaly`.** `internal typealias AnomalyPatcher = (Set<String>, Double, GrayImage,
  BgrImage?) -> Unit` mirrors Python's argument list; `generateHypothesis` defaults it to the
  no-op `NO_ANOMALY_PATCH` so the module stays compilable and testable before 03d lands. **03d
  passes `state::maybePatchAnomaly`.** The call order is transcribed literally —
  `confirmer.reset()` -> `markStuck(...)` -> `patchAnomaly(...)` -> `if (stuckReason != null)` note
  — because the patcher may CLEAR the stuck state (`tracker.py:3419-3421`), which is exactly what
  that guard is for.
- **D03c-6 — `f"{s:+.1f}"` cannot be `String.format("%+.1f", …)`.** Java's `%f` rounds HALF_UP on
  the exact decimal value while Python rounds HALF_EVEN, and Java would print `+0.0` where Python
  prints `-0.0` for a small negative score. The ambiguity note therefore formats via
  `BigDecimal(abs(v)).setScale(1, HALF_EVEN)` with the sign taken from the raw double (including
  negative zero). Only the note text depends on this; no decision does.
- **D03c-7 — there is no `parity/steps/` (00b's schema wins).** The phase file's "step-scoped
  Tier B fixtures in `core-engine/src/test/resources/parity/steps/`" does not exist; per the 00b
  mapping table the real source is `parity/<clip>/frames/NNNN.json`. `TrackerConfig` is built from
  `meta.effectiveConfig` via `toTrackerConfig()` throughout. **No fixture was invented.**
  `tierB.bestUci` / `candidateUci` / `stuckReason` / `promotionPending` / `note` are the emitted
  key names, and `tierB.shadowVeto` / `changed` / `tainted` supply the `DetectContext`.
- **D03c-8 — commit frames must be EXCLUDED from a `frame.fen`-driven replay.** On a frame that
  committed, `frame.fen` is the position AFTER the move (D02a-3) while `tierB.bestLl` belongs to
  the pre-move board, so the decision board is not recoverable from the fixture. 43 of the 247
  tier-A frames are in that case; the remaining **204** are replayed. 03d's full-clip Tier-B gate
  does not have this problem because it carries the board forward itself.
- **D03c-9 — `_pair_candidate`'s `board.copy(stack=False)` is a `push`/`pop` here.** chesslib
  restores the complete state in `undoMove` and neither move generation nor the square derivation
  reads the move stack, so the intermediate-board evaluation is identical without a FEN reparse
  per pair (same rationale as D02a-8). The `Game` is left untouched on return.
- **D03c-10 — 03b was in flight in the same module.** Its `Vetoes.kt` / `NoiseLearning.kt` /
  `Taint.kt` (+ tests) landed while 03c was running; the module compiled throughout, so **no
  isolated copy was needed** and the gate below is from the real tree with both phases present.
  `ktlintFormat` runs module-wide and is deterministic/idempotent (same situation as D01c-7);
  nothing outside 03c's seven files was hand-edited.
- **Note (not a discrepancy):** the acceptance greps hold literally —
  `strong.size != 1` (`EndpointCandidate.kt:29`), `vote = false` exactly once
  (`Hypothesis.kt:211`), `cnnOn` twice in the branch logic (`:183` pair-before-single, `:199`/`:202`
  no-single-fits), `blockedN` in both the gate and the pair pre-condition, `promoPending` inside
  the `!cnnOn` arm of `Ambiguity.kt`, `moveDestinationSquares` intersected with `shadowVeto` in
  `PairCandidate.kt`, and `grep -rn "synchronized\|@Volatile\|Atomic\|Mutex"` over
  `core-engine/src/main` hits only three comment lines.
- **Coverage actually asserted:** `hypothesisMatchesPythonOnEveryTierAFrame` replays step 5 + step 6
  over **204 tier-A frames of all 18 clips** and asserts `tierB.bestLl`, `tierB.secondLl` (1e-4
  fixture tolerance, and they cover the pair write-back), `tierB.candidateUci` (exact, wherever the
  fixture value is not a two-uci pair key), plus `tierB.stuckReason` **and `tierB.note`** on the
  **136 frames** that reach the stuck path — every one of those 136 notes matches Python's string
  byte for byte. Hand-written on top: both pair-viability tests from `TestPairScores`, the
  intermediate-board proof (`e5e6 + f7xe6`, which the pre-push board would misclassify as en
  passant and reject), the pair margin at and just inside `ambiguityMarginLl`, the pair write-back,
  the pair shadow rule from both sides, a negative pair, the endpoint candidate (one/two/zero
  strong squares, shadow-vetoed destination, same-destination rivals, `vote = false` with and
  without CNN), the soft-gate boundary at ±0.01, castling and en-passant signatures, the hot
  untouched square, `shadowBlocked` + its note vs. a shadowed origin, invariant 4 (`blockedN`
  blocks the pair), the `maxChanged + 2` ceiling, the CNN-conditional order on identical evidence,
  the two-knights ambiguity note, the prior rerank at margin ∓0.01, and both promotion branches.

### 03b (shadow veto / occlusion taint latch / noise learning), 2026-07-25

Files created (all `internal`, package `com.chesslab.engine`, module `:core-engine`):
main `Vetoes.kt`, `Taint.kt`, `NoiseLearning.kt`; tests `VetoesTest.kt` (13), `TaintTest.kt` (14),
`NoiseLearningTest.kt` (6) — **33 tests**. No other file was touched: no build file, no
`libs.versions.toml`, no `api/` seam file, and neither `EngineState.kt` nor any 03a/03c file.

#### The surface 03d wires

```kotlin
// Taint.kt — step 2, call straight after computeEvidence, on the SAME mutable z map,
// BEFORE deriving `changed = {s : z[s] >= zThr}`.
internal fun EngineState.applyTaints(z: MutableMap<String, Double>)
internal fun EngineState.cnnOcclusionFilter(squares: Set<String>, board: Game): Set<String>
internal const val OBS_MAX_AGE_S: Double = 3.0

// Vetoes.kt — step 3. NOTE: no `z` parameter (D03b-1).
internal fun EngineState.applyVetoes(
    cur: GrayImage, curBgr: BgrImage?, changed: MutableSet<String>, cens: Map<String, Double>?,
): VetoResult
internal data class VetoResult(changed: MutableSet<String>, shadowVeto: Set<String>, occludedSet: Set<String>)

// NoiseLearning.kt — step 4, AFTER applyVetoes, with its post-veto `changed` and `shadowVeto`.
internal fun EngineState.learnNoise(
    diffs: Map<String, Double>, cens: Map<String, Double>?, changed: Set<String>, shadowVeto: Set<String>,
)
```

`applyTaints` leaves `EngineState.tainted` holding exactly the latched set, so 03c's
`blockedN = state.tainted.size` (entry.md invariant 4) is correct, and `occludedVetoed` holds
`motionOccludedSquares ∪ tainted` (sorted) for the UI. `applyVetoes` returns `tainted.keys` as
`occludedSet`, so 03d's "only photograph a clean board" guard is a real condition.

#### How the expiry-map latch reproduces Python's release rule (answers D03a-8)

**There is no frame counting to reproduce — Python's type hint is stale, its values are already
timestamps.** `tracker.py:795` annotates `self._tainted: dict[str, int]` with the comment
"frames to clear", but every write is `self._tainted[sq] = time.time() + self.motion_hold_s`
(`:2861`, `:2875`) and the only read compares `_now > exp` with `_now = time.time()` (`:2884-2887`).
The value has always been an absolute wall-clock expiry. The port stores `nowS + config.motionHoldS`
and compares against `nowS` — identical arithmetic with `time.time()` replaced by the engine's
frame clock (03a sets `nowS` once per frame from `FrameInput.timestampMs`), which is the same
substitution every other timestamp in the port already makes.

The release condition is transcribed literally, including why each half exists:

```kotlin
val exp = tainted.getValue(square)
val motionSinceTaint = lastMotionTs >= exp - config.motionHoldS   // exp - hold == the taint instant
val backToBaseline = (z[square] ?: 0.0) < config.zThr
if (nowS > exp && (motionSinceTaint || backToBaseline)) tainted.remove(square) else z[square] = 0.0
```

`exp - motionHoldS` is exactly the moment the taint was last refreshed, so `motionSinceTaint` means
"motion occurred since the taint" without needing a second stored timestamp — that identity is the
whole reason Python stores the expiry rather than the taint time. The `else` branch runs on **every
frame**, not only at taint time (`:2881-2883`): a still hand outlived the 0.4 s hold and surfaced as
"change" when the zeroing was done once. Asserted from both sides by
`TaintTest.occlusionVetoZeroesZ` (zeroed on the taint frame AND the next one) and
`TaintTest.latchReleaseNeedsMotionOrBaselineReturn`.

#### Discrepancies

- **D03b-1 — `applyVetoes` has no `z` parameter.** The phase file's signature carries Python's
  `z`, but `_apply_vetoes` never reads or writes it (`tracker.py:3141-3176`) and detekt's
  `style.UnusedParameter` is active and reports public functions (D00a-4), so the parameter is
  unbuildable. Dropping it is also what makes the phase's own acceptance grep
  (`grep "z\[" Vetoes.kt` → nothing) structurally true rather than a convention: **the shadow path
  physically cannot touch z.** 03d calls `applyVetoes(cur, curBgr, changed, cens)`.
- **D03b-2 — `_cnn_occlusion_filter`'s two null guards are not expressible as written.**
  `snap.obs is None` is unreachable: the frozen seam declares `CnnSnapshot.obs: CnnObservation`
  (non-null). `self.recovery is None` has no `EngineState` counterpart — 03a declares no evaluator
  field — so it is mapped to `!cnnRun || cnnFailed`, which is exactly when `_ensure_cnn` has not
  produced (or has disabled) a `CnnRecovery` (`tracker.py:833`, `:1849-1865`). Both fall back to the
  `>2 = hand` heuristic, as Python does.
- **D03b-3 — the threshold really is `cnnConfThr` (0.85), not the phase file's 0.9.** Implemented
  per the orchestrator's resolved note ("the 0.9 fallback is dead code"): `CnnRecovery` is always
  built with `conf_thr=self.cnn_conf_thr` (`:1856`). The phase file's "Do NOT use
  `config.cnnConfThr`" bullet is superseded by that resolution.
- **D03b-4 — the resting-hand veto iterates all 64 squares, because the seam has no `p_occluded`
  map.** Python does `for sq, p in snap.obs.p_occluded.items()`; `CnnObservation` only exposes
  `pOccluded(square): Double`. Iterating `Squares.ALL` and testing `> 0.5` is equivalent — a square
  absent from Python's dict cannot exceed 0.5, and an implementation returns 0.0 for it. Python's
  `if p_occl:` emptiness guard is likewise not expressible and not needed (an empty observation
  simply taints nothing).
- **D03b-5 — detekt `MatchingDeclarationName` forced `VetoResult` to the BOTTOM of `Vetoes.kt`.**
  As the first top-level class-like declaration of a file not named `VetoResult.kt` it is a finding;
  moving it below the functions clears it. Same class of finding as D01a-2 / D01c-2 (01c moved
  `ShadowParams` out of `ShadowVeto.kt` for the identical rule). No rename, no `@Suppress`, no
  baseline. Two test findings came from the same family: `NestedBlockDepth` split the test-local
  Gaussian blur into `gauss5`/`gaussPixel` and the fixture scan into `countDiscriminating`, and
  `LoopWithTooManyJumpStatements` merged the two `continue`s of both parity replays (D03a-7's rule).
- **D03b-6 — the acceptance grep `grep "0.125" NoiseLearning.kt` cannot hit.** `MagicNumber` fires
  on literals in function bodies (D00a-3 / D02a-4), and 01d already publishes the constant, so the
  census lane reads `CENSUS_NOISE_EXCLUDE_ALPHA_SCALE` (`SquareNoise.kt`, value **0.125**,
  unchanged). The criterion is met as "the slow-lane scale appears exactly once, in the census
  lane"; `NoiseLearningTest.censusLaneUsesExcludeAlphaScale` pins the arithmetic
  (`alpha * 0.125 * value`) numerically. The `alarm == null` grep is a real hit and it wraps **both**
  lanes (an early `return` would have satisfied the behaviour but not the grep, so the block form
  was chosen deliberately).
- **D03b-7 — `hsvShadowSquares` needs converted planes, so `applyVetoes` converts both BGR frames
  itself.** Python hands `cv2.cvtColor` the raw planes inside `hsv_shadow_squares` (`:265-266`);
  01c's port takes HSV buffers (D01c-2). The conversion happens in `Vetoes.kt` into two file-private
  size-keyed scratch arrays — same reuse contract as 01a's D01a-2, and the engine is single-threaded
  so nothing can alias them. The reference plane is re-converted every frame exactly like Python;
  caching it on identity would be a behavioural change and was not done.
- **D03b-8 — `tainted` is empty on all 969 fixture frames and `shadowVeto` on all 247 tier-A
  frames, so the clip parity is a NEGATIVE assertion — and it is still load-bearing.** The clips
  replay with `cnn_run=None` over quiet detection frames, so nothing can latch. What the fixtures do
  carry is **158 HSV shadow squares over 109 tier-A frames that Python did NOT veto**, i.e. the raw
  census gate rejecting every one of them, and **one square where the RAW census is ≥ 40 while the
  NORMALIZED one is below it** — a port reading the normalized channel vetoes that square and fails
  `applyVetoesMatchesPythonOnEveryTierAFrame`. `censusThresholdReadsTheRawChannelInTheFixtures`
  isolates that case explicitly (entry.md invariant 8). The band fast path is exercised on the 3
  channel-guard frames, where Python also has neither `cens` nor `_cens_raw`.
- **D03b-9 — there is no `parity/steps/` and no `tierB.z`** (confirms D03a-9). The phase file's
  "step-scoped slice `parity/steps/`" does not exist and no post-veto `z{}` map is emitted; the real
  sources are `tierA.vetoCandidates` / `tierA.hsvShadowSquares` / `tierA.censusRaw` /
  `tierA.censusNormalized` / `tierA.noiseExclude` / `tierA.noise*` / `tierB.changed` /
  `tierB.shadowVeto` / `tierB.tainted` / `tierB.occlusionVetoed`, all of which are consumed.
  **No fixture was invented.** `TrackerConfig` is built from `meta.effectiveConfig` via
  `toTrackerConfig()` throughout (`detSize` 320, `overhang` 0.0 on several clips,
  `occlusionColorThr` 1.5).
- **D03b-10 — `cnnOcclusionFilter` takes 02a's `Game`, not a chesslib `Board`.** Same reason as
  D03a-1: `Game` is the only place allowed to know chesslib. The FEN occupancy test is
  `board.pieceCharAt(sq) != null`.
- **Note (not a discrepancy):** the two blur helpers in the test sources reproduce
  `cv2.GaussianBlur(noise, (5,5), 0)` (separable `[1,4,6,4,1]/16`, BORDER_REFLECT_101) rather than a
  box blur — the `test_hard_shadow_is_shadow_not_occlusion` /
  `test_multiplicative_shadow_is_census_quiet` scenarios depend on the texture being smooth enough
  that a multiplicative darkening preserves the census codes, which is a property of Python's blur,
  not of any smoothing. Nothing in `:core-engine` gained a blur.
- **Coverage actually asserted:** **247 tier-A frames over all 18 clips** replayed through
  `applyVetoes` (shadow-veto set, `_shadow_vetoed` list and the post-veto `changed` set, all EXACT
  against `tierB`) and through `computeEvidence + learnNoise` (`noiseMean`, `noiseStd`,
  `censusNoiseMean`, `censusNoiseStd` per frame from the constructor state, never reset, at the
  1e-4 fixture tolerance, with `tierA.noiseExclude == changed ∪ shadowVeto` asserted per frame);
  **969 frames** for "`tierB.tainted` is empty and `applyTaints` leaves z bit-identical"; plus every
  named invariant test the phase file lists and the hand-written scenarios
  `test_shadow_veto_removes_hand_shadow_in_detect`, `test_hsv_shadow_detects_uniform_darkening`,
  `test_hsv_shadow_ignores_real_piece`, `test_census_low_for_uniform_darkening`,
  `test_multiplicative_shadow_is_census_quiet`, `test_hard_shadow_is_shadow_not_occlusion`,
  `test_textured_occluder_is_occluded`, `test_flat_hand_needs_chroma_to_be_occlusion`,
  `test_resting_hand_taints_and_blocks_reanchor`,
  `test_taint_persists_without_motion_while_evidence_hot`,
  `test_taint_releases_on_motion_or_baseline` (both release paths),
  `test_stale_snapshot_does_not_taint`, `test_occlusion_filter_ignores_old_snapshot`,
  `test_hand_over_pieces_keeps_base_truth` and `test_shadow_squares_not_learned_into_noise`.

### 03d (dispatch / commit / set-ref / anomaly patcher / `TrackerEngine` wiring), 2026-07-25

Files created (package `com.chesslab.engine`, module `:core-engine`): main `Commit.kt`,
`Dispatch.kt`, `AnomalyPatcher.kt` plus the filled-in seam file
`api/TrackerEngine.kt`; tests `DispatchTest.kt` (19), `CommitTest.kt` (13),
`AnomalyPatcherTest.kt` (7), `ClipReplayParityTest.kt` (2) — **41 tests**. No other file was
touched: no build file, no `libs.versions.toml`, no other `api/` file, and no file owned by
03a/03b/03c. `EngineState` had every field 03d needs — **no blocker**.

#### `TrackerEngine` wiring order (`onFrame` = `_loop` body + `_try_detect`)

`FrameLoop.step(input)` (03a, constructed with `::setRef` as the QUIET capture,
`fromCommit = false`, D03a-5) → on `FrameOutcome.Detect` → `tryDetect(cur, curBgr, seq)`:

1. `detectGuards()` (03a) → 2. `computeEvidence(cur)` (03a) → `applyTaints(z)` (03b) →
`changed = {s : z >= zThr}` + `changedVals` (top 8) → 3. `applyVetoes(cur, curBgr, changed, cens)`
(03b) → `state.changed = sorted` → 4. `learnNoise(diffs, cens, changed, shadowVeto)` (03b) →
5. `scoreViableMoves(z, shadowVeto)` (03c, **called, not reimplemented**, D03c-2) + the quiet
branch (03d) → 6. `generateHypothesis(z, moves, DetectContext(changed, shadowVeto,
blockedN = tainted.size, cur, curBgr), this::maybePatchAnomaly)` (03c) → 6b/7/8 `commitGates`
(LL floor → motion → confirmer, in that order) → `anomalySince.clear()` → 9. `dispatch(...)`.

#### Discrepancies

- **D03d-1 — `TrackerEngine` gained `internal val state: EngineState` (additive, no signature
  change).** The class has to own the state object, and both the parity replay and the unit tests
  drive it through that handle (`TrackerStatus` carries neither `tainted` nor `promotionPending`,
  see D03d-9). It is a PROPERTY, so detekt's `TooManyFunctions` is untouched — the class still has
  exactly the 10 frozen functions.
- **D03d-2 — `onCnnSnapshot` is not a pure `emptyList()` stub: it stores the snapshot.** detekt's
  `style.UnusedParameter` is active and reports public functions (D00a-4), so a body that ignores
  `snap` is unbuildable without a forbidden `@Suppress`. Storing it is exactly the one line
  Python's `_observe_snapshot` does before the ticks (`tracker.py:1824`), and 03b's taint filter
  already reads `state.cnnSnap`. **Every tick/verify/recovery behaviour is still phase 04's**;
  `acceptCnnPosition` remains a real `emptyList()` stub (it takes no parameter).
- **D03d-3 — `applyVerdict` takes a third parameter `anchor: CommitAnchor? = null`.** The phase
  file's two-parameter signature cannot express entry.md invariant 5, which requires the recovery
  path to anchor on `snap.gray` / `snap.warped` while the verify path anchors on `pending.cur`.
  The default IS `pending.cur` / `pending.curBgr`, so the phase file's call shape is unchanged;
  phase 04c passes the observed frame explicitly. Pinned by
  `DispatchTest.verdictAnchorsOnTheCallerSuppliedFrame`.
- **D03d-4 — detekt's parameter/return caps shaped four signatures and four bodies (additive, no
  semantic change).** Same family as D01b-1 / D01c-2 / D01d-2 / D02a-5 / D03c-1: `LongParameterList`
  fires at **6**, `ReturnCount` caps at **2**, `ComplexCondition` at **4**, `NestedBlockDepth` at
  **4**. Landed: `CommitOptions(recovered, priorUsed, decider)` for `commitMove`,
  `DispatchContext(priorUsed, note, seq)` for `dispatch`, `QuietContext(cur, curBgr, occludedSet)`
  for the quiet branch and `RegionPlane` for the patcher's `copyRegion` — every argument of the
  phase file's signatures is present with the same name, type, order and default. `tryDetect`,
  `quietOutcome`, `commitGates` and `maybePatchAnomaly` are single-exit with a result variable, the
  patcher's four-term bail-out became an `eligible` local, and its per-square loop moved into
  `patchDueSquares`. No `@Suppress`, no baseline, no config change.
- **D03d-5 — `TooManyFunctions` caps a FILE at 10 top-level functions as well as a class, which is
  why `tryDetect` and friends are top-level `internal` extensions in `TrackerEngine.kt` rather than
  members.** `TrackerEngine` is at exactly 10 functions (D00a-4's note) and cannot take an
  eleventh. **ACTION FOR PHASE 04: do not add a public method to `TrackerEngine`** — a needed
  eleventh method is a real design decision for the orchestrator, not something to suppress.
  `quietOutcome` and `commitGates` are `internal` (not `private`) so the named invariant tests can
  drive them directly.
- **D03d-6 — the session capture emits no event.** `:core-engine` does no I/O, owns no recorder and
  the frozen seam has no capture event, so `queueSessionCapture` only sets `state.pendingCapture`
  and `flushSessionCapture` clears it and **returns** the due capture for `:app` (08a). The phase
  file's "emit `TrackerEvent.Note`" was deliberately not done: it would put engine-internal text on
  the same channel the parity test compares `state.note` on. Python's `_queue_session_capture`
  additionally returns early when no recorder exists; the port always sets `pendingCapture`, since
  that is the only way `:app` can ever learn a photo is due. Nothing reads the field yet, so this
  is invisible to Tier B.
- **D03d-7 — `_record_decision`'s image half is not ported.** The phase file already assigns the
  `_recent_decisions` ring to `:app`, so `pre_ref_bgr` has no counterpart and
  `recordDecision(move, san, fenBefore, decider, priorUsed)` writes the log row only. Because
  `DecisionRecord` (03a) is a fixed data class, `_clear_alarm`'s 7-key user row is filled with the
  current evidence values rather than being a shorter dict; `decider` / `reason` / `ply` /
  `fenAfter` are exactly Python's.
- **D03d-8 — event semantics (the seam has an event bus, Python has polled state).** `Stuck` and
  `Note` are emitted **only on a change** of `stuckReason` / `note` (the phase file's "do not emit
  `Stuck` every frame", extended to notes for the same reason). `PromotionPending` is emitted when
  `promoPending` becomes non-null, `ReAnchored` from the quiet re-anchor, `AlarmCleared(kind)` from
  `clearAlarm`. `choosePromotion`'s error paths return a `TrackerEvent.Note` and — like Python,
  which returns an error dict — do **not** touch `state.note`.
- **D03d-9 — `TrackerStatus` carries neither `tainted` nor `promotionPending`.** Both exist on
  `EngineState` and both are part of Python's `status()` payload (`debug.tainted`,
  `promotion_pending`). The parity test therefore reads them off `engine.state` (D03d-1).
  **Flagged for 07b:** the debug screen cannot show the taint latch or the promotion dialog through
  the seam as it stands; extending `TrackerStatus` is an orchestrator decision (00a owns the file).
- **D03d-10 — two things the clip replay needs that the fixture schema does not spell out.**
  (a) The emitter calls `reset_to_start(start_fen)` after construction
  (`emit_parity_fixtures.py:266`) — that is what puts `"Reference set"` on frame 0; without the
  equivalent `engine.setFen(meta.startFen)` **every clip diverges on frame 0's note**.
  (b) The virtual clock starts at `VCLOCK_START = 1.7e9` and advances by **video** time
  (`1/fps` for the first emitted frame, `(idx - prev)/fps` afterwards, D00b-6).
  `FrameInput.timestampMs` is a `Long`, so the replay rounds that clock to whole milliseconds; at
  12 fps every interval is a multiple of 1/12 s and no threshold (`motionHoldS` 0.4,
  `motionRecencyS` 20.0, `nudgeTimeoutS` 5.0) lands within 1 ms of a frame boundary, so the
  rounding is not observable — **all 969 frames match exactly**.
- **D03d-11 — `corners` / `gridLineCoverage` / `timestampMs` are not in the fixtures** (D00b's
  mapping table). The replay passes a frozen 8-float corner array — the clips run with
  `live_align=False`, so Python's `_last_corners` never changes and `_corners_jumped` is constantly
  false, and the Kotlin guard compares a copy of the same array and is false as well — and
  `gridLineCoverage = 1.0`, which is never read because every clip sets
  `min_grid_line_coverage = 0.0` and `_occluded_by_grid` returns before touching it.
  **No fixture was invented**; `TrackerConfig` comes from `meta.effectiveConfig` via
  `toTrackerConfig()` for every clip.
- **D03d-12 — `expected_occupancy` is re-derived inside `:core-engine`.** The cnn_desync veto
  (`tracker.py:2982`) imports it from `cnn_recovery`, which the engine may not depend on (cycle,
  entry.md module table). `cnnDesyncConflicts` iterates `Squares.ALL` and tests
  `board.pieceCharAt(sq) != null` — the same list in the same order, so `dis[:4]` in the note is
  identical. Related: the acceptance grep `grep -rn "boardColorGamut" .../src/main` also hits
  `Gamut.kt`, which is where 01c DECLARES the function; the criterion holds as intended — the only
  **call site** is `Commit.kt:110`.
- **Note (not a discrepancy):** the `:1696-1697` state reset stays where 03a proved it belongs
  (D03a-4) and was NOT re-added; `scoreViableMoves` is called, never reimplemented (D03c-2); the
  anomaly patcher is wired as `this::maybePatchAnomaly` (D03c-5); `applyVetoes` is called without a
  `z` argument (D03b-1); and `grep -rn "synchronized\|@Volatile\|Atomic\|Mutex\|
  System.currentTimeMillis\|Instant.now\|nanoTime"` over `core-engine/src/main` hits only two
  comment lines in `TrackerEngine.kt`'s KDoc.
- **Coverage actually asserted:** **`ClipReplayParityTest` replays all 18 clips / 969 frames
  through `TrackerEngine.onFrame` with ZERO diverging frames**, comparing `state`, `changed`,
  `shadowVeto`, `occlusionVetoed`, `tainted`, `bestLl`, `secondLl`, `motionScore`, `bestUci`,
  `candidateUci`, `stuckReason`, `confirmerKey`, `confirmerCount`, `note` and every `commit`
  (uci/san/fenAfter/decider) per frame — sets and strings EXACT, floats at the 1e-4 fixture
  tolerance — and it re-derives every clip's full SAN list and final FEN (`meta.replayedSans` /
  `replayedFen`). `meta.tierBComplete` and `index.tierBDegraded` are asserted per clip, so a
  degraded clip can never count as passing. On failure the test prints only the FIRST divergence
  (clip, frame, field, expected, actual). Hand-written on top: the Python scenarios
  `test_no_cnn_commits_directly`, `test_alarm_blocks_dispatch_commits`,
  `test_alarm_discards_pending_candidate`, `test_cnn_unavailable_commits_pending`,
  `test_pair_respects_motion_gate`, all four `TestMotionPrerequisite` cases,
  `test_valid_move_advances_base_truth_with_fen`, `test_decision_recorded_on_commit`,
  `test_undo_clears_bgr_buffer`, the three alarm-latch user corrections,
  `test_weak_candidate_does_not_reanchor`, `test_quiet_reanchor_vetoed_by_confident_cnn_conflict`,
  `test_nudge_patches_occupied_square`, `test_empty_square_not_patched_before_drift_window`,
  `test_cnn_overrules_diff_candidate`, `test_choose_promotion_invalid_piece` and
  `test_promotion_waits_for_user_choice`; plus the named invariant tests
  `cnnOverruleReplacementMoveIsExpressible` (invariant 10 — the replacement commits in the SAME
  cycle, `decider == "cnn_overrule"`), `setRefFromCommitDoesNotRebuildGamut` +
  `gamutRebuildHappensOnlyOnQuietReanchor` (invariant 6, proven in both directions),
  `alarmBlocksCommitReanchorAndPending` (invariant 9), `commitLlFloorExemptsEndpointCandidates`,
  `reanchorFloorScalesWithTouchedSquares` (castling clears -8.0 where a normal move fails -4.0),
  `verdictAnchorsOnTheCallerSuppliedFrame` (invariant 5), `patchInvalidatesRefCensusCache`,
  `patchRegionIncludesOverhang` (pixel-exact box equality against
  `squareRegion(inset = 0.0, extendUp = overhang)`) and `statusIsAPureFunctionOfState`.

## Lean pass (representation + leanness refactor of `:core-engine`)

Pure representation refactor after 03d, requested by the user on the line count. **Behaviour is
unchanged by construction:** `ClipReplayParityTest` still replays **18/18 clips, 969 frames,
zero diverging frames**, and the whole module gate is green.

### Line counts (`:core-engine`, code / comment / blank, counted separately)

| | code | comment | blank | total |
|---|---|---|---|---|
| `src/main/**` before | 3510 | 1419 | 559 | 5488 |
| `src/main/**` after | 3318 | 1297 | 515 | 5130 |
| `src/test/**` after | 5698 | 847 | 756 | 7301 |

Signature counts in `src/main/**`: `Map<String, Double>` 45 -> 7, `Set<String>` 42 -> 3 (all seven
and all three now live in `api/` — `TrackerStatus`, `CnnObservation`, `CnnEvaluator`), and the
`Squares.ALL[i]` string lookups 21 -> 13 (the remainder are the `CnnObservation` seam, which is
string-keyed by contract, plus `uciOf` / `PromoPending`, which produce names on purpose).

### What changed

1. **Square sets are `Long` bitboards** (`Bitboard.kt`, 39 code lines: `bit`, `has`, `with`,
   `without`, `forEachSquare`, `forEachSquareSorted`, `squareNames`, `sortedSquareNames`,
   `ofSquares`). `changed`, `shadowVetoed`, `occludedVetoed`, `tainted`, `motionOccluded`,
   `anomalySince`, `occlWhitelist`, `desyncConflicts`, the shadow/occlusion/chroma/`BaselineResult`
   sets and `moveTouchedMask` / `moveDestinationMask` are all `Long` now. `Squares.maskToSet` /
   `setToMask` (the `BooleanArray` pair) are gone. `sortedSquareNames` iterates file-major, which
   IS Python's `sorted(set_of_squares)` order — no string sort anywhere.
2. **Per-square scalars are `DoubleArray(64)` end to end.** The `Evidence` holder and the
   `squareMap(...)` / `LinkedHashMap` building loops are deleted; `computeEvidence` now fills
   `EngineState.lastDiffs` / `lastCens` / `lastZ` / `censRaw` directly, and the five evidence
   scratch arrays moved from file-level `private var`s onto `EngineState` (per-engine ownership —
   two engines in one process could previously alias each other's scratch).
3. **`tainted` is a `Long` mask + a `DoubleArray(64)` of expiry stamps.** The release arithmetic is
   unchanged (`nowS > exp`, `lastMotionTs >= exp - motionHoldS`). `occlusionExpiry` /
   `occlCoreExpiry` became bare `DoubleArray(64)` with no mask at all: an unset slot is `0.0`,
   which is always in the past, so `pruneExpiry` had nothing left to do and was deleted.
4. **Strings appear once, at the seam.** `toStatus()` is the only place that builds square-name
   maps/sets; `recordDecision` and `clearAlarm` are the only others that name squares, because
   `DecisionRecord` is provenance the UI reads. `api/` types are UNCHANGED — `entry.md`'s frozen
   seam block needed no edit.

### detekt thresholds changed (`android/config/detekt/detekt.yml`)

| rule | was | now | why |
|---|---|---|---|
| `LongParameterList` | 6 (default) | 8 | the 6-cap is what created the single-use holder classes below |
| `TooManyFunctions` | 11 (default) | 15 | D03d-5 recorded "`TrackerEngine` is at exactly 10 functions and cannot take an eleventh" — that is a config shaping the architecture, and phase 04 needs the room |
| `ReturnCount` | 2 (default) | 3 | a `var out` threaded through four branches reads worse than three honest returns |

No `@Suppress` and no baseline was added; the config change is the whole fix and is recorded here.
`TooManyFunctions` was raised but NOT excluded for `api/` — 15 is enough for the facade, and a path
exclusion would silently disarm the rule for every future api file.

### Wrapper types deleted (9)

`PlaneGeometry` and `ColorPlanes` survived; both group a genuinely cohesive concept and are passed
to more than one function. Deleted:

- `BaselineParams` (boardSize/absThr/whitePov) -> three parameters of `baselineOcclusionAndShadow`
- `ShadowParams` -> five file-private constants in `ShadowVeto.kt` (never constructed non-default)
- `VetoResult` -> `applyVetoes` writes `changed` / `shadowVetoed` onto the state and returns `Unit`
- `DetectContext` -> `generateHypothesis(z, moves, cur, curBgr)`; `changed`, `shadowVetoed` and
  `blockedN` are read off the state, exactly like Python's `self._changed` / `self._tainted`
- `QuietContext` -> `quietOutcome(moves, cur, curBgr, events)`; the occluded set is `tainted == 0L`
- `CommitOptions` -> named `decider` / `priorUsed` / `recovered` parameters of `commitMove`
- `DispatchContext` -> named `priorUsed` / `candidateNote` / `seq` parameters of `dispatch`
- `CensusOutcome` (Evidence.kt) -> `censusEvidence` returns the census z-array or `null`
- `Split` (BaselineOcclusion.kt) and `RegionPlane` (AnomalyPatcher.kt) -> two `Long`s resp. three
  parameters; `AnomalyPatcher`/`NO_ANOMALY_PATCH` (the 03c->03d function-type seam) went with them,
  since both phases are the same module and `maybePatchAnomaly` can simply be called.

`PatchResult`, `Outcome`, `Resolution`, `CommitAnchor` and `VerifyVerdict` were KEPT: each returns
two values that must travel together, or (for `CommitAnchor`) carries invariant 5's rationale.

### Comments

All `tracker.py:NNNN` line-number citations are gone (symbol names kept) — they rot the moment
that file moves. In `EngineState.kt` the 55 one-line `/** `_python_name` */` KDoc blocks became
trailing comments on a dense field table (the fact survives verbatim, the ceremony does not); the
same transform was tried module-wide and **reverted** everywhere else, because there the KDoc
carried prose and inlining it made lines long and worse to read.

**Honest note: the comment count only fell 1419 -> 1297 (-9%), not the requested ~50%.** What is
left is almost entirely "why": the invariant-2 split (shadow preserves z, taint zeroes it), why
`censusThr` reads RAW census, why `getFen(true, true)`, why the census guard must still learn under
no alarm, why `-0.0` may not overtake `0.0` in the sort, why the pair/single order is CNN-conditional,
why OpenCV's integer LUT paths are reproduced instead of the float formulas. Cutting to ~700 lines
would have meant deleting incident knowledge, which the brief forbids. The rot and the ceremony are
gone; the prose is not.

### Test-side effects

`:core-engine:test` 239 -> **238** tests, 0 skipped. `theMapOverloadsAgreeWithThePrimitiveOnes`
was deleted with the `Map<String, Double>` scoring overloads it existed to compare;
`SquareGeometryTest.maskRoundTrip` became `bitboardRoundTrip` (and now also pins the ALL-order vs
sorted-order distinction); `VetoesTest.occludedSetIsTheLatchedSet` became
`sessionCaptureWaitsForTheLatchToClear`, which asserts the same latch against the real consumer
(`queueSessionCapture`) instead of against a deleted return field. No assertion was weakened, no
tolerance loosened, no clip degraded, and the fixtures/generator were not touched.

`:core-geometry` and `:core-cnn` needed **no** edits — nothing in the seam they consume changed.

### 04b (`_verify_pair_tick` — touched-squares fast-accept + pre-existing-conflict fallback), 2026-07-25

Files created (package `com.chesslab.engine`, module `:core-engine`): main `VerifyPair.kt`; tests
`VerifyPairFixtures.kt` (`PairObs`/`PairRecovery` + builders) and `VerifyPairTest.kt` (**10 tests**).
Nothing else was touched — no build file, no `EngineState.kt`, no `api/` file, no file owned by
04a/04c. Every `EngineState` field and every 03d entry point the pair path needs existed
(`commitSequence`, `setRef(fromCommit = true)`, `clearStuck`, `PendingVerify.frames/voteOutcome/
voteCount`) — **no blocker from 03a/03d**.

#### Entry point 04a routes to

```kotlin
internal object VerifyPair {
    fun tick(state: EngineState, cnn: CnnEvaluator, moves: List<Move>,
             boardSnap: Game, snap: CnnSnapshot): List<TrackerEvent>
}
```

#### Discrepancies

- **D04b-1 — the entry signature drops `obs` and takes a `Game`, not a chesslib `Board`.** The
  phase file quotes six parameters ending `snap: CnnSnapshot, obs: CnnObservation`; `obs` IS
  `snap.obs` (Python's body starts with `obs = snap.obs`), and a duplicated parameter would be
  either unused — detekt `style.UnusedParameter` is active — or a redundant consistency check.
  `boardSnap` is the engine's `Game` wrapper because `:core-engine` has no other board type;
  `Game` holds its chesslib `Board` privately. **04a: call `VerifyPair.tick(state, cnn, pendMoves,
  boardSnap, snap)` with `boardSnap = state.board.copy()`.**
- **D04b-2 (RESOLVED by 04a's D04a-1) — `self._cnn_agreement = float(after["agreement"])` was not
  expressible.** The seam's original `ResyncResult(match, conflicts, checked)` carried no
  `agreement`, and 04b refused to fake one. 04a landed `move` / `agreement` on `ResyncResult`
  mid-phase, so `state.cnnAgreement = after.agreement` is now in `VerifyPair.tick`, in Python's
  position (before the pending-identity guard). Nothing in the pair ladder READS it — it is
  provenance (`DecisionRecord.cnnAgreement`, `TrackerStatus`).
- **D04b-3 — the `board: Any` seam is unresolvable at runtime as it stands (cross-phase).**
  `:core-engine` hands `cnn.resyncCheck` a `Game`, while `:core-cnn`'s `CnnRecovery`
  `require`s a concrete chesslib `Board` (D02c-1). It compiles (`Any`), and the 04b tests use a
  hand-written `CnnEvaluator`, but the first live call with the real evaluator will throw.
  Resolution is an orchestrator/seam decision — `:core-cnn` accepting a FEN `String`, or `Game`
  exposing its `Board`. Neither file is 04b's.
- **D04b-4 — `cnn.moveTouchedSquares` / `cnn.expectedOccupancy` (the phase file's pseudocode) do
  not exist on `CnnEvaluator`.** Used the engine's own `moveTouchedMask` (02a) and
  `Game.pieceCharAt(i) != null` — exactly the re-derivation 03d already landed for the desync veto
  (D03d-12), and required by the module rule that `:core-engine` must not depend on `:core-cnn`.
  Both square sets are `Long` bitboards, so `checked` is `touched and confident` and "checked is
  empty" is `checked == 0L`.
- **D04b-5 — the decider grep hits constants, not literals.** The acceptance criterion greps
  `cnn_pair\|diff_after_verify`; the file uses `DECIDER_CNN_PAIR` / `DECIDER_DIFF_AFTER_VERIFY`
  from `Commit.kt`, whose values are exactly those strings. Re-spelling the literals would fork the
  decider vocabulary. `pairAgree` (3 hits), `minConfidentBoard` (3 hits) and `pendingVoted`
  (exactly 2 — shadow rung and commit rung, none in the window-end block) are as specified.
- **D04b-6 — `pendingVoted` (04a) did not exist while 04b ran**, so the first gate ran in an
  **isolated copy** of `android/` with a transcribed 17-line `PendingVote.kt` stub (scratchpad
  only, deleted afterwards, never in the repo tree). 04a has since landed `PendingVote.kt` with
  byte-identical semantics and calls `VerifyPair.tick(this, cnn, moves, board.copy(), snap)` — the
  D04b-1 signature — so nothing needed adjusting; the final gate below was re-run against the real
  file in the repo.
- **D04b-7 — the two discard paths reset the recovery confirmer differently, on purpose.** The
  shadow rung calls `confirmer.reset()` then `clearStuck()`, and `clearStuck` already resets the
  recovery confirmer (`Guards.kt`), which is what Python's explicit `_recovery_confirmer.reset()`
  before `_clear_stuck` amounts to. `rejectPair` resets it **explicitly**, because Python's
  `_reject_pair` deliberately does not clear the stuck state.
- **Coverage actually asserted (10 tests):** the five Python pair scenarios
  (`test_pair_verify_commits_on_after_match`, `..._rejects_shadow`,
  `..._touched_squares_fast_accept`, `..._window_end_preexisting_conflicts_commit`,
  `..._window_end_occluded_discards`, `..._blind_glance_never_shadow_rejects`) plus
  `pairFastAcceptNeedsThreeCheckedSquares`, `pairSecondHalfTouchedOnMidBoard`,
  `pairTerminalsNeedTwoGlances` and `windowEndTerminalIsNotVoteGated` (the spec's ninth case split
  in two: the window end must fire on a SINGLE glance, `verifyWindow = 1`). The shadow test pins
  invariant 5 (`refGray` becomes `pending.cur`), the blind-glance test pins that `refGray` is
  untouched. `pairSecondHalfTouchedOnMidBoard` uses `Nb1c3` + `b4xc3`: on the mid board the reply
  is an ordinary capture, on the pre-move board it would classify as en passant and drag in `c4`,
  the one square the fixture misreads. **Both invariants were mutation-checked in the isolated
  copy** — computing the second half on `boardSnap` and dropping the `>= 3` guard each turn the
  suite red (4 failures); the file was restored before the final run.

### 04a (`_verify_tick` — five signals, five-rung ladder, `cnn_overrule`, vote gate), 2026-07-25

Files created (package `com.chesslab.engine`, module `:core-engine`): main `VerifySingle.kt`,
`PendingVote.kt`; tests `VerifySingleTest.kt` (19), `VerifySingleFixtures.kt`. Edited: the
`onCnnSnapshot` routing in `api/TrackerEngine.kt` and `ResyncResult` in `api/CnnObservation.kt`
(both recorded below). No build file, no `libs.versions.toml`, and no file owned by 03*/04b/04c.
`EngineState` had every field 04a needs (`pending` with `frames`/`voteOutcome`/`voteCount`/`seq`,
`alarm`, `verifyState`, `cnnStatus`/`cnnConflicts`/`cnnAgreement`/`cnnBestMove`, `confirmer`,
`recoveryConfirmer`) — **no blocker**.

#### The routing wired into `onCnnSnapshot`

```
state.cnnSnap = snap                       // `_observe_snapshot`, unchanged
state.pending != null -> VerifySingle.tick(state, cnn, snap)   // PRIORITY over the periodic check
else                  -> state.cnnTick(cnn, snap)              // 04c
```
`VerifySingle` forks to `VerifyPair.tick` internally for multi-move candidates, so the router has
exactly the two arms `_cnn_worker` has. 04c's `ObserverSchedule` has no `onSnapshot` — this is the
only router; 04c's `observerDue`/`observationStarted`/`observationFailed` are bookkeeping driven by
`:app`.

#### Discrepancies

- **D04a-1 — `api/ResyncResult` had no `move`/`agreement`, which makes `cnn_overrule` (entry.md
  invariant 10, the whole reason this phase exists) inexpressible. Two defaulted fields were added.**
  Python's `resync_check` returns `{match, conflicts, move, agreement}` (`cnn_recovery.py`), and
  BOTH `_verify_tick` (rung 2's `cnnUci == pending.uci` clause and rung 4) and `_cnn_tick`'s
  occupancy path read `move`/`agreement`. The 04a and 04c phase files declare `ResyncResult` WITH
  them; 00a's transcription of `entry.md`'s seam block dropped them. `:core-cnn` computes them and
  throws them away (`Recovery.kt resyncCheck` already holds `full.move` / `full.agreement` from
  `resyncCheckFull` and discards both). Landed: `val move: String? = null, val agreement: Double =
  0.0` **appended with defaults**, so `:core-cnn` (which constructs the type with named arguments)
  still compiles untouched. Sanctioned by the ownership registry's "may be extended by nobody
  *without a STATUS.md discrepancy note*"; the `api/` seam is otherwise unchanged. This also
  resolves 04b's D04b-2.
  **ACTION REQUIRED (orchestrator, one line in a file no phase-04 agent may edit):** `:core-cnn`'s
  `CnnRecovery.resyncCheck` must pass `move = full.move, agreement = full.agreement`. Until it
  does, the overrule rung and `_cnn_tick`'s occupancy path are silently dead against the REAL
  evaluator — see the Blockers section.
- **D04a-2 — `TrackerEngine` gained `internal var cnn: CnnEvaluator? = null`.** The frozen seam has
  no way to reach an evaluator: `onCnnSnapshot(snap)` takes only the snapshot, `EngineState` (03a,
  frozen) holds no evaluator, and `VerifySingle.tick` / `cnnTick` both require one. Additive and
  `internal`, so the public surface and the function count are unchanged (D03d-1 precedent). It is
  `internal`, i.e. **not reachable from `:app`** — phase 05c needs a public injection point, which
  is an orchestrator decision on a frozen file.
- **D04a-3 — `VerifyVerdict` lives in `Dispatch.kt` (03d) with `For(decider, replacement)`, not in a
  new `VerifySingle`-owned `VerifyVerdict.kt` with `Hold/Shadow/Reject/Commit`.** The phase file's
  acceptance grep `val move: Move?` in `VerifyVerdict.kt` is therefore superseded: the replacement
  move is `VerifyVerdict.For.replacement: List<Move>?`, already landed and already pinned by
  `DispatchTest.cnnOverruleReplacementMoveIsExpressible`. Invariant 10 is satisfied by that field;
  no second verdict type was introduced. `Hold` maps to "return `emptyList()`", `Reject`/`Shadow`
  to the file-private `reject(...)`, exactly as Python's `_reject` / `_commit` closures do.
- **D04a-4 — the verify path anchors on `pending.cur`, NOT on `snap.gray` (invariant 5 narrowed).**
  `_verify_tick`'s shadow re-anchor and every commit pass `pending["cur"]` / `pending["cur_bgr"]`,
  the AVERAGED frame the candidate was raised from; only the *recovery* path (`_cnn_tick`, 04c)
  anchors on the observed frame. `applyVerdict`'s default `anchor` is already exactly that, so no
  `CommitAnchor` is passed here. Pinned by `VerifySingleTest.shadowSuppressedNoCommit`
  (`refGray === pending.cur`). `entry.md` invariant 5 already states both paths since the authoring
  round; this records that the code follows the narrower reading.
- **D04a-5 — `CnnEvaluator.board: Any` is fed a chesslib `Board` here and a `Game` in 04b.**
  `:core-cnn`'s `asBoard` `require`s a chesslib `Board` (D02c-1), and `Game` (02a) exposes no
  accessor for the one it wraps, so `VerifySingle` builds the snapshot itself:
  `Board().also { it.loadFromFen(game.fen()) }` — which IS Python's `board.copy(stack=False)`.
  04b's `VerifyPair.tick(…, boardSnap: Game, …)` passes the wrapper instead and will throw against
  the real evaluator (their D04b-3). 04a calls `VerifyPair.tick` with `board.copy()` to match the
  signature they published. **The two must be unified by the orchestrator** — see Blockers.
- **D04a-6 — the fallback commit uses the plain diff deciders, not a verdict.** Python's
  CNN-unavailable branch calls `_commit_move` / `_commit_sequence` with their DEFAULTS
  (`decider = "diff"` / `"diff_pair"`, `prior_used = False`) rather than the verified path's
  `_commit`. Routing it through `applyVerdict` would have silently upgraded the decider to a
  verified one and carried `pending.prior_used`, so `fallbackCommit` calls the two commit functions
  directly. Pinned by `cnnUnavailableCommitsPending` (asserts `decider == "diff"`).
- **D04a-7 — test-fake naming and the constructor cap.** `TaintTest.kt` (03b) already declares a
  *private* top-level `FakeObservation` in this package, which collides with an `internal` one, so
  04a's fakes are `VerifyObs` / `VerifyEvaluator` (04b's are `PairObs` / `PairRecovery`). And
  `LongParameterList` fires at **8** parameters (not above 8), so `VerifyEvaluator` carries 7
  constructor parameters with `minAgreement` / `confThr` as fixed properties — no test overrides
  them. Same finding family as D00a-3 / D01b-1 / D03c-1. No `@Suppress`, no baseline.
- **D04a-8 — the "isolated copy" gate was needed once.** 04b and 04c were editing this module
  concurrently; `CnnTick.kt` was mid-refactor and broke `:core-engine:compileKotlin` for a while.
  The first full gate therefore ran in a copy of `android/` under the session scratchpad with
  `CnnTick.kt` stubbed and 04c's two test classes removed (**267 tests, 0 failures, 0 skipped**,
  `ClipReplayParityTest` 2/2). Everything was re-run **in the repo** afterwards, with all three
  phases landed: see the session log. Nothing was copied back except the (unchanged) ktlint output.
- **Note (not a discrepancy):** the ladder is transcribed rung for rung with the vote gate on
  rungs 1–4 and NOT on the window end (Python calls `_reject`/`_commit` directly there — the window
  itself is the temporal damping). `fromOccConf` hard-rejects in exactly one place, the window-end
  ghost. `grep -rn "synchronized\|@Volatile\|Atomic\|Mutex\|System.currentTimeMillis\|Instant.now\|
  nanoTime"` over `VerifySingle.kt` / `PendingVote.kt` is empty; the lock-scoped re-checks became
  plain sequential identity checks (`pending !== pend || board.fen() != pend.fen`).
- **Coverage actually asserted (19 tests):** all 18 scenarios the phase file names —
  `shadowSuppressedNoCommit`, `occupancyConfirmsCommit`, `hardVetoRejectsGhostToStillEmpty`,
  `fromEmptyButToEmptyHoldsNonCastling`, `fromLeftAloneNeverCommitsNonCastling` (**b1c4**),
  `fromLeftCommitsWhenOccupancyDerivesSameMove`, `castlingCommitsDespiteKingSquareMisreadEmpty`,
  `fromOccupiedButArrivedCommitsAfterWindow`, `arrivedButOriginNeverEmptiedDiscards` (**d4b3**),
  `alarmDiscardsPendingCandidate`, `fromOccupiedNoArrivalRejectsAfterWindow`, `counterMoveOverrules`
  (**invariant 10** — asserts the `MoveCommitted` event carries `d2d4` with
  `decider == "cnn_overrule"` in the SAME cycle, plus the `(CNN overruled e4)` note suffix),
  `occlusionTimesOutRejects`, `fallbackRejectsWhenPostmoveBoardContradicts` (**b1d4**),
  `clearviewBorderlineAcceptsAfterWindow`, `cnnUnavailableCommitsPending`,
  `staleObservationNeitherConfirmsNorRejects` (asserts `frames == 0` and `voteOutcome == null` after
  the stale glance — ignored, not held), `singleGlanceNeverDecides` (**invariant 13**, both
  directions: one glance holds at `1/2`, a differing glance resets the count) — plus
  `blindGlanceDoesNotReAnchorOnACoveredBoard`, which drives the shadow rung with the REAL
  `minConfidentBoard = 32` and proves a vacuous match neither re-anchors nor accepts.

### 04c (observer schedule / `_cnn_tick` recovery / illegal-move alarm), 2026-07-25

Files created (package `com.chesslab.engine`, module `:core-engine`): main `ObserverSchedule.kt`,
`Alarm.kt`, `CnnTick.kt`; tests `RecoveryFixtures.kt` + `CnnTickTest` (18), `AlarmLatchTest` (14)
— **32 tests**. Nothing else was touched: no build file, no `api/` file, no `EngineState.kt`, no
file owned by 03*/04a/04b. `EngineState` had every field 04c needs — **no blocker**.

#### The entry point 04a routes to (this is the whole 04a↔04c seam)

```kotlin
internal fun EngineState.cnnTick(cnn: CnnEvaluator?, snap: CnnSnapshot): List<TrackerEvent>
```

A top-level extension, not `CnnTick.evaluate(state, cnn, snap)` — that is the house style since the
lean pass (`dispatch`, `commitMove`, `applyVerdict` are all `EngineState.` extensions), and an
`object` wrapper would be a tenth holder type. Call it from `_cnn_worker`'s routing when
`state.pending == null && snap != null`; it is a no-op when `cnn == null` or when no evaluation gate
is open, so an unconditional call is safe.

#### Alarm-release call sites — status for the orchestrator

| Path | Reason | Wired |
|---|---|---|
| `undo()` | `illegal_move_undone` | yes — 03d (`TrackerEngine.undo`) |
| `resetToStart()` / `setFen()` | `illegal_move_accepted` | yes — 03d |
| `captureBaseline()` | `illegal_move_accepted` | yes — 03d |
| verified restore — `matchOk` | *(none)* | yes — 04c (`onMatchOk` → `releaseAlarm()`) |
| recovery commit resolving all conflicts | *(none)* | yes — 04c (`commitRecovery`) |
| **`acceptCnnPosition()`** | `illegal_move_accepted` | **NO — still 03d's `emptyList()` stub** |
| CNN resync (`resync_cnn`, apply observed move) | `illegal_move_accepted` | **NO — no Kotlin counterpart; the frozen seam has no `resyncCnn()`** |

The last two are **reconciliation items, not 04c defects**: both live in `api/TrackerEngine.kt`
(03d's file — its `acceptCnnPosition` carries a `/** Owner: phase 04c */` comment that the
orchestrator's brief overrides with "do not touch `TrackerEngine.kt`"). Implementing
`acceptCnnPosition` is real work, not a one-liner: it rebuilds the position from the observation on
the label-confident squares, preserves the side to move, prunes castling rights, REJECTS an
observation without both kings, clears the history, and only then releases the latch — plus the
`preview = true` variant. Python: `tracker.py::accept_cnn_position :2486`, tests
`test_accept_cnn_position_*:2675-2716`. The corresponding Kotlin tests
(`acceptCnnPositionClearsLatch`, preview, missing-king) were therefore **not written** rather than
landed red.

#### Discrepancies

- **D04c-1 — there is no `AlarmState`.** The phase file declares
  `data class AlarmState(kind, sinceMs, conflicts, guess)`; 03a's FROZEN `EngineState` already
  carries `alarm: TrackerEvent.Alarm?` (kind / conflicts / guess / **guessSan**) plus a separate
  `alarmSince: Double`, and `TrackerStatus.alarm` is that same seam type. Adding `AlarmState` would
  have meant a tenth wrapper plus a conversion at the status boundary. The seam type is used as-is;
  `guessSan` is filled at raise time.
- **D04c-2 — the frozen `ResyncResult` cannot express Python's occupancy-only move.**
  `ResyncResult(match, conflicts, checked)` has no `move` and no `agreement`, but `_cnn_tick`'s
  `else` arm (`obs.label is None`, `tracker.py:1927-1934`) reads exactly those two. `:core-cnn`'s
  Python-faithful `resyncCheckFull` is unreachable from `:core-engine` (module cycle). Landed: in
  occupancy-only mode `matchOk`/`conflicts` come from `resyncCheck` and the MOVE comes from
  `deriveMovesDeep(maxPlies = recoveryMaxPlies)` alone, with `agreement` from the deep search. The
  deep search reaches the same 1-ply move `resync_check` reports, so the delta is the `agreement`
  number, not the decision — and the path is **unreachable with the bundled 14-class model**
  (identity is always present). Extending `ResyncResult` is an orchestrator decision; 00a owns
  `api/CnnObservation.kt`.
- **D04c-3 — the `_cnn_worker` routing is 04a's, not 04c's.** The phase file puts
  `ObserverSchedule.onSnapshot` / `onFrameTick` here, but the orchestrator assigned `PendingVote.kt`
  and the `onCnnSnapshot` routing to 04a. `ObserverSchedule.kt` therefore owns only `observerDue`,
  the single-flight/backoff bookkeeping (`observationStarted` / `observationFinished` /
  `observationFailed`), the `_observe_snapshot` contract as KDoc, and `anchorAtDetSize`. That also
  keeps 04c free of any compile-time dependency on `VerifySingle.kt`, which is why 04c could gate
  while 04a was mid-flight.
- **D04c-4 — `Alarm.clear(state, reason)` is `EngineState.releaseAlarm(logReason: String? = null)`,
  and the reasoned path DELEGATES to 03d.** `api/TrackerEngine.kt` already has
  `EngineState.clearAlarm(logReason: String)` (non-null reason, always writes the provenance row).
  Rather than duplicate that 25-line row builder, `releaseAlarm` calls it when `logReason != null`
  and does the silent reset itself otherwise. **Consequence, recorded not fixed:** the verified
  restores emit `AlarmCleared("board_restored")` (what the phase file specifies) while 03d's user
  corrections emit `AlarmCleared(alarm.kind)` = `"illegal_move"`. Unifying them means editing 03d's
  file. Recommendation: give 03d's `clearAlarm` a `String?` parameter and let it emit
  `AlarmCleared(logReason ?: "restored")`, after which `releaseAlarm` collapses to a one-line
  delegate.
- **D04c-5 — `onStableMismatch` drops the phase file's `inconclusive` parameter, and the raise
  condition drops `obs.label != null`.** Branch B (`inconclusive`) returns before branch C, so
  Python's `has_identity and not inconclusive` (`:1978`) IS `has_identity` there, and
  `has_identity and obs.label is not None` (`:1998`) tests the same dict twice. Both are recorded as
  dead sub-terms rather than transcribed. `inconclusiveObservationBreaksStreak` proves the streak
  drops to 0 and restarts at 1.
- **D04c-6 — `hasIdentity` is `Squares.ALL.any { obs.label(it) != null }`.** Python tests the whole
  `obs.label` dict for `None`; the frozen seam is per-square (`label(square): String?`).
  `:core-cnn`'s `OccupancyObservation` returns `null` for EVERY square when labels are absent, so
  `any` is exact.
- **D04c-7 — `expected_labels` and `_build_alarm_guess_san` are re-derived inside `:core-engine`.**
  Both live in `cnn_recovery.py`, which the engine may not depend on (module cycle — same reasoning
  as D03d-12). `expected_labels` is 02a's `Game.labelAt(square)` on the post-sequence board
  (identical `config.label_from_piece` mapping); `_build_alarm_guess_san` is
  `Game.alarmGuessSan(guess)` in `Alarm.kt`, whose castling arm uses `Game.hasCastlingRights`.
- **D04c-8 — `Squares.colOf` takes the PACKED `colRow` value, not a square index.** Passing an index
  compiles and silently returns `index shr 3`, which made every suspected castling read "illegal move
  suspected". The FILE of a `Squares.ALL` index is `index % Squares.N`. Caught by
  `alarmStatusFieldsForUi`; flagged because the signature invites the same mistake.
- **D04c-9 — detekt `LongParameterList` fires at 8 (the post-lean-pass threshold).** The fake's 11
  constructor parameters became 7 + four body properties: `RecoveryEvaluator(match, conflicts, moves,
  agreement, occupancyMatch, occupancyConflict, guess)`, with `inconclusive` and the three
  `CnnEvaluator` thresholds set in the body. Same family as D01b-1 / D03d-4. No `@Suppress`, no
  baseline, no config change. Related: `CnnRead` (the five values one observation yields, which must
  travel together) is a **private** top-level class — `MatchingDeclarationName` exempts private
  classes, so it can live in `CnnTick.kt` beside nine functions.
- **D04c-10 — the recovery commit does NOT reuse `commitSequence` / `commitMove`.** Python's
  `_cnn_tick` commit tail (`:2044-2076`) genuinely differs from `_commit_move`'s: it does not set
  `verifyState = "confirmed"`, does not clear `anomalySince`, sets `recoveredLast = true`, and has
  the "no anchor at all" arm that drops `refGray`/`refBgr`/`refFen` and the gray buffer.
  `commitRecovery` transcribes that tail literally; only `recordDecision`, `queueSessionCapture` and
  `setRef` are reused.
- **Tests deliberately not written** (beyond the two `acceptCnnPosition` items above):
  `pendingCandidateTakesPriorityOverPeriodicCheck` — the routing is 04a's (D04c-3), so 04a owns that
  test; `quietReanchorVetoedByConfidentCnnConflict` — already landed by 03d (`cnnDesyncConflicts` +
  `alarmBlocksCommitReanchorAndPending`), and the half 04c owns (the pipeline never healing the
  alarm) is covered by `alarmBlocksFabricatedRecovery`.
- **Coverage actually asserted:** the desync streak over DISTINCT seqs, same-seq dedup, subset
  stability vs a disjoint reset-to-ONE, inconclusive breaking the streak, identity-only conflicts
  never alarming, occupancy-only mode never alarming, no-CNN never alarming, the three user-correction
  releases through the PUBLIC `TrackerEngine` API, the verified restore leaving no `decider = "user"`
  row, and the full UI status payload incl. `guessSan`. On the tick side: the four observer-schedule
  rules (interval throttle, single flight, 1 s failure backoff, observing while no evaluation is due),
  both evaluation gates in both directions, the discard-on-FEN-change guard, `matchOk` anchoring on
  `snap.gray` and NOT on `lastCur`, the `detSize` rejection falling back to `lastCur`, no gamut
  rebuild on that anchor, the occupancy fallback rescuing an identity mismatch, the recovery confirmer
  needing `confirmFrames` votes, atomic sequence commit, the granted motion window, the
  unplayable-sequence drop and the no-anchor base-truth drop.

### 04x (cross-module seam reconciliation — orchestrator), 2026-07-25

Closes the four open phase-04 items (D04a-1 / D04a-2 / D04a-5 / D04b-3 / D04c-2 / D04c-4) plus
04c's `acceptCnnPosition` reconciliation item. Files touched: `api/CnnObservation.kt`,
`api/TrackerEngine.kt`, `Alarm.kt`, `CnnTick.kt`, `VerifySingle.kt`, `VerifyPair.kt`,
`:core-cnn`'s `Recovery.kt`, six test files, plus the new
`core-cnn/src/test/.../EngineSeamIntegrationTest.kt`. `entry.md`'s seam block was updated (the one
sanctioned spec edit) to match.

#### D04x-1 — `CnnEvaluator` now takes the position as a FEN, not as `Any`

```kotlin
fun verifyMove(boardFen: String, moveUci: String, obs: CnnObservation): Pair<Double, Int>
fun resyncCheck(boardFen: String, obs: CnnObservation): ResyncResult
fun boardMatchesIdentity(boardFen: String, obs: CnnObservation): IdentityResult
fun deriveMovesDeep(boardFen: String, obs: CnnObservation, maxPlies: Int): DeriveResult
fun hasOccupancyConflict(boardFen: String, obs: CnnObservation, thr: Double, conflicts: List<String>): Boolean
fun guessIllegalMove(boardFen: String, obs: CnnObservation, thr: Double): String?
```

`board: Any` was fed a chesslib `Board` by `VerifySingle` and a `Game` by `VerifyPair`, `CnnTick`
and `Alarm`, while `:core-cnn`'s `asBoard` `require`d the former — it compiled, every test passed,
and it threw on the first live call. A FEN is the only position type both modules already speak.
The cost is one `loadFromFen` per call, and these calls happen per CNN **observation** (a few per
second), never per frame. `Game.fen()` is `getFen(true, true)` (D02a-1), so placement, side to
move, castling rights and the en-passant target all survive; the move stack does not, and none of
`verify_move` / `resync_check` / `board_matches_identity` / `derive_moves_deep` reads it.
`:core-cnn`'s `asBoard` is gone, replaced by `boardOf(fen)`; `VerifySingle` no longer imports
chesslib's `Board` at all and passes `board.copy()` (a `Game`, Python's `copy(stack=False)`).

#### D04x-2 — `:core-cnn` forwards `move` / `agreement` (04a's ACTION REQUIRED)

`CnnRecovery.resyncCheck` computed `resyncCheckFull` and dropped both fields, so rung 4 of the
verify ladder (`cnn_overrule`, entry.md invariant 10 / legacy specs/12 D3) could never fire against
the real evaluator, silently. Two named arguments. **Verified by mutation:** removing them again
turns `overruleRungCommitsTheCnnsReplacementMove` red.

#### D04x-3 — `TrackerEngine.attachCnn(evaluator: CnnEvaluator?)` replaces `internal var cnn`

Phase 05c owns the ONNX classifier and could not reach an `internal` field. `attachCnn` also sets
`state.cnnRun` — without it the detection pipeline commits straight from the diff and no candidate
is ever queued for verification, i.e. injecting an evaluator alone would have been a no-op. Twelve
public functions, under the 15 the lean pass allows.

#### D04x-4 — `acceptCnnPosition()` implemented; **no `preview` variant**

Ported from `tracker.py::accept_cnn_position`: a MINIMAL edit over the label-confident squares
(unsure/occluded squares keep the game-state piece), side to move preserved, castling rights pruned
to what the rebuilt position supports (`clean_castling_rights`), en passant dropped, both clocks
carried over, an observation without exactly one king per side REJECTED, then `setFen` (history +
latch) and `captureBaseline` (visual reference). The observation comes from `state.cnnSnap`, so no
seam change was needed. **Partial in one respect:** Python's `preview = true` returns a would-be
FEN plus a per-square change list, which the `List<TrackerEvent>` return type cannot express. It is
a UI affordance, not a correctness item — phase 06/07 needs either a status field or a second
entry point, and that is a seam decision, so it is recorded here rather than improvised.
Second deviation: Python calls `chess.Piece.from_symbol(lab[1])`, which **throws** on an
`"occluded"` label; the port treats any non-piece label as "keep the game-state piece", which is
what `label_confident` is supposed to have excluded anyway.

#### D04x-5 — `clearAlarm` takes a `String?` and `releaseAlarm` is gone (04c's D04c-4 recommendation)

`clearAlarm(logReason: String?)` is now the single release: `null` = verified restore (no
`decider = "user"` row, `AlarmCleared("board_restored")`), non-null = user correction (log row,
`AlarmCleared(logReason)`). It previously emitted `AlarmCleared(alarm.kind)` — i.e. the string
`"illegal_move"` for a *cleared* alarm — so the event's reason is now always why the latch went.
No test asserted the old value.

#### D04x-6 — the integration test lives in `:core-cnn` and is the point of the exercise

`EngineSeamIntegrationTest` (3 tests) drives the PUBLIC `TrackerEngine` API against a real
`CnnRecovery`, over synthetic 400 px warps and model-free `FakeSquareClassifier` observations
(no fixture was invented or edited; the committed `parity/_cnn/*.jsonl` families are all keyed to
`resyncCheckFull`/`deriveMovesDeepFull` directly and are already asserted by the 02c tests):

- `overruleRungCommitsTheCnnsReplacementMove` — the diff raises `e2e4`, the board shows `d2d4`, e4
  reads `occluded` so rungs 1–3 cannot decide; two glances later the ladder commits `d2d4` with
  `decider = "cnn_overrule"`. **Red without D04x-2** (verified).
- `recoveryCommitsAMoveDerivedThroughTheSeam` — no pending candidate, so `_cnn_tick` runs
  `boardMatchesIdentity` + `deriveMovesDeep` + `resyncCheck` with a real FEN and commits
  `cnn_recovery`. **Red without D04x-1** (verified by feeding the call a non-FEN string, which
  reproduces the pre-fix `IllegalArgumentException` class).
- `alarmRaisesOnARealOccupancyConflict` — a vanished e2 pawn explains no legal move, so the deep
  search stays silent, the desync streak runs, and the third glance raises through
  `hasOccupancyConflict` / `guessIllegalMove`. **Red without D04x-1** (same experiment).

`:core-engine` did NOT gain a dependency on `:core-cnn`.

#### D04x-7 — three `acceptCnnPosition` tests landed in `AlarmLatchTest`

`acceptCnnPositionAdoptsTheObservationAndClearsTheLatch`,
`...RejectsAnObservationWithoutBothKings`, `...PrunesCastlingRightsAndKeepsSideToMove`
(04c's third named test was the preview variant, which does not exist — see D04x-4; the
castling/side-to-move test replaces it). `alarmedEngine()` now latches through
`attachCnn` + `onCnnSnapshot` instead of calling `cnnTick` directly, which is what puts
`state.cnnSnap` in place and exercises the new injection point.

#### Still open after 04x

- **D04c-2 stays open** — `ResyncResult` now carries `move`/`agreement`, but `_cnn_tick`'s
  occupancy-only arm still reaches its move through `deriveMovesDeep` (`CnnTick.occupancyRead`)
  rather than through `resync_check`'s own. Unreachable with the bundled 14-class model, and
  changing it now would touch 04c's file for a path no test can reach.
- **No Kotlin counterpart to `resync_cnn`** (04c's release table, row 7). Unchanged.

### 05a (camera — single CameraX owner, delivered-resolution truth, rebind backoff), 2026-07-25

Files created (package `com.chesslab.tracker.camera`, module `:app`): main `CameraModels.kt` (63),
`ReconnectPolicy.kt` (80), `ResolutionMismatchLogger.kt` (29), `TrackerCamera.kt` (184) — 356 LOC,
no file over 250; tests `ReconnectPolicyTest` (5), `ResolutionMismatchLoggerTest` (2),
`DeliveredSizeTest` (2) — **9 tests, 0 skipped, 0 failures**. Nothing else was touched: no build
file, no catalog entry, no manifest, no file owned by 05b/05c. **No dependency was missing.**

`TrackerCamera` is the class 06c constructs and owns:
`TrackerCamera(context, request: CameraRequest, sink: FrameSink, policy: ReconnectPolicy)`, with
`bind(lifecycleOwner)` / `close()`, `cameraState: StateFlow<CameraHealth>`,
`deliveredSize: DeliveredSize?` and `requestedSize: Size` (kept strictly separate).
06a renders the calibration preview from the frames 06b/06c publish out of the same `FrameSink` —
it must never bind a provider of its own.

#### Discrepancies

- **D05a-1 — the `grep -c "ProcessCameraProvider" == 1` acceptance criterion is unachievable as
  written.** The name necessarily occurs on three lines of `TrackerCamera.kt`: the `import`, the
  `private var provider: ProcessCameraProvider?` field, and the single call. (A fourth is the KDoc
  sentence naming the bug.) The criterion's *intent* — one binding owner — is met and greppable as
  **`grep -c "ProcessCameraProvider.getInstance" … == 1`**, and
  `grep -rn "ProcessCameraProvider" android/app/src/main/kotlin/` hits `camera/TrackerCamera.kt`
  and no other file. Suggest the orchestrator reads the criterion that way for phases 06+.
- **D05a-2 — `shouldDiagnose()` fires after **2** failures, not the 3 the phase file states.**
  Python `_log_reconnect_diagnosis` guards with `if self._reconnect_diagnosed or
  self._reconnect_attempts < 2: return`, and `_reconnect_attempts` is incremented *before* the
  call — so the diagnosis lands on the second consecutive failure. `entry.md` says trust the Python
  code, so `DIAGNOSE_AFTER = 2`. The legacy app used 3. The test keeps the spec's name
  (`diagnosisFiresExactlyOnceAfterThreeFailures`) and asserts what actually matters: nothing after
  the first failure, and **exactly one** `true` across ten consecutive failures.
- **D05a-3 — the downshift is not restricted to local USB (deliberate deviation, as instructed).**
  Python's `_downshift_target` bails on `not isinstance(self._src, int)`. Android has no such
  distinction; the bandwidth argument applies to the ISP/HAL path too, so `offerDownshift` always
  applies. Threshold and latch are Python's: `attempts >= 2`, delivered `>= 1920*1080`, once ever.
  `offerDownshift(null)` is **false** — with no frame yet there is no trustworthy size, and the
  request may never substitute for one (that is `a7dab73`).
- **D05a-4 — sustained recovery is measured from the last FAILURE, not from a frame-continuity
  counter.** Python resets when `self._reconnect_attempts and (time.time() -
  self._last_reattach_ts) > 10.0` on a good read — i.e. 10 s since the last reattach, evaluated
  only while frames arrive. `onFrameDelivered(nowMs)` reproduces exactly that (`nowMs -
  lastFailureMs >= 10 s`), which is also what makes "one lucky frame at t+1 s does not reset"
  true. No separate continuity state was invented.
- **D05a-5 — test names are camelCase, not the phase file's snake_case.** The house style of every
  existing test in this pack (`pairVerifyCommitsOnAfterMatch`, …). Mapping:
  `backoff_schedule_is_3_6_12_24_30_30` → `backoffScheduleIs3612243030`,
  `backoff_base_follows_reconnect_grace_s` → `backoffBaseFollowsReconnectGraceS`,
  `one_lucky_frame_does_not_reset_escalation` → `oneLuckyFrameDoesNotResetEscalation`,
  `diagnosis_fires_exactly_once_after_three_failures` → `diagnosisFiresExactlyOnceAfterThreeFailures`,
  `downshift_offered_once_above_1080p_then_latched` → `downshiftOfferedOnceAbove1080pThenLatched`,
  `logs_once_per_distinct_pair` → `logsOncePerDistinctPair`,
  `no_log_when_delivered_matches_requested` → `noLogWhenDeliveredMatchesRequested`,
  `delivered_size_is_read_from_the_image_never_from_the_request` →
  `deliveredSizeIsReadFromTheImageNeverFromTheRequest`. One extra test
  (`requestAndDeliveredAreNeverConflated`) pins that `CameraRequest.downshifted()` changes the WISH
  only and that no `DeliveredSize` can be produced from a `CameraRequest`.
- **D05a-6 — `CameraRequest` carries `width`/`height` as `Int`, not an `android.util.Size`.**
  `Size` is an android.jar stub on the unit-test JVM and its constructor throws; the phase file's
  `val requestedSize: Size` is still exposed on `TrackerCamera` (built on demand from the ints), so
  the "requested and delivered are never conflated" rule is unaffected. Same reason the fake
  `ImageProxy` returns a literal `0x23` for `getFormat()` instead of touching `ImageFormat`.
- **D05a-7 — `runCatching` instead of `try/catch` in the two must-not-throw paths.** detekt's
  default `TooGenericExceptionCaught` forbids catching `Throwable`/`Exception`/`RuntimeException`,
  which is exactly what "a sink exception must never kill the analyzer thread" requires.
  `runCatching { … }.onFailure { Log.w(...) }` (analyzer) and `runCatching { bindToLifecycle(…) }
  .getOrElse { scheduleRebind(…) }` express it with no `@Suppress` and no baseline. Related:
  `offerDownshift` was reshaped to 3 returns for `ReturnCount` (behaviour unchanged).
- **Note (not a discrepancy) — the gate was run in an isolated copy.** 05b is editing
  `app/src/main/kotlin/com/chesslab/tracker/pipeline/` concurrently and it does not currently
  compile (`BoardWarps.kt`: `Unresolved reference 'FrameStages'`, ~20 `overrides nothing` errors),
  which fails `:app:compileDebugKotlin` and therefore every `:app` task. The full gate was
  therefore run against `git archive HEAD android` + only this phase's seven files: tests,
  `ktlintCheck` and `detekt` all **green, zero findings**. In the live tree `:app:detekt` also runs
  (it needs no compilation) and reports exactly one finding, in 05b's `pipeline/RoiMotion.kt`
  (unused `org.opencv.core.CvType` import) — **nothing in `camera/`**.

#### Manual verification checklist — NOT executed

No device was attached in this session, so all four items (tab-switch feed survival, the
requested-vs-delivered WARN, the 3/6/12/24/30 s backoff with one diagnosis line, the ~10 s
escalation reset) are **open for phase 09 / the first live bring-up**. Everything that can be
checked without a device is covered by the 9 unit tests and the acceptance greps.

### 05c (ONNX `SquareClassifier`, loud attach state, CNN observer thread), 2026-07-25

Files created (package `com.chesslab.tracker.cnn`, module `:app`): main `ModelSpec.kt` (56),
`CnnState.kt` (114), `CnnModelAssets.kt` (60), `OnnxSquareClassifier.kt` (170),
`CnnObserver.kt` (158); tests `ModelSpecTest` (5), `OnnxSquareClassifierContractTest` (6),
`CnnStateTest` (3), `CnnObserverScheduleTest` (5) — **19 tests**. No build file, no manifest, no
file outside `cnn/` was touched; nothing was needed from `camera/`, `pipeline/`, `:core-cnn` or
the version catalog, so **no blocker**.

**Entry points 06c drives:** `CnnObserver(source, fen, onSnapshot, log, nowMs, dispatcher)` →
`attach { Attached(OnnxSquareClassifier.open(staged, log), backend, model) }`,
`onFrameAvailable()` once per analyzer frame (returns immediately), `wantsFrame()` as the gate
for 05b's `CropFrameStore.wantsFrame()`, `setIntervalS(observerIntervalS)`, `setEnabled`,
`retryAttach` (07b), `state: StateFlow<CnnState>`, `close()`. `onSnapshot` is the callback that
marshals the `CnnSnapshot` onto the engine thread (`TrackerEngine.onCnnSnapshot`).

#### Discrepancies

- **D05c-1 — the 14-class assertion is `:core-cnn`'s `requireExpectedClasses`, so it throws
  `IllegalArgumentException`, not the `IllegalStateException` the phase file names.** Reusing it
  keeps the canonical class list in exactly one place (CLAUDE.md), which is why **both acceptance
  greps over `cnn/` return ZERO hits, not "only `ModelSpec.kt`"**: there is no `wP`/`bK` literal
  and no `0.485`/`0.229` literal anywhere in `:app` — the ImageNet fallback is `:core-cnn`'s
  `IMAGENET_MEAN`/`IMAGENET_STD` and is applied **only** when the `normalize` key is absent
  (`fallsBackToImagenetOnlyWhenNormalizeKeyIsAbsent` asserts both directions, the `ee7c83c`
  regression). Both exception types are unchecked and both fail loudly at load.
- **D05c-2 — the `addQnn` guard is structural, not an in-function file check.** `Ep` is an enum
  pairing each provider with the graph it may run (`QNN -> model.qnn.onnx`, `NNAPI`/`CPU` ->
  `model.onnx`) and `epChain(hasQnnModel)` does not even offer `Ep.QNN` without the staged
  quantized file. The acceptance grep expects the existence check inside the same function as
  `addQnn`; the enum makes the wrong pairing unrepresentable instead, and
  `prefersQuantizedModelForQnnAndFp32Otherwise` pins it.
- **D05c-3 — `grep -c "session.run\|runner.run"` is 2, not 1.** `runner.run(...)` in `classify`
  is the ONE inference call site; the second hit is `session.run(...)` inside the file-private
  `OrtSessionRunner`, which exists **because** the phase file's own test section demands a fake
  `SessionRunner` seam. Splitting it into another file would break the file-ownership list.
- **D05c-4 — `CnnSnapshot.inferMs` is preprocess + inference, not the bare `run`.** The observer
  can only time the `SquareClassifier` seam. The pure session time is
  `OnnxSquareClassifier.lastRunMs` (measured around `runner.run` only, `@Volatile`), which 07b
  should read for the debug screen.
- **D05c-5 — the observer's input seam is `CnnFrameSource`/`CnnFrame` (owned by `cnn/`), not
  05b's `CropFrameStore`.** 05b runs concurrently and 05c may not name a type it owns, so the
  observer takes `fun take(): CnnFrame?` and 06c adapts the store to it. `take()` is called **on
  the observer thread**, so the bordered warp's cropping happens off the analyzer thread; the
  analyzer's only inbound coupling stays `wantsFrame()` + `onFrameAvailable()`, both non-blocking
  volatile reads.
- **D05c-6 — `:core-cnn`'s `preprocess` allocates a fresh `FloatArray` per call** (64 x 3 x 128 x
  128 = 12.6 MB). The direct `FloatBuffer` handed to ORT is allocated once and reused
  (`reusesTheInputBufferAcrossCalls`), but removing the intermediate copy would mean an `out`
  overload in `:core-cnn`, which 05c does not own. ~6-10 allocations/s at observer rate.
- **D05c-7 — `attach` takes `() -> Attached` (classifier + backend + model).** The observer never
  casts to the ONNX implementation, so `CnnState.Ready` carries a named EP for any classifier and
  the schedule tests run against a pure fake.
- **D05c-8 — the real bundled model IS testable on the host, and is tested.** `onnxruntime-jvm` is
  a `testImplementation` (00a) and the QNN AAR is excluded from unit-test configurations, so
  `stagesAndRunsTheRealAssetModelOnTheFallbackProvider` stages `assets/cnn_model/` into a
  `@TempDir`, walks the real EP chain (QNN fails → WARN, NNAPI fails → WARN, **CPU builds**), runs
  all 64 crops through the committed `model.onnx` in one session call and asserts the softmax
  rows. This covers `ModelSpec.parse` on the real asset, staging, the fall-through logging and the
  batched run end to end — everything except which EP a *device* picks.
- **D05c-9 — `android.util.Log` is stubbed in JVM unit tests**, so every log goes through a
  `CnnLog` seam (`AndroidCnnLog` is the Android binding). That is what makes "an attach failure is
  an ERROR log **and** a state" assertable at all.
- **Not testable on the host (by construction):** QNN-HTP(NPU) and NNAPI selection, the QNN
  `backend_path`/`htp_performance_mode` options, `CnnModelAssets.fromAssets(Context)`, and the
  steady-state on-device `inferMs`. All four are in the phase file's manual checklist, which is
  **not yet run** — no device was attached in this session.
- **Note:** `grep -rn "catch" cnn/` is EMPTY — every failure path is `runCatching(...)` with an
  `onFailure` that logs **and** transitions state (attach → sticky `Failed` at ERROR; observation
  → WARN + the 1 s backoff). No `@Suppress`, no baseline, no detekt config change.

### 05b (frame pipeline — YUV→BGR, the two warps, gray, ROI motion, dark gate, timings), 2026-07-25

Files created (package `com.chesslab.tracker.pipeline`, module `:app`): main `YuvToBgr.kt` (146),
`FrameSizeGuard.kt` (108), `GrayPipeline.kt` (37), `RoiMotion.kt` (166), `BoardWarps.kt` (176),
`StageTimings.kt` (61), `FramePipeline.kt` (151); tests `YuvToBgrTest` (5), `FrameSizeGuardTest`
(4), `RoiMotionGeometryTest` (6), `StageTimingsTest` (2), `FramePipelineOrderTest` (6) — **23
tests, 0 failures** — plus the fixtures `app/src/test/resources/pipeline/yuv420_64x48.bin` and
`…_expected_nv21.bin`. No build file, no `camera/`, no `cnn/`, no `core-*` file was touched.

#### The entry point 06c calls per frame

```kotlin
class FramePipeline(config: TrackerConfig, stages: FrameStages, cropStore: CropFrameStore,
                    sizeGuard: FrameSizeGuard, timings: StageTimings = StageTimings()) {
    @Volatile var corners: FloatArray?          // [a8,h8,h1,a1] in source px, swapped by 06c
    fun onFrame(image: ImageProxy, timestampMs: Long): FrameResult   // Ready(FrameInput) | Skipped(note)
    fun onConfigChanged(config: TrackerConfig)  // CLAHE rebuild + prevRoi reset
    fun onGeometryChanged(geometry: BoardGeometry)
    fun close()
}
// production wiring: FramePipeline(cfg, CameraStages(geom, cfg, store), store, guard)
```

#### Discrepancies

- **D05b-1 — `:core-engine`'s `motionScore` is `internal`, so `:app` cannot call it.** The phase
  file's "do not reimplement `motionScore` — call `:core-engine`" is not executable: `Motion.kt`
  is `internal fun`, `:core-engine`'s public surface is `api/` only (entry.md hard rule 3), and
  both `:core-engine` and the seam are frozen for this phase. Rather than stop the phase over an
  8-line pure function, `RoiMotion.kt` carries `changedPixelPercent(prev, cur, pxThr)` — the same
  arithmetic (unsigned bytes, strict `>`, result in PERCENT), unit-tested, with the duplication
  flagged in its KDoc. **Orchestrator decision needed:** promote `motionScore` into
  `engine.api` (one line) and delete the copy, or keep the copy. It is the ONLY duplicated logic
  in the package.
- **D05b-2 — `:app` unit tests have no OpenCV natives, so the OpenCV steps are untested.**
  `app/build.gradle.kts` depends on the OpenCV **AAR** (Android `.so` only) and has no bytedeco
  host artifact the way `:core-geometry` does; build files are frozen for this phase. Consequence:
  `cvtColor(COLOR_YUV2BGR_NV21)`, `warpFromCorners`, `warpBoardForCrops`, CLAHE/blur, `Canny`
  coverage and the ROI warp/resize/blur are **not** exercised by `:app:testDebugUnitTest` — every
  one of them is already covered by `:core-geometry`'s 58 native-backed tests except the two
  `cvtColor` calls. What this phase owns and tests is the arithmetic around them: NV21 packing
  (byte-exact vs the fixture, incl. `rowStride > width` and `pixelStride 2`), the centre
  expansion, the change score, the buffer lifecycle, the size guard and the per-frame order.
  **The phase file's `yuv420_64x48_expected_bgr.bin` was therefore replaced by
  `yuv420_64x48_expected_nv21.bin`** — an expected-BGR fixture would need a decoder this module
  cannot run. Everything OpenCV-backed sits behind the `FrameStages` interface so the order test
  runs with fakes.
- **D05b-3 — `pipeline/GrayPipeline.kt` DELEGATES to `:core-geometry`'s `GrayPipeline`.** 02b
  already landed the `_gray` port (cvtColor → CLAHE(clip, 8x8) → GaussianBlur(5,5,0)) with a
  cached CLAHE handle. Re-typing it in `:app` would create a second source of truth for a parity
  primitive. The app class adds only what 02b's cannot know: the reused destination `Mat` and the
  CLAHE **rebuild** on a live `diffClaheClip` change (`_apply_live_tuning` sets `_clahe = None`).
  **The acceptance grep `grep -n "GaussianBlur" pipeline/GrayPipeline.kt` therefore does not
  hit** — it hits `core-geometry/.../GrayPipeline.kt:47` with kernel `5, 5`. The same grep on
  `pipeline/RoiMotion.kt` does hit, as specified.
- **D05b-4 — `CropFrameStore` hands over a `Pending` record, not a bare `Mat`.** 05c's
  `CnnFrame(crops, seq, tsMs, warped, gray)` needs the observed frame's **detection** warps and
  its seq; a bare crop `Mat` cannot supply them, and invariant 5 (recovery anchors on the frame
  the CNN looked at) then has no way to be satisfied. `Pending(cropWarp, seq, tsMs, bgrDet,
  grayDet)` bundles what the pipeline already holds at emit time. Ownership is as specified:
  `update()` releases the previous `cropWarp`, `take()` transfers it, `close()` releases.
  A second addition: `internal fun served()`, called by the pipeline right after the warp, is what
  makes one `request()` yield exactly one bordered warp (`wantsFrame() = wanted && pending ==
  null`). The 06c adapter is `CnnFrameSource { store.take()?.let { … } ?: run { store.request();
  null } }` — 05c's file already documents that adapter as 06c's.
- **D05b-5 — `FrameSizeGuard` takes plain ints, not 05a's `DeliveredSize`.** 05a runs
  concurrently and its files are not mine; the guard is deliberately Android-free and OpenCV-free
  (`setRequested`, `setProfile`, `note(w, h)`, `mismatch: SizeMismatch?`). `requestRegeneration`
  is a **signal only** — it carries no frame, because ArUco must not run on the analyzer thread
  (`4a7609e`). Python's rate-limit rule, the retry-every-frame rule and the a7dab73 "delivered is
  truth" rule are all ported and asserted.
- **D05b-6 — `FrameInput`'s `ByteArray`s are freshly allocated per frame, ON PURPOSE.** The
  engine's `RunningMean*` stores appended planes by reference (invariant 14 / `FrameLoop.kt`
  KDoc), so handing it a reused buffer would silently average one plane against itself. "Zero
  per-frame allocation" therefore governs the YUV→BGR path and every `Mat` (all long-lived
  fields, `release()`d in `close()`); the two seam copies at `detSize` (~1.0 MB/frame at
  `detSize = 800`) are the price of the engine's contract, not an oversight.
- **D05b-7 — `gridLineCoverage` runs on EVERY emitted frame.** Python calls
  `_occluded_by_grid` only inside the motion/stable branches, but `gridLineCoverage` is a
  `FrameInput` field, so the app cannot know whether the engine will need it. The values are
  identical; only the Canny cost is unconditional. If the on-device budget needs it back, the
  seam would have to carry a lazy accessor — recorded rather than improvised.
- **D05b-8 — the manual checklist is NOT run and the fps/median numbers are NOT measured.** No
  device was attached in this session, and `:app` has no UI/service yet (06b/06c) to run the
  pipeline end to end. The four checklist items (1/s `chesslabPerf` line, ≤ 20 ms median, dark-gate
  flip, mid-session resolution change) stay **open for phase 09**.
- **Note (not a discrepancy):** the acceptance greps are otherwise green —
  `warpBoardForCrops` appears only in `BoardWarps.kt` and only under `cropStore.wantsFrame()`;
  `detSize`/`detectScale` hit `BoardWarps.kt`; `160` hits `RoiMotion.kt`; and
  `Aruco|MarkerTracker|detectMarkers` and `SquareClassifier|OrtSession|runBlocking|.await()` are
  both **empty** over `pipeline/`. No file exceeds 250 LOC (largest: `BoardWarps.kt` at 176);
  `FramePipeline.kt` is 151 (≤ 200) and `YuvToBgr.kt` 146 (≤ 150).

### 06b (tracking UI — board, moves, alarm card, promotion, preview, navigation), 2026-07-25

Files created (module `:app`): `MainActivity.kt` (87), `ui/ChesslabNavHost.kt` (42),
`ui/TrackerServiceBinding.kt` (88), `ui/theme/Color.kt` (42), `Theme.kt` (33), `Type.kt` (57),
`ui/tracking/StatusUiModel.kt` (135), `TrackerSession.kt` (99), `TrackingViewModel.kt` (123),
`TrackingScreen.kt` (148), `BoardCanvas.kt` (170), `MoveList.kt` (135), `AlarmCard.kt` (87),
`AcceptCnnDialog.kt` (147), `PromotionDialog.kt` (75), `PreviewOverlay.kt` (138) — **1606 LOC,
largest file 170**, versus the legacy `TrackingScreen.kt`'s 664 in ONE file. Tests
`StatusUiModelTest` (5), `TrackingViewModelTest` (5), `MoveListModelTest` (3),
`AcceptCnnDialogModelTest` (4) — **17 tests, 0 failures, 0 skipped**, JVM only, no Compose test
dependency. No file under `service/`, `camera/`, `pipeline/`, `cnn/`, `ui/calibration/`, no build
file, no manifest and no catalog entry was edited.

Nav routes registered (07a/08a extend them): `tracking` (start) and `calibration`, wired to 06a's
pinned `CalibrationRoute(onCalibrated, onBack)`; `ROUTE_SETTINGS` / `ROUTE_DEBUG` /
`ROUTE_ANALYSIS` / `ROUTE_GAMES` are declared as constants with `TODO(phase 07a/07c/08a)` markers
and **no** composable, so a later phase attaches to this host instead of inventing a second one.

#### Discrepancies

- **D06b-1 — ktlint 1.5.0 rejects EVERY `@Composable` function and there was no `.editorconfig`.**
  `standard:function-naming` reports "Function name should start with a lowercase letter" on
  PascalCase composables and marks it **not auto-correctable**, so `:app:ktlintCheck` was
  unpassable for any Compose file — 06a's five files failed identically. Fixed by adding
  `android/.editorconfig` with
  `ktlint_function_naming_ignore_when_annotated_with = Composable`. 06a landed the same file
  concurrently; the content converged. This is infrastructure neither phase owns — recorded here so
  the orchestrator knows why it appeared.
- **D06b-2 — two additive files beyond the phase file's list**, both inside this phase's packages
  and touched by nobody else:
  - `ui/tracking/TrackerSession.kt` — the seam the UI codes against (`StateFlow<TrackerStatus?>`,
    event `Flow`, `rawPreview`, five actions) plus `TrackerSessionHost` and `idleTrackerStatus()`.
    The phase file pins the *data*, not where it is declared; declaring it inside
    `TrackingViewModel.kt` would have pushed that file past its 180-LOC cap.
  - `ui/TrackerServiceBinding.kt` — `BindTrackerService()` (start-foreground + bind) and the
    `TrackerBinder -> TrackerSession` adapter. The composition root is the only place where 06c's
    binder and the UI are both visible, and `MainActivity.kt` has a 120-LOC cap.
- **D06b-3 — "Accept CNN position" cannot show a real per-square diff, and the dialog says so.**
  The phase file asks for a preview "computed by `:core-cnn`'s pure accept-CNN function via
  `TrackerEngine.acceptCnnPosition()`'s preview path". That path does not exist (**D04x-4**: the
  `List<TrackerEvent>` return type cannot express a would-be FEN plus a change list), and
  `TrackerStatus` carries **no CNN label map**, so from the status alone only the *believed* side of
  each conflicting square is knowable. Landed: `acceptCnnPreview(fen, conflicts, reads = emptyMap())`
  lists every conflicting square as `square: <believed piece> → ? `, sets `complete = false`, and
  the dialog then reads *"The CNN's own reading is not previewable here — the adopted position may
  differ from this list. Adopting drops the move history and cannot be undone."* The `reads`
  parameter is already the full `from → to (conf %)` form and is asserted by
  `previewListsEveryChangedSquareWithFromToAndConfidence`, so the day a status field (07b's
  `DebugPayload`) or a second engine entry point carries the CNN labels, one call site changes.
  **Cancel mutates nothing** — `cancelDispatchesNoAction` asserts the fake session recorded zero
  calls after open+cancel.
- **D06b-4 — `TrackerStatus` has no corners, so the overlay's board quad is currently undrawable.**
  The phase file says "Overlay draws the board quad from `status` corners"; the frozen seam has no
  such field (00a). `PreviewOverlay(corners: FloatArray? = null, sourceWidth, sourceHeight)` takes
  them as an optional `[a8,h8,h1,a1]` parameter (invariant 11) and draws nothing when they are
  absent — which is the state today, since no one can supply them. The three evidence sets ARE
  plumbed through and drawn once corners exist. Adding `corners` to `TrackerStatus` is a seam
  decision, recorded rather than improvised.
- **D06b-5 — 06c's `TrackerBinder.status` is `StateFlow<TrackerStatus?>`, not `StateFlow<TrackerStatus>`.**
  The phase file pins the non-null form. Adapting 06c's file is forbidden, so `TrackerSession.status`
  is nullable and the view model substitutes `idleTrackerStatus()` for the pre-first-sample `null`.
  No extra collector was introduced to hide it (that would have broken the one-collector rule).
- **D06b-6 — detekt `MatchingDeclarationName` shaped two placements** (no `@Suppress`, no baseline,
  no config change): `object Routes` in `ChesslabNavHost.kt` became top-level `ROUTE_*` constants,
  and `PromotionPrompt` + `promotionAfter` moved from `PromotionDialog.kt` into
  `StatusUiModel.kt` — which is where the other pure event/status folds live anyway. The dialog file
  keeps only the composable and its private choice list. Also detekt-shaped:
  `parseFenPlacement` split out a `parseRank` helper (NestedBlockDepth) and `quadPoint` reads the
  four corners by index instead of destructuring (DestructuringDeclarationWithTooManyEntries).
- **D06b-7 — two acceptance greps read differently than written.**
  `grep -rn "status.fen" ui/tracking/BoardCanvas.kt` does **not** hit: `BoardCanvas(fen: String, …)`
  takes the FEN as a parameter and `TrackingScreen` passes `ui.fen`, which is `status.fen` mapped by
  the pure model. The rule the grep protects — one board source — is asserted by
  `boardRendersOnlyFromStatusFen` (a commit whose `fenAfter` disagrees with the status does not move
  the board) and by the absence of any other placement parser in the package.
  `grep -c "collect" ui/tracking/TrackingViewModel.kt` is **3**: one `.collect(` call on the status
  flow and two occurrences of the word in the comments explaining why there is only one. The event
  and preview flows use `onEach { }.launchIn(…)`.
- **D06b-8 — the engine's state strings are `internal`.** `STATE_WAITING`/`MOVING`/`OCCLUDED`/`MOVE`
  live in `:core-engine`'s `EngineState.kt` and the module's public surface is `api/` only
  (entry.md hard rule 3), so `StatusUiModel.kt` re-declares the four literals. They are a string
  contract of `TrackerStatus.state`; promoting them into `engine.api` is a one-line seam change and
  would delete the duplication — same class of item as **D05b-1** (`motionScore`).
- **D06b-9 — nobody can build 06a's `CalibrationHost` from 06c's `TrackerBinder`, so
  `LocalCalibrationHost` is never provided.** 06a's route needs `latestCalibrationFrame()`,
  `rawPreview`, **`boardGeometry(): BoardGeometry`** and **`onProfileSaved(CalibrationProfile)`**;
  the binder implements `CalibrationFrames` (the first two) and offers
  `applyCalibration(geometry, corners, profileName)` instead of the last two. The composition root
  therefore provides no host and 06a's own "waiting for the tracker service" fallback renders. This
  is 06a<->06c glue that neither phase's file list covers — **orchestrator item**: either the binder
  gains `boardGeometry()` + a profile hook, or 06c provides the host. 06b deliberately did not
  invent the geometry mapping.
- **D06b-10 — test names are camelCase**, per the house style of every test in this pack (same as
  D05a-5): `state_text_and_colour_per_tracker_state` → `stateTextAndColourPerTrackerState`,
  `alarm_present_sets_board_tint_and_pins_the_state_line` →
  `alarmPresentSetsBoardTintAndPinsTheStateLine`, and so on for all named tests. One extra test,
  `previewIsIncompleteWithoutCnnReadsAndStillNamesTheBelievedPiece`, pins D06b-3.
- **Note — `:app:detekt` is not zero on the shared tree, and the one finding is not 06b's.**
  `service/TrackerCoordinator.kt:30` trips `LongParameterList` (8-parameter constructor). Every
  finding in `MainActivity.kt`, `ui/**` was fixed in code. `:app:ktlintCheck` and
  `:app:ktlintFormat` are BUILD SUCCESSFUL. `ktlintFormat` runs over the whole source set, so it
  will have reformatted 06a's and 06c's concurrently-added files too; both phases run the same
  formatter, so this is not a drive-by edit of content.
- **Note — the phase file's "camera preview is collapsible, off by default" is implemented as a
  text toggle** above the action bar, remembered per composition. `grep -rn "androidx.camera"` over
  `ui/` is empty and no `PreviewView` exists: the bitmap comes from the service's `rawPreview`.

#### Manual verification checklist — NOT executed

No device was attached in this session and the app has not been run, so all five items are **open
for phase 09 / the first live bring-up**:

- [ ] Readable at arm's length: state text (34sp, colour-coded) and board legible from ~1 m.
- [ ] Play 10 moves — move list and board track them; fps does not drop with the screen on.
- [ ] Trigger an alarm → board turns red, card appears, the Accept-CNN preview lists the
      conflicting squares (see D06b-3 for what it can and cannot show); Cancel changes nothing.
- [ ] Promote a pawn → dialog appears, back button does not dismiss it, choosing Q commits.
- [ ] Toggle the preview overlay → changed squares light up while a hand moves (the quad needs
      D06b-4 resolved first).

### 06a (calibration — ArUco auto, manual 4-tap, orientation confirmation, profile store), 2026-07-25

Files created — main, `com.chesslab.tracker.geometry`: `CalibrationProfile.kt` (123),
`CalibrationStore.kt` (123), `ArucoCalibrator.kt` (131); `com.chesslab.tracker.ui.calibration`:
`CalibrationHost.kt` (38), `CalibrationViewModel.kt` (172), `CalibrationRoute.kt` (139),
`CalibrationOverlay.kt` (207), `ManualCornerPicker.kt` (117), `OrientationConfirm.kt` (63) —
**1113 LOC, no file over 250**. Tests: `CalibrationProfileSerializationTest` (4),
`CalibrationStoreTest` (5), `CornerMappingTest` (4), `CalibrationViewModelTest` (5) — **18 tests,
0 failures, 0 skipped**. No build file, no catalog entry, no manifest, no file owned by 06b/06c
was touched.

**The route/seam 06b + 06c wire:** `CalibrationRoute(onCalibrated, onBack)` — the pinned 2-arg
signature, unchanged; 06b's `ChesslabNavHost` already calls it verbatim. Frames arrive through
`LocalCalibrationHost` (`CalibrationHost.kt`), provided once by whoever owns the service binding:

```kotlin
ProvideCalibrationHost(
    CalibrationHost(
        latestCalibrationFrame = binder::latestCalibrationFrame,
        rawPreview = binder.rawPreview,
        onCalibrated = binder::applyCalibration,      // (BoardGeometry, FloatArray, String) -> Unit
    ),
) { ChesslabNavHost() }
```

**No second camera binding, proven:**
`grep -rn "ProcessCameraProvider\|androidx.camera" app/src/main/kotlin/com/chesslab/tracker/ui/`
hits only two COMMENT lines in `CalibrationHost.kt` naming the bug — zero imports, zero types;
`grep -rn "ProcessCameraProvider.getInstance" app/src/main/kotlin/ | wc -l` is still **1**
(`camera/TrackerCamera.kt`, per D05a-1's reading of the criterion). The screen's only pixel
sources are `latestCalibrationFrame()` and `rawPreview` (4 hits under `ui/calibration/`).

#### Discrepancies

- **D06a-1 — Compose could not be linted at all: `android/.editorconfig` and one detekt rule had
  to be added (SHARED FILES — coordinate).** ktlint 1.5's `standard:function-naming` and detekt's
  `naming>FunctionNaming` both flag every PascalCase `@Composable`, and neither exempts
  `@Composable` by default in this project's setup. Two minimal additions, no `@Suppress`, no
  baseline, no rule disabled:
  - **new** `android/.editorconfig`: `ktlint_function_naming_ignore_when_annotated_with = Composable`
  - `android/config/detekt/detekt.yml`: a `naming: FunctionNaming: ignoreAnnotated: ['Composable']`
    block, in the same spirit as the Lean pass's recorded threshold changes.
  Both are shared infrastructure that 06b/06c/07*/08* need identically — verified: with them,
  `:app:ktlintCheck` is **green over the whole module including 06b's and 06c's files**. If another
  06 agent landed the same change, keep one copy.
- **D06a-2 — `CalibrationHost` is a class of lambdas, not an interface, and it replaced the phase
  file's `onProfileSaved(profile)` with 06c's `applyCalibration(geometry, corners, profileName)`.**
  06c landed `TrackerBinder.applyCalibration(BoardGeometry, FloatArray, String)` and a
  `CalibrationFrames` interface of its own; making 06c implement a 06a interface would have meant
  editing their file. A lambda holder is constructible from their binder in one expression, so
  **neither phase edits the other**. The phase file's `boardGeometry()` member is gone with it:
  the geometry to detect against comes from the persisted profile (`CalibrationStore.geometry`,
  `@Volatile`, defaulting to `margin = 0.06`) — the same value, and one fewer thing 06c supplies.
- **D06a-3 — `CalibrationStoreTest` uses an in-memory `ProfileBacking` fake, not an in-memory
  DataStore.** `androidx.datastore:datastore-preferences` is an Android artifact and its file
  backing is not reliably constructible on the unit-test JVM. `CalibrationStore` therefore takes a
  two-method `ProfileBacking` seam (`text: Flow<String?>`, `write(String)`); production is
  `DataStoreProfileBacking` over a DataStore of its OWN (`preferencesDataStore(name =
  "calibration")` — the safety-critical geometry does not share a write path with 06c's settings
  store). Everything the phase file asks the store test to prove is proven against the fake, and
  the carry-over rule itself is a **pure function** (`carryOver`) tested directly.
- **D06a-4 — the `<2 markers` failure and the `3 of 4` case are different outcomes.** The phase
  file's checklist reads "cover one marker -> explicit 'only 3 of 4 markers visible'". Python's
  `resolve_board_corners` reconstructs the quad from 3 (affine) and even 2 (similarity) markers, so
  failing at 3 would be a regression against the reference. `CalibrationResult` is therefore
  `ok = true` with a non-null `reason` ("only 3 of 4 markers visible — quad reconstructed") for
  2/3 markers, and `ok = false` with a reason for `<2` or a degenerate quad. Either way the count
  is on screen and stale corners are never presented as fresh.
- **D06a-5 — the confirmation warp is a `Bitmap` produced by `ArucoCalibrator.warp`, not by the
  screen.** `warpFromCorners` needs OpenCV and `ui/` must stay JVM-testable, so `BoardDetector`
  (the seam the view model owns) has two methods: `detect()` and `warp(corners, whitePov)`. The
  warp is `warpFromCorners(frame, geom.copy(whitePov = …), corners, 512)` converted BGR→RGBA→
  Bitmap. On top of it the screen draws a8/h1 and the file/rank gutters through
  `:core-geometry`'s `squareToColRow`, so the labels flip live with the `White plays from the
  bottom` switch.
- **D06a-6 — `CalibrationViewModel` is a plain class taking a `CoroutineScope`, not an
  `androidx.lifecycle.ViewModel`.** `viewModelScope` is `Dispatchers.Main.immediate` and would have
  forced `Dispatchers.setMain` plumbing into every test for no benefit; the route creates it with
  `rememberCoroutineScope()`. Same reason `CalibrationState` holds no Compose type.
- **D06a-7 — test names are camelCase** (house style, D05a-5). Mapping:
  `round_trips_all_fields_including_corner_order` → `roundTripsAllFieldsIncludingCornerOrder`,
  `rejects_an_unknown_schema_version_instead_of_migrating` →
  `rejectsAnUnknownSchemaVersionInsteadOfMigrating`,
  `rejects_a_corners_array_that_is_not_8_floats` → `rejectsACornersArrayThatIsNot8Floats`,
  `recalibration_carries_over_white_pov_board_size_margin_and_crop` →
  `recalibrationCarriesOverWhitePovBoardSizeMarginAndCrop`,
  `recalibration_replaces_corners_and_source_size` → `recalibrationReplacesCornersAndSourceSize`,
  `explicit_white_pov_change_on_confirm_wins_over_carry_over` →
  `explicitWhitePovChangeOnConfirmWinsOverCarryOver`,
  `tap_maps_to_source_pixels_using_the_rendered_bitmap_size` →
  `tapMapsToSourcePixelsUsingTheRenderedBitmapSize`,
  `four_taps_are_stored_in_tap_order_not_sorted` → `fourTapsAreStoredInTapOrderNotSorted`,
  `save_is_blocked_until_orientation_is_confirmed` → `saveIsBlockedUntilOrientationIsConfirmed`,
  `detection_failure_surfaces_a_reason_and_keeps_the_previous_profile_untouched` →
  `detectionFailureSurfacesAReasonAndKeepsThePreviousProfileUntouched`,
  `only_one_detection_runs_at_a_time` → `onlyOneDetectionRunsAtATime`,
  `frame_size_is_taken_from_the_detected_frame` → `frameSizeIsTakenFromTheDetectedFrame`.
  Six extra tests were added (absent-vs-discarded profile, first-calibration defaults, a discarded
  profile is not carried over, unmappable taps, incomplete tap sets, and
  `recalibrationDoesNotResetAHandSetWhitePov` end to end through the view model).
- **D06a-8 — one extra file beyond the phase file's list: `ui/calibration/CalibrationHost.kt`.**
  detekt's `MatchingDeclarationName` fires when a file's single top-level class-like declaration
  does not match its name, so the host could not live in `CalibrationRoute.kt`. The same rule moved
  `TapPoint` from `ManualCornerPicker.kt` into `CalibrationViewModel.kt`, where it is anyway part
  of the screen state. Both files are inside 06a's own packages.
- **Note (not a discrepancy) — the a8-transposition mitigation.** `toConfirm()` is the ONLY path to
  `CalibrationStep.CONFIRM` and it sets `orientationSeen`; `canSave` is
  `step == CONFIRM && orientationSeen && corners != null`, and `save()` returns early otherwise
  (`saveIsBlockedUntilOrientationIsConfirmed` asserts the store is untouched before and written
  after). Tapped corners are appended in tap order by `tapsToCorners` and **never sorted**
  (`fourTapsAreStoredInTapOrderNotSorted` taps a deliberately non-canonical order and asserts the
  array element by element).
- **Note — `sourceWidth`/`sourceHeight` come from the `Mat` that was detected on**, on the failure
  path too, because the manual 4-tap fallback maps its taps into exactly that size. There is no
  `forResolution`/rescale anywhere in `geometry/` (a7dab73); the only hit for that grep is the
  comment saying so.

#### Manual verification checklist — NOT executed

No device was attached in this session, so all seven items are **open for phase 09 / the first
live bring-up**:

- [ ] tracking → calibration → tracking repeatedly: the feed never freezes (the MEMORY second-
      binding bug). Statically defended: zero CameraX types under `ui/`, one `getInstance` in `:app`.
- [ ] auto-calibrate shows 4 marker ids, the quad, a8 highlighted, correct file/rank letters;
      `White plays from the bottom` flips them 180°.
- [ ] cover one marker → the explicit "only 3 of 4 markers visible" note, no stale corners.
- [ ] manual 4-tap on a marker-less board produces a correct warp.
- [ ] a8/h1 tapped swapped is obvious on the confirmation screen before save.
- [ ] `whitePov = false` survives a recalibration (unit-tested end to end; on-device unverified).
- [ ] "Recalibrate" leaves the move list intact; "Reset game" leaves the profile intact.

#### Gate (run in an isolated `git archive HEAD` copy first, then re-run LIVE)

Both runs green. Live `:app:detekt` reports exactly **one** finding and it is 06c's
(`service/TrackerCoordinator.kt:30 LongParameterList`, 8 constructor parameters) — nothing in
`geometry/` or `ui/calibration/`.

```
:app:testDebugUnitTest --tests "com.chesslab.tracker.geometry.*" --tests "com.chesslab.tracker.ui.calibration.*"
  BUILD SUCCESSFUL
  CalibrationProfileSerializationTest: tests=4 failures=0 errors=0 skipped=0
  CalibrationStoreTest:                tests=5 failures=0 errors=0 skipped=0
  CalibrationViewModelTest:            tests=5 failures=0 errors=0 skipped=0
  CornerMappingTest:                   tests=4 failures=0 errors=0 skipped=0
:app:ktlintFormat   BUILD SUCCESSFUL
:app:ktlintCheck    BUILD SUCCESSFUL   (live, whole module — 06b/06c included)
:app:detekt         BUILD SUCCESSFUL   (isolated copy: 0 findings)
```

### 06c (service — the single camera + engine owner, coordinator, settings persistence), 2026-07-25

Files created (module `:app`) — `AndroidManifest.xml` (rewritten, 8 permissions), `ChesslabApp.kt`
(33); `service/`: `EngineAction.kt` (32), `EngineHost.kt` (144), `TrackerCoordinator.kt` (119),
`StatusPublisher.kt` (111), `CameraFrameBus.kt` (140), `CnnCropAdapter.kt` (42),
`TrackerBinder.kt` (63), `TrackerNotification.kt` (45), `TrackerService.kt` (172); `settings/`:
`ConfigKnobs.kt` (109), `ConfigCodec.kt` (73), `SettingsRepository.kt` (71),
`SettingsDataStore.kt` (35). **1189 LOC across 14 files, largest 172** — against the legacy
`service/TrackerService.kt`'s **970 in one file**. Every file is under its phase-file cap.

Tests: `EngineActionQueueTest` (4), `StatusPublisherTest` (5), `NotePrecedenceTest` (3),
`ConfigCodecTest` (6), `SettingsRepositoryTest` (5) — **23 tests, 0 failures, 0 skipped**, JVM only.
No build file, no catalog entry, no `camera/`, `pipeline/`, `cnn/`, `ui/`, `geometry/` or `core-*`
file was touched. **No dependency was missing** (DataStore, kotlinx-serialization,
lifecycle-service and coroutines-test were all already in 00a's catalog).

#### Decomposition (what replaced the 970-LOC monolith)

| File | Owns |
|---|---|
| `TrackerService` | Android lifecycle, foreground notification, construction order, teardown |
| `TrackerCoordinator` | the analyzer-thread loop; `LiveAlign` (async ArUco) lives beside it |
| `EngineHost` | thread ownership + the two bounded queues; the ONLY file naming `TrackerEngine` |
| `StatusPublisher` | 10 Hz sampling, event fan-out, note precedence, stage-timing merge |
| `CameraFrameBus` | 06a's pixel seam + preview publishing behind an in-flight gate |
| `TrackerBinder` | the whole API the UI sees |
| `CnnCropAdapter` | 05b's `CropFrameStore` -> 05c's `CnnFrameSource`, on the observer thread |
| `settings/**` | knob catalog, JSON codec, DataStore, live-vs-restart classification |

#### The seam 06a/06b consume (all three already match what they landed)

```kotlin
interface CalibrationFrames {                       // TrackerBinder implements it
    fun latestCalibrationFrame(): Mat?              // a CLONE; the caller releases it
    val rawPreview: StateFlow<Bitmap?>              // ~5 fps, off the analyzer thread
    val cameraHealth: StateFlow<CameraHealth>
}
class TrackerBinder : Binder(), CalibrationFrames {
    val status: StateFlow<TrackerStatus?>           // sampled at 10 Hz — do not throttle again
    val events: SharedFlow<TrackerEvent>            // replay 0, 64-deep, DROP_OLDEST
    val config: StateFlow<TrackerConfig>
    val cnnState: StateFlow<CnnState>
    var deliveredSize: DeliveredSize?               // internal set
    fun submit(action: EngineAction)
    fun updateConfig(config: TrackerConfig): UpdateResult
    fun applyCalibration(geometry: BoardGeometry, corners: FloatArray, profileName: String)
}
```

#### Discrepancies

- **D06c-1 — three files beyond the phase file's list, all inside this phase's own packages.**
  `service/CnnCropAdapter.kt` (42): 05c's D05c-5 explicitly names the store->source adapter as 06c's
  job, and it is neither lifecycle (`TrackerService`, already at 172) nor loop (`TrackerCoordinator`).
  `settings/ConfigKnobs.kt` (109): the 46-row knob table plus `ConfigCodec`'s codec would be ~180
  lines in one file; the phase file's own rule is "if a file wants to grow past its cap, split it and
  record the split". `service/EngineAction.kt` is in the phase file's list; `LiveAlign` deliberately
  is **not** a separate file — it is the coordinator's own concern and both together are 119 lines.
- **D06c-2 — `TrackerConfig` is persisted through a KNOB TABLE, not a mirrored `@Serializable` DTO.**
  `TrackerConfig` lives in `:core-engine`, which has no kotlinx-serialization on its classpath
  (entry.md hard rule 1) and is frozen, so it cannot be annotated. A DTO would restate all 46 fields
  three times (property, `toConfig`, `fromConfig`) and drift silently. `KNOBS` is one row per field
  with a `get`/`set` pair, and it is simultaneously what the codec, the live-vs-restart diff and
  07a's settings UI read. Every value travels as a `Double`; `Int?` overrides travel as **NaN**
  (`allowSpecialFloatingPointValues = true`), which is why `ConfigCodec.same` treats NaN == NaN.
  `roundTripsEveryTrackerConfigField` mutates **every** knob off its default before the round trip,
  so a forgotten row cannot pass.
- **D06c-3 — the twelve live-tunable keys are declared as `LIVE_TUNABLE_KEYS`, in `app.py`'s order;
  `KNOBS` keeps `TrackerConfig`'s field order.** `Knob.live` is `key in LIVE_TUNABLE_KEYS`. The two
  orders necessarily differ, so `liveTunableTableContainsExactlyTheTwelveAppPyKnobs` compares the
  declaration as an ordered list and the derived knob subset as a set (both directions asserted).
- **D06c-4 — the `_apply_live_tuning` side effects are NOT implemented in the repository, by design
  and per the phase file's own "do not duplicate the pipeline's internal reset logic".** The chain is
  `SettingsRepository.update` -> `EngineAction.UpdateConfig` -> `EngineHost.tick` (engine thread) ->
  `TrackerEngineOps.apply`, which calls `TrackerEngine.updateConfig(cfg)` **and**
  `FramePipeline.onConfigChanged(cfg)` in the same action, so a frame can never observe half a
  config change. `motionMargin` -> `RoiMotion.prevRoi` and `diffClaheClip` -> CLAHE rebuild are 05b's
  (`CameraStages.onConfigChanged`); `overhang` -> `rebuildBoxes()` is the engine's. `SettingsRepositoryTest`
  therefore asserts that the changed config REACHES a pipeline stub, once — not that 05b's internals
  reset, which 05b already tests. `restartRequired` names every changed non-live knob.
- **D06c-5 — `StatusPublisher.status` is `StateFlow<TrackerStatus?>`** (06b recorded the mirror item
  as D06b-5). There is no `TrackerStatus` before the first frame, and manufacturing an all-zero one
  would be a fake reading the debug screen cannot distinguish from a real one.
- **D06c-6 — the preview drop test lives in `StatusPublisherTest` but exercises `InFlightGate`,
  which `CameraFrameBus` owns.** The conversion itself (`bgrToBitmap`) touches `android.graphics.Bitmap`
  and `org.opencv.android.Utils` and is not runnable on the desktop JVM; the decidable part is the
  gate, and the phase file pins the test's name and file. `previewConversionDropsWhenOneIsInFlight`
  asserts drop-not-queue in both directions.
- **D06c-7 — `StatusPublisher` takes the `StageTimings` instead of receiving a map per frame.**
  `TrackerCoordinator`'s constructor hit detekt's `LongParameterList` at exactly 8 (the Lean pass
  threshold), and the honest fix was to move the timing source to the object that publishes it
  rather than to invent a holder type — which is the class of thing the Lean pass deleted nine of.
  The coordinator is now 7 parameters. `publish(snapshot, events, pipelineNote)`.
- **D06c-8 — `TrackerEngine` is constructed by a top-level `engineHost(config, cnn, onConfigApplied)`
  factory in `EngineHost.kt`.** The acceptance criterion `grep -rn "TrackerEngine"` hits that file
  and no other, which needs the construction there too — and `attachCnn` belongs to construction
  anyway (D04x-3: without it `cnnRun` stays false and no candidate is ever queued for verification).
  Verified: the grep hits only `service/EngineHost.kt` in `:app`'s main sources.
- **D06c-9 — the camera frame bus runs its OWN `YuvToBgr`, i.e. one extra colour conversion at
  ~5 fps.** `CameraStages` keeps its converted `Mat` private (05b's file, not mine), and the
  `ImageProxy` is dead the moment the analyzer callback returns, so the calibration/preview copy has
  to be made on the analyzer thread. Throttled to 200 ms, it is ~1 frame in 6. Exposing the
  pipeline's frame would remove it — a 05b seam change, recorded rather than improvised.
- **D06c-10 — `publisher.lastFen` is an unsampled `@Volatile` beside the 10 Hz `status`.** The CNN
  observer captures the FEN when an observation starts as its discard-on-change guard; reading it off
  a 100 ms-sampled flow could hand it the position from BEFORE the move it is about to verify.
- **D06c-11 — the notification's move count is counted from the event bus**, because `TrackerStatus`
  carries no ply count. `MoveCommitted` counts 1, `SequenceCommitted` counts its `ucis.size`.
- **D06c-12 — `StatusPublisherTest` must use `runTest`'s `backgroundScope`.** `sample` + `stateIn`
  never complete by construction, and a hand-rolled `TestScope(testScheduler)` made
  `:app:testDebugUnitTest` **hang forever** (not fail) — two 10-minute runs before the cause was
  found. Recorded because every later phase testing a publisher-shaped flow will hit it.
- **D06c-13 — `Flow.sample` is `@FlowPreview` in coroutines 1.9**, so `StatusPublisher.status`
  carries `@OptIn(FlowPreview::class)`. That is an opt-in marker, not a `@Suppress`.
- **D06c-14 — the manifest declares `<uses-feature android:required="true">` for the camera** as the
  phase file specifies, which makes the app uninstallable on camera-less devices. Deliberate.

#### 06b's D06b-9 is closed on this side

`TrackerBinder` exposes all three members 06a's `CalibrationHost` needs
(`latestCalibrationFrame`, `rawPreview`, `applyCalibration(BoardGeometry, FloatArray, String)`) —
06a's D06a-2 dropped `boardGeometry()`/`onProfileSaved` in favour of exactly this shape. What is
still missing is the one `ProvideCalibrationHost(...)` call, and it belongs in **06b's**
`ui/TrackerServiceBinding.kt`, which this phase may not edit. **Orchestrator item, three lines.**

#### Manual verification checklist — NOT executed

No device was attached in this session, so all six items are **open for phase 09 / the first live
bring-up**:

- [ ] foreground + notification before the camera binds; no `ForegroundServiceStartNotAllowedException`.
- [ ] tab switch tracking <-> calibration <-> settings: the feed never freezes.
- [ ] rotate / background+foreground: the tracker keeps running, the game state survives.
- [ ] change `censusThr` live -> "tracker tuning updated live", effect next frame, survives restart.
- [ ] change `diffClaheClip` -> contrast visibly changes within a frame.
- [ ] `chesslabPerf` median >= 15 fps with the UI open.

#### Acceptance greps (verbatim)

```
wc -l service/*.kt settings/*.kt        -> 14 files, max 172, none over 250 (legacy: 970 in one)
grep -rn "ProcessCameraProvider" main/kotlin/  -> camera/TrackerCamera.kt, ui/calibration/CalibrationHost.kt (06a comment)
grep -rn "TrackerCamera(" main/kotlin/         -> service/TrackerService.kt only
grep -rn "TrackerEngine" main/kotlin/          -> service/EngineHost.kt only (+ 06b's ui/tracking/TrackerSession.kt KDoc)
grep -n "runBlocking|Thread.sleep|.await()" service/TrackerCoordinator.kt -> the KDoc line saying there are none
grep -rn "forResolution|rewarpFor" service/    -> empty
grep -c "uses-permission" AndroidManifest.xml  -> 8
grep -c "sample(" service/StatusPublisher.kt   -> 1
grep -rn "@Suppress" service/ settings/        -> empty
```

#### Gate (run in an isolated `git archive HEAD` copy first, then re-run LIVE)

Both green. The isolated copy was needed at the start (06b's `MainActivity.kt` referenced a
`ui.BindTrackerService` that did not exist yet); by the end of the session the shared tree compiled
and the LIVE run is the one quoted:

```
:app:testDebugUnitTest --tests "com.chesslab.tracker.service.*" --tests "com.chesslab.tracker.settings.*"
  BUILD SUCCESSFUL          23 testcases, 0 failures, 0 errors, 0 skipped
  EngineActionQueueTest 4 · StatusPublisherTest 5 · NotePrecedenceTest 3
  ConfigCodecTest 6 · SettingsRepositoryTest 5
:app:ktlintFormat   BUILD SUCCESSFUL   (isolated copy; only 06c files reformatted, copied back)
:app:ktlintCheck    BUILD SUCCESSFUL   (LIVE, whole module)
:app:detekt         BUILD SUCCESSFUL   (LIVE, whole module — 0 findings; 06a/06b's recorded
                                        `TrackerCoordinator LongParameterList` is fixed, see D06c-7)
```

### 07a (settings — every knob, Python defaults inline, live vs restart), 2026-07-25

Files created (module `:app`): `settings/AppSettings.kt` (68); `ui/settings/KnobUi.kt` (85),
`KnobCatalog.kt` (196), `KnobRow.kt` (114), `SettingsScreen.kt` (209), `AppSettingsSection.kt` (157),
`SettingsViewModel.kt` (82), `SettingsExport.kt` (54) — **965 LOC over 8 files, largest 209**.
Extended: `settings/SettingsRepository.kt` (71 -> 118), `settings/SettingsDataStore.kt` (slot-keyed),
`ui/ChesslabNavHost.kt` (settings + debug routes + the settings entry point).
Tests: `ui/settings/KnobCatalogTest` (11), `SettingsViewModelTest` (6), `SettingsExportTest` (3),
`settings/SettingsRepositoryTest` (5 -> 7) — **33 tests with `ConfigCodecTest`, 0 failures, JVM only**.
No build file, no catalog entry, no `core-*`, `service/`, `ui/debug/`, `ui/tracking/` or `analysis/`
file was touched. No dependency was missing.

**Coverage: 46 catalog rows for 46 `TrackerConfig` fields** (asserted by reflection in both
directions), of which exactly the **twelve** `app.py::_live_tuning_kwargs` knobs are live —
`motionThr`, `zThr`, `censusThr`, `censusZWeight`, `occlCensusThr`, `occlusionColorThr`,
`minGridLineCoverage`, `motionMargin`, `overhang`, `motionHoldS`, `diffClaheClip`, `commitLlFloor`.

#### Discrepancies

- **D07a-1 — the `TrackerService` API the phase file codes against does not exist, and
  `restartTracker()` is the one that matters. OPEN BLOCKER.** 06c landed `TrackerBinder.updateConfig`
  + `SettingsRepository`, not `applyConfig` / `restartTracker` / `configInUse`. Config edits work
  (same chain 06c tests), but **nothing in `:app` can rebuild the engine and pipeline**, so the 34
  restart-only knobs take effect on the next app start. Not improvised: a restart is construction
  order (`TrackerService.wire()`), and faking it from the UI would leave two engines or two camera
  owners. The screen says so instead — `SettingsRoute(onRestartTracker = null)` renders *"Saved,
  waiting for a tracker restart: … — close and reopen the app to apply"* rather than an Apply button
  that does nothing. **Wiring is one line** once 06c's file gains the method:
  `SettingsRoute(..., onRestartTracker = binder::restartTracker)`.
- **D07a-2 — the composition root had no path to the repository.** `BindTrackerService` publishes a
  `TrackerSession` and a `CalibrationHost` and nothing else, and both `ui/TrackerServiceBinding.kt`
  and `service/TrackerBinder.kt` are outside this phase's ownership. Added `SettingsHost` (in
  `SettingsRepository.kt`), the exact mechanism 06b uses for `TrackerSessionHost`; the repository
  publishes itself at the end of `load()`, i.e. once it holds the persisted truth. A second
  repository over the same DataStore was the alternative and would be a second source of truth the
  engine never hears from.
- **D07a-3 — `ConfigStore` is now slot-keyed** (`read(slot)` / `write(slot, text)`, constants
  `SLOT_CONFIG` / `SLOT_APP`): the app-level settings must not be mixed into the `TrackerConfig`
  envelope, which is the parity seam. `settings/AppSettings.kt` is a new file in 06c's package
  (`ResolutionMode`, `BoardOrientation`, `EpRequest`, `AppSettings` + codec) — same class of
  in-package addition as D06c-1.
- **D07a-4 — `resetGroup` / `resetAll` live on the VIEW MODEL, not on `SettingsRepository`.**
  `KnobGroup` is screen metadata; putting it on the repository would drag the UI's grouping into the
  persistence layer, and both actions are an ordinary `update(...)` with the live/restart rules
  already applied. 06c's `resetToDefaults()` stays where it is and is what `resetAll` calls.
- **D07a-5 — there is ONE knob type, not two.** The phase file sketches `Knob(id, group, kind,
  pythonDefault: String, live, help, get, set)`; 06c already landed `Knob(key, kind, get, set)` with
  `live` derived from `LIVE_TUNABLE_KEYS`, and that is what the codec and the change diff read.
  `KnobUi` wraps it with `group`/`min`/`max`/`step`/`help`. `pythonDefault` is **not a string**: it is
  read back off `TrackerConfig()` through the knob's own getter, so the number beside the value cannot
  drift from the number the engine falls back to (`catalogDefaultsEqualTrackerConfigDefaults` becomes
  true by construction and is still asserted).
- **D07a-6 — the phase file's group lists cover 43 of the 46 fields.** The three D00b-17 overrides
  (`settleFramesOverride`, `avgFramesOverride`, `confirmFramesOverride`) postdate it. They sit in
  EVIDENCE, rendered as counts with an **`auto`** position one step below the range (`auto` = `null`
  = Python's CNN-conditional fallback), which is a real setting and not a value.
- **D07a-7 — the completeness test reflects over Java `declaredFields`, not `memberProperties`.**
  kotlin-reflect is not on `:app`'s classpath (00a owns the catalog), and a backing field is exactly
  what a settable knob has: the derived `detSize` has none and `settleFrames(cnnOn)` is a function,
  so both drop out without a filter that could also hide a real field. Both directions are asserted,
  so neither a new knob nor a deleted one can pass unnoticed.
- **D07a-8 — a restart-only edit IS forwarded to the engine, contrary to the phase file's "does not
  call applyConfig".** 06c's chain (D06c-4) is one `EngineAction.UpdateConfig` handing the whole
  config to `TrackerEngine.updateConfig` and `FramePipeline.onConfigChanged` in one tick; withholding
  a field would create a second, partial config path and two ideas of the truth. The knob is
  persisted, forwarded, and reported in `restartRequired` — nothing is silent, which is what the rule
  exists for.
- **D07a-9 — there was no way to REACH the settings screen.** `TrackingScreen.kt` belongs to 07c this
  phase, so the entry point is a slim top row in the nav host's tracking destination. If a later
  phase gives the tracking screen its own overflow action, that row should go.
- **D07a-10 — `advanceUntilIdle()` does NOT run `backgroundScope` work.** The mirror image of
  D06c-12: with the repository's persist launched into `backgroundScope`, six tests failed because
  `advanceUntilIdle` stops as soon as the FOREGROUND work is idle — the write never ran and every
  reload assertion read defaults. `SettingsRepository` has no never-completing flow (`debugEnabled`
  is a plain `MutableStateFlow` kept in step by hand, deliberately not `map(...).stateIn(scope)`), so
  the right scope here is the `TestScope` itself.
- **D07a-11 — the four app-level settings are PERSISTED but not yet CONSUMED.** `resolutionMode`
  (05a hardcodes `CameraRequest(1920, 1080)`), `epRequest` (05c's `epChain` is automatic),
  `modelAsset` (05c stages both graphs and picks by EP) and `orientation` (06a's profile carries
  `whitePov`) each belong to a file this phase may not touch. They are stored, exported and marked
  restart-required; wiring them is one line each, for the orchestrator.
- **D07a-12 — 07b's entry point is `DebugRoute(onBack: () -> Unit)`** (`ui/debug/DebugScreen.kt`),
  wired under `ROUTE_DEBUG` and reachable only from the settings screen's Debug row, which also owns
  the `debugEnabled` switch. `TrackerService.setDebugEnabled` does not exist; per its own phase file
  07b reads `SettingsRepository.debugEnabled` instead.
- **Acceptance greps that do not apply as written** (all a consequence of D07a-5): rows are `row(` /
  `flag(` / `count(`, not `Knob(`; `live = true` appears nowhere, because `live` is derived from
  `LIVE_TUNABLE_KEYS` (asserted set-equal to the twelve, and `KNOB_CATALOG.count { it.live } == 12`);
  `resetMotionRoi` / `rebuildClahe` appear in neither the view model nor the repository, because
  D06c-4 routes both through `FramePipeline.onConfigChanged` — reimplementing them here is what the
  phase file's own "do not duplicate the pipeline's reset logic" forbids. The no-numeric-literals
  grep holds: `SettingsScreen.kt` carries no threshold literal, only dp.

#### Manual verification checklist — NOT executed (no device in this session)

- [ ] Settings opens from the tracking screen and the feed does not freeze on the way back.
- [ ] Change `censusThr` -> "tracker tuning updated live", effect visible within a frame.
- [ ] Change `detectScale` -> amber chip + the restart bar naming it; the value survives a restart.
- [ ] Reset group / Reset all put the numbers back and clear every modified dot.
- [ ] Export settings as JSON offers a share sheet and `nonDefault` holds exactly the edits.
- [ ] Debug switch off -> 07b's payload is not assembled while the screen is closed.

#### Gate (isolated copy, then LIVE)

`ui/debug/**` and `analysis/**` were mid-flight in the shared tree (they did not compile), so the
gate first ran in a `git archive HEAD` copy plus this phase's files — the only edit there is a
placeholder `Text` in the `ROUTE_DEBUG` body, since 07b's `DebugRoute` is not in HEAD. Re-run LIVE
once the shared tree compiled again:

```
ISOLATED :app:testDebugUnitTest --tests "com.chesslab.tracker.ui.settings.*"
                               --tests "com.chesslab.tracker.settings.*"
  BUILD SUCCESSFUL   33 tests, 0 failures, 0 skipped
  KnobCatalogTest 11 | SettingsViewModelTest 6 | SettingsExportTest 3
  SettingsRepositoryTest 7 | ConfigCodecTest 6 (06c's, still green)
ISOLATED :app:ktlintFormat            BUILD SUCCESSFUL  (reformatted only KnobCatalog.kt, copied back)
ISOLATED :app:ktlintCheck :app:detekt BUILD SUCCESSFUL  (0 findings)
LIVE     :app:testDebugUnitTest --tests "...ui.settings.*" --tests "...settings.*"  BUILD SUCCESSFUL
LIVE     :app:ktlintCheck             BUILD SUCCESSFUL  (whole module)
LIVE     :app:detekt                  FAILED - 11 findings, ALL in 07b's ui/debug/CropGridPanel.kt
                                      and 07c's analysis/** + ui/analysis/**; ZERO in 07a files.
```

### 07c (Stockfish — native build, persistent polling analyzer, eval bar), 2026-07-25

Files created (module `:app`): `analysis/WinChance.kt` (15), `UciLines.kt` (70), `UciEngine.kt` (110),
`StockfishAnalyzer.kt` (219), `AnalysisGate.kt` (80), `MoveQuality.kt` (4), `Accuracy.kt` (40);
`ui/analysis/AnalysisHost.kt` (157), `EvalBar.kt` (127), `AnalysisPanel.kt` (76),
`AnalysisSettingsSheet.kt` (87) — **985 LOC over 11 files, largest 219**. Tests:
`analysis/ScriptedEngineProcess.kt` (100), `WinChanceTest` (2), `UciEngineTest` (5),
`StockfishAnalyzerTest` (8), `AnalysisGateTest` (7), `AccuracyTest` (4),
`ui/analysis/EvalBarLabelTest` (5) — **31 tests, 0 failures, JVM only**.
Extended: `app/build.gradle.kts` (`externalNativeBuild`, 4 lines of comment + 6 of block) and
`ui/tracking/TrackingScreen.kt` (148 -> 155: `EvalBarSlot()` + the `Row` that puts it beside the
board; nothing else changed). `app/src/main/cpp/CMakeLists.txt` was moved forward by 00a and is
**byte-unchanged** — no dependency, no catalog entry, no `core-*` / `service/` / `ui/settings/` /
`ui/debug/` file was touched.

#### The native build DOES work (measured)

`:app:externalNativeBuildDebug` **42 s cold** for both ABIs (arm64-v8a + x86_64, ninja, NNUE nets
downloaded and SHA-256-prefix verified at configure time). `:app:assembleDebug` **57 s** on top.
`extractNativeLibs="true"` in the merged manifest and `lib/<abi>/libstockfish.so` is **deflated** in
the APK — which is exactly what `useLegacyPackaging = true` must produce: compressed in the APK,
*extracted by the installer* into `nativeLibraryDir`, the one place API 29+ allows `exec`. An
uncompressed entry would mean the modern packaging mode, i.e. nothing on disk to execute.

#### Thread & priority contract (as built)

1. `analysisDispatcher()` — a single daemon thread named **`chesslab-analysis`**, distinct from the
   camera analyzer (`chesslab-analyzer`, 05a), the CNN observer (`chesslab-cnn`, 05c) and the engine
   thread (06c). Asserted by `analysisRunsOnItsOwnDispatcher`.
2. The loop's **first statement** is `lowerPriority()` = `Process.setThreadPriority(THREAD_PRIORITY_LOWEST)`,
   injectable so the test can record the thread without the Android stub.
3. `Threads = 2`, `Hash = 64` — Python's values and the ceiling; `availableProcessors` appears
   nowhere under `analysis/`. `go movetime <cap>` only: no `go infinite`, no ponder, no depth limit.
4. `gateBlock` suspends (stops the engine outright, keeps the last result greyed) on: setting off
   (**default**), `< 3 s` of stable tracking, rolling-median `stageTimingsMs["total"] > 66 ms`
   (= below 15 fps), `thermalStatus >= 2`, power-save mode, or `< 20 %` battery while discharging.
   **The frame budget is checked BEFORE the user's "pause on pressure" switch** — that switch may
   waive thermal/battery, never the tracker's 15 fps.

#### Move-quality thresholds (cp loss, exclusive upper bounds)

`BOOK` (still in book) | `< 10` **BEST** | `< 50` GOOD | `< 100` INACCURACY | `< 250` MISTAKE |
`>= 250` BLUNDER. Negative loss grades BEST. `cpLoss(beforeWhitePov, afterWhitePov, whiteMoved)`
does the White-POV -> mover-POV flip, so `classify` never has to know the side.

#### Discrepancies

- **D07c-1 — `TrackerService.uiState` / `isTracking` do not exist; the equivalent seam does, so this
  is not a blocker.** The phase file says to code against `uiState: StateFlow<UiState>` (`.fen`,
  `.moves`) and `isTracking: StateFlow<Boolean>`. 06b/06c landed `TrackerSessionHost.session ->
  TrackerSession.status: StateFlow<TrackerStatus?>`, which carries `.fen`, `.fps` **and**
  `.stageTimingsMs` — the last of which the phase file's own fps gate needs and `UiState` would not
  have had. `EvalBarSlot` reads that flow directly and `fenProvider` is
  `TrackerSessionHost.session.value?.status?.value?.fen`. "Tracking" is `status != null`, timed for
  the 3 s warm-up rule. Nothing in `service/` was touched.
- **D07c-2 — two files beyond the phase file's table, both inside `analysis/**` / `ui/analysis/**`.**
  `analysis/UciLines.kt` (pure `info`/`bestmove` parsing + the White-POV flip) exists because
  `UciEngine.kt` would otherwise be ~180 LOC of two unrelated concerns, and the sign flip deserves to
  be testable without a process. `ui/analysis/AnalysisHost.kt` exists because `TrackerService` is
  owned by nobody this phase: the analyzer's lifecycle, the `PowerProbe` and the gate evaluation had
  to live somewhere the tracking screen can `remember`, and putting them in a composable file would
  make them untestable. Neither adds a seam outside 07c's scope.
- **D07c-3 — the eval bar cannot be "absent entirely" when the setting is off.** The phase file makes
  the long-press on the bar the *only* entry to `AnalysisSettingsSheet` (it deliberately does not
  live in 07a's settings screen) **and** says the bar disappears when the setting is off — together
  that makes the feature unreachable after the first toggle-off. Resolved by rendering a **6 dp inert
  hairline** instead of the 18 dp bar while off (tap or long-press opens the sheet). `Unavailable`
  still renders **nothing at all**, exactly as specified.
- **D07c-4 — the "sheet"s are `AlertDialog`s.** `ModalBottomSheet` is still
  `@ExperimentalMaterial3Api`, and the pack forbids `@Suppress`-style escapes; `combinedClickable` is
  likewise experimental, so the gesture is `pointerInput { detectTapGestures(onTap, onLongPress) }`.
  Names kept (`AnalysisSettingsSheet`) so the phase file's file list still matches.
- **D07c-5 — `AnalysisOptions` is a `() -> AnalysisOptions` on the analyzer, not a value.** Python
  fixes them at construction; on the phone they are user-tunable, and `movetime`/`MultiPV` must apply
  on the next tick. `threads`/`hash` are read only when the process launches, so `AnalysisHost.update`
  stops the analyzer when any option changed and the gate restarts it — a relaunch, never a live
  `setoption` on a running search.
- **D07c-6 — `BufferedWriter.newLine()` is wrong for UCI.** It writes the platform separator, i.e.
  CRLF from a desktop JVM, and the fake engine then sees `"uci\r"`. `UciEngine` writes an explicit
  `"\n"`. On Android the two coincide, which is exactly why this would never have shown up on device.
- **D07c-7 — detekt shaped three implementations** (no `@Suppress`, no baseline, no config change):
  `parseUciInfo` was a token-walking `while`/`when` at complexity 15 / 4 returns and is now
  `intAfter` + `scoreOf` index lookups; `UciEngine.readLine`'s three `throw`s became a
  `private fun fail(): Nothing`; `50.0` (`WinChance`), `100` (battery fallback) and `100.0`
  (`CP_PER_PAWN`, now shared by the bar and the panel) became named constants. Values unchanged.
- **D07c-8 — the debug APK is 321 MB.** `libstockfish.so` is ~114 MB *per ABI* after symbol
  stripping, because both NNUE nets are embedded via incbin; the ONNX QNN AAR adds ~120 MB more.
  Nothing here is wrong — it is the recipe the phase file froze — but a release build will need an
  ABI split or a per-ABI APK, and 09 should record the on-device install size.
- **D07c-9 — what the host JVM CANNOT test.** The real Stockfish binary does not run on the desktop
  JVM, so every UCI test drives `ScriptedEngineProcess`. Untested until a device run:
  (a) that the built binary is exec'able from `nativeLibraryDir` at all (the whole point of
  `useLegacyPackaging`), (b) that Stockfish accepts `setoption name Threads/Hash/MultiPV` in this
  order before `position`, (c) real `info` line shapes (`lowerbound`/`upperbound`, `multipv`
  ordering under time pressure), (d) that `THREAD_PRIORITY_LOWEST` actually keeps the CNN observer's
  latency intact under a 400 ms search, and (e) the thermal/battery probes, which return stub values
  on the JVM. `AnalysisHost` itself has **no** test for that reason — its Android half is
  `PowerManager`/`BatteryManager`; only the pure `gateBlock` / `RollingMedian` it delegates to are
  covered. **Phase 09 must run one live game with analysis ON and watch the fps.**

#### Gate (verbatim)

07a/07b were mid-flight and `:app:compileDebugKotlin` was RED on their files
(`ui/debug/DebugViewModel.kt:106:74 Unresolved reference 'cropTiles'`), so the gate ran in an
**isolated `git worktree` at HEAD (1450476) carrying only 07c's files** — real submodule, real NNUE
download, real NDK compile, real packaging:

```
:app:testDebugUnitTest --tests "...analysis.*" --tests "...ui.analysis.*"
                                    BUILD SUCCESSFUL   31 tests, 0 skipped, 0 failures
:app:ktlintFormat                   BUILD SUCCESSFUL   (5 files reformatted, copied back; no
                                                        file outside 07c's ownership touched)
:app:ktlintCheck                    BUILD SUCCESSFUL
:app:detekt                         BUILD SUCCESSFUL   (0 findings)
:app:externalNativeBuildDebug       BUILD SUCCESSFUL   42 s, both ABIs
:app:assembleDebug                  BUILD SUCCESSFUL   57 s
```

**The orchestrator must re-run `:app:assembleDebug` in the live tree** once 07a/07b compile — 07c's
half is proven, the merge of all three is not.

### 07b (debug menu — timings, evidence heatmap, 64-crop grid, CNN reads, decision log), 2026-07-25

Files created — `:core-engine`: `api/DebugPayload.kt` (91), `DecisionLog.kt` (178);
`:app` `service/`: `DebugPayloadAssembler.kt` (110), `DebugProbes.kt` (87);
`:app` `ui/debug/`: `DebugSession.kt` (70), `DebugSessionBinding.kt` (38), `DebugViewModel.kt` (120),
`DebugScreen.kt` (114), `TimingsPanel.kt` (115), `EvidenceModel.kt` (75), `EvidencePanel.kt` (161),
`CropGridPanel.kt` (168), `CnnReadsModel.kt` (64), `CnnReadsPanel.kt` (98), `CnnStatePanel.kt` (99),
`DecisionLogExport.kt` (83), `DecisionLogPanel.kt` (102) — **17 files, 1774 LOC, no file over 250**.
Tests `DecisionLogTest` (9, `:core-engine`) and `DebugStateTest` (12, `:app`) — **21 tests, 0
failures**, JVM only, no Compose test dependency. **`:core-engine:test` is fully green including
`ClipReplayParityTest` — 18/18 clips, zero diverging frames**, so the engine edits below are
behaviourally inert, as intended.

**Route for 07a:** `DebugRoute(onBack: () -> Unit)` in `ui/debug/DebugScreen.kt`, under `ROUTE_DEBUG`
— 07a already wired exactly this (its D07a-12). It picks the session up from `DebugSessionHost`.

#### The final `DebugPayload` shape

```kotlin
data class DebugPayload(
    val decisions: List<DebugDecision>,   // newest last, ring-capped at 64, rejections included
    val cnnReads: List<DebugCnnRead>,     // 64 rows of the last glance, or empty
    val tainted: Set<String>,             // D03d-9's missing set
    val cnnSeq: Long, val cnnAgeMs: Long, val cnnInferMs: Double,
    val gridCoverage: Double, val motion: Double,
    val maxChanged: Int, val zThr: Double, val cnnConfThr: Double,
    val minConfidentBoard: Int, val minConfidentRecovery: Int,
)
data class DebugDecision(...)  // _record_decision + stuckReason / verifyOutcome / accepted
data class DebugCnnRead(square, label, conf, pOccluded, occupied, confident, believed)
```

#### Discrepancies

- **D07b-1 — the seam extension, declared.** `api/TrackerStatus.kt` keeps its single
  `val debug: DebugPayload? = null` (00a had already landed the field); the **empty marker type moved
  out of that file into the new `api/DebugPayload.kt`**, which is the file 07b's own list names.
  Same package, no import changed anywhere. This is the one sanctioned `api/` change of the phase.
- **D07b-2 — `TrackerEngine` gained `setDebugEnabled(on: Boolean)` and `toStatus` a
  `debugEnabled` parameter.** Without it `TrackerStatus.debug` could only be filled from `:app`, and
  `:app` cannot see `EngineState` — the decisions, the taint mask and the CNN observation all live in
  the engine. `TrackerEngine` is now at **13 public functions** (lean-pass limit 15). `status()`'s
  signature is unchanged; `toStatus(debugEnabled = false)` defaults so every existing caller compiles.
- **D07b-3 — `EngineState.kt` (03a's file) was edited twice, both inert.** `decisionLog` is now a
  `DecisionLog()` instead of `mutableListOf()` — a `MutableList` subclass that drops the oldest row at
  64, so every existing call site (`add`, `clear`, `removeAt`, `last`) is untouched — and
  `DecisionRecord` gained three **defaulted** fields (`stuckReason`, `verifyOutcome`,
  `accepted = true`). Defaults mean no construction site changed shape. `Commit.kt::recordDecision`
  passes the first two explicitly, because reading them off the state at render time would show every
  historic row the newest values (the commit clears both immediately after).
- **D07b-4 — rejected candidates ARE logged, from `commitGates`, with a dedupe.** Python logs commits
  only. Rungs 6b (absolute LL floor) and 7 (motion gate) now append a row with `accepted = false`;
  the confirmer rung deliberately does not, because it fires per frame while a candidate accumulates
  and is not a rejection. Both hard rungs also re-fire every stable frame while the same weak
  candidate sits there, so `recordRejection` folds an identical consecutive rejection into the row
  already at the tail (`anIdenticalRepeatedRejectionDoesNotEvictTheRing`: 200 calls → 1 row).
  Without that fold one static phantom would evict the whole 64-row ring in about a second.
- **D07b-5 — there is no `TrackerService.setDebugEnabled` seam and no `latestObservation` on 05c;**
  both are inventions of the phase file. What landed instead:
  - `EngineAction.SetDebugEnabled(on)` (+ one branch in `TrackerEngineOps.apply`) — the flag is read
    on the engine thread while it publishes, so a UI thread writing it directly is precisely the race
    `EngineHost` exists to prevent;
  - `service/DebugProbes.kt`'s **`DebugCropTap`**, a `CnnFrameSource` decorator around 06c's
    `cropFrameSource`. It sees exactly the list `classify` is about to consume and runs on the
    OBSERVER thread. Disabled, its whole cost is one volatile read per observation (~1/s) and it
    retains nothing;
  - `CnnRuntimeProbe`, filled once at attach.
  `TrackerService.kt` gained ~25 lines for the three (probe fields, `openClassifier`,
  `setDebugEnabled`, the `DebugSessionHost.publish`/unpublish pair). `EngineAction.kt`,
  `EngineHost.kt` and `TrackerService.kt` are 06c files, all COMPLETE and committed — recorded here
  rather than blocked on, per the orchestrator instruction.
- **D07b-6 — `OnnxSquareClassifier` gained one line: `val inputShape: String`.** The panel has to
  show the tensor the graph is actually fed and `ModelSpec` is private to the class. `lastRunMs`
  (D05c-4) is read through `CnnRuntimeProbe.lastRunMs` as a function reference, so the "session only"
  number is the one on the CNN-state panel while `cnnInferMs` in the payload stays
  preprocess + inference.
- **D07b-7 — the crop grid does NOT decode on the analyzer thread, and it does not decode at all
  unless its own tab is open.** `DebugViewModel.pollCrops` runs at 2 Hz, skips work when the seq has
  not changed, and converts on `Dispatchers.Default`. The tiles are dropped when the tab changes.
- **D07b-8 — the cost gate is the ViewModel's lifecycle, not a setting.** `attach` arms,
  `onCleared` disarms — unless 07a's persisted `SettingsRepository.debugEnabled` is on, which is the
  "pin". The service also arms (never disarms) when that switch flips, so turning it on outside the
  screen works. **Measured/argued cost when disabled:** `TrackerStatus.debug` is `null`, so
  `debugPayload()` is not called at all (no 64-square walks, no decision copy, no allocation) —
  `debugPayloadIsNullWhenDisabled` runs 1000 frames and
  `assemblerAllocatesNothingWhenDisabled` asserts 1000 `assemble` calls produce zero `DebugState`.
  The only always-on additions are the `DecisionLog` ring (bounded, appended at most once per
  committed or rejected move, never per frame), one volatile read per CNN observation, and a
  `stuckReason`/`voteOutcome` read at commit time. Nothing per frame.
- **D07b-9 — `CnnObservation` exposes no separate `p_occ` / `p_empty`**, so the reads panel shows
  `label`, `conf`, `pOccluded` and the seam's own `occupied` (`pOcc > pEmpty`) verdict. Adding the
  two probabilities would be a seam change for a number the model already collapses.
- **D07b-10 — 06b's accept-CNN dialog now gets its `reads` map (D06b-3 closed as far as the status
  can close it).** One call site in `ui/tracking/TrackingViewModel.kt`: `status.debug?.cnnReads`
  becomes `Map<String, CnnRead>`, so whenever the payload is armed the dialog renders the real
  `from → to (conf %)` instead of `→ ?` and `complete` is true. With the payload off it falls back to
  exactly the old behaviour. 06b's `AcceptCnnDialog.kt` was NOT touched and its four tests still pass.
- **D07b-11 — the export is `EXTRA_TEXT`, not a `FileProvider` cache file.** A provider needs a
  `<provider>` entry in `AndroidManifest.xml`, which is 06c's file and closed to everyone. 64
  tab-separated rows plus the config header are a few kB — comfortably inside an intent extra, and no
  storage permission either way. The header carries the app version, the model + requested/actual EP,
  and every `KNOBS` row (`decisionExportContainsConfigHeader` asserts all three).
- **D07b-12 — no `DebugPayloadAssembler` grep for `debugEnabled` as an identifier.** The gate is
  `status?.debug ?: return null`; the acceptance grep's intent (the gate is visible in this file) is
  met by the KDoc naming `debugEnabled` / `setDebugEnabled` and by the two tests above. Also, the
  decision-log ring lives in `:core-engine`, so the `Bitmap|createBitmap` grep over
  `core-engine/src/main/kotlin/com/chesslab/engine/` returns **nothing**, as specified, and
  `decisionCarriesNoBitmaps` pins it by reflection over `DebugDecision`'s declared fields.

#### Manual verification checklist — NOT executed (no device in this session)

- [ ] Open Settings → Debug: the six tabs render and the timings table fills within a second.
- [ ] `total` under 66 ms and fps ≥ 15 **with the debug screen open** — then close it and confirm
      the `chesslabPerf` logcat median is unchanged (this is the cost gate's live proof).
- [ ] Wave a hand over the board: changed / shadow-vetoed / occlusion-vetoed squares light up in
      three distinct channels, and an occlusion cell reads `0.0` while a shadow cell keeps its z.
- [ ] Flip the evidence channel to census on a dark-on-dark move and confirm it is visible there.
- [ ] Crops tab: 64 tiles, `a1` top-left, `h8` bottom-right; hold the same position in Python and
      compare against `GET /crops.jpg` — **this is phase 09 step 5**.
- [ ] Tap a tile → the enlarged crop and that square's read appear.
- [ ] CNN state tab: the EP line shows `QNN-HTP(NPU)` alone on a Snapdragon with the quantized graph
      staged, and `QNN … (requested) → NNAPI/CPU (actual)` in amber otherwise.
- [ ] Rename `assets/cnn_model/model.onnx` → attach FAILS → the red banner is on every tab and
      cannot be dismissed; "Retry attach" works after restoring it.
- [ ] Play five moves, then export the decision log and check one row per commit plus the config
      block. Provoke a weak candidate and confirm a single `rejected` row, not a flood.



- ~~**OPEN (07a, D07a-1) — nothing can restart the tracker**~~ — **RESOLVED**, see the
  "Restart + app-settings wiring" section below (D07x-1..7).
- ~~**OPEN (07a, D07a-11) — `resolutionMode` / `orientation` / `modelAsset` / `epRequest` are stored
  and exported but nothing reads them yet**~~ — **RESOLVED**, same section (D07x-4..6). They were
  not "one line each": the camera one needed a retarget path that keeps the single owner, and the
  model/EP ones needed `Ep` to stop hardcoding its graph.
- **OPEN (06b/06c, D06b-9) — the `CalibrationHost` is CONSTRUCTIBLE but nobody provides it.**
  06c's `TrackerBinder` has all three members 06a's final host needs (`latestCalibrationFrame`,
  `rawPreview`, `applyCalibration(BoardGeometry, FloatArray, String)` — see 06a's D06a-2, which
  dropped `boardGeometry()`/`onProfileSaved`). The missing piece is one `ProvideCalibrationHost(...)`
  call in 06b's `ui/TrackerServiceBinding.kt`; neither 06a nor 06c may edit that file. **Three-line
  orchestrator item.** The stale wording below is 06b's original reading:
- ~~**OPEN (06b, D06b-9) — no one can provide 06a's `CalibrationHost`.** The binder has
  `latestCalibrationFrame()` and `rawPreview` but no `boardGeometry()` and no profile-saved hook, so
  the composition root cannot build the host and the calibration screen renders 06a's fallback. Not
  worked around: the missing piece is geometry state, and inventing it in the UI is exactly the
  class of drive-by this pack forbids. Needs 06c (two members on `TrackerBinder`) or an orchestrator
  decision.
- ~~**OPEN (06b, D06b-4) — `TrackerStatus` carries no corners**~~ — **RESOLVED by the perf/overlay
  pass**, see D-perf-3: `TrackerStatus.corners: FloatArray? = null`, filled by `StatusPublisher`,
  drawn by `PreviewOverlay`. `entry.md`'s seam block was updated to match.
- **OPEN (06b, D06b-3) — `acceptCnnPosition()` has no preview variant (D04x-4) and `TrackerStatus`
  has no CNN label map**, so the alarm dialog can only name the believed piece per conflicting
  square and must present the action as irreversible. Needs a status field or a second entry point.
- **OPEN (05b, D05b-1) — `motionScore` is `internal` to `:core-engine` and unreachable from
  `:app`.** Worked around with an 8-line, unit-tested local port in `RoiMotion.kt`; the clean fix
  is one line in `engine.api` and is an orchestrator/seam decision.
- ~~**OPEN (04a, D04a-1) — `:core-cnn`'s `CnnRecovery.resyncCheck` drops the derived move**~~ —
  **RESOLVED by 04x**, see D04x-2 (and mutation-verified: the overrule test goes red without it).
- ~~**OPEN (04a D04a-5 / 04b D04b-3) — `CnnEvaluator.board: Any` is fed two different types**~~ —
  **RESOLVED by 04x**, see D04x-1: the seam takes `boardFen: String`, so neither module names the
  other's board type. `entry.md`'s seam block was updated to match.
- ~~**OPEN (04a, D04a-2) — `TrackerEngine.cnn` is `internal`**~~ — **RESOLVED by 04x**, see D04x-3:
  `attachCnn(evaluator)` is public and also arms `cnnRun`.
- ~~02c has no CNN fixtures~~ — **withdrawn**, see D00b-2: `parity/_cnn/` now carries 7
  synthetic, model-free JSONL families covering every pure function 02c names.
- ~~02b has no `geometry_resolve_corners.jsonl`~~ — **withdrawn**, see the mapping table:
  `parity/_geometry/resolve_corners.jsonl` (17 synthetic marker point sets) and
  `parity/_geometry/grid_coverage.jsonl` (+ self-contained gray planes) close both gaps.
  What 02b still has to build itself (no fixture is possible from clips): **ArUco marker
  *detection*** (`ArucoTest`, `BoardCornersForFrameTest`) — the clips replay with
  `live_align=False`, so no marker was ever detected. 02b's spec already writes those as
  hand-written tests over `Objdetect.generateImageMarker` renders, so this is not a blocker.
- ~~**01d's `BaselineOcclusion.kt` does not compile against 01b's landed `perSquareCensusChange`**~~
  — **resolved by 01d**, see D01d-1: the `boardSize` argument was removed and the call was also
  adapted to 01c's `ColorPlanes` / `PlaneGeometry` signature. `:core-engine:compileTestKotlin`
  and `:core-engine:test` are green.
- ~~**`TrackerEngine` is at exactly 10 functions and cannot take an eleventh** (D03d-5)~~ —
  **resolved by the Lean pass**: `TooManyFunctions` is now 15, so phase 04 has room for
  `acceptCnnPosition`'s real body plus the verify/recovery entry points.
- **Open orchestrator decision (D00b-17):** whether `TrackerConfig` should gain explicit
  `settleFrames`/`avgFrames`/`confirmFrames` overrides. Until then, phases 03* must read
  those three from `meta.effectiveConfig`.
- **04c reconciliation — (a) RESOLVED by 04x** (D04x-4: `acceptCnnPosition()` is implemented, minus
  Python's `preview` variant, which the `List<TrackerEvent>` return type cannot express).
  **(b) still open:** there is no Kotlin counterpart to `resync_cnn` at all. See the 04c release
  table.
- **04c open (orchestrator), narrowed:** `ResyncResult` now carries `move` / `agreement`
  (D04a-1 + D04x-2), but `_cnn_tick`'s occupancy-only arm still reaches its move through
  `deriveMovesDeep` alone (D04c-2). Unreachable with the bundled 14-class model.
- ~~**04c open (cosmetic but user-visible):** the two release families emit different
  `AlarmCleared` reasons~~ — **RESOLVED by 04x**, see D04x-5: `clearAlarm(String?)` is the single
  release and always emits the REASON.

### 08b (LAN spectator), 2026-07-25

- **D08b-1 — the phase file's data source does not exist.** 08b codes against
  `TrackerService.uiState: StateFlow<UiState>`; there is no `UiState` type and no `uiState` on the
  service (that was the legacy app's shape). What exists is 06b's published seam
  `ui.tracking.TrackerSessionHost.session` -> `status: StateFlow<TrackerStatus?>` +
  `events: Flow<TrackerEvent>`, which the service fills (`ui/TrackerServiceBinding.kt:87`).
  `SpectatorController` folds those two into `GameSnapshot`: `fen`/`status` from `TrackerStatus`,
  `sanHistory`/`lastMoveUci` from `MoveCommitted`/`SequenceCommitted`. Not a blocker — the seam is
  strictly narrower than the one the spec assumed, which is the right direction for this feature.
- **D08b-2 — `SpectatorState.Running` carries no `ssidLabel`.** Reading the SSID needs
  `WifiManager` plus `ACCESS_FINE_LOCATION` from API 27 on (it returns `<unknown ssid>` otherwise),
  and a location permission for a cosmetic label on a read-only page is not a trade worth making.
  `Running(url, port)` is what the screen shows.
- **D08b-3 — `result`/`"over"` are derived from the FEN with chesslib, not read from a game store.**
  The spec's `GameSnapshot` carries a `result` but names no source (08a's game store is a
  concurrent phase and off-limits). `Board.loadFromFen(fen)` -> `isMated`/`isDraw`/`isStaleMate` is
  a pure function of data the spectator already gets, so no new coupling was introduced. A
  malformed FEN reads as "live"; a fabricated result would be worse than none.
- **D08b-4 — one field added to `AppSettings` (`spectatorEnabled`), and nothing else outside
  `spectate/**`.** The spec says persist through the shared repository and forbids a second store,
  so the field is unavoidable; it is written through the existing `updateApp`, so
  `SettingsRepository` itself needed **no** change. 08c added four speech keys to the same file in
  the same phase — the two edits are append-only and disjoint.
- **D08b-5 — the persisted flag is written but never read back at launch.** "Persisted" and "never
  auto-started" are in tension; the resolution is that `spectatorEnabled` is a *mirror* of what is
  running (so the settings export cannot lie), not a boot-time intent. The controller writes
  `false` on construction. The server can therefore never come back up serving after a process
  restart, which is the stronger of the two guarantees.
- **D08b-6 — one file more than the phase file lists: `spectate/SpectatorController.kt`.**
  The lifecycle glue (settings write-through, the status/event fold, the Wi-Fi `NetworkCallback`,
  the ongoing notification + its Stop broadcast) has no home in the spec's six files without
  pushing `SpectatorServer.kt` past 250 LOC or putting Android types into the JVM-testable server.
  The spec's owning-service-scope lifecycle is not available either — `service/TrackerService.kt`
  belongs to 08c this phase — so the controller is a process singleton (`SpectatorHost`) created by
  the screen and outliving it deliberately: a server that stops because somebody pressed Back is a
  server whose QR silently rots. The Stop receiver is registered at **runtime**, not in the
  manifest (06c owns the manifest).

Design notes worth keeping: the port is **probed with a `ServerSocket` before `embeddedServer`
binds**, because CIO's `start(wait = false)` surfaces a bind failure asynchronously and the spec
requires a *loud* `Error("port 8420 in use")` rather than a silent drift to another port.
`SpectatorServer.refresh(enabled)` is the single reconciliation point — start, stop, Wi-Fi loss and
Wi-Fi return are all the same call, so there is no state in which a bound socket and the displayed
URL can disagree. `bindsWifiAddressNotWildcard` proves the bind is not `0.0.0.0` by binding 8420 on
another local IPv4 *while the server runs* (skipped via `assumeTrue` on a machine with only
loopback), which is a real proof rather than a string check.

**Not covered by tests** (JVM-only, no instrumented tests): `QrCode.forUrl`'s `Bitmap` conversion
(`matrixFor` is tested and decoded back to the URL), `SpectatorScreen`'s composition, the ongoing
notification and its Stop broadcast, `SystemWifiAddress`'s real `wlan*` enumeration, and the
`ConnectivityManager` callback wiring. Phase 09 must confirm on device that the timings panel does
not move while a spectator is connected.

## Perf + overlay pass (D05c-6, D05b-7, D06b-4), 2026-07-25

Three follow-ups from phases 05b/05c/06b, no behaviour change intended and none measured.

- **D-perf-1 (closes D05c-6) — `preprocess` no longer allocates per observation.**
  `:core-cnn` gained `preprocessInto(crops, outW, outH, out, mean, std)`; `preprocess` is now
  `FloatArray(n).also { preprocessInto(...) }`, so the numerical contract lives in exactly one
  body (BGR→RGB, `/255`, ImageNet mean/std, NCHW, N-then-R/G/B planes — every line unchanged).
  `OnnxSquareClassifier` keeps a reused `staging` array next to its reused direct `FloatBuffer`.
  **Measured** (`PreprocessTest`, HotSpot per-thread allocation counter, 64 × 128 × 128 crops):
  `preprocess` **12 583 128 B** per call → `preprocessInto` **72 B** per call (the counter's own
  overhead). The 12.6 MB heap buffer is now a one-off per classifier, and the copy into the direct
  buffer is a bulk `put`, i.e. one memcpy and zero allocation.
- **D-perf-2 (narrows D05b-7) — the grid-line Canny is skipped when the gate is off.**
  `FramePipeline` computes `stages.gridCoverage()` only while `minGridLineCoverage > 0` and passes
  `GRID_GATE_OFF = 1.0` otherwise. That is exact, not a heuristic: `FrameLoop.occludedByGrid`
  returns `false` before it reads the value, so nothing downstream can observe the difference (the
  parity clips run `min_grid_line_coverage = 0.0` and are unaffected — verified by the 18/18 replay).
  **Measured cost of the pass itself**: `gridLineCoverage` on an 800×800 (`detSize`) gray Mat is
  **0.87 ms/call** on the dev machine (200 iterations after 30 warm-ups, throwaway bench, deleted).
  **Honest limitation:** the live default is `minGridLineCoverage = 0.5`, so on a normally
  configured phone this saves nothing — it only pays off when the user disables the gate or a clip
  replays with it off. Making it lazy in the general case needs the seam to carry `() -> Double`
  instead of a `Double`; that was NOT done (it would touch `FrameInput`, every parity test's frame
  construction, and buys ~1 ms on a 66 ms budget). D05b-7 stays open in that reduced form.
- **D-perf-3 (closes D06b-4) — the board quad is live.** `TrackerStatus` gained
  `corners: FloatArray? = null` (`[a8, h8, h1, a1]`, source px, invariant 11), `entry.md`'s seam
  block was updated to match. The engine never sets it — it owns no geometry — so `StatusPublisher`
  carries a `@Volatile var corners` that `TrackerCoordinator` assigns from `pipeline.corners` right
  next to `sizeMismatch`, and `trackingUiState` passes it to `PreviewOverlay`. No source size is
  passed: the preview bitmap is a uniformly downscaled copy of the same analyzer frame
  (`bgrToBitmap`), so the bitmap's own size is the correct divisor.

**Out-of-list files touched** (owned by no concurrent agent, one or three lines each, recorded here
rather than improvised silently): `service/TrackerCoordinator.kt` (assigns the corners),
`ui/tracking/StatusUiModel.kt` + `ui/tracking/TrackingScreen.kt` (carry them to the overlay — item 3
is undeliverable without its call site). No file owned by another agent was edited.

**Gate** (run in an isolated `git worktree` at `HEAD` with only these changes applied — the shared
tree did not compile at the time: a concurrent agent's in-flight `Ep`/`EpRequest` rework had
`OnnxSquareClassifierContractTest` and `TrackerService.kt` mid-edit): `:core-engine:test` **312
tests, 0 failures**, `:core-cnn:testDebugUnitTest` **54, 0**, `:app:testDebugUnitTest` **177, 0**;
`ClipReplayParityTest` green (18/18 clips, zero divergence — the test asserts
`clipsPassed == index.clips.size`); `ktlintFormat` changed nothing, `ktlintCheck detekt` BUILD
SUCCESSFUL. No `@Suppress`, no baseline, no threshold touched.

## Restart + app-settings wiring (closes D07a-1 and D07a-11), 2026-07-25

Files created (`:app`): `service/TrackerStack.kt` (188), `service/AppSettingsWiring.kt` (60).
Extended: `service/TrackerService.kt` (218 → 229), `service/TrackerBinder.kt`,
`service/EngineHost.kt`, `service/DebugProbes.kt`,
`camera/TrackerCamera.kt`, `camera/CameraModels.kt`, `cnn/CnnModelAssets.kt`,
`cnn/OnnxSquareClassifier.kt`, `cnn/CnnObserver.kt`, `geometry/CalibrationStore.kt`,
`ui/ChesslabNavHost.kt`. Tests added: `service/TrackerRestartTest` (4), `cnn/EpRequestChainTest` (7),
`cnn/CnnObserverCloseTest` (2), `camera/ResolutionModeRequestTest` (3),
`geometry/OrientationSettingTest` (4) — **20 new, JVM only**; `:app` goes 177 → 197 tests. No build file, no catalog entry, no
`@Suppress`, no baseline, no threshold change.

### What a restart actually does

Two lifetimes now live in `TrackerService`. The **session** (camera, `CameraFrameBus`,
`StatusPublisher`, `SettingsRepository`, `TrackerBinder`, `TrackerNotification`) lasts as long as
the service. The **stack** (`FramePipeline` + `CameraStages` + `CropFrameStore` + `FrameSizeGuard`,
`EngineHost` + `TrackerEngine` + `CnnRecovery`, `DebugCropTap`, `CnnObserver` + the ONNX session,
`LiveAlign`, `TrackerCoordinator`, and a `SupervisorJob` child scope) is what `restartTracker()`
rebuilds. Order, and each step's reason:

1. `calibration.applyOrientation(...)` — 07a's orientation reaches the profile (see D07x-4).
2. `camera.runOnAnalyzer { stacks.restart() }` — the swap runs on the analyzer thread, i.e.
   serialized against `TrackerCamera.deliver`, so no frame is inside the stack while it is closed.
3. `StackSwitch.restart()` = **detach → close → build**. Detaching first (`current = null`) makes a
   frame arriving mid-restart a dropped frame, not a call into a closed pipeline. Closing before
   building is what keeps two ONNX sessions, two observer threads and two sets of full-resolution
   warps from coexisting on a phone.
4. `TrackerStack.close()` = `scope.cancel()` (collectors + in-flight live-align) → `observer.close()`
   (the only member with a thread and a native session) → `pipeline.close()` (OpenCV Mats + the
   pending crop warp). The engine host is not closed: it is queues and plain objects, and the point
   of rebuilding it is that its thread claim goes with it.
5. `camera.retarget(...)` on the main thread, last, so no frame is delivered into a half-built stack.

### Discrepancies

- **D07x-1 — `TrackerBinder` no longer holds the `EngineHost`.** It takes `queue: (EngineAction) ->
  Unit` and reads the CURRENT stack, because the binder object is handed to `BindTrackerService` once
  and a restart would otherwise leave every screen submitting into a torn-down engine. Same reason
  the `StatusPublisher`, the `CameraFrameBus` and the `CnnState` flow are session-scoped: a swapped
  `StateFlow` instance is a screen that silently stops updating.
- **D07x-2 — the restart entry point is `TrackerRestartHost`, not the binder.** `TrackerBinder`
  *does* gain `restartTracker()` (it is the real API and it implements the `TrackerRestart` fun
  interface), but the only composable holding a binder is `ui/TrackerServiceBinding.kt`, which this
  change does not own. The service publishes the action exactly the way it publishes the settings
  repository (D07a-2), and `ChesslabNavHost` reads it — so 07a's `onRestartTracker` is non-null once
  the service is up, and still null (with 07a's honest "close and reopen the app" text) before that.
- **D07x-3 — a restart preserves the position, not the move history.** `TrackerEngine` is re-seeded
  with `publisher.lastFen`, plus the geometry and the last corners, so calibration and alignment
  survive. It takes a FEN and not a history, so **undo starts empty after a restart** and 08a's PGN
  would restart from the resumed position. Not worked around: carrying history would mean a new
  engine entry point, which is a seam change.
- **D07x-4 — orientation is reconciled in BOTH directions, not wired one way.** At service START the
  stored profile wins and `AppSettings.orientation` is synced to it (06a's calibration screen has its
  own a8 switch, and a stale setting must not transpose the board behind the user's back). At a
  user-triggered RESTART the setting wins and `CalibrationStore.applyOrientation` writes it INTO the
  profile — only the profile is carried over by `saveRecalibrated` (`ensure_profile`), so a value
  living anywhere else would be silently reset by the next recalibration. An unchanged orientation
  writes nothing.
- **D07x-5 — `resolutionMode` needed a camera *retarget*, not a new camera.** `TrackerCamera` gained
  `retarget(request)` (rebinds the ONE `ImageAnalysis` use case on the main thread) and
  `runOnAnalyzer(block)`. Rebuilding the camera per restart was the alternative and is exactly the
  two-owner bug from MEMORY `android-single-camera-owner`; `ProcessCameraProvider.getInstance` stays
  at **1** call site. `cameraRequestFor(mode)` lives in `camera/CameraModels.kt`; AUTO maps to 1080p
  because that is the mode the 15 fps budget was measured at. The delivered `ImageProxy` size is
  untouched as the source of truth — asserted by `ResolutionModeRequestTest`.
- **D07x-6 — `Ep` no longer names its own graph.** `modelAsset` made the `Ep.model` constant a lie,
  so `Ep` carries only the backend, `modelFor(staged, ep)` resolves the file (QNN always
  `model.qnn.onnx` — the HTP backend rejects float32), and `SessionRunner.model` is
  `modelFile.name`, i.e. what was really loaded. `CnnState.Ready(backend, model)` therefore reports
  actual, never requested, and `requestedBackend(staged, request)` is the separate head-of-chain
  value 07b renders beside it. `epChain(hasQnn, request)` = `available.dropWhile { it != head }`, so
  an explicit CPU request tries CPU **only**, NNAPI keeps CPU below it as a last resort, QNN may
  still fall back, and a QNN request with no quantized graph falls back to the whole automatic chain
  and reports NNAPI as requested.
- **D07x-7 — `CnnObserver.close()` was leaking, and closing the session on the wrong thread.** It
  used to `classifier.close()` inline from the caller's thread and never shut its executor down —
  harmless when it only ran at process death, a native use-after-free plus a leaked thread per
  restart now. It now cancels the scope, then frees the session **on the observer thread** and closes
  the `ExecutorCoroutineDispatcher` behind it. `CnnRuntimeProbe.observations` became a `() -> Long`
  supplier for the same reason: the counter belongs to the stack, and a restart legitimately
  restarts it.
- **D07x-8 — `TrackerService` was 264 LOC after the restart path, so the four app settings moved
  out.** `service/AppSettingsWiring.kt` holds `openClassifier(context, app, probe)` and
  `adoptStoredOrientation(store, settings)` — a real unit ("07a's app settings, applied at
  construction"), not a lint holder. The service is back to 229 and 12 functions.

### For the concurrent-agent owners (no file of theirs was edited)

Nothing is required of them. Recorded only so the coupling is visible: `StatusPublisher.cnnState`
and `StatusPublisher.corners` are now written by a stack that can be replaced mid-session, and
`TrackerCoordinator` is constructed per stack rather than once.

### Not verifiable without a device

- That a restart is visually seamless (the preview keeps rendering; `camera.retarget` only rebinds
  when the mode actually changed, so an unchanged mode should not blink at all).
- That the ONNX session and the observer thread are really reclaimed — the JVM test asserts `close()`
  is called on the observer thread, not that native memory dropped. Watch `chesslabCnn` for exactly
  one "CNN inference backend:" line per restart, and the process RSS across five restarts.
- That an explicit `QNN` request selects `QNN-HTP(NPU)` on a Snapdragon (only the fall-back arms are
  reachable on the desktop JVM), and that the 2160p request is honoured or honestly reported as a
  mismatch on the user's phone.
- That a restart after changing `detectScale` really re-warps at the new `detSize` in the live feed.

### Gate (LIVE tree; concurrent agents' edits present and compiling)

```
:app:testDebugUnitTest   BUILD SUCCESSFUL   197 tests, 0 failures, 0 errors (40 classes, --rerun-tasks)
:app:ktlintFormat        BUILD SUCCESSFUL   (one fix by hand first: my KDoc insert had split
                                             saveRecalibrated's KDoc, which ktlint cannot auto-correct)
:app:ktlintCheck :app:detekt   BUILD SUCCESSFUL   (0 findings, whole module)
:core-engine:test        BUILD SUCCESSFUL   312 tests, 0 failures — ClipReplayParityTest green
                                             (everyClipReplaysPythonsDecisionsFrameForFrame, 18/18,
                                              zero divergence)
```

### Phase 08c — spoken move announcement (2026-07-25)

- **D08c-1 — `AppSettings` had to be extended; the phase file forbade a second store.** 08c owns no
  settings file, but design §1 binds the four keys (`speechEnabled`, `speechLanguage`,
  `speechVerbosity`, `speechAnnounceAlarms`) to the shared `SettingsRepository`. They were added to
  `settings/AppSettings.kt` as four fields (defaults `false` / `"en-US"` / `WORDS` / `true`) —
  additive only, `ignoreUnknownKeys` already covers older payloads, and 08a/08b do not own that
  file either. Nothing else in `settings/` was touched.
- **D08c-2 — two extra files in `speech/`, to keep every file under ~150 LOC.** The phase file lists
  three main files; the platform half (`AndroidTts`, `AndroidSilence`, the `androidSpeechEngine`
  factory) lives in `speech/AndroidSpeech.kt` and the bounded queue in `speech/UtteranceQueue.kt`.
  Both are inside the package this phase exclusively owns, so no ownership boundary moves. The split
  is what makes the policy host-testable: `SpeechEngine` never names `TextToSpeech`.
- **D08c-3 — the acceptance greps land in the neighbouring file, not the named one.** `QUEUE_FLUSH`
  occurs exactly once, in `AndroidSpeech.kt:83`, as the `flush` flag's translation; the flag is set
  only by the alarm branch of `MoveAnnouncer` (`speaker.say(..., flush = true)`), which is what the
  criterion means. Likewise `RINGER_MODE_NORMAL` / `INTERRUPTION_FILTER_ALL` sit in
  `AndroidSpeech.kt`'s pure `silencedBy(ringerMode, interruptionFilter)` rather than in
  `SpeechEngine.kt` — the point of putting them there is that the rule is unit-tested.
- **D08c-4 — `MoveAnnouncer` takes the `Speaker` interface, not the concrete `SpeechEngine`.** The
  phase file's signature says `engine: SpeechEngine`; a `TextToSpeech`-free seam is what lets the
  alarm-suppression and thread rules be tested at all. `SpeechEngine` implements `Speaker`, so the
  service wiring is unchanged.
- **D08c-5 — the side comes from `fenAfter`, not from a ply counter.** `MovePhrase` still takes the
  1-based ply the spec describes, but the announcer derives its parity from the committed FEN's
  side-to-move (" b " = White just played). A counter would be a second, drifting move history —
  and after a `SequenceCommitted` or an undo it would drift silently.
- **D08c-6 — pawn moves do not say "pawn".** The spec's own table has `exd5` -> "e takes d5", which
  drops it; saying "pawn e takes d5" for a capture and "pawn e4" for a push would be inconsistent
  with the very example it is specified by. So the pawn is never named: `e4` -> "e4".

**What the host cannot test** (and is therefore untested): everything below the `Tts` seam —
`TextToSpeech` construction, its async init callback, `setLanguage`'s `LANG_MISSING_DATA` /
`LANG_NOT_SUPPORTED` return and the `Locale.US` fallback, `UtteranceProgressListener` delivery, the
`AudioAttributes` usage tag, and `AudioManager`'s real ringer/DND/focus values. Tested instead: the
state the engine surfaces when a `Tts` reports `LanguageMissing`, the pure `silencedBy` rule against
the platform constants, and the fact that a denied focus or a silenced ringer never even opens an
engine. Phase 09 must confirm on the device that a `de-DE` selection either speaks German or shows
the "install voice data" card.

```
:app:testDebugUnitTest --tests "com.chesslab.tracker.speech.*"   BUILD SUCCESSFUL
    MoveAnnouncerTest 10, MovePhraseTest 9, SpeechEngineTest 7, UtteranceQueueTest 4
    = 30 tests, 0 failures, 0 errors
:app:ktlintFormat              BUILD SUCCESSFUL
:app:ktlintCheck :app:detekt   BUILD SUCCESSFUL   (0 findings; one LongParameterList on the
                                                   12-field `Words` table was FIXED, not suppressed
                                                   — it is now two maps keyed by a `Term` enum)
```
Gate run in an isolated worktree of `dc6b38a` with only 08c's files applied: the shared tree did not
compile while 08a's `games/**` and `record/**` were mid-write (`SessionExporter.kt:30 Unclosed
comment`). None of those errors is 08c's; nothing outside `speech/**` + the two registration lines
was changed.


### 08a (games, PGN, session recording), 2026-07-25

17 main files (1701 LOC, largest `ui/games/GamesScreen.kt` 199) + 8 test files, **41 tests, 0
failures**. No build file, no catalog entry, no manifest edit, no `@Suppress`, no baseline.

- **D08a-1 — `AndroidManifest.xml` was NOT edited; the ownership registry overrides the phase file.**
  08a's file list claims the manifest and a `FileProvider`; `entry.md`'s registry says 06c owns it and
  "nobody" extends it, and the orchestrator's brief repeated that. The two permissions 08a was told to
  add for 08b (`INTERNET`, `ACCESS_NETWORK_STATE`) are **already declared** by 06c, so nothing was
  missing. Consequence: **no `FileProvider`**, so a PGN is shared as `Intent.EXTRA_TEXT`
  (`text/plain`, subject `<id>.pgn`) — the same decision and the same reason as 07b's decision-log
  share, and a PGN is a few kB. The session ZIP goes through SAF (`ACTION_CREATE_DOCUMENT`), which
  needs no provider and no permission either. `res/xml/file_paths.xml` was therefore not created.
- **D08a-2 — there is no `ui/Nav.kt` and `ui/settings/SettingsScreen.kt` was not touched.** The nav
  host is `ui/ChesslabNavHost.kt` (registry); 08a added `ROUTE_GAMES`, `ROUTE_GAME_DETAIL`, a "Games"
  button next to the existing "Settings" one, and one call to `AttachGameSession()` **outside** the
  `NavHost` (the running game must not be scoped to a back-stack entry). The three settings rows the
  phase file asks for would have meant editing 07a's screen, which the brief froze; the games entry
  point lives on the tracking screen's action row instead. **08b's and 08c's routes ARE wired**, once
  their files had landed and compiled: `ROUTE_SPECTATOR` -> `spectate.ui.SpectatorScreen(onBack)` and
  `ROUTE_SPEECH` -> `speech.ui.SpeechSettingsScreen(onBack)`, with a button each in the same action
  row. Both agents recorded that their screens are unreachable until 08a wires them, and the nav host
  is the one file in phase 08 only 08a may touch.
- **D08a-3 — storage is `<id>.json` + `<id>.pgn`, not `<id>.pgn` + `<id>.provenance.json`.** The spec
  contradicts itself: `StoredMove` carries `provenance` inline *and* a separate provenance file is
  listed. Splitting one record over two files (or duplicating it) buys nothing — the PGN is a
  rendered artifact, so the JSON is the source of truth and the PGN is regenerated on save and on
  rename. `index.json` is a derived listing exactly as specified.
- **D08a-4 — the `TrackerService` API the phase file codes against does not exist.** There is no
  `uiState: StateFlow<UiState>`, no `frames: SharedFlow<CapturedFrame>` and no `recordingSink`; 06c
  and the restart pass built `TrackerBinder` (status + events + actions), `TrackerSessionHost` and
  `CalibrationHost` instead. Not raised as a blocker, because everything 08a needs is reachable
  without touching a foreign file: the game is reconstructed from `TrackerEvent.MoveCommitted` /
  `ReAnchored` plus `TrackerStatus`, and the raw frame comes from
  `CalibrationHost.latestCalibrationFrame()` (a clone of the analyzer frame, the same pixels 06a
  calibrates on) with `TrackerStatus.corners` as its geometry. **Two honest consequences:**
  (a) that frame is published at ~5 fps, so it can be up to 200 ms old — the board is static at flush
  time by construction, so this costs nothing in practice; (b) the driver is a composable
  (`AttachGameSession`), so **recording pauses when the app UI is destroyed** while the service keeps
  tracking. The fix is one construction site in `TrackerService` and is filed for the orchestrator,
  not improvised across an ownership line. **RESOLVED** — see "Game session ownership (D08a-4 fix)".
- **D08a-5 — `EngineState.flushSessionCapture()` is unusable from `:app`.** It is `internal`, and
  `TrackerEngine` **discards** its return value (`Commit.kt:236`, `TrackerEngine.kt:405`); no event
  crosses the seam. So `_queue_session_capture` / `_flush_session_capture` are re-ported app-side in
  `record/SessionCapture.kt`, driven by the two signals that DO cross: a commit queues the capture,
  and `TrackerEvent.ReAnchored` flushes it — the engine emits that event in exactly the branch where
  Python calls `flushSessionCapture()` (the quiet re-anchor). Both gates run at queue time and again
  at flush time, as Python does.
- **D08a-6 — the "clean board" test is weaker without the debug payload.** Python's condition is
  `not _motion_occluded_squares and not _tainted`. `TrackerStatus` has no `tainted` set (D03d-9) — it
  rides on `DebugPayload` — so with debug off only `occlusionVetoed` decides. A missed taint means a
  capture is taken one flush too early, never a wrong label for the position.
- **D08a-7 — an undo is detected from the FEN, because there is no undo event.** `TrackerEngine.undo`
  only sets a note. `LiveGame.onFen` pops the last move when the published position equals the one
  *before* it, and the controller then calls `SessionCaptureController.undo()`, which deletes the
  frame file and rewrites `log.jsonl` (`tracker.py:2782`, "a WRONG move is removed again on undo").
- **D08a-8 — `SessionWriter` schema deltas, desktop read first (`collect.py:42-120`).** Frames are
  **JPEG q90** here (`frames/%04d.jpg`) where the desktop writes PNG — the spec asks for JPEG and
  `slice` reads the frame path out of the log, so the extension is free. `camera_index: -1` (the
  phone is not a rig capture device; `ingest.py:123` sets -1 for the same reason) instead of 0. The
  two lens keys `undistorted` / `lens_calib_id` are **omitted**: they come from
  `lens.profile_lens_state(camera_index)`, which has no phone equivalent, and the desktop's own
  comment says an absent key means raw frames — `ingest.py` omits them too. Everything else is
  verbatim: `session_id`, `profile`, `mode`, `created_at`, `camera_index`, `frame_size`, `notes`, and
  one `log.jsonl` line per capture with `frame`, `ply`, `fen`, `ts`, `move_san`, `corners` as
  `[[x, y], …]` in `[a8, h8, h1, a1]` order.
- **D08a-9 — the size cap sets a visible reason but posts no notification.** `TrackerNotification` and
  `TrackerService` are 06c/08c files. The reason is shown on the games screen next to the toggle and
  on the live-game row; a notification is a two-line addition once someone owns that file.
- **D08a-10 — `SessionRecorder`'s constructor is `(dir, SessionMeta, now)`.** The spec's flat
  signature is 8 parameters wide and detekt caps at 8 (`>=`). `SessionMeta` is a real unit — it is
  exactly what `session.yaml` contains — not a lint holder.
- **D08a-11 — a tracker restart (D07x-3) does not lose the game.** The engine is re-seeded with a FEN
  and no history, but `LiveGame` keeps its own move list and `AttachGameSession` remembers on the
  binder, which a restart does not replace. The PGN therefore still starts where the game started.
  What a restart does lose is the engine-side undo depth, which is D07x-3's finding, not a new one.
- **D08a-12 — `chesslib` in `:app` was already declared** ("phase 08a: PGN result determination") and
  is used for exactly two things: the result tag (`isMated`/`isDraw`) and
  `physicalInventoryViolations`. The latter counts by `fenSymbol`, **not** by `PieceType.name` —
  KNIGHT and KING share their first letter, which is a silent way to make the queen limit wrong.

**Gate** (live tree): `:app:testDebugUnitTest --tests "com.chesslab.tracker.games.*" --tests
"com.chesslab.tracker.record.*" --rerun-tasks` → BUILD SUCCESSFUL, **8 classes / 41 tests / 0
failures**; `:app:ktlintFormat` → BUILD SUCCESSFUL (reformatted only 08a's own files);
`:app:ktlintCheck :app:detekt` → BUILD SUCCESSFUL, 0 findings (two `MagicNumber` findings on
`1024` were fixed by naming the constant, not suppressed).

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
- 2026-07-24 — **00b done**: `scripts/emit_parity_fixtures.py` drives the real `MoveTracker`
  synchronously (no thread, no `mt.start()`, virtual clock) over 18 of 20 blender clips and emits
  Tier A (all primitives incl. the raw undilated occlusion core and raw+normalized census),
  Tier B (per-frame `_try_detect` outcome) and Tier C (`natives/`, source JPEG + corners +
  grid coverage) into `android/core-engine/src/test/resources/parity` — 2 780 files, 38.73 MB
  of 40 MiB, byte-stable (re-run leaves the staged tree unchanged), 17/18 clips reproduce their
  manifest move list. Plus the shared `_colorspace/` (BGR->HSV/Lab) and `_geometry/` (region /
  crop-box / homography cross-product) fixtures, `ParityFixtures.kt` (delta-plane decoder +
  the 1e-4-relative tolerance contract) and `ParityFixturesTest` (6 tests). Gate green:
  `:core-engine:test`, `ktlintCheck`, `detekt`. 16 discrepancies (D00b-1..16) and a fixture-key
  mapping table for phases 01–03.
- 2026-07-24 — **00b follow-ups** (orchestrator round 1): `meta.effectiveConfig` (all 47
  `TrackerConfig` members read off the live tracker, with a hard generator self-check) +
  `ParityEffectiveConfig.toTrackerConfig()`; `parity/_cnn/` — 7 synthetic model-free JSONL
  families closing the 02c blocker; `parity/_geometry/resolve_corners.jsonl` +
  `grid_coverage.jsonl` (with self-contained gray planes) closing the 02b blocker;
  `blender-scholars` diagnosed as a generator artifact (real `pytest -m clips` passes 7/7)
  and fixed by a sampling escalation ladder — **all 18 clips now reproduce their manifest
  move list**, `blender-nudge` is back in. New: D00b-17 (`TrackerConfig` cannot express a
  `confirmFrames` override — `blender-castle` uses 3), D00b-18, D00b-19. Both original
  blockers withdrawn. **40.93 MB / 40 MiB**, byte-stable; `:core-engine:test` 11/11 green,
  ktlint + detekt clean.
- 2026-07-24 — **01a done**: canonical square order (`Squares`), `squareRegion`/`squareBoxes`/
  `squareCenter` with Python's truncate-then-clamp rounding, integral images + `regionMeans`,
  `perSquareDiff` and `normalizeDiffs` (upper median, input never mutated). All 10 published
  contract signatures landed verbatim for 01b/01c/01d; two additive deviations recorded
  (D01a-1 named `inset` default, D01a-2 `integralBuffer` + `out` overloads instead of an
  `IntegralScratch` class — a shared scratch would have aliased 01c's colour planes).
  Parity is asserted against the real fixtures: 16 geometry cross-product sets exactly,
  18 clip-native region sets, and **247 tier-A frames across all 18 clips** for
  `perSquareDiff` + `normalizeDiffs` at 1e-4 relative, with `TrackerConfig` always built from
  `meta.effectiveConfig`. Gate green: `:core-engine:test` 18/18 (`SquareDiffParityTest` 5,
  `SquareGeometryTest` 13), `ktlintCheck`, `detekt` — zero findings, no `@Suppress`, no baseline.
- 2026-07-25 — **02c done**: whole `cnn_recovery.py` (438 LOC) ported to `:core-cnn` as pure
  functions over probability arrays — observation model (`OccupancyObservation` implements the
  frozen `CnnObservation`), `observationFromProbs`, `expectedOccupancy/Labels`, `scoreMoves`,
  `verifyMove`/`verifyMoveIdentity` (LOCAL), `boardMatchesIdentity` (three-valued),
  `deriveMovesIdentity`/`deriveMoveIdentity`, conflict-guided beam search `deriveMovesDeep`
  (placement-only `finals` key, beam 8, shortest-sequence tie-break), `resyncCheck`, the alarm
  gate `hasOccupancyConflict`, `guessIllegalMove` + `buildAlarmGuessSan`, plus the
  `serving.py:318-400` preprocessing contract and the `SquareClassifier` interface (no ONNX,
  no OpenCV, no Android — 05c owns the implementation). `CnnRecovery` implements the frozen
  `CnnEvaluator`; the three seam types that are narrower than Python keep a Python-faithful
  companion (`resyncCheckFull` / `boardMatchesIdentityFull` / `deriveMovesDeepFull`) — the seam
  itself is untouched. 49 tests consume **all 7 `_cnn` families (34 rows)** with asserted row
  counts, at the 1e-4-relative fixture tolerance; sets/conflicts/moves exact. 8 discrepancies
  (D02c-1..8); the only non-exact golden sequence is `deep_four_ply`, a genuine transposition
  tie (same plies, same placement, same hits — chesslib enumerates pawn moves first), asserted
  by placement equivalence. Gate green: `:core-cnn:testDebugUnitTest` 49/49, `ktlintCheck`,
  `detekt` — zero findings, no `@Suppress`, no baseline.
- 2026-07-25 — **02b done**: `:core-geometry` implemented end to end (`Corners`, `CropBox`,
  `Homography`, `Warp`, `Crops`, `Aruco`, `MarkerTracker`, `GridLines`, `GrayPipeline`) as a 1:1
  port of `calibration.py` / `labeling.py` / `imgops.py` / `tracker.py:_grid_line_coverage` +
  `_gray`. **The two warps are separate** (`warpFromCorners` scales H rows 0/1 for `targetSize`;
  `warpBoardForCrops` pre-multiplies by `T(B,B)` on a `bs + 2B` canvas) and `Crops.kt` is the only
  caller of the latter — asserted by a test that the two widths differ. `CropBox.kt`,
  `MarkerTracker.kt` and `Corners.kt` are OpenCV-free for phase 03. **58 tests green, 0 skipped —
  the bytedeco natives loaded, so all 7 Tier-C classes really ran**; every `_geometry/` golden row
  is consumed (16x64 crop boxes + 16x64 square regions + 16x64 centres, 6 homographies, 17
  resolve-corners cases, 7 grid-coverage planes), ArUco *detection* is hand-written over
  `Objdetect.generateImageMarker` (no fixture exists by design). `build.gradle.kts` /
  `libs.versions.toml` untouched — nothing was missing. 9 discrepancies (D02b-1..9), the important
  ones: `cropBorderPx` defaults to **20** not 200, `squareRegion` is the **inset 0.16 / truncating**
  `tracker.py` function (not the crop-box special case), Python's `round` is **half-to-even**
  (`Math.rint`), and `boardCornersForFrame` moved to `Aruco.kt` to keep `MarkerTracker.kt` native-free.
  Gate: `:core-geometry:testDebugUnitTest` 58/58, `ktlintFormat` + `ktlintCheck` + `detekt` clean —
  zero findings, no `@Suppress`, no baseline. (`:core-engine` was transiently red from concurrent
  01c/01d work at report time; the 58/58 run is against the final 02b sources.)
- 2026-07-25 — **01b done**: `Census.kt` — `POPCOUNT8`, `CENSUS_EPS = 0`, `censusBuffer`,
  the 3x3 `censusTransform` (BORDER_REPLICATE at the image *and* band edges, row-major bit order,
  strictly `centre > neighbour + eps` on unsigned bytes, never a roll) and `perSquareCensusChange`
  with the `:236-248` band fast path transcribed literally including the `+/-1` halo guard. Raw
  output, `* 255/8`, no normalization inside (invariant 8); primitive arrays only, size-keyed
  scratch, no per-pixel allocation. Parity over **247 tier-A frames in all 18 clips**: byte-exact
  census codes (247 x 256 px), `tierA.censusRaw` full path (247 x 64), the candidate band on the
  229 frames that have candidates, and band-vs-full interior equality — `TrackerConfig` always
  from `meta.effectiveConfig`. 5 discrepancies (D01b-1..5); the one that needs action:
  **detekt caps functions at 5 parameters**, so `perSquareCensusChange` lost its `boardSize`
  argument (it is `curGray.height`, `require`d square) and **01d's `BaselineOcclusion.kt` call
  site must drop it**. Gate (isolated copy of the module, because 01c/01d are mid-flight and the
  shared module is red for their reasons): `:core-engine:test` 11/11 (`CensusParityTest` 4,
  `CensusUnitTest` 7), `ktlintFormat` (no change), `ktlintCheck`, `detekt` — zero findings, no
  `@Suppress`, no baseline.
- 2026-07-25 — **01d done**: `Motion.kt` (`motionScore` = **percent** of pixels over `pxThr`,
  strict `>`, unsigned bytes, 0.0 on empty), `SquareNoise.kt` (per-square EMA of mean and
  mean-abs-deviation against the **pre-update** mean, exact `a == 0.0` skip, `stdFloor` clamp;
  gray lane `0.05/6.0/3.0` + exclude scale 0.0, census lane `8.0/2.5` + slow lane 0.125 — never
  unified) and `BaselineOcclusion.kt` (`SQ_NEIGHBOURS` orthogonal-only, the four-branch
  occluder/shadow classification, orthogonal dilation, and the **RAW UNDILATED core** as a
  first-class third return). Parity asserted against the real fixtures: **969 motion frames**
  (every emitted frame of all 18 clips), the **247 tier-A frame** noise replay from the
  constructor state across all four recorded maps, and **173 baseline-occlusion frames** with all
  three sets EXACT — 87 of them with a non-empty raw core and 42 with a non-empty chroma-outlier
  set. 5 discrepancies (D01d-1..5): 01b's and 01c's landed signatures differ from the published
  contract and MY file was adapted to them (theirs untouched, 01b's interim blocker struck);
  `baselineOcclusionAndShadow`'s 12 parameters had to be grouped into `BaselineParams` +
  `BaselineEvidence` because detekt caps functions at 5 (additive, every argument kept with the
  same name/type/order/default); the frame-level `baselineOcclusion` reference reconstruction rule
  was proved in Python first (173/173) because `tierA.baselineOcclusion` is empty everywhere; and
  `censusNoiseZ == null` marks a full-alpha census learning event, not a skipped update. Gate:
  `:core-engine:test` 17/17 (`MotionNoiseParityTest` 3, `BaselineOcclusionUnitTest` 14),
  `ktlintFormat`, `ktlintCheck` and `detekt` — zero findings in 01d's five files, no `@Suppress`,
  no baseline. (The module-wide `ktlintCheck`/`detekt` runs still report 01c's in-flight
  `ShadowVeto.kt` / `Gamut.kt` / `ShadowGamutParityTest.kt`; nothing in 01d's scope.)
- 2026-07-25 — **01c done**: hand-written BGR→HSV/Lab, the Cucchiara HSV cast-shadow veto and the
  Lab/saturation colour gamut with its nearest-neighbour Mahalanobis occlusion veto
  (`ColorSpace.kt`, `ShadowVeto.kt`, `Gamut.kt`). The phase file's float Lab formula was measured
  against the OpenCV fixture and **misses its own ≤1 LSB bound** (2 LSB on a\*), so OpenCV's real
  8-bit integer LUT paths (`RGB2HSV_b` / `RGB2Lab_b`) were ported instead — **HSV bit-exact, Lab
  ≤1 LSB**, and faster (no `pow`/`cbrt` per pixel). Parity: 247 tier-A frames × 18 clips for
  `hsvShadowSquares` (109 non-empty) and for the detection-frame occlusion set, 18 gamut rebuilds
  (end-to-end and from Python's own features), and 173 hand-over-the-board `chromaOutliers` blocks
  (42 non-empty) — **every derived square set EXACT**, thresholds always read from
  `effectiveConfig` / the emitted per-frame values (`occlusionColorThr` 1.5, `detSize` 320).
  7 discrepancies (D01c-1..7): the LUT port, the parameter-holder bundles forced by detekt's
  5-parameter cap (`PlaneGeometry` / `ColorPlanes` / `ShadowParams` — 01d already codes against
  them), the additive `colorGamutFromFeatures`, the ≤1 LSB bound propagating into per-square
  means (worst 0.1248 on a feature, 0.549 % on `invCov`), the unreachable extended-box arm, the
  1.5-not-3.0 threshold, and the isolated-copy workaround while the module was mid-flight.
  Gate green on the real tree: `:core-engine:test` 13/13 (`ColorSpaceParityTest` 3,
  `ShadowGamutParityTest` 5, `GamutUnitTest` 5), `ktlintFormat`, `ktlintCheck` + `detekt` — zero
  findings module-wide, no `@Suppress`, no baseline.
- 2026-07-25 — **02a done**: the chesslib wrapper (`Game.kt`, incl. the
  `getFen(true, true)` en-passant fix that makes FENs byte-identical to python-chess),
  `move_touched_squares` vs `move_destination_squares` as two deliberately different functions
  (`MoveSquares.kt`), the clipped log-likelihood move and pair scoring with Python's endpoint-only
  `soft` gate and union scoring (`Scoring.kt`), `move_prior` (`MovePrior.kt`) and the
  `confirm_frames` streak voter (`Confirmer.kt`). Primitive-array hot path
  (`moveTouchedIndices` into an `IntArray`, `DoubleArray(64)` z indexed by `Squares.ALL`), the
  published `Map<String, Double>` signatures kept as delegating overloads, no tie-break added
  anywhere. Parity over the real fixtures: **969 FEN round-trips**, **247 tier-A frames /
  5463 legal-move rows** for touched, destination and prior, **2877 loglik rows** and **58 pair
  rows** — every fixture row matched by uci AND by score, so no tie escape hatch was needed;
  plus hand-written coverage of both castlings, en passant, promotions, the `>= soft` boundary,
  the shared-square union, the +/-12 clip and stalemate. 10 discrepancies (D02a-1..10), the
  important ones: chesslib's default `getFen()` would corrupt every double-pawn-push FEN
  (D02a-1), the phase file's four `scoring_*.jsonl` fixtures do not exist and 00b's `tierA` keys
  are the real source (D02a-2), and the Tier-A scoring block belongs to the POST-frame board
  `frame.fen` (D02a-3). Gate green: `:core-engine:test` **100/100** for the whole module
  (`MoveSquaresTest` 11, `ScoringTest` 8, `MovePriorTest` 5, `ConfirmerTest` 6 = 30 new),
  `ktlintFormat`, `ktlintCheck` + `detekt` — zero findings, no `@Suppress`, no baseline, and
  `ktlintFormat` touched no file outside 02a's nine.
- 2026-07-25 — **03a done**: the shared mutable state (`EngineState.kt`, every Python field named,
  complete incl. the phase-04 vote/alarm/desync/recovery-confirmer fields and a
  `PendingCandidate` alias), `_detect_guards` with the `(image, FEN)` base-truth invariant and the
  axis-wise `_corners_jumped` (`Guards.kt`), `_compute_evidence` with the RAW census copy taken
  BEFORE normalization, the channel-local `hot > maxChanged + 2` guard that still LEARNS unless
  the alarm is latched, and the `max(zGray, w·zCensus)` fusion (`Evidence.kt`), and the frame loop
  — pre-CLAHE dark gate, FPS EMA, `max(frame, ROI)` motion, the baseline-occlusion expiry stamps,
  the motion/stable branches, the grid gate with its "just cleared → extend hold + drop both
  buffers" rule, the `_RunningMean` pair with the every-64-appends resync and NumPy truncation,
  and the `>2` gate on the RAW UNDILATED core (`FrameLoop.kt`). Determinism enforced: `nowS` is
  set once per frame from `FrameInput.timestampMs` and the module contains zero wall-clock and
  zero concurrency primitives (both greps are empty). Parity: **247 tier-A frames across all 18
  clips** replayed through `computeEvidence` at the 1e-4 fixture tolerance, `TrackerConfig` always
  from `meta.effectiveConfig`, including the 3 channel-guard frames. 12 discrepancies (D03a-1..12)
  plus a "03a contract change" table — the load-bearing ones: `censusNoise` needs the census
  constants (the phase file's `SquareNoise()` diverges immediately), `board` is 02a's `Game` not a
  chesslib `Board`, `stageTimingsMs` cannot be filled inside a clock-free engine, and the
  `:1696-1697` state reset moves ahead of `_try_detect` with a proof of equivalence. Gate green:
  `:core-engine:test` **134/134** (34 new: `GuardsTest` 8, `EvidenceTest` 10, `FrameLoopTest` 16),
  `ktlintFormat`, `ktlintCheck` + `detekt` — zero findings, no `@Suppress`, no baseline.
- 2026-07-25 — **03c done**: step 5's LL-scoring + two-stage viability filter (`scoreViableMoves`,
  with the destination-ONLY shadow rule and the `shadowBlocked` list) and step 6's hypothesis
  generator — the too-much-change gate with `blockedN = tainted.size` counting toward `maxChanged`
  (invariant 4) and the `blockedN == 0 && changed <= maxChanged + 2` pair escape, the
  **CNN-conditional order** (pair before single with CNN, single first without), the no-single-fits
  ladder (pair without CNN -> `vote = false` endpoint candidate with CNN -> stuck), the ambiguity
  gate with its promotion special case (`promoPending` without CNN, queen variant through with it)
  and the `movePrior` rerank that must clear the FULL margin, the strict both-halves pair viability
  on the **intermediate** board, and the exactly-one-strong-square endpoint rescue
  (`Hypothesis.kt`, `PairCandidate.kt`, `EndpointCandidate.kt`, `Ambiguity.kt`). Parity: **204 of
  the 247 tier-A frames** across all 18 clips (the 43 commit frames are not replayable from
  `frame.fen`, D03c-8) asserting `bestLl` / `secondLl` / `candidateUci`, plus `stuckReason` **and
  the note string** on the **136 frames** that go stuck — all byte-identical. 10 discrepancies
  (D03c-1..10); the ones 03d must read: **`scoreViableMoves` is 03c's — call it** (D03c-2), the
  anomaly patcher is a functional seam defaulting to a no-op (D03c-5), and the detekt-forced
  `ViableMoves` / `DetectContext` holders replace the 11-parameter Python signature (D03c-1).
  `_single_endpoint_candidate`'s "different destination" ambiguity loop turned out to be
  unreachable in Python too (D03c-3), and two golden ties (`b8c6`/`c7c6`, the promotion variants)
  are asserted by destination/shape rather than by uci — no tie-break was added (D03c-4).
  Gate green on the real tree (03b's files present): `:core-engine:test` 31/31
  (`HypothesisTest` 17, `PairCandidateTest` 7, `EndpointCandidateTest` 7, 0 skipped),
  `ktlintFormat`, `ktlintCheck` + `detekt` — zero findings module-wide, no `@Suppress`, no baseline.
- 2026-07-25 — **03b done**: the two vetoes with OPPOSITE semantics, kept apart by construction.
  `Vetoes.kt` (`_apply_vetoes`) removes a shadowed square from `changed` and **cannot touch z** — it
  no longer takes the parameter (D03b-1) — gating on the **RAW** census (`censRaw`, invariant 8) with
  the `censusZWeight == 0` band fast path and its ±1 halo transcribed; `Taint.kt` (`_try_detect`
  step 2) **zeroes z**: CNN-arbitrated baseline occlusion (unconfident or FEN-agreeing → taint, a
  confident disagreement is a real move and passes through), the resting-hand `pOccluded > 0.5`
  veto, and the motion-or-baseline latch release that re-zeroes z on **every** frame until it fires;
  `NoiseLearning.kt` (step 4) learns the gray lane at exclude-scale 0.0 and the census lane at 0.125
  over `changed ∪ shadowVeto`, **both wrapped in `alarm == null`** (invariant 9). D03a-8 answered:
  Python's `_tainted` values were already `time.time() + motion_hold_s` timestamps (only the
  `dict[str, int]` "frames to clear" annotation is stale), so the expiry map is the same arithmetic
  with `nowS` substituted, and `exp - motionHoldS` IS the taint instant the motion test needs.
  Parity: **247 tier-A frames of all 18 clips** for the veto sets and for the noise replay from the
  constructor state, **969 frames** for "nothing latches and z is untouched", including the 3
  channel-guard frames that take the band path — plus the one fixture square where RAW ≥ 40 and
  NORMALIZED < 40, which fails the whole clip replay if the normalized channel is used. 10
  discrepancies (D03b-1..10). Gate: `:core-engine:test` **33/33** (`VetoesTest` 13, `TaintTest` 14,
  `NoiseLearningTest` 6, 0 skipped) and `ktlintFormat` green on the REAL tree; `ktlintCheck` +
  `detekt` green in an isolated copy of `android/` (the real tree reports one
  `LoopWithTooManyJumpStatements` in 03c's in-flight `HypothesisTest.kt:298`, outside my scope — the
  orchestrator must re-run the module gate). Zero findings in 03b's six files, no `@Suppress`, no
  baseline; `ktlintFormat` touched nothing outside them.
- 2026-07-25 — **03d done**: the engine is assembled. `Commit.kt` (`_set_ref` with the
  `fromCommit` gamut rule — the ONLY `boardColorGamut` call site in the module, `_commit_move` /
  `_commit_sequence` with the shared state tail, `_record_decision` + the verbatim
  `_DECIDER_REASON` vocabulary, and the recorder-free session-capture state machine),
  `Dispatch.kt` (the ONE commit gate: the alarm block as the literal first statement, the pending
  path with its Spec-11 `seq` signature, the direct single/pair commit, and the `VerifyVerdict` /
  `applyVerdict` / `CommitAnchor` seam that makes `cnn_overrule` structurally expressible),
  `AnomalyPatcher.kt` (per-square nudge/drift timers, the overhang-inclusive patch box, the
  identity-keyed census-cache invalidation and the resting-hand ceiling) and the filled-in
  `api/TrackerEngine.kt` — `onFrame` = `FrameLoop.step` + the 9-step `_try_detect`, plus step 5's
  remainder (the scaled re-anchor floor, the ORDERED occluded / no_legal_move / cnn_desync
  bail-outs and the weak-evidence hold), the three commit gates, `status()`, the four
  user-correction paths with the alarm latch release, `choosePromotion` and `updateConfig`.
  **Headline: `ClipReplayParityTest` replays all 18 clips (969 frames) through the public
  `TrackerEngine.onFrame` and matches Python's Tier B frame for frame — ZERO diverging frames,
  every SAN list and final FEN re-derived**, `TrackerConfig` always from `meta.effectiveConfig`.
  12 discrepancies (D03d-1..12); the ones phase 04 must read: **`TrackerEngine` is at exactly 10
  functions and cannot take an eleventh** (D03d-5), `applyVerdict` carries an optional
  `CommitAnchor` because invariant 5 is path-specific (D03d-3), `onCnnSnapshot` already stores the
  snapshot (D03d-2), and `TrackerStatus` has no `tainted`/`promotionPending` field (D03d-9).
  Gate green: `:core-engine:test` **239/239, 0 skipped** (41 new: `DispatchTest` 19, `CommitTest`
  13, `AnomalyPatcherTest` 7, `ClipReplayParityTest` 2), `ktlintFormat`, `ktlintCheck` + `detekt`
  — zero findings module-wide, no `@Suppress`, no baseline, and `ktlintFormat` touched no file
  outside 03d's eight.
- 2026-07-25 — **04b done**: `VerifyPair.tick` ports `_verify_pair_tick` verbatim — touched-squares
  fast-accept (second half read on the MID board, `pairAgree = 0.0` below 3 confident touched
  squares), the vote-gated shadow / commit rungs with the `minConfidentBoard` blind-glance guard on
  both, and the un-gated window end whose "every post-move conflict pre-existed" branch commits as
  `diff_after_verify` instead of re-firing forever. Square sets are `Long` bitboards, no
  `Set<String>`/`Map<String, Double>` outside `api/`, no new holder type. Gate (isolated copy, 04a's
  `pendingVoted` stubbed — D04b-6): `VerifyPairTest` **10/10**, `ktlintFormat` (no reformat of the
  three files), `ktlintCheck` + `detekt` zero findings, whole `:core-engine:test` **248/248, 0
  skipped, 0 failures** with `ClipReplayParityTest` still **18/18 clips, 969 frames, zero
  divergence**. Re-run in the repo once 04a/04c had landed: `VerifyPairTest` 10/10 and the whole
  module **299/299, 0 skipped, 0 failures** (`ClipReplayParityTest` 2/2, still zero divergence).
  The two `ktlintCheck`/`detekt` findings left in the tree at that moment are 04c's `Alarm.kt`
  (`function-signature`) and the `LongParameterList` on 04a's `VerifySingleFixtures` / 04c's
  `RecoveryFixtures` constructors — **none of the three 04b files is involved**. 7 discrepancies (D04b-1..7); the ones the orchestrator must act on: the entry
  signature drops the redundant `obs` and takes `Game` (D04b-1), `ResyncResult` has no `agreement`
  so `_cnn_agreement` is not expressible and was NOT faked (D04b-2), and `CnnEvaluator`'s
  `board: Any` will throw against the real `:core-cnn` evaluator, which requires a chesslib `Board`
  (D04b-3).
- 2026-07-25 — **04a done**: `_verify_tick` ported rung for rung — five occupancy signals with their
  deliberate asymmetry, the five-rung ladder (shadow / commit / ghost hard veto / `cnn_overrule` /
  window end), `_pending_voted` in `PendingVote.kt`, and the `onCnnSnapshot` router (pending has
  priority over the periodic check; `VerifySingle` forks to `VerifyPair` internally). The b1c4,
  d4b3, b1d4, h2h4 and g8h6 incidents each have a named test. **`ResyncResult` had to be extended
  with `move` / `agreement`** — without them `cnn_overrule` (invariant 10, the legacy D3 bug this
  pack exists to fix) cannot be expressed at all; two defaulted fields, `:core-cnn` untouched and
  still compiling, recorded as D04a-1 with the one-line `:core-cnn` follow-up in Blockers. Gate:
  `VerifySingleTest` **19/19**; `ktlintFormat` reformatted none of the four files; `ktlintCheck` +
  `detekt` **zero findings**; whole `:core-engine:test` **299/299, 0 skipped, 0 failures** with
  `ClipReplayParityTest` still **18/18 clips, 969 frames, zero divergence**. The first gate ran in
  an isolated scratchpad copy because 04c's `CnnTick.kt` was mid-refactor (267/267 there, D04a-8);
  every number above is from the re-run **in the repo** with 04b and 04c landed. 8 discrepancies
  (D04a-1..8); three open items for the orchestrator, all in Blockers: `:core-cnn` must forward
  `move`/`agreement`, `board: Any` is fed `Board` here and `Game` in 04b, and `TrackerEngine.cnn`
  is `internal` so `:app` cannot inject.
- 2026-07-25 — **04c done**: the free-running observer schedule (`ObserverSchedule.kt` —
  `_observer_due` with single-flight `cnnBusy` and the 1 s failure backoff, the `_observe_snapshot`
  contract as engine law, and `anchorAtDetSize` which REJECTS a warp that is not at `detSize`
  instead of corrupting the reference resolution), the illegal-move latch (`Alarm.kt` — the per-seq
  desync streak with subset-stability and reset-to-ONE, the occupancy-gated raise that makes
  identity-only conflicts unable to alarm, `releaseAlarm` as the one closed release, and the
  re-derived `_build_alarm_guess_san`) and `_cnn_tick` itself (`CnnTick.kt` — the stuck/periodic
  evaluation gates, the identity read with the b8b6->c6 occupancy fallback, the discard-on-FEN-change
  guard, the match-ok reference pull-forward, the D6 recovery-vote confirmer, the while-alarmed
  "resolves EVERY conflict square or withhold" rule, and the commit that anchors on **`snap.gray` /
  `snap.warped`** with `fromCommit = true` and grants exactly one motion window). Entry point for
  04a's routing: **`EngineState.cnnTick(cnn, snap)`**. 10 discrepancies (D04c-1..10); the ones the
  orchestrator must act on: **`acceptCnnPosition()` and the CNN-resync release are NOT wired** (both
  in 03d's `api/TrackerEngine.kt`, the first is a real feature, not a call), the frozen
  `ResyncResult` carries no `move`/`agreement` so occupancy-only mode reaches its move through
  `deriveMovesDeep` alone, and the two release families emit different `AlarmCleared` reasons.
  Gate (isolated copy of `android/`, because 04a's `VerifySingleFixtures.kt`/`VerifySingleTest.kt`
  were mid-flight and red in the shared tree — those two files were the ONLY ones excluded):
  `:core-engine:test --tests CnnTickTest --tests AlarmLatchTest` **32/32**, then the whole
  `:core-engine:test` **280/280, 0 skipped — `ClipReplayParityTest` still 18/18 clips, 969 frames,
  ZERO divergence** — `ktlintFormat`, `ktlintCheck` and `detekt` all clean; zero findings, no
  `@Suppress`, no baseline, and `ktlintFormat` touched no file outside 04c's six.
- 2026-07-25 — **04x done** (orchestrator, cross-module seam): `CnnEvaluator` now takes
  `boardFen: String` instead of `board: Any` (the mismatch that would have thrown on the first live
  call — `VerifySingle` passed a chesslib `Board`, `VerifyPair`/`CnnTick`/`Alarm` a `Game`,
  `:core-cnn` accepted only the former); `:core-cnn` forwards `resync_check`'s `move`/`agreement`,
  which brings `cnn_overrule` back from the dead; `TrackerEngine.attachCnn()` is the public
  injection point for 05c and arms `cnn_run`; `acceptCnnPosition()` is a real implementation
  (minimal edit, castling pruning, missing-king rejection, latch release) instead of a stub;
  `clearAlarm(String?)` is the single alarm release. New `EngineSeamIntegrationTest` in `:core-cnn`
  drives the public engine API against the REAL `CnnRecovery` — overrule / recovery / alarm — and
  each of its three tests was confirmed RED against the pre-fix behaviour. Gate:
  `:core-engine:test` + `:core-geometry:testDebugUnitTest` + `:core-cnn:testDebugUnitTest`
  **412 tests, 0 failures, 0 skipped** (302/58/52), `ClipReplayParityTest` still **18/18 clips,
  969 frames, ZERO divergence**; `ktlintFormat`, `ktlintCheck`, `detekt` all clean, no `@Suppress`,
  no baseline. 7 discrepancies (D04x-1..7); two items stay open: no `resync_cnn` counterpart and
  no `preview` variant of `acceptCnnPosition`.
- 2026-07-25 — **05a done**: `camera/` in `:app` — `TrackerCamera` is the ONLY class in the app
  that calls `ProcessCameraProvider.getInstance` (one call site, greppable), binds `ImageAnalysis`
  as the only use case with `STRATEGY_KEEP_ONLY_LATEST` + `OUTPUT_IMAGE_FORMAT_YUV_420_888` on a
  dedicated `chesslab-analyzer` thread, and hands the raw `ImageProxy` to a `FrameSink` it closes
  in a `finally`. `DeliveredSize` is built only from the `ImageProxy` (the `a7dab73` regression
  test), `ResolutionMismatchLogger` reports a mismatch once per pair, `ReconnectPolicy` is the pure
  3/6/12/24/30 s backoff with the one-shot diagnosis, the single 720p downshift and the 10 s
  sustained-recovery reset. 4 main files (356 LOC, max 184), 3 test files, 9 tests green;
  gate run in an isolated copy because 05b's `pipeline/` does not compile right now — tests +
  ktlintCheck + detekt all clean, zero findings in `camera/`. 7 discrepancies (D05a-1..7); the
  4-item manual device checklist is untested and deferred.
- 2026-07-25 — **05c done**: the ONNX classifier and the CNN observer thread. `ModelSpec.parse`
  reads classes / `out_size` / `normalize` from the asset `config.json` and refuses to load on a
  reordered 14-class list or a non-128 crop (`ee7c83c`); `OnnxSquareClassifier` walks the
  **QNN-HTP(NPU) → NNAPI → CPU** chain with the graph pairing made unrepresentable-if-wrong by an
  `Ep` enum (QNN only ever sees `model.qnn.onnx`), and runs **all 64 crops in ONE session call**
  through a reused direct `FloatBuffer`, calling `:core-cnn`'s `preprocess` (no second copy) and
  softmaxing the log-probability head; `CnnObserver` is a single-thread dispatcher with
  `_observer_due`'s spawn guard, single-flight `cnnBusy`, `observerIntervalS` pacing, the 1 s
  failure backoff and the FEN captured **at observation start**, producing `CnnSnapshot` for the
  callback 06c wires. **Attach failure is loud by construction**: `CnnState`
  (`Off | Attaching | Ready(backend, model) | Failed(reason)`) as a `StateFlow`, ERROR log with
  the throwable, sticky `Failed` that only `retryAttach()` clears, and exactly one
  `CNN inference backend: …` line per session — `grep -rn "catch" cnn/` is empty (runCatching +
  log + transition everywhere). Gate: `:app:testDebugUnitTest --tests "com.chesslab.tracker.cnn.*"`
  **19/19, 0 skipped, 0 failures**, `ktlintFormat` (touched no file outside `cnn/`), `ktlintCheck`
  + `detekt` **zero findings for the whole `:app` module** (run with `--rerun-tasks`, so 05a's and
  05b's in-flight files were analysed too and were clean at that moment). 9 discrepancies
  (D05c-1..9); the notable one is D05c-8: `onnxruntime-jvm` lets the **real committed
  `model.onnx`** load and classify 64 crops on the host CPU EP, so the whole
  stage → parse → EP-fallback → batched-run path is covered by a test, and only the device EP
  selection and the on-device `inferMs` remain manual.
- 2026-07-25 — **05b done**: `pipeline/` ports `_loop`'s per-frame order (size guard → YUV→BGR →
  detection warp @ `detSize` → dark gate on PRE-CLAHE luma → `_gray` → `_roi_motion` → grid
  coverage → `FrameInput`; the bordered `warpBoardForCrops` runs ONLY on `CropFrameStore`
  demand, per invariant 1 and `4a7609e`). 7 main files (845 LOC, largest 176), all `Mat`s and the
  NV21 buffer are long-lived fields, no ArUco / no classifier / no blocking call in the package.
  `StageTimings` fills `convert/warp/gray/motion/grid/total` for `TrackerStatus.stageTimingsMs`
  (the engine cannot: wall-clock ban) and logs `chesslabPerf` at 1/s. Gate:
  `:app:testDebugUnitTest --tests "com.chesslab.tracker.pipeline.*"` **23/23, 0 failures**,
  `:app:ktlintFormat` (no drive-by outside `pipeline/`), `:app:ktlintCheck :app:detekt` BUILD
  SUCCESSFUL, zero findings. 8 discrepancies (D05b-1..8); one blocker-grade item stays open —
  `motionScore` is `internal` to `:core-engine`, so the ROI stage carries a local 8-line port.

- 2026-07-25 — **06b done**: the tracking screen the user actually looks at. 16 source files,
  **1606 LOC, largest 170** (legacy: one 664-LOC `TrackingScreen.kt`); the board renders from
  `status.fen` and nothing else, the UI holds no `TrackerEngine` reference and collects the sampled
  status exactly once, and every action is an `EngineAction` value handed to 06c's binder. Alarm =
  red board scrim + card + Accept-CNN preview whose Cancel provably dispatches nothing; promotion
  dialog is a pure fold over `PromotionPending`/`MoveCommitted` and is not dismissible. Nav host
  registers `tracking` + `calibration` and reserves the four later routes. Gate:
  `:app:testDebugUnitTest --tests "com.chesslab.tracker.ui.tracking.*"` **17/17, 0 failures**,
  `:app:ktlintFormat` + `:app:ktlintCheck` BUILD SUCCESSFUL, `:app:detekt` clean for every file
  06b owns (one remaining finding is 06c's `TrackerCoordinator`). 10 discrepancies (D06b-1..10);
  three items open: no `CalibrationHost` provider, no corners in `TrackerStatus`, no CNN-read
  preview for the alarm dialog. Manual checklist not run (no device).
- 2026-07-25 — **06a done**: board calibration that binds no camera. 9 source files, **1113 LOC,
  largest 207**; ArUco auto-detect single-flight on `Dispatchers.Default` off the service's
  `latestCalibrationFrame()`, manual 4-tap fallback whose taps are stored in TAP ORDER and never
  sorted, and a **mandatory** orientation-confirmation step (rectified board + a8/h1 outlines +
  live-flipping file/rank gutters) without which `canSave` is false and `save()` writes nothing.
  Profile persists as versioned JSON in its own DataStore with Python's `ensure_profile`
  carry-over: `whitePov`/`boardSize`/`margin`/`markerDict`/`crop` survive a recalibration, only the
  corners and the source size are replaced. `grep ProcessCameraProvider.getInstance` over `:app` is
  still **1**; `ui/` has zero CameraX types. Gate:
  `:app:testDebugUnitTest --tests "com.chesslab.tracker.geometry.*" --tests
  "com.chesslab.tracker.ui.calibration.*"` **18/18, 0 failures**, `:app:ktlintFormat` +
  `:app:ktlintCheck` BUILD SUCCESSFUL live over the whole module, `:app:detekt` clean for every
  06a file. 8 discrepancies (D06a-1..8); **D06a-1 touches two SHARED files** (`android/.editorconfig`
  is new, `config/detekt/detekt.yml` gains a Compose `FunctionNaming` exemption) — without them no
  Compose file in `:app`, 06b's included, can pass lint. Open for the orchestrator: nobody provides
  `LocalCalibrationHost` yet (06b's D06b list has the mirror item). Manual checklist not run (no device).
- **06c (service), 2026-07-25** — the app is runnable: `TrackerService` is the single camera AND
  engine owner, `EngineHost` enforces the one-thread contract with a latching
  `check(Thread.currentThread() == owner)`, and the analyzer loop drains queued UI actions and CNN
  snapshots BEFORE `onFrame`. 14 source files, **1189 LOC, largest 172** — the legacy
  `TrackerService.kt` was 970 in one file. `TrackerConfig` persists through a 46-row knob table
  (`ConfigKnobs.kt`), of which exactly the twelve `app.py::_live_tuning_kwargs` knobs are live; the
  rest report `restartRequired`. Side effects are routed, never reimplemented: one `UpdateConfig`
  action calls `TrackerEngine.updateConfig` and `FramePipeline.onConfigChanged` on the same thread
  in the same tick. 23 tests green; `:app:ktlintCheck` + `:app:detekt` BUILD SUCCESSFUL **live over
  the whole module** (06a/06b's recorded `TrackerCoordinator LongParameterList` finding is fixed,
  D06c-7). 14 discrepancies (D06c-1..14); the one that costs time twice is **D06c-12** — a
  hand-rolled `TestScope` around `sample`/`stateIn` makes `:app:testDebugUnitTest` HANG, use
  `backgroundScope`. Manual checklist not run (no device).
- **07a (settings), 2026-07-25** — every one of the **46** `TrackerConfig` knobs is on the phone,
  grouped by concern, each with the Python default beside the live value, a range, and one line of
  help taken from `config.py:590-646` (including why `censusThr` is 40 and not 160, and why
  `occlusionColorThr` is 3.0 and not the historic 1.5). A reflection test over `TrackerConfig`'s
  fields fails in BOTH directions, so a knob added to the seam cannot silently go unexposed. Exactly
  the twelve `app.py::_live_tuning_kwargs` knobs are live; the other 34 persist immediately, show an
  amber chip and are named in a restart bar — and the bar tells the truth, because **`TrackerService`
  has no `restartTracker()` (D07a-1, blocker, one line to fix)**. Plus per-group and global reset,
  the app-level section (resolution / orientation / model / EP — stored, none consumed yet,
  D07a-11), a JSON export with a `nonDefault` section, and the debug route behind the settings
  screen. 8 new files, 965 LOC, largest 209; 33 tests green. 12 discrepancies (D07a-1..12); the one
  that costs time is **D07a-10** — `advanceUntilIdle` does not run `backgroundScope` work, so a
  persist launched there silently never happens.
- 2026-07-25 — **07c done**: the Stockfish native build is wired and real (`externalNativeBuildDebug`
  42 s for arm64-v8a + x86_64, `assembleDebug` 57 s, `extractNativeLibs="true"`, `libstockfish.so`
  deflated in the APK = installer-extracted = exec'able). `analysis.py` is ported as a **persistent
  polling analyzer** on its own `chesslab-analysis` thread at `THREAD_PRIORITY_LOWEST`, multipv 3 /
  400 ms / 2 threads / 64 MB, self-disabling without a binary, gated off under thermal/battery
  pressure and whenever the tracker's median frame exceeds 66 ms. Off by default. 31 tests green;
  gate ran in an isolated worktree because 07a/07b had `:app:compileDebugKotlin` red. 9 discrepancies
  (D07c-1..9); the two that matter: **D07c-1** the phase file's `TrackerService.uiState`/`isTracking`
  never existed (the `TrackerSession.status` seam is used instead, and it is strictly better — it
  carries `stageTimingsMs`), and **D07c-9** the real binary cannot run on the host JVM, so phase 09
  must play one live game with analysis ON and watch the fps.
- 2026-07-25 — **07b done**: the debug surface `specs/12` D5 cut is back, behind the settings screen
  and off by default. `DebugPayload` is filled in (decisions, 64 CNN reads, the taint set
  `TrackerStatus` never had, the gates each panel measures against) and rides on the published
  snapshot — no second flow, no binder callback, no broadcast. Six panels: per-stage timings with
  last/median/p95 and a red line at 66 ms; the evidence heatmap with `changed` / shadow-vetoed /
  occlusion-vetoed as three distinct channels and the legend "shadow keeps z, occlusion zeroes it";
  the 64-crop model-input grid in `all_squares()` order, taken from the inference path's own crops
  and labelled as phase 09's crop-parity reference; per-square CNN reads with the FEN conflicts
  pinned; a decision log that now also records REJECTED candidates, ring-capped at 64, exportable as
  text with the full config header; and a loud CNN attach/EP panel whose FAILED banner is a pure
  function of the state, so dismissal is not representable. Cost when closed is nil by construction —
  `TrackerStatus.debug` is null and nothing is assembled (two tests, 1000 frames each). 17 files,
  1774 LOC, largest 178; 21 tests green; **`:core-engine:test` still 18/18 clips, zero divergence**.
  12 discrepancies (D07b-1..12); the ones to read are **D07b-5** (the phase file's
  `TrackerService.setDebugEnabled` / `05c.latestObservation` seams never existed — an `EngineAction`
  and a `CnnFrameSource` decorator replace them) and **D07b-4** (rejections are logged with a
  consecutive-duplicate fold, or one static phantom evicts the whole ring in a second).
- 2026-07-25 — **perf + overlay pass done**: `preprocessInto` (12 583 128 B → 72 B per observation,
  measured), grid-line Canny skipped while the gate is off (0.87 ms/frame, only when disabled —
  D05b-7 stays open in reduced form), `TrackerStatus.corners` + a drawn board quad (closes D06b-4;
  `entry.md` seam updated). Gate run in an isolated worktree (the shared tree was mid-edit by a
  concurrent agent): 312 / 54 / 177 tests, 0 failures, 18/18 clips zero divergence, ktlint + detekt
  clean.
- 2026-07-25 — **08c done**: spoken move announcement. `MovePhrase` (SAN -> speech, three verbosity
  modes, en/de table with an English fallback, disambiguators kept), `SpeechEngine` + `UtteranceQueue`
  (lazy `TextToSpeech`, transient-may-duck focus per utterance, silent/vibrate/DND suppression, at
  most 3 live utterances — a 10-move burst speaks 3 and "and 7 more moves"), `MoveAnnouncer`
  (collects on `Dispatchers.Default`, drops the backlog and stays silent while the alarm is latched,
  announces the alarm once with the only `QUEUE_FLUSH` in the package), `SpeechSettingsScreen`, and
  one registration + teardown in `TrackerService`. Off by default; 6 src (698 LOC, max 143), 30
  tests green, ktlint + detekt clean. 6 discrepancies (D08c-1..6); the ones to read are **D08c-1**
  (four keys added to `AppSettings` — a second store was forbidden) and **D08c-3** (the acceptance
  greps land in `AndroidSpeech.kt`, the file that exists so the policy is host-testable).

- 2026-07-25 — **08b done**: LAN spectator. `SpectatorServer` (Ktor CIO, `refresh(enabled)` as the one
  reconciliation point, port probed before binding), `WifiAddress` (`wlan*` + site-local IPv4 only,
  never `0.0.0.0`), `GameSnapshot` (6 fields, no engine internals), `SpectatorPage` (one
  self-contained document, inline CSS/JS/glyphs, polls `/api/status` every 1000 ms, first paint from
  an embedded snapshot), `QrCode`, `SpectatorController` (status/event fold, Wi-Fi callback, ongoing
  notification with Stop) and `SpectatorScreen`. Two GET routes and nothing else — proven by route
  inspection (`RoutingRoot` leaves), by 405 on POST/PUT/PATCH/DELETE across both paths, and by 404
  on unknown paths. Off by default; 7 src (661 LOC, max 190), 21 tests green, ktlint + detekt clean,
  `:app:assembleDebug` green. APK 163.22 -> 163.30 MB (+0.08); Ktor+ZXing measured separately at
  **5.82 MB** of dex, already paid at `dc6b38a`. Gated in an isolated worktree at `dc6b38a` — the
  shared tree did not compile (08a's `games/`, `record/` mid-edit). 6 discrepancies (D08b-1..6); the
  ones to read are **D08b-1** (`TrackerService.uiState` never existed; `TrackerSessionHost` replaces
  it) and **D08b-6** (a 7th file, `SpectatorController.kt`, and a process-singleton lifecycle because
  the owning service scope belongs to 08c this phase).
  **The nav route and the settings row are 08a's**, per the ownership registry; the screen is
  `com.chesslab.tracker.spectate.ui.SpectatorScreen(onBack: () -> Unit = {})` and is unreachable
  until 08a wires it.
- 2026-07-25 — **08a done**: the game library, PGN export and opt-in session recording.
  `games/` — `GameStore` (app-private `index.json` + `<id>.json` + `<id>.pgn`, every write temp-file
  + `ATOMIC_MOVE` with a copy fallback), `PgnBuilder` (seven-tag roster, **`SetUp`/`FEN` whenever
  the game did not start from the start position**, correct move numbering and the `12...` ellipsis
  for a black-to-move start, 80-column wrapping, sanitized brace comments behind an export toggle
  that is **off by default and byte-identical to a plain PGN**), `LiveGame` (accumulates committed
  moves, detects an undo from the published FEN) and `GameSessionController` (event stream -> saved
  game, auto-saves on a mate/draw, never saves an empty game).
  `record/` — `RecordingGates` (`physicalInventoryViolations` ported from `state.py`, plus the
  geometry gate that SUSPENDS instead of stopping, docstring included), `SessionRecorder`
  (`collect.py::SessionWriter` on the phone: `session.yaml` + one `log.jsonl` line per capture with
  `ply`/`fen`/`move_san`/`corners` in `[a8, h8, h1, a1]`, raw frames only, consistent undo),
  `SessionCaptureController` (`_queue_session_capture` / `_flush_session_capture` incl. deferral to
  the quiet re-anchor, both gates re-run at flush, no auto-start with the toggle off, size cap),
  `SessionStore`/`SessionExporter` (size indicator, delete, SAF ZIP) and `LiveCaptureSource`
  (JPEG q90 at grab time, `Mat` released immediately). Recording is **off by default**, capped at
  1 GB, and its cost is stated on the toggle.
  17 src (1701 LOC, max 199), 8 test files, **41 tests green**, ktlint + detekt clean, no manifest
  edit and no storage permission of any kind. 12 discrepancies (D08a-1..12); the ones to read are
  **D08a-1** (no `FileProvider` — the manifest is 06c's, so a PGN shares as `EXTRA_TEXT`),
  **D08a-4** (the `TrackerService` API the phase file assumes does not exist; recording was driven
  from the composition and therefore paused when the UI was destroyed — since fixed, see "Game
  session ownership (D08a-4 fix)") and **D08a-5** (`flushSessionCapture` never crosses the seam, so the
  deferral is re-ported app-side on `MoveCommitted` + `ReAnchored`).

## APK size

2026-07-25 — the debug APK went from **329.8 MB to 163.2 MB (-50.5 %)** with three build-config
changes. Scope was `android/app/build.gradle.kts` and `android/gradle/libs.versions.toml`;
`android/app/src/main/cpp/CMakeLists.txt` was read in full but **not modified** (see "declined"
below). No Kotlin source was touched.

### Measurement caveat, read this before comparing numbers

AGP packages the APK incrementally and leaves *holes* where entries were removed — the file keeps a
gap instead of being rewritten. The 329.8 MB baseline carried ~23 MB of such holes (sum of zip
entries was only ~306.8 MB), and the first post-change measurement reported an unchanged 207.3 MB
while the entry sum had already dropped 13 MB. **Every number below is from a clean repackage**
(`Remove-Item app/build/intermediates/apk; :app:packageDebug --rerun-tasks`), and file size and
entry sum are quoted together so the two can never drift apart again unnoticed.

| step | APK file | zip entry sum | delta |
|---|---|---|---|
| baseline (HEAD 65d7186) | 329.8 MB | ~306.8 MB | — |
| 1. arm64-v8a only | 207.3 MB | 207.0 MB | -122.5 MB |
| 2. + unused QNN backends excluded | 194.4 MB | 194.3 MB | -12.9 MB |
| 3. + `material-icons-extended` dropped | **163.2 MB** | 163.1 MB | -31.2 MB |

Final `lib/arm64-v8a` = 121.9 MB, dex = 37.3 MB (was 66.4 MB across 3 fat `classesN.dex`),
`assets/cnn_model` = 2.9 MB.

### 1. x86_64 dropped — capability traded away, stated plainly

`abiFilters` is now `listOf("arm64-v8a")`. **This removes emulator support**, and x86_64
Chromebooks with it. The trade is deliberate: the app is a camera-driven board tracker, so an
emulator has no board to film, and it has no Hexagon NPU either — the CNN would run on the
emulator's CPU path, which is not the path anyone needs to test. The x86_64 slice cost 99.7 MB of
packed APK (mostly a *second* copy of the embedded NNUE nets) plus a full second Stockfish compile
on every clean build. ABI *splits* were considered and rejected: with one ABI left they add nothing,
and they would have kept paying the x86_64 native build cost. `CMakeLists.txt` keeps its `x86_64`
flag branch untouched, so re-enabling is a one-word revert of the `abiFilters` line.

### 2. Unused QNN backends excluded — 12.9 MB, `libQnnHtpPrepare.so` deliberately KEPT

`OnnxSquareClassifier` passes `backend_path = libQnnHtp.so`, so the GPU and legacy DSP backends can
never be loaded, and of the HTP variants only the SoC's own Hexagon version is ever `dlopen`'d.
Excluded via `packaging.jniLibs.excludes`: `libQnnGpu.so`, `libQnnDsp.so`,
`libQnnDspV66Skel/Stub.so`, `libQnnHtpV68/V69/V73 Skel+Stub.so` (SD 888 / 8 Gen 1 / 8 Gen 2).
**Kept**: `libQnnHtpV75*` (the 8 Gen 3 target device) and `libQnnHtpV79*` (8 Elite, so a newer phone
does not silently lose the NPU) — V79 costs 3.2 MB and is cheap insurance against exactly the
silent-fallback failure this lever risks.

`libQnnHtpPrepare.so` (52.5 MB raw / 22.9 MB packed) is the single biggest item that was *not*
removed, and that is a decision, not an oversight. The hypothesis that the staged model is
"pre-prepared" is **false**: `assets/cnn_model/model.qnn.onnx` was inspected and contains
`QuantizeLinear` / `DequantizeLinear` nodes and **no** `EPContext`, `ep_cache_context`,
`main_context` or `QNNExecutionProvider` marker. It is a plain QDQ graph, so QNN compiles it on
device at `createSession` time and needs Prepare. Excluding it would not fail loudly — the EP chain
in `OnnxSquareClassifier.open` catches the failure, logs a WARN and falls through to NNAPI, i.e. the
NPU fast path would disappear while everything still "worked".

### 3. `material-icons-extended` was declared and never used — 31.2 MB of dex

`androidx.compose.material.icons` appears in **zero** Kotlin files in the whole `android/` tree
(`grep -rn "material.icons\|Icons\." --include=*.kt` -> no hits), yet the dependency shipped the
entire extended icon set as generated Kotlin: 31.2 MB packed across `classes.dex` (33.7 -> 15.9 MB),
`classes15.dex` (20.2 -> 11.3) and `classes16.dex` (12.5 -> 8.4). Removing it needed no code change
and the build proves it — `:app:compileDebugKotlin` is green without it. `material3` still brings
`material-icons-core` transitively, so `Icon` / `IconButton` are unaffected. The version-catalog
alias is kept with a comment; wire it back in the module that first writes an actual `Icons.*`
symbol.

Untouched per instruction: **no R8/minify for debug**, and `release { isMinifyEnabled = false }` was
left exactly as it was, so 07a's `declaredFields` settings-catalog reflection is not at risk.

### Declined: the 76 MB Stockfish net — needs a code change, filed for the orchestrator

`libstockfish.so` is 108.5 MB raw / 76.0 MB packed and is now **47 % of the whole APK**. Essentially
all of it is one file: the build dir holds `nn-c288c895ea92.nnue` at **108.9 MB** (big) next to
`nn-37f18f62d772.nnue` at **3.5 MB** (small), both `INCBIN`-embedded by `nnue/network.cpp`.

"Embed only the small net" **does not work, and this was verified in the submodule source, not
assumed**: `Network::verify()` in `third_party/stockfish/src/nnue/network.cpp` prints
`"The engine will be terminated now."` and calls `exit(EXIT_FAILURE)` when the named net did not
load, and `Engine::verify_networks()` runs it for *both* nets. A stubbed or truncated big net does
not degrade analysis strength — it kills the engine process at startup. There is also no smaller
compatible big net: the file name encodes a SHA-256 prefix and the architecture hash is checked on
load.

The viable route is the other one, and it is **out of this agent's scope because it is Kotlin**:

1. `CMakeLists.txt` compiles with `NNUE_EMBEDDING_OFF` and stops embedding (both nets — the macro is
   all-or-nothing).
2. `AnalysisHost` / `UciEngine` fetch `nn-c288c895ea92.nnue` on first *use of analysis* into app
   storage. Note `UciEngine` currently does `ProcessBuilder(it)` with **no** `.directory(...)`;
   `Network::load` searches `{"<internal>", "", rootDirectory}`, so setting the process working
   directory to the download dir is what makes the file findable — `rootDirectory` is
   `nativeLibraryDir`, which is read-only.
3. Ship the 3.5 MB small net as an asset (cheap) and pull only the 108 MB big net over the network.

Payoff ~ **76 MB packed, taking the debug APK to ~87 MB**. Cost: analysis needs a one-time 108 MB
download, and the first-run UX for a feature that is off by default has to be designed. Worth doing;
not worth an unreviewed cross-scope edit while two agents are live in `service/` and `cnn/`.

### Also declined

- **ABI splits** — see lever 1; pointless with a single ABI and they keep the x86_64 build cost.
- **Dropping `libQnnHtpV79*`** — 3.2 MB is not worth a silent NPU loss on a future phone.
- **A pre-compiled QNN EPContext binary** (which *would* let `libQnnHtpPrepare.so` go, -22.9 MB) —
  it must be generated on/for the exact SoC, it is a new build artifact plus an `ep.context_enable`
  code path, and getting it wrong degrades silently. Filed as a follow-up, not attempted.
- **`useLegacyPackaging`** — left `true`. It is load-bearing (the Stockfish executable must be a
  real file in `nativeLibraryDir` to be exec'd on API 29+) *and* it is already the APK-size-friendly
  setting: flipping it to `false` stores the libs uncompressed and would push the APK back to
  ~300 MB.

### Gate

`:app:assembleDebug` + `:app:ktlintCheck` + `:app:detekt` — **all green**, run in an isolated
worktree at HEAD `65d7186` with only the two config files copied in. The shared tree could not be
gated: concurrent agents had `service/TrackerStack.kt` mid-extraction
(`Cannot access 'fun cnnConfig': it is private in file`) and two ktlint violations in
`geometry/CalibrationStore.kt` — neither is reachable from a build-config change, and the worktree
run reproduced the same 163.19 MB APK byte-for-byte.

**Verified**: the exact `lib/arm64-v8a/*` contents of the shipped APK (V75 + V79 Skel and Stub,
`libQnnHtp.so`, `libQnnHtpPrepare.so`, `libQnnSystem.so` all present; every excluded lib absent, and
no `lib/x86_64/` at all), that the QDQ model is not an EPContext binary, and that Stockfish exits on
a missing net. **Not verified, deferred to phase 09** (no device was attached — `adb devices` came
back empty): that QNN still actually selects on the 8 Gen 3 after the Skel prune. The check is one
line — `CnnState` reports the chosen EP, and the debug screen's EP panel must read `QNN-HTP(NPU)`,
not `NNAPI`. If it reads `NNAPI`, restore `libQnnHtpV73*` first; that is the only plausible
mis-prune.

## Game session ownership (D08a-4 fix)

The game/recording driver moved out of the composition and into the service.

- **New `service/GameSessionWiring.kt` (125 LOC).** `wireGameSession(context, scope, frames,
  publisher, calibration)` builds the `GameSessionController` (08a's `buildController` moved
  verbatim, including the `totalBytes()` baseline snapshot) and publishes it to `GameSessionHost`;
  `attachGameSession(scope, controller, events, status, profileName)` is the driving half and the
  part under test. `TrackerService.wireSession` calls it in the **session** half — one line —
  and `onDestroy` publishes `null` and calls `endAndSave()`.
- **`ui/games/GameSessionAttachment.kt` → `GameSessionHost.kt`.** `AttachGameSession()` is gone,
  and with it its call in `ChesslabNavHost`. What remains is observation only: `GameSessionHost`,
  `RecordingSettingsHost`, `gamesDir`/`sessionsDir`/`gameId`. `GamesScreen` already read the host,
  so no screen changed.

### Discrepancies

- **D08a-13 — recording survives a tracker restart, on purpose.** The session is attached to the
  service's `lifecycleScope`, not to `TrackerStack.scope`. A restart exists to apply the 34
  construction-time knobs; the game being played is not a knob, and the position, the calibration
  and the camera binding survive it too. Making recording stack-lifetime would end a session (and
  split a game) every time the user changed a threshold. `StatusPublisher` and `CameraFrameBus` are
  themselves session-lifetime, so nothing has to be re-collected after the swap.
  `GameSessionDriverTest.aTrackerRestartDoesNotInterruptTheSession` pins it against a scope built
  exactly the way `TrackerStack` builds its own.
- **D08a-14 — the service now ends the game on destroy.** Previously the controller died with the
  composition and an in-progress game was simply lost. `onDestroy` calls `endAndSave()`, which
  returns `null` for a zero-move game, so a start/stop cycle still leaves the library alone. Kept
  cheap on purpose: `SessionRecorder` already writes `session.yaml` at init and appends `log.jsonl`
  per capture, so even a killed process leaves a session `slice` can read; `finish()` only restates
  the yaml.
- **D08a-15 — the calibration profile is now read from a `StateFlow` inside the wiring**, not from
  a composable's `rememberUpdatedState`. `wireGameSession` collects `CalibrationStore.profile` into
  a `MutableStateFlow` on the service scope and hands the capture path `latest::value`, so a
  recalibration under a running game reaches the next capture (same behaviour as 08a, without the
  composition).
- **D08a-16 — threading is deliberately unchanged**: both collectors run on the service's main
  scope, exactly where the composition used to run them. The frame grab
  (`latestCalibrationFrame()` → clone → JPEG → release, in `LiveCaptureSource`) therefore still
  never touches the analyzer thread, and the 15 fps tracking budget is untouched. Moving the driver
  to `Dispatchers.Default` was considered and rejected: `GameSessionController` has no locks and the
  games screen calls `endAndSave()` from the main thread, so a background driver would introduce a
  data race for no measured gain.
- **Not verifiable without a device:** that recording actually continues while the screen is off —
  the proof is that the driver's scope is the service's, which is asserted in JVM tests, but the
  end-to-end behaviour (foreground service kept alive, frames still arriving at ~5 fps, JPEGs landing
  in `filesDir/sessions`) needs a phone. Check on device by starting a recorded game, locking the
  screen for a few moves and confirming the session's `log.jsonl` has no gap.

### Gate

- `:app:testDebugUnitTest` — **BUILD SUCCESSFUL**, 292 tests in `:app`, 0 failures, including the 3
  new `service/GameSessionDriverTest` cases; 08a's `GameSessionControllerTest` unchanged and green.
- `:app:ktlintFormat` then `:app:ktlintCheck` — **BUILD SUCCESSFUL**.
- `:app:detekt` — **FAILS on a foreign file**: `LongParameterList - 9/8 - [SimClip] at
  app/src/test/kotlin/com/chesslab/tracker/sim/SimClips.kt:37`, the concurrent simulation-harness
  agent's new test source set. It is the only finding in the whole report; no file touched here
  appears in it.
- `:core-engine:test --rerun-tasks` — **BUILD SUCCESSFUL**, 312 tests, 0 failures;
  `ClipReplayParityTest` green, i.e. **18/18 clips, zero diverging frames**.

---

## CNN clip simulation (2026-07-25)

`scripts/emit_parity_fixtures.py:262` replays every clip with `cnn_run=None`, so all 969
committed parity frames exercise the **diff path only**. The verify ladder, pair verify, recovery
and the illegal-move alarm had never run against real video — only against hand-built probability
arrays. This section records what happened when they did.

**Harness:** `android/app/src/test/kotlin/com/chesslab/tracker/sim/`, class
`CnnClipSimulationTest`. mp4 → board warp → 64 crops → the committed `model.onnx` on the ONNX
Runtime CPU provider → `CnnRecovery` → `TrackerEngine` (public seam only) → committed move list,
compared to `tests/data/testclips/<clip>.labels.json`. Opt-in:

```
.\gradlew.bat :app:testDebugUnitTest -Pchesslab.sim=true --tests "com.chesslab.tracker.sim.*"
```

It lives in `:app` because `:app` is the only module that can see BOTH the ONNX classifier and the
model assets; `:core-cnn` and `:core-geometry` test sources cannot. JavaCV/bytedeco (the same
artifacts `:core-geometry` already declares) were added to `:app`'s test classpath for mp4 decode
and the desktop OpenCV JNI library.

**Config** is `parity/<clip>/meta.json → effectiveConfig`, field for field, including the explicit
`settleFrames`/`avgFrames`/`confirmFrames` overrides. The ONLY deliberate change is
`attachCnn(CnnRecovery(...))`; the overrides are what keep that from silently also flipping the
frame counts from 4/3/2 to 3/2/1 via `EngineState.cnnOn`. Corners come from the clip's
`labels.json` and are frozen (`liveAlign = false`), exactly as the fixture generator establishes
them — the clips carry no ArUco markers.

### Result

| | clips |
|---|---|
| diff-only baseline, full rate | **18/18** reproduce `labels.json` |
| CNN attached, full rate | **14/18** |
| CNN-caused regressions | **4**: `blender-promotion`, `blender-underpromo`, `blender-stalemate`, `blender-queenside` |

The 18/18 diff-only line is itself new information: the committed fixtures only assert a *sampled*
frame subset, and this is the first Kotlin run over every frame of every clip.

### Findings — record only, NOT fixed in this task

Every one of the four is triggered by a **confident and wrong** occupancy reading. The audit built
into the harness scores each observation against `labels.json`'s per-frame FEN (occluded frames
excluded), so the observation is measured independently of what the engine believed.

- **S17-SIM-1 — `onMatchOk` pulls base truth forward past an unseen move.**
  `blender-stalemate`, frame 27. The board is `k7/8/8/8/8/8/2Q5/7K`; after `Qc7` the model reads
  c2 as `wQ` again (its ONE confident error in the whole clip, 1/111). `resyncCheck` therefore
  matches, `CnnTick.onMatchOk` fires the stuck-path re-anchor
  (`setRef(anchor, fromCommit = true)`, note *"CNN: board unchanged — reference pulled forward
  (no move)"*, `verifyState = resynced`) and the move is baked into the reference. From frame 43
  the diff sees 7–8 changed squares → `too_many_changed`, and `Qc7` is never committed. The
  diff-only run commits it at frame 44. CNN recovery does start at frame 51
  (*"CNN recovery checks c2c7… (1/2)"*) but the clip ends before the second confirming
  observation. Evidence: the note streams of both runs are identical up to f21 and diverge only
  after the f27 pull-forward.
- **S17-SIM-2 — one persistent misread latches `cnn_desync` and starves the reference.**
  `blender-promotion` / `blender-underpromo` (same scene, `6k1/4P3/8/8/8/8/8/6K1`), frames 3–15.
  The white king on g1 is confidently read as EMPTY in every clear observation (`wK→empty ×2`).
  `TrackerEngine.quietOutcome`'s desync branch then marks `cnn_desync` and refuses the quiet
  re-anchor (*"quiet board but CNN disagrees on g1 — holding reference"*). With no commit to
  refresh the reference either, drift accumulates: 13–14 changed squares from frame 43, and the
  promotion is never committed. The diff-only run commits `e8=Q+` at frame 44. On a sparse board
  a single stuck square is enough to hold the veto indefinitely.
- **S17-SIM-3 — `cnn_overrule` replaced a correct diff move on a 1-square margin.**
  `blender-queenside`, frame 182. The diff correctly proposes `Bf4`; `VerifySingle` rung 4 sees
  the CNN's `scoreMoves` prefer `c1g5`, collects `verifyObsVotes = 2` votes and commits **Bg5**
  (*"Move detected: Bg5 (CNN overruled Bf4)"*, `verifyState = overruled`). With `cnnMarginSquares
  = 1`, "strictly better by one square" is enough — a missed piece on the true destination plus an
  unconfident alternative destination clears the bar. The phantom bishop on g5 then poisons the
  rest of the game: rung 5's whole-board check rejects `Qd2` twice with *"board contradicts
  post-move position: g5"*, `Qd7` is lost, and `O-O-O` never commits. This clip has the set's
  worst observations: 13.5 % of confident occupancy statements wrong, `wB→empty ×5`.

### Model behaviour on these renders (context for all three)

Confident-occupancy error rate per clip ranges from 0.9 % (`blender-stalemate`) to 13.5 %
(`blender-queenside`); confident-identity error tracks it closely. The dominant confusion is
`piece → empty` (`bP→empty`, `wN→empty`, `wB→empty`, `wK→empty`) — the model *misses* pieces
rather than mistyping them, which is the failure mode all three findings are built on.

This is not a harness artefact. Measured A/B: rendering the crops from a `boardSize = 1600` warp
instead of the clip's 640 moves the error by < 0.2 pp and changes no clip's outcome, at 4× the
crop cost (15.6 vs 3.9 ms per observation). The board spans only ~249 px of the 640×640 render, so
a square carries ~31 real pixels either way — see the memory note *"Synth crop resolution gap"*.
Whether the same three engine behaviours would also fire in Python with this model is **not
established here**; the Python emitter has no CNN path. That cross-check is the natural follow-up
before any of S17-SIM-1..3 is treated as a port bug rather than as documented behaviour.

### Timing (desktop CPU — bounds nothing about on-device fps)

Over 2168 frames / 2168 observations, one observation per frame (`observerIntervalS = 0.0`):

| stage | ms |
|---|---|
| detection warp | 0.63 / frame |
| gray + CLAHE | 0.35 / frame |
| ROI motion | 0.84 / frame |
| engine `onFrame` | 1.33 / frame |
| 64 crops (bordered warp + `cropSquare`) | 3.98 / observation |
| ONNX inference, 64 crops, CPU provider | 34.22 / observation |
| **total** | **41.3 / frame → 24.2 fps** |

The CPU provider is ~11× the whole rest of the pipeline. On device that call goes to the QNN/HTP
NPU, so this ratio is an upper bound on the CNN's relative cost, not a prediction — the point it
does make is that everything OTHER than inference costs ~3 ms/frame, i.e. the diff path alone
would run at >300 fps on this machine.

### What the harness cannot exercise

CameraX (binding, delivered-vs-requested resolution, reconnect), Compose UI, the foreground
service and its threading, QNN/NNAPI execution providers, thermal throttling and sustained-load
behaviour, ArUco marker detection and live corner alignment (`liveAlign = false` on these clips),
and real-camera photometry — every clip here is a Blender render.

## Python CNN cross-check (2026-07-25)

The open question from the section above — *"whether the same three engine behaviours would also
fire in Python with this model is not established here"* — measured. **Result: no port defect. All
four regressions reproduce in the Python tracker, on the same clips, at the same frames, through
the same code branches.**

**Setup.** `scripts/replay_clip.py::replay` (the API `tests/test_clips.py` uses), driven with
`cnn_run="tiny-p3"`. The bundled assets are byte-identical to that run
(`md5 android/app/src/main/assets/cnn_model/{model.onnx,model.qnn.onnx,config.json}` ==
`data/models/tiny-p3/…`); Python loads `data/models/tiny-p3/best.pt`, i.e. the same weights through
PyTorch instead of ONNX Runtime. Corners frozen from the clip manifest (identical to
`labels.json`), `live_align=False`, `realtime=True`, per-clip `tracker:` kwargs from the manifest
(= `meta.json → trackerKwargs`) plus explicit `settle_frames=4 / avg_frames=3 / confirm_frames=2`
overrides, mirroring `SimClips.trackerConfigOf`. Everything else is a Python default and matches
`effectiveConfig` field for field. Nothing under `src/chesslab/**` was modified; the observation
log came from a monkey-patched `_observe_snapshot` wrapper in a throw-away script.

**One measurement caveat, since the Python replay is wall-clock paced:** the first inference of a
fresh process costs ~2.1 s (torch/timm warm-up), which starves the free-running observer for ~25
frames and changes the outcome. All numbers below are from a **warmed** process (model already
built): 1 observation per frame, 10–13 ms each — a *denser* observation stream than the Kotlin
sim's ONNX CPU path (34 ms). Cold-start runs are noted where they differ.

| clip | `labels.json` | Python + CNN (warm, 3/3 runs) | Kotlin + CNN | verdict |
|---|---|---|---|---|
| `blender-stalemate` | `Qc7` | — (nothing committed) | — | same |
| `blender-promotion` | `e8=Q+` | — | — | same |
| `blender-underpromo` | `e8=N` | — | — | same |
| `blender-queenside` | …`Bf4`… | …**`Bg5`**… (rest correct) | …**`Bg5`**… (then `Qd7`/`O-O-O` lost) | same defect, milder aftermath |
| `blender-opening` | `d4 e5 Nc3` | ✔ | ✔ | same |
| `blender-capture` | `e4 d5 exd5` | ✔ | ✔ | same |
| `blender-castle` | …`O-O` | ✔ | ✔ | same |
| `blender-scholars` | …`Qxf7#` | ✔ | ✔ | same |

Control: the same four clips with `cnn_run=None` commit their full move lists in Python — the
regression is caused by the CNN, not by the config used here.

- **S17-SIM-1 — confirmed, frame-exact.** Instrumented `blender-stalemate`: at **seq 27** the model
  reads c2 as still OCCUPIED (`p_occ 0.90`, label `wN` 0.47) while the queen is in transit and c7
  still reads empty (0.98). That is the believed position, so `resync_check` matches,
  `_cnn_tick` takes the `match_ok` + stuck branch (`src/chesslab/move_tracker/tracker.py:1944`,
  re-anchor at `:1957`, note at `:1963`) and prints *"CNN: board unchanged — reference pulled
  forward (no move)"* at video 2.2 s. The reference is then anchored on a mid-move frame; the diff
  afterwards reports 7–8 changed squares / `ambiguous: Qc7 (+24.0) / Qc1 (+24.0)`, and
  *"CNN recovery checks c2c7… (1/2)"* starts at 4.2 s but the clip ends before the second vote.
  Identical frame, identical note, identical outcome as the Kotlin run.
- **S17-SIM-2 — confirmed verbatim.** `blender-promotion` and `blender-underpromo` both end with
  `stuck_reason = cnn_desync` and the note *"quiet board but CNN disagrees on g1 — holding
  reference (recovery will resolve)"* (`tracker.py:2988–2991`), followed by *"Much change (13/14
  squares …)"* — the same square (g1), the same change counts (13–14) and the same non-commit as
  Kotlin. (In a cold-start process `blender-promotion` happens to commit `e8=Q+`: the warm-up hole
  suppresses the observations that would latch the veto. That is a Python-harness timing artefact,
  not a behavioural difference.)
- **S17-SIM-3 — confirmed verbatim.** `blender-queenside`: *"verify: overrule:c1g5? confirming
  (1/2)"* → *"Move detected: Bg5 (CNN overruled Bf4)"* — `_verify_tick` rung 4
  (`tracker.py:2241–2247`). The phantom bishop then poisons rung 5 exactly as described
  (*"Move not confirmed (board contradicts post-move position: g5) — discarded"*). Python recovers
  better afterwards (it re-detects `Qd2`+`Qd7` as a fast-play pair and commits `O-O-O`), so its
  final list is wrong in one ply where Kotlin's is wrong in three. That downstream difference
  tracks observation pacing (Python: 1 obs/frame at 11 ms; Kotlin: 34 ms per observation), not a
  different decision rule — the diverging decision itself is bit-for-bit the same.

**Conclusion.** The Kotlin port is faithful on all three findings. S17-SIM-1..3 are a
model/threshold limitation of `tiny-p3` on these synthetic Blender renders (piece → empty misses,
plus one occupied-while-in-transit read), reproduced by the reference implementation on the same
weights. Any fix belongs in the model or in the thresholds — and must be made on BOTH sides.

**Not reproduced identically:** absolute timing. The Python replay paces the video by wall clock
and the observer by real inference latency, so cooldowns (`cnnCooldownS`, `motionRecencyS`,
`nudgeTimeoutS`) land on different frames than in the virtual-clock Kotlin sim. Two cold-start
Python runs of `blender-stalemate` failed through *different* branches (verify-window hold; then
*"no motion since last move"*) before the warm runs settled on the S17-SIM-1 path. The
frame-for-frame determinism of the sim is a property Python cannot offer here.

### Follow-up: does the illegal-move alarm fire on the S17-SIM-2 clips? (Python, warm)

**No. It never fires** — `_alarm is None` at every observation and at end of clip, in every run of
both `blender-promotion` and `blender-underpromo` (`alarm_seen = False`; the Kotlin sim likewise
recorded no alarm on these clips).

Terminal state, identical for both clips and stable across runs:

```
stuck_reason=too_many_changed  stuck_count=15  desync_obs=2  desync_conflicts={e7,g1}
alarm=None  cnn_status=mismatch  cnn_conflicts=['g1','e7']
note="Much change (13 squares + 0 occluded) — occluded/unstable, no move committed"
last notes: "quiet board but CNN disagrees on g1 — holding reference (recovery will resolve)"
            -> "CNN: board unchanged — reference pulled forward (no move)"
            -> "Much change (13/14 squares …)"  (x15, to the end)
```

**Which term fails.** Of the gate at `tracker.py:1998-1999` only ONE term is false:
`self._desync_obs >= self.desync_obs_n` → **2 >= 3 is false**. `has_identity` is true,
`obs.label` is not None, `_alarm is None` is true, and `has_occupancy_conflict` is **never even
called** (the `and` short-circuits at the counter). The coordinator's other two candidates are
ruled out by the trace: the conflict-set streak does NOT reset (`{g1}` → `{g1,e7}` is a superset,
which `tracker.py:1981-1983` treats as stable), and `derive_moves_deep` returns `[]` at every
mismatch tick (agreement 0.98) — so the mismatch-with-NO-moves branch is indeed the one taken,
exactly as predicted: no legal move can put the white king anywhere the model can see.

**Why the counter cannot reach 3.** `_desync_obs` only advances on an EVALUATED `_cnn_tick`, and
the evaluation gate (`tracker.py:1878-1884`) admits at most one tick per `cnn_cooldown_s` = 2.0 s
(`stuck` term) or per `cnn_check_interval_s` = 10.0 s (`periodic` term). Over the clip's 58
observations (one per frame, 4.8 s of video) **exactly three ticks ran**: seq 3 (periodic,
first-ever), seq 27 (+2.00 s), seq 51 (+2.01 s). All 55 others were dropped by the gate. And the
seq-27 tick is the S17-SIM-1 misread — it came out `match=True`, contributing nothing to the
streak. So the streak is seq 3 and seq 51: **2**. The clip ends 0.6 s later.

**The escalation path is intact, just slower than the clip.** Sensitivity probes (deliberate
deviations from `effectiveConfig`, measurement only — no fix):

| probe | alarm | detail |
|---|---|---|
| `desync_obs_n = 2` | **fires** | `conflicts=['g1','e7']`, `guess=None` |
| `cnn_cooldown_s = 0.4` (n stays 3) | **fires** | `conflicts=['e7']`; run then commits a phantom `Kh2` |
| both | **fires** | as above |

So the veto is not unbounded in principle: it escalates after `desync_obs_n × cnn_cooldown_s`
≈ 4–6 s of *continuously mismatching, gate-admitted* observations. These clips are 4.8 s long and
one of the three admitted ticks was consumed by a wrong `match`, so the alarm never gets there.

**What this does mean.** Within these clips the tracker degrades silently: it holds the reference
on a stale frame, accumulates 13–14 changed squares, commits nothing, and shows only the ordinary
`"Much change …"` note — no alarm, no user-visible desync signal. The veto's own comment
(`tracker.py:2969-2977`) hands the standoff to CNN recovery, and here recovery provably **cannot**
resolve it (`derive_moves_deep` → `[]` every time, because the observation is not explainable by
any legal move). The only remaining escape is the alarm, which is throttled by the *same*
`cnn_cooldown_s` that throttles recovery. Whether ~5 s of silent degradation before escalation is
acceptable is a design call, not a port question — Kotlin inherits the identical structure and
the identical outcome. Recorded, not fixed.

## Veto escalation + overrule threshold (2026-07-25)

Two defects from the CNN clip simulation, fixed in **both** implementations (Python first, then
ported). No new config knob, so `TRACK_DEFAULTS`, `TrackerConfig` and entry.md's seam block are
untouched — and the parity fixtures (`cnn_run=None`) are unaffected: `ClipReplayParityTest` stays
**18/18 clips, zero diverging frames**, replayed against their own recorded `effectiveConfig`.

### Defect 1 — the `cnn_desync` veto was unbounded in practice, not in principle

The coordinator's original mechanism (the alarm gated behind piece identity / `min_confident_board`)
was **disproven** by the measurement in *"Follow-up: does the illegal-move alarm fire on the
S17-SIM-2 clips?"*: the only false term is `_desync_obs >= desync_obs_n` (2 >= 3), because
`_desync_obs` advances only on an EVALUATED `_cnn_tick` and the evaluation gate admits at most one
tick per `cnn_cooldown_s`. Confirmed defect: **escalation is throttled by the same cooldown that
throttles recovery, and the note claims a resolution that cannot come** — `derive_moves_deep`
returns `[]` at every mismatch tick, because no legal move puts the white king where the model sees
it.

**What changed** (`tracker.py::_desync_evidence` / `Alarm.kt::desyncEvidence`):

1. The veto site now counts its own occupancy conflict as desync evidence, through the SAME streak
   discipline `_cnn_tick` uses — one count per distinct `snap.seq`, conflict set stable as
   equal-or-subset either way, reset on an inconclusive observation (`_advance_desync_streak` /
   `advanceDesyncStreak`, now shared by both call sites). This decouples the streak from
   `cnn_cooldown_s` without touching the cooldown.
2. At `desync_obs_n` it raises the **existing** alarm — no new terminal state, no new UI, the
   existing release paths. Never an auto re-anchor (the Bxc3 hole stays closed).
3. The note is honest and observable:
   `"quiet board but CNN disagrees on g1 — holding reference for 2s (18 observations)"`.

**The escalation bar is measured, not assumed.** Three variants were run over all 18 clips:

| escalation condition | result |
|---|---|
| streak alone (`desync_obs >= 3`) | **13/18** — false alarm on `blender-promocapture` at f20 (one chronically missed king on g1, `guess=null`); the latch then discarded the real `exd8=Q+` on every later frame |
| streak + conflicts in BOTH directions (one vacated, one received) | **14/18**, but still a false alarm on `blender-shadowsweep` at f25 (`e6`, `g6` phantom-occupied under the moving shadow + `e7` missed) — a clip where nothing happens |
| streak + the observation NAMES a move (`guess_illegal_move != None`: exactly one vacated and one received square) | **14/18**, alarms only on `blender-promotion` and `blender-underpromo` — shipped |

The shipped condition is the Bxc3 shape itself, and it is what the alarm card renders. Baseline for
comparison: **zero** alarms across all 18 clips before this change.

**Effect on the S17-SIM-2 clips:** `blender-promotion` and `blender-underpromo` now **raise the
illegal-move alarm at f51** (`conflicts=[g1, e7]`) instead of degrading silently to the end of the
clip. The alarm arrives through `_cnn_tick`, which finds the shared streak already past
`desync_obs_n` — that is the throttle removal doing its work — while the veto site itself declines
to escalate because the conflicts name no move. Both clips still FAIL the harness (the expected
move is never committed; an alarm is not a move), but the tracker is no longer silent: from f4 the
note reports the held reference, its squares and its age, and at f51 the board goes red with a
user-releasable alarm.

### Defect 2 — the overrule rung decided inside the model's noise floor

`cnn_margin_squares` was NOT touched: it is 1 because a capture differs from its non-capture sibling
by exactly one square, and it is shared with recovery. The measured problem is that the overrule
rests on the model's DOMINANT error direction. Over 1366 clip observations (87 424 square reads,
`ObsAudit`):

- confident-occupancy error 0.78 % overall, 1.11 % on `blender-queenside`;
- **misses (piece→empty) 8826 vs phantoms (empty→piece) 226** — a phantom-occupied read is 39×
  rarer than a missed piece;
- errors are systematic per square, not independent: `f4` was misread in **90 of 186** observations
  of `blender-queenside`, `g1` in 42 of 42 of `blender-promotion`.

That last point rules out the "more consecutive votes" lever: 2 votes, 3 votes or 10 votes all lose
to a square that is wrong 90 times in a row. It also rules out a higher agreement threshold — the
phantom `c1g5` scored 63/64 because the square it needed (`g5`) was simply never read.

**Chosen threshold: the overruling move's own endpoints must be READ at `cnn_conf_thr` (0.85) —
origin confidently EMPTY and destination confidently OCCUPIED.** No new knob; the threshold is the
existing confidence threshold, applied to two squares that previously did not have to be observed at
all. This puts the aggressive rung on the 39×-rarer error direction and demands direct evidence
where it previously accepted an absence, while a capture still differs by one square as before.
(`tracker.py::_endpoints_read`, `VerifySingle.Signals.overrules`.)

**Effect:** `blender-queenside` no longer fabricates `Bg5` (`cnn_overrule` does not fire anywhere in
the 18 clips now). The clip still FAILS: with `f4` read empty in half the observations, `Bf4` cannot
clear rung 2 either and now dies at rung 5's post-move board check instead, so the run commits
`[d4, d5, Nc3, Nc6, Qd2]` — five correct moves and no phantom, against the previous
`[d4, d5, Nc3, Nc6, **Bg5**, Bf5, Qd2]`. Failing by omission rather than by fabrication is the
better failure (a phantom bishop poisons every later verify), but it is still a failure, and the
root cause is the model: no threshold recovers a piece the CNN does not see.

### Clip simulation, before → after

| | before | after |
|---|---|---|
| diff-only baseline | 18/18 | 18/18 |
| CNN attached | **14/18** | **14/18** |
| CNN-caused regressions | 4 | 4 (same clips) |
| alarms raised across all clips | 0 | 2 (`blender-promotion`, `blender-underpromo`) |
| phantom overrule commits | 1 (`Bg5`) | 0 |

**The clip count did not improve.** Both fixes change what the tracker DOES when the model is wrong
— surface it instead of hiding it, refuse instead of fabricating — not whether `tiny-p3` can see
the pieces in these renders. S17-SIM-1 (`blender-stalemate`'s `onMatchOk` pull-forward) was out of
scope and is unchanged.

### Tests

Python (`tests/test_move_tracker.py`): `test_persistent_cnn_misread_escalates_veto_to_alarm`
(alarms within `desync_obs_n`, reference never re-anchored),
`test_desync_streak_needs_distinct_observations` (seq contract),
`test_unnamed_desync_never_alarms` (the promocapture/shadowsweep shape),
`test_overrule_needs_its_own_endpoints_read`, plus the existing
`test_quiet_reanchor_vetoed_by_confident_cnn_conflict` (Bxc3 regression) unchanged and green.
Kotlin mirrors all four (`DispatchTest`, `VerifySingleTest`).

### Gate

`uv run pytest -q` → 584 passed, 3 failed — all three in `tests/test_camera.py`, pre-existing on
this working tree (verified by stashing this change). `uv run ruff check src tests scripts` clean.
`:core-engine:test` 316/316, `:core-cnn:testDebugUnitTest` 54/54, `:app:testDebugUnitTest` 293/293,
`detekt` clean. `ktlintCheck` fails ONLY on
`app/src/test/kotlin/com/chesslab/tracker/sim/SimClips.kt:51` — a concurrent agent's uncommitted
model-comparison edit, not touched here.

---

## UI repair (post-06/07/08 pass)

The shipped UI was unusable on the device: the top nav sat *inside* the status bar and was
untappable, the eval bar stole the whole column so the move list and every control were pushed
off-screen, and the calibration preview drew at its bitmap's intrinsic size in the corner of a
square box. Verified throughout on a real device (Xiaomi, 1440x3200, Android 16 / SDK 36).

### Root causes

- **Edge-to-edge, not styling.** `targetSdk = 35` means Android 15+ forces the window under the
  system bars and Android 16 removed the opt-out. Nothing consumed the insets, so *every* screen
  drew under the status bar. `MainActivity` now calls `enableEdgeToEdge(SystemBarStyle.auto(...))`
  and consumes `WindowInsets.safeDrawing` once at the root (`Modifier.safeDrawingPadding()`) —
  per-device, per-rotation, cutout- and gesture-nav-correct, with no hardcoded dp anywhere.
- **`EvalBarSlot` called `fillMaxHeight()`** inside a `Row` whose height was unconstrained, so the
  row claimed the entire column. The board row now measures at `IntrinsicSize.Min`, where the
  square board decides the height; the bar's fill uses `weight`, not `fillMaxHeight`.
- **`CalibrationRoute` emitted `onBack` as a sibling** of its content, and the nav host stacks
  children in a `Box` — the button was painted on top of the camera preview.
- **The malformed status note was a data problem, not layout.** `FrameSizeGuard` reported a
  stale-profile mismatch (`profile '' was calibrated at 0x0`) on an install that had never been
  calibrated. It now distinguishes the two cases and says
  `not calibrated yet — tap Recalibrate and point the camera at the whole board`.

### Changed

- `MainActivity.kt` — edge-to-edge + `safeDrawingPadding` at the root.
- `res/values{,-night}/themes.xml`, `res/values{,-night}/colors.xml` — DayNight launch window; the
  Light-only parent flashed white and painted a light navigation bar under a near-black app.
- `ui/Chrome.kt` (new) — `ChesslabScaffold`: one `TopAppBar` with the standard leading
  `Icons.AutoMirrored.Filled.ArrowBack`, replacing three different hand-rolled Back controls
  (outlined pill right / plain text right / plain text left). Applied to Settings, Games,
  Spectator, Speech, Calibration and Debug. It also fixes the settings list scrolling under its
  own title, because a real app bar pushes content out from under itself.
- `ui/TopNav.kt` (new) — the board screen's `TabRow` with a selected-tab indicator, replacing bare
  `TextButton`s that had no background and no active state.
- `ui/tracking/TrackingScreen.kt` — intrinsic-height board row, two-line ellipsised status note,
  camera view as a `FilterChip` that *replaces* the move list (at 4:3 it overflowed and overdrew
  the board), action bar always on screen.
- `ui/tracking/PreviewOverlay.kt` — caller-sized instead of a forced 4:3 aspect.
- `ui/calibration/CalibrationRoute.kt` — preview takes the leftover height and carries the SOURCE
  aspect ratio (the overlay maps source px onto the whole box, so a mismatched box offset every
  drawn corner); three squeezed buttons in one row became a full-width primary plus two outlined
  secondaries — the "stray grey pill" was the third button squeezed to one character per line.
- `ui/analysis/EvalBar.kt` — labelled 40dp column; `+0.3` no longer wraps to `+0.` / `3`.
- `ui/settings/KnobRow.kt` — slider tick marks dropped; the dotted track read as decoration.
- `ui/games/RecordingPanel.kt` — cap options are real `FilterChip`s, not coloured text.
- `spectate/ui/SpectatorScreen.kt` — switch laid out before the text, so the subtitle stops running
  under it.
- `speech/ui/SpeechSettingsScreen.kt` — `speechStateText` replaces `state.toString()` ("Uninitialised").
- `pipeline/FrameSizeGuard.kt` — the uncalibrated-vs-stale message split (+ test).

### Theme — paper and ink

`ui/theme/Color.kt` is now a `ChesslabPalette` interface with `PaperPalette` (warm paper, sepia
ink, boxwood/walnut board) and `InkPalette` (ink-stained walnut, warm cream), selected by
`isSystemInDarkTheme()` and provided through `LocalChesslabPalette`. The existing token names
(`Accent`, `OnSurfaceMuted`, …) became `@Composable @ReadOnlyComposable` getters, so no call site
changed. `Theme.kt` fills **every** Material role, not the obvious six — leaving the container and
`surfaceContainer*` roles at baseline is what produced lavender sliders and purple chips.

Measured contrast (WCAG, against the surface each is actually drawn on):

| | light on bg / surface / raised | dark on bg / surface / raised |
|---|---|---|
| ink (body) | 12.87 / 13.92 / 11.36 | 14.04 / 13.02 / 11.45 |
| muted text | 6.43 / 6.95 / 5.67 | 7.15 / 6.63 / 5.83 |
| accent | 6.11 / 6.60 / 5.39 | 10.10 / 9.37 / 8.24 |
| busy | 5.88 / — / 5.19 | 8.57 / 7.95 / 6.99 |
| danger | 7.22 / 7.80 / 6.37 | 6.95 / 6.45 / 5.67 |
| primary | 6.81 / 7.36 / 6.01 | 8.36 / 7.76 / 6.82 |

All body/label pairs clear AA 4.5:1; the display-sized state text and fps clear it several times
over. Evidence overlays are separated by **hue** — blue / ochre / magenta — not lightness, so a
red-green deficiency cannot collapse them (light 4.61 / 3.94 / 5.27, dark 6.73 / 7.11 / 5.85
against their backdrop; all above the 3:1 non-text threshold).

**Alarm.** The scrim alone was NOT enough on a warm palette: red at 34 % over boxwood and walnut
just reads as a pinker board. `BoardCanvas.drawAlarm` now adds a hard `danger` border at 18 % of a
cell, which does not compete with the square colours at all. Verified in both schemes by
temporarily forcing `alarmed = true`, screenshotting, and reverting.

### System back

`ChesslabNavHost` already uses a real `NavHost`, and after the scaffold work back behaves
correctly. Verified per screen with `KEYCODE_BACK` + `dumpsys activity activities`: from Settings,
Games, Spectator, Speech and Calibration the app stays foreground and lands on the tracking
screen; from tracking (the root) it leaves the app. The promotion dialog keeps
`DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)` — verified in code,
not on device, because `PromotionPending` needs a real game in front of the camera.

### Gate

`:app:ktlintCheck`, `:app:detekt`, `:app:testDebugUnitTest`, `:app:assembleDebug` all green.
`DebugStateTest.cnnStateShowsActualEpNotRequested` was updated rather than deleted: the tone is now
a palette lookup, so the test asserts the new pure `epFellBack(...)` decision behind it.

## UI follow-up: an off switch, and the Analysis knobs where people look (2026-07-26)

Three defects found while touring the app after the UI repair above.

### 1. The camera could not be turned off

The tracker held the camera for as long as the service ran, and the service ran until the process
died. The ongoing notification had **no action at all** — the only way to stop being filmed was to
force-stop the app from system settings, and swiping the app out of recents left the service (and
the green camera indicator) running. That is not an off switch, it is a workaround.

The distinction that matters here is invisible in code and total to the OS: *pausing the analyzer*
and *unbinding the CameraX use case* look the same from inside the app, but only the second one
releases the device and puts the platform's camera indicator out.

- `camera/TrackerCamera.kt` — `stop()` / `resume()`. `stop()` unbinds the analysis use case
  (`provider.unbindAll()`) and keeps the object: exactly ONE `ProcessCameraProvider` binding may
  exist app-wide (MEMORY `android-single-camera-owner`), and the analyzer thread must survive so
  the engine's latched thread ownership still holds when the camera comes back. A `@Volatile
  stopped` flag guards every path that could rebind — the queued retarget, the error-recovery
  rebind, a provider future that arrives late — so a timer already in flight cannot undo the user.
  Verified by grep: `ProcessCameraProvider.getInstance` and `bindToLifecycle` each appear **exactly
  once** in the whole `:app` source set.
- `camera/CameraModels.kt` — `CameraHealth.Off`, distinct from `Down`. `Down` promises a retry;
  this one must never advertise one.
- `service/CameraSwitch.kt` (new, 31 LOC) — `CameraSwitch` (`cameraOn` + `setCameraOn`) and
  `TrackerControls : TrackerRestart, CameraSwitch`. The binder delegates both rather than keeping
  its own copy of "is the camera on".
- `service/TrackerService.kt` — `setCameraOn` (stop/resume, service and game untouched),
  `onStartCommand` handling `ACTION_STOP_TRACKING`, `onTaskRemoved`, and `endService()`.
- `service/TrackerNotification.kt` — a **Stop tracking** action, via
  `PendingIntent.getForegroundService` (the shade delivers it while the app is backgrounded, where
  a plain `startService` is not allowed), plus `post(state, moves, cameraOn)` so the shade says
  `stopped · camera off` instead of a frozen `waiting`.
- `ui/tracking/` — the session seam carries `cameraOn` / `setCameraOn`; the action bar gained a
  chip reading `Tracking · camera on` ⇄ `Stopped · tap to resume`.

Three decisions worth recording:

- **`endService()` releases the camera FIRST, unconditionally.** A bound UI client keeps the
  service alive past `stopSelf()`, so leaving the unbind to `onDestroy` would leave the indicator
  lit for as long as the activity happens to live. `stopForeground(STOP_FOREGROUND_REMOVE)` +
  `stopSelf()` then end the service as soon as nothing is bound.
- **`onStartCommand` returns `START_NOT_STICKY`** (it inherited `START_STICKY`). A tracker the
  system killed must not restart itself and reopen the camera with nobody watching.
- **`setCameraOn(true)` re-enters foreground before rebinding.** The notification's Stop action may
  have dropped the service out of foreground, and a background service that binds a camera is
  denied on Android 14. Resume is only ever a tap in a visible app, so the FGS start is legal.

`trackingUiState(status, cameraOn)` now takes the camera flag and lets it outrank every engine
state in the header (`STOPPED` / `camera off` / "No frames are arriving — the camera is
released. Resume to continue; the game is kept."). Without it the last sample stands forever and
the screen keeps reporting `WAITING · 14.8 fps` over a dead feed — covered by
`TrackingViewModelTest.stoppingTheCameraOverridesTheFrozenStatusHeader`.

### 2. The Analysis settings were undiscoverable

Stockfish's knobs were reachable **only** by long-pressing the eval bar — a 40 dp sliver beside the
board. The user could not find them and had to ask.

- `analysis/AnalysisSettingsHost.kt` (new) — the file-private `storedSettings` flow in
  `ui/analysis/AnalysisHost.kt` was promoted to a single shared object. Both surfaces read and
  write it; there is no second copy. `AnalysisHost` now *follows* the flow (a collector in its
  scope) instead of only reacting to its own `update`, so a value changed under Settings actually
  relaunches Stockfish with the new engine options.
- `ui/analysis/AnalysisControls.kt` (new, 99 LOC) — the six controls, extracted so the dialog and
  the settings screen cannot drift apart. `AnalysisSettingsSheet` is now a 29-line dialog wrapper.
- `ui/settings/AnalysisSettingsSection.kt` (new, 52 LOC) — an **Analysis** group on the settings
  screen, using that screen's own `Card`/label style.

The long-press stays: walking to Settings mid-game to stop the engine is the wrong ask.

These are app settings, **not** `TrackerConfig` knobs, so they are deliberately not a `KnobGroup`
and not in `KNOB_CATALOG` — `KnobCatalogTest` asserts that catalog matches `TrackerConfig`
one-for-one in both directions, and widening it to cover analysis would break exactly the property
that makes it useful.

### 3. Text running under a trailing control

"Pause on thermal / battery pressure" ran underneath its `Switch` — the same defect fixed on the
spectator screen. The cause is measurement order: an unweighted `Text` is measured first, claims
the full row, wraps, and the `Switch` then keeps its minimum size and overlaps it. The fix is
`Modifier.weight(1f)` on the text (weighted children are measured *after* the fixed ones), never a
fixed width. Swept every `Row` in the app that puts text beside a trailing control and fixed eight:

`ui/analysis/AnalysisControls.kt` (toggles + knob labels), `ui/settings/AppSettingsSection.kt`
(Debug menu), `speech/ui/SpeechSettingsScreen.kt` (Announce moves, Announce alarms),
`ui/games/RecordingPanel.kt` (Record training frames, Skip physically impossible positions, session
rows), `ui/games/GameDetailScreen.kt` (game id, Include provenance comments),
`ui/games/GamesScreen.kt` (game-in-progress row). Text-beside-text rows (`StatRow`, `PvRow`,
`KnobRow`) were left alone — a `Text` respects its constraints and wraps, so they cannot overlap.

### Gate

`:app:testDebugUnitTest`, `:app:ktlintFormat`, `:app:ktlintCheck`, `:app:detekt`,
`:app:assembleDebug` — all green.

Detekt shaped two edits, recorded so they are not mistaken for taste: `TrackerBinder` would have
hit `LongParameterList` at eight constructor parameters, which is why `TrackerRestart` and
`CameraSwitch` were merged into one `TrackerControls` seam; and `TrackerService` would have hit
`TooManyFunctions`, which is why `buildStack()` was inlined into the `StackSwitch` lambda and
`attachCnn` became a property. No threshold was raised. `TrackerService.kt` is now 306 LOC (from
245) — it is a lifecycle owner, not a composable, but it is the file to watch next.

### ⚠ Device verification NOT done — the phone was disconnected

Everything above is verified by the build gate and by unit tests only. The device that was attached
earlier in the session dropped off `adb` before this work could be exercised (`adb devices` empty,
no Android device on USB at all, adb server restarted, mDNS/wireless shows nothing, no AVD
configured). Nothing was improvised around it.

**The camera claim is therefore unproven on hardware, and it is the one that matters**: that
`stop()` really releases the device and the platform's green camera indicator goes out. The code
unbinds the CameraX use case (`provider.unbindAll()`) rather than pausing the analyzer, which is
the right mechanism, but "right mechanism" is not "observed indicator".

A ready-to-run script is parked at `scratchpad/verify-ui-followup.ps1`. It installs the APK and
walks the six checks: camera open while tracking → released on Stop (asserted against
`dumpsys media.camera`'s client list, not a status-bar pixel) → service still alive and the game
intact → reopened on Resume → released by the notification action → released by swipe-from-recents;
then the Analysis group and the long-press dialog in both light and dark.

## QNN device failure + EP truthfulness (2026-07-26)

Device: Xiaomi `zorn` / 24117RK2CG, SM8650 (Snapdragon 8 Gen 3, HTP v75), SELinux enforcing.
Everything below is **measured on that phone**, not inferred.

### The bug

```
I chesslabCnn: CNN attaching
W onnxruntime: [qnn_backend_manager.cc:879 SetupBackend] Failed to setup so cleaning up
E onnxruntime: [qnn_execution_provider.cc:691 GetCapability] QNN SetupBackend failed
              Failed to create device. Error: QNN_DEVICE_ERROR_INVALID_CONFIG
I chesslabCnn: CNN inference backend: QNN-HTP(NPU) (model=model.qnn.onnx, classes=2)
```

`addQnn` returned happily, so 05c's chain treated QNN as a win and reported it. The EP then failed
in `GetCapability` — *after* selection — claimed no node, and the whole graph ran on the CPU. This
is the silent degradation 05c exists to prevent, one rung softer: the loud-attach machinery was
reporting what was **requested**, never what **ran**.

### Fix 1 — report the EP that actually ran

The Java ORT API has no "which EP owns this node" accessor, but the profiler does: every
`*_kernel_time` trace event carries `args.provider`. So:

- `cnn/OrtSessionRunner.kt` (new, 82 LOC) — the ORT session, extracted out of
  `OnnxSquareClassifier`. `enableProfiling` is armed at construction; `profiledProvider()` calls
  `session.endProfiling()`, parses the trace and deletes it. `endProfiling` also turns profiling
  OFF for the rest of the session, so this costs **nothing** steady-state — one profiled batch at
  attach, then never again.
- `cnn/EpProfile.kt` (new, 89 LOC) — `dominantProvider(json)` sums kernel time per provider and
  returns the majority one (a partial assignment is normal, so it is a majority, not unanimity),
  plus `EpVerdict`, whose invariant is that its `label` can never name a provider that was not
  observed. Unverifiable renders as `QNN-HTP(NPU) (unverified)`; a provider outside the chain's
  vocabulary is printed verbatim.
- `OnnxSquareClassifier.verify()` runs one warm-up batch at the real `[64,3,128,128]` shape and
  takes the verdict. `backend` is now that verdict's label, never `runner.requested`. The warm-up
  also pays the first-call cost off the observer thread and leaves a genuine 64-crop timing in
  `lastRunMs` before the first observation — which is what 07b's "last infer ms" row renders.
- `EpAttempts` (in `OnnxSquareClassifier.kt`) walks the chain. An EP that builds but is **caught
  running elsewhere** is now closed and skipped, not kept. That is not cosmetic: the discarded QNN
  session was running `model.qnn.onnx` (INT8/QDQ) on the CPU, and falling through hands the CPU its
  own float32 graph instead — **166 ms to 97 ms per 64 crops, measured, a 1.7x win** (A/B'd through
  07a's own "CNN model" + "Execution provider" settings). A verdict of *unknown* is deliberately
  NOT a mismatch: the session works, and the label says "unverified" out loud.

Tests: `EpProfileTest` (8 cases) drives the parsing and the verdict off two realistic ORT traces —
mixed QNN/CPU assignment, all-CPU (the measured bug), truncated/empty/non-array payloads, session
events that must not count, and every `EpVerdict` label. `OnnxSquareClassifierContractTest`'s
real-asset test now asserts the *measured* `CPU` (not `CPU (unverified)`), the
`CNN EP verified: ... warm-up ... ms` line, and that the trace file is cleaned up — that test runs
the bundled graph through real ORT on the desktop JVM, so the whole profile → parse → label path is
exercised end to end, not just the parser.

Two pre-existing red tests were fixed on the way: `ModelSpecTest` and the contract test hardcoded
the 14-class list while the bundled asset is now the 2-class `occ-real-f2`. They now assert against
the asset's own declared class list (`assetClasses()`), which is what "the asset is the source of
truth" actually means.

**On device, after the fix:**

```
I chesslabCnn: CNN attaching
W chesslabCnn: CNN EP QNN-HTP(NPU) loaded but CPU ran the graph, falling back
W chesslabCnn: CNN EP NNAPI unavailable, falling back: ... not compiled with NNAPI support.
I chesslabCnn: CNN EP verified: CPU, warm-up 97 ms for 64 crops
I chesslabCnn: CNN inference backend: CPU (model=model.onnx, classes=2)
```

**Measured: 92 / 95 / 97 / 119 ms per 64 crops, fp32 on CPU** (four cold attaches). 07b renders
`QNN-HTP(NPU) (requested) -> CPU (actual)` in amber next to that number.

Incidental finding, worth knowing: **`onnxruntime-android-qnn` 1.21.1 ships no NNAPI support at
all** ("This binary was not compiled with NNAPI support"). The NNAPI rung of the chain can never
fire with this artifact. It is not dead code — the AAR could change — but nobody should expect it
to do anything today.

### Fix 2 — the manifest line QNN needs (real, necessary, not sufficient here)

Raising the ORT environment to `ORT_LOGGING_LEVEL_VERBOSE` surfaces QNN's own log through ORT's
callback, which is where the answer was:

```
QnnDsp <W> Failed in loading stub: dlopen failed: library "libcdsprpc.so" not found:
           needed by .../lib/arm64/libQnnHtpV75Stub.so in namespace clns-10
QnnDsp <E> Unable to load Remote symbols 4000
```

`libQnnHtpV75Stub.so` links against the fastRPC client `libcdsprpc.so`. That is a **vendor** public
library (listed in `/vendor/etc/public.libraries.txt`), not an NDK one, and since Android 12 those
are absent from an app's linker namespace unless the manifest names them. Fixed in
`AndroidManifest.xml`:

```xml
<uses-native-library android:name="libcdsprpc.so" android:required="false" />
```

This is a genuine bug and the fix is kept: on any device where the DSP is reachable it is the
difference between an NPU and no NPU. It moved QNN from "cannot even load the stub" to reaching the
DSP transport layer, SoC detection and `QnnDevice_create`.

### The actual wall: this ROM does not let an app reach the DSP

With the stub loading, the failure moves one layer deeper and becomes explicit:

```
QnnDsp <V> Setting default value for unsigned PD usage
QnnDsp <V> skel file path file:///libQnnHtpV75Skel.so?...&_dom=cdsp
E com.chesslab.tracker: fastrpc_apps_user.c:3752: Error 0xd: open_shell failed for domain 3
    search paths used are /dsp/, /vendor/dsp/, /vendor/dsp/xdsp/ (errno Permission denied)
QnnDsp <E> Failed to retrieve skel build id: err: 10007
QnnDsp <E> Failed to create transport for device, error: 4000
QnnDsp <E> Failed to load skel, error: 4000
QnnDsp <E> Transport layer setup failed: 14001
QnnDsp <I> QnnDevice_create done. status 0x36b1     <- QNN_DEVICE_ERROR_INVALID_CONFIG
```

QNN uses an **unsigned PD** (the only option without Qualcomm signing) and must open the fastRPC
shell for the cDSP out of `/vendor/dsp/`. On this device that path is SELinux-labelled
`adsprpcd_file` and unreadable — even the `shell` domain is denied:

```
$ adb shell ls -ld /vendor/dsp
ls: /vendor/dsp: Permission denied
avc: denied { search } for name="/" scontext=u:r:shell:s0 tcontext=u:object_r:adsprpcd_file:s0
```

So `open_shell` gets `EACCES`, the v75 skel never loads on the DSP, and `QnnDevice_create` reports
`QNN_DEVICE_ERROR_INVALID_CONFIG` — an error code that describes the symptom, not the cause, which
is why the option map was such a red herring. The vendor camera HAL uses the same HTP happily in
the same logcat, because it is a vendor process.

**Nothing in the app can lift this.** Signed PD needs Qualcomm signing; unsigned PD needs a ROM
that lets `untrusted_app` read the fastRPC shell. The NPU is out of reach on this phone, and the
CNN runs on the CPU — now with an accurate label and a measured number instead of a claim.

Ruled out, so nobody repeats them: `htp_performance_mode` (removed, identical failure); the
`jniLibs` prune (every excluded QNN lib restored, identical failure — `app/build.gradle.kts` is
untouched by this pass); a missing v75 Skel/Stub (both verified present in the installed
`lib/arm64`); an absolute `backend_path` (moot — `libQnnHtp.so` loads fine, reports interface
2.24.0 / build v2.31.0, and the failure is well past backend creation); a malformed
`model.qnn.onnx` (the failure precedes graph handling entirely, and the same file runs fine on the
CPU EP, see the 166 ms measurement above). ORT 1.21.1's option contract was checked against its
source: unknown keys are silently ignored, and with `soc_model`/`htp_arch` unset `CreateDevice`
passes an **empty** config list — QNN's own log confirms it (`Config not passed. Loading default
config`), so no option key was ever implicated.

### Next, if the NPU is ever wanted

Nothing app-side. It needs a different device or ROM — and that is now a one-install experiment,
because the manifest line is already in place and the attach reports honestly either way. A
pre-compiled EPContext binary would **not** help: the graph would still need a device on the DSP.

### Gate

`ktlintCheck`, `detekt`, `test` (all modules), `:app:assembleDebug` — green. No `@Suppress`, no
baseline, no threshold raised. New files 89 + 82 LOC; `OnnxSquareClassifier.kt` is 225 LOC.
Detekt shaped one edit, recorded so it is not mistaken for taste: the chain walk would have hit
`LoopWithTooManyJumpStatements`, which is why it is an `EpAttempts` object driven by
`firstNotNullOfOrNull` over the chain rather than a loop with two `continue`s.

## Two fps numbers: camera vs detection (2026-07-26)

`0.0 fps` next to a **Tracking · camera on** chip read as a defect and was not one: with no
calibration `FramePipeline` returns `Skipped`, the engine never ticks, and `EngineState.fps` stays
0 — while CameraX happily delivers ~30 fps that all get discarded. One number cannot separate
*camera dead* from *camera fine, nothing analysed*, and the two need opposite actions from the user.

Both rates are now reported.

- `pipeline/CameraRate.kt` (new, 44 LOC) — an EMA over the gaps between delivered frames, the same
  0.9/0.1 weights as the engine's `_fps` so the two numbers settle alike. It lives in `:app` for
  the same reason `StageTimings` does: `:core-engine` is under the wall-clock ban, and it cannot
  count frames it never received anyway.
- `service/TrackerService.kt` — `publisher.onCameraFrame()` in the analyzer lambda, i.e. the last
  point that sees EVERY `ImageProxy`, including the ones dropped while a restart swaps the stack.
  `setCameraOn(false)` resets the meter: the gap across a released camera is minutes long and would
  otherwise be measured as a frame time.
- `api/TrackerStatus.kt` + `entry.md`'s seam block — `cameraFps: Double = 0.0`, filled in by
  `StatusPublisher` exactly like `corners` and the pipeline half of `stageTimingsMs`. The engine
  never sets it.
- `service/StatusPublisher.kt` — publishes `cameraFps`, and **zeroes `fps` on a skipped frame**.
  That is the subtler half of the same lie: a skipped frame ticks nothing, so the engine's EMA is
  frozen rather than current, and a stale `14.8 fps` standing over a paused detection (dark gate,
  lost warp) says the loop is running when it provably is not. `pipelineNote != null` is exactly
  "this frame produced no `FrameInput`".
- `ui/tracking/StatusUiModel.kt` — the header line, stacked in two short lines rather than one long
  one so both stay readable at arm's length:
  | state | line 1 | line 2 |
  |---|---|---|
  | camera released | `camera off` | — |
  | bound, nothing arriving | `no frames` | — |
  | delivering, never ticked, `corners == null` | `camera 30 fps` | `not calibrated` |
  | delivering, never ticked, calibrated | `camera 30 fps` | `no detection` |
  | detecting, behind the sensor | `15.0 fps` | `camera 30` |
  | detecting at the sensor rate | `15.0 fps` | — |
  `corners == null` is what tells "never calibrated" from "stalled for another reason" — the
  publisher fills in the corners the frame was warped with, so null means there was never a board.
- `ui/debug/TimingsPanel.kt` + `DebugPayloadAssembler` — `camera fps` and `detection fps` rows,
  each with its own 5 s median, since that is where a slow pipeline gets diagnosed.

### Verified on device (f86dfdca, debug build)

| state | header |
|---|---|
| uncalibrated, camera running | `WAITING` · `camera 49 fps` / `not calibrated` (light: `camera 34 fps`) |
| camera stopped via the chip | `STOPPED` · `camera off` |
| tracking, both rates equal | `WAITING` · `10.3 fps`, no second line |
| tracking, frames being skipped | `5.9 fps` / `camera 7` |
| debug → Timings | `camera fps (now / 5 s) 8.7 / 8.9`, `detection fps (now / 5 s) 8.8 / 8.9` |

The uncalibrated state had to be *forced*: nothing is persisted in the calibration store, but
`liveAlign` re-acquires the markers within ~3 frames of launch, so the screenshots were taken with
`liveAlign` off (restored to `on` afterwards — verified in `tracker_config_json`; `debugEnabled`
likewise left as found).

### Gate

`:core-engine:test` (ClipReplayParityTest 18/18 clips, zero divergence), `:app:testDebugUnitTest`,
`assembleDebug` — green. `ktlintCheck` / `detekt` are green on every file this pass owns; both were
red on `pipeline/YuvToBgr.kt` / `YuvToBgrTest.kt`, which belong to the concurrent perf pass running
in the same worktree and are not touched here.

Known limit, worth knowing before reading the two numbers: `ImageAnalysis` runs
`STRATEGY_KEEP_ONLY_LATEST`, so CameraX delivers the next frame only once the analyzer returns. The
camera rate is therefore bounded by the analyzer's own speed — it shows the DISCARDED-frame gap
(the case above), not a "sensor is faster than we are" gap, which is why an idle pipeline reads 49
fps and a working one reads the detection rate.
