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
