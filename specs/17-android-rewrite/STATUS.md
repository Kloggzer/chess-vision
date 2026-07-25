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


## Blockers

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
