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

## Blockers

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
- **Open orchestrator decision (D00b-17):** whether `TrackerConfig` should gain explicit
  `settleFrames`/`avgFrames`/`confirmFrames` overrides. Until then, phases 03* must read
  those three from `meta.effectiveConfig`.

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
