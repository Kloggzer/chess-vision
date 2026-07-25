# 17 — Android rewrite: strict Kotlin port of the Python move tracker

> Entry file for the spec pack. Every implementing agent reads **this file completely**,
> then exactly the phase file(s) assigned to it. The Python tracker is the **source of
> truth for behaviour**; every phase names its reference functions. The existing Kotlin
> app (moved to `android-legacy/` in phase 00) is a **negative reference only** — do not
> copy its logic, do not consult it for design decisions. It may be read for build
> configuration and for Android API usage patterns (CameraX, ONNX Runtime, Ktor).

## What this is

`chesslab track` (Python) works in production. The Android app does not: it was ported
once from an *older* `tracker.py` and then patched forward three times (`specs/08` →
`12` → `16`) without ever catching up structurally. Consequences on record:

- `specs/12-android-parity/STATUS.md` **D3** — `VerifyVerdict` cannot carry a replacement
  move, so Python's `cnn_overrule` is not expressible; the real move lands a cycle late.
- **D6** — the recovery-commit voting confirmer was never ported.
- **D5** — no debug/tuning surface on mobile at all (a deliberate cut, now a liability).
- `specs/16-.../STATUS.md` — `:app:detekt` and `:engine:detekt` both RED on branch start.
- No parity test anywhere, so none of the ~40 live-tuned thresholds is verified.

This pack rebuilds the app from scratch as a faithful 1:1 port of **today's**
`src/chesslab/move_tracker/tracker.py`, with golden-fixture parity tests generated from
the Python implementation, and a real on-device debugging surface.

**Definition of success:** `./gradlew :core-engine:test` proves the Kotlin engine
reproduces Python's decisions frame-for-frame on recorded clips; the app runs at ≥15 fps;
every knob is inspectable and tunable on the phone.

---

## Module layout (binding)

Four Gradle modules under the new `android/`. The split exists for exactly one reason:
**the parity-critical code must run on the desktop JVM** — no emulator, no OpenCV
native, no ONNX native.

| Module | Type | Dependencies | Contains |
|---|---|---|---|
| `:core-engine` | `java-library` + `kotlin("jvm")`, JDK 17 | **`chesslib` only** | 9-step detection pipeline, evidence channels, vetoes, noise models, hypothesis generation, confirmer, dispatch/commit/re-anchor, anomaly patcher, verify / pair-verify / cnn-tick / alarm state machines, game state, public API types |
| `:core-geometry` | `com.android.library` | `:core-engine` (api types), OpenCV | homography solve/apply, corner order, `squareRegion`, `squareToCropBox`, `cropBorderPx`, `MarkerTracker`, corner-jump detection, grid-line coverage, warp + CLAHE |
| `:core-cnn` | `com.android.library` | `:core-engine`, `:core-geometry`, `chesslib` | `OccupancyObservation`, `expectedOccupancy/Labels`, `deriveMovesIdentity/Deep`, `scoreMoves`, `verifyMove`, `resyncCheck`, `hasOccupancyConflict`, `guessIllegalMove`, crop→NCHW-float preprocessing, `SquareClassifier` **interface** |

> **Why `:core-geometry`/`:core-cnn` are Android libraries, not `java-library`:**
> `org.opencv:opencv:4.10.0` is an **AAR** (it ships `org.opencv.android.OpenCVLoader`),
> so a plain `java-library` cannot consume it. Their unit tests still run on the host JVM
> — the task is **`:core-geometry:testDebugUnitTest`** / **`:core-cnn:testDebugUnitTest`**,
> not `:test`. `:core-engine` alone is `java-library`, and it is the one that matters:
> it holds all parity-critical logic and runs as `:core-engine:test`.
| `:app` | `com.android.application` | all of the above + CameraX, ONNX Runtime, OpenCV, Ktor, Compose | camera ownership, frame plumbing, ONNX `SquareClassifier` impl, ArUco (OpenCV), Compose UI, service, settings, Stockfish, spectator, PGN, TTS |

### Hard rules

1. **`:core-engine`'s runtime classpath is `chesslib` + kotlin-stdlib and nothing else.**
   Enforced by `ClasspathPurityTest` (phase 00). No OpenCV, no Android, no coroutines.
   The parity-critical pixel math (`per_square_diff`, `census_transform`, HSV shadow,
   Lab-gamut Mahalanobis, `motion_score`, `_baseline_occlusion_and_shadow`) is plain
   per-region arithmetic that Python also does in NumPy, not cv2 — it belongs in the
   engine. OpenCV lives only where Python genuinely calls cv2: warping, CLAHE, Canny,
   ArUco, `getPerspectiveTransform`.
2. **`:core-engine` contains zero `synchronized`, zero `Atomic*`, zero `Mutex`, zero
   `@Volatile`.** It is a pure state machine driven by exactly one thread. This removes
   the entire race class that Python's `self.lock` guards. Enforced by grep in the gate.
3. **`:core-engine` public surface is the `com.chesslab.engine.api` package only.**
   Everything else is `internal`.
4. Package roots: `com.chesslab.engine`, `com.chesslab.geometry`, `com.chesslab.cnn`,
   `com.chesslab.tracker` (app).

---

## The engine API seam (binding — phase 00 creates it, no later phase may change it
without a STATUS.md discrepancy note)

All types live in `android/core-engine/src/main/kotlin/com/chesslab/engine/api/`.

```kotlin
// Images.kt — no Android, no OpenCV types cross the seam.
class GrayImage(val width: Int, val height: Int, val data: ByteArray)  // 8-bit, row-major, stride == width
class BgrImage(val width: Int, val height: Int, val data: ByteArray)   // interleaved BGR, stride == width * 3

// TrackerConfig.kt — every knob from src/chesslab/config.py TRACK_DEFAULTS (lines 590-646),
// plus the constructor-only knobs that have no CLI flag. Defaults copied VERBATIM from
// config.py — NOT from the tracker.py constructor signature, which disagrees on
// occlusionColorThr (constructor 1.5, TRACK_DEFAULTS 3.0). TRACK_DEFAULTS WINS.
data class TrackerConfig(
    val motionThr: Double = 0.25,
    val motionPxThr: Double = 20.0,
    val zThr: Double = 3.0,
    val ambiguityMarginLl: Double = 2.0,
    val reanchorLlFloor: Double = -4.0,
    val nudgeTimeoutS: Double = 5.0,
    val driftWindowS: Double = 30.0,
    val maxChanged: Int = 6,
    val censusThr: Double = 40.0,
    val censusZWeight: Double = 1.0,
    val occlCensusThr: Double = 24.0,
    val cnnConfThr: Double = 0.85,
    val cnnCooldownS: Double = 2.0,
    val cnnCheckIntervalS: Double = 10.0,
    val verifyWindow: Int = 8,
    val cnnMinAgreement: Double = 0.97,
    val cnnMarginSquares: Int = 1,
    val recoveryMaxPlies: Int = 4,
    val minConfidentBoard: Int = 32,
    val minConfidentRecovery: Int = 8,
    val motionMargin: Double = 0.10,
    val overhang: Double = 0.25,
    val alignEvery: Int = 3,
    val alignScale: Double = 0.5,
    val cornerJumpPx: Double = 6.0,
    val motionHoldS: Double = 0.4,
    val occlusionColorThr: Double = 3.0,
    val minGridLineCoverage: Double = 0.5,
    val reconnectGraceS: Double = 2.0,
    val diffClaheClip: Double = 2.0,
    val requireMotionForMove: Boolean = true,
    val motionRecencyS: Double = 20.0,
    val commitLlFloor: Double = 2.0,
    val detectScale: Double = 0.5,
    val desyncObsN: Int = 3,
    val verifyObsVotes: Int = 2,
    val observerIntervalS: Double = 0.0,
    // constructor-only in Python (no CLI flag, not in TRACK_DEFAULTS):
    val llK: Double = 1.0,
    val darkLumaThr: Double = 18.0,
    val cnnVerify: Boolean = true,
    val liveAlign: Boolean = true,
    val usePrior: Boolean = true,
    val boardSize: Int = 1600,          // config.DEFAULT_BOARD_SIZE
    // Python takes these as constructor params defaulting to None and only THEN falls back
    // to the CNN-conditional counts (tracker.py:675-707). Clip manifests override them
    // (blender-castle sets confirm_frames: 3). null = use the CNN-conditional default.
    val settleFramesOverride: Int? = null,
    val avgFramesOverride: Int? = null,
    val confirmFramesOverride: Int? = null,
) {
    // Python: settle/avg/confirm are CNN-conditional unless explicit (tracker.py:739-742)
    fun settleFrames(cnnOn: Boolean) = settleFramesOverride ?: if (cnnOn) 3 else 4
    fun avgFrames(cnnOn: Boolean) = avgFramesOverride ?: if (cnnOn) 2 else 3
    fun confirmFrames(cnnOn: Boolean) = confirmFramesOverride ?: if (cnnOn) 1 else 2
    val detSize: Int get() = if (detectScale < 1.0) (boardSize * detectScale).toInt() else boardSize
}

// FrameInput.kt — one detection tick's input. Produced by :app, consumed by the engine.
data class FrameInput(
    val seq: Long,                 // monotonic frame counter (Spec 11 signature)
    val grayDet: GrayImage,        // CLAHE'd + blurred gray warp at config.detSize
    val bgrDet: BgrImage,          // BGR warp at config.detSize
    val corners: FloatArray,       // 8 floats: a8x,a8y,h8x,h8y,h1x,h1y,a1x,a1y (source-image px)
    val motionRoiScore: Double,    // _roi_motion result (percent), computed in :app
    val gridLineCoverage: Double,  // _grid_line_coverage result, computed in :core-geometry
    val lumaPreClahe: Double,      // mean luma BEFORE CLAHE — dark-frame gate
    val timestampMs: Long,
)

// CnnObservation.kt — the engine-side CNN seam. `:core-engine` MUST NOT depend on
// `:core-cnn` (that would be a dependency cycle), so the engine consumes the observation
// model through these interfaces; `:core-cnn` implements them. Created by phase 00a.
interface CnnObservation {
    fun occupied(square: String): Boolean          // pOcc > pEmpty
    fun confident(square: String, thr: Double): Boolean
    fun labelConfident(square: String, thr: Double): Boolean
    fun label(square: String): String?
    fun conf(square: String): Double
    fun pOccluded(square: String): Double
    fun occupancyOnly(): CnnObservation             // identity stripped (the _cnn_tick fallback)
}
// `move`/`agreement` carry `resync_check`'s derived move — without them `cnn_overrule` (invariant
// 10) is inexpressible. Defaulted, so an evaluator that derives no move stays source-compatible.
data class ResyncResult(val match: Boolean, val conflicts: List<String>, val checked: Int,
                        val move: String? = null, val agreement: Double = 0.0)
data class IdentityResult(val match: Boolean, val inconclusive: Boolean, val conflicts: List<String>)
data class DeriveResult(val moves: List<String>, val agreement: Double, val inconclusive: Boolean)
// The position crosses as a FEN: neither module may name the other's board type (`Game` here,
// chesslib `Board` there), and `Any` only deferred the mismatch to the first live call.
interface CnnEvaluator {                            // implemented by :core-cnn CnnRecovery
    val confThr: Double
    fun verifyMove(boardFen: String, moveUci: String, obs: CnnObservation): Pair<Double, Int>
    fun resyncCheck(boardFen: String, obs: CnnObservation): ResyncResult
    fun boardMatchesIdentity(boardFen: String, obs: CnnObservation): IdentityResult
    fun deriveMovesDeep(boardFen: String, obs: CnnObservation, maxPlies: Int): DeriveResult
    fun hasOccupancyConflict(boardFen: String, obs: CnnObservation, thr: Double, conflicts: List<String>): Boolean
    fun guessIllegalMove(boardFen: String, obs: CnnObservation, thr: Double): String?
    val minConfidentBoard: Int
    val minAgreement: Double
}

// CnnSnapshot.kt — Spec-11 observation/frame pairing. Immutable, handed across threads.
data class CnnSnapshot(
    val obs: CnnObservation,
    val seq: Long,                 // tracker frame seq of the OBSERVED frame
    val tsMs: Long,
    val inferMs: Double,
    val warped: BgrImage?,         // BGR warp of the observed frame at detSize — reference anchor
    val gray: GrayImage?,          // gray warp at detSize
    val fen: String?,              // game FEN at observation start (discard-on-change guard)
)

// TrackerEvent.kt — everything the engine tells the outside world.
sealed interface TrackerEvent {
    data class MoveCommitted(val uci: String, val san: String, val fenAfter: String,
                             val decider: String, val priorUsed: Boolean) : TrackerEvent
    data class SequenceCommitted(val ucis: List<String>, val sans: List<String>,
                                 val fenAfter: String, val decider: String) : TrackerEvent
    data class Stuck(val reason: String) : TrackerEvent
    data class Alarm(val kind: String, val conflicts: List<String>, val guess: String?,
                     val guessSan: String?) : TrackerEvent
    data class AlarmCleared(val reason: String) : TrackerEvent
    data object ReAnchored : TrackerEvent
    data class Note(val text: String) : TrackerEvent
    data class PromotionPending(val from: String, val to: String) : TrackerEvent
}

// TrackerStatus.kt — an immutable snapshot for the UI. The debug screen is a pure
// function of this; no phase may add a side channel to the UI.
data class TrackerStatus(
    val state: String,                       // waiting | moving | occluded | move
    val fen: String,
    val z: Map<String, Double>,              // fused per-square z (evidence heatmap)
    val diffs: Map<String, Double>,          // normalized gray channel
    val census: Map<String, Double>,         // normalized census channel
    val changed: Set<String>,
    val shadowVetoed: Set<String>,
    val occlusionVetoed: Set<String>,
    val bestLl: Double, val secondLl: Double, val bestUci: String?,
    val stuckReason: String?, val alarm: TrackerEvent.Alarm?,
    val confirmerKey: String?, val confirmerCount: Int,
    val verifyState: String?, val pendingUci: String?, val pendingFrames: Int,
    val stageTimingsMs: Map<String, Double>, // warp, gray, motion, evidence, veto, score, total
    val fps: Double,
    val note: String?,
    val debug: DebugPayload? = null,         // null unless debugEnabled — see 07b
)

// SquareClassifier.kt lives in :core-cnn, not here — the engine never sees pixels-to-probs.
```

The engine's entry points:

```kotlin
class TrackerEngine(config: TrackerConfig, startFen: String = STARTPOS) {
    fun onFrame(input: FrameInput): List<TrackerEvent>   // the whole per-frame loop + _try_detect
    fun attachCnn(evaluator: CnnEvaluator?)              // :app injects :core-cnn's CnnRecovery
    fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent>  // observer results (verify / cnn tick)
    fun status(): TrackerStatus
    fun undo(): List<TrackerEvent>
    fun resetToStart(): List<TrackerEvent>
    fun setFen(fen: String): List<TrackerEvent>
    fun captureBaseline(): List<TrackerEvent>
    fun choosePromotion(piece: Char): List<TrackerEvent>
    fun acceptCnnPosition(): List<TrackerEvent>
    fun updateConfig(config: TrackerConfig)              // live tuning; mirrors app.py _live_tuning_kwargs side effects
}
```

---

## Correctness invariants (binding — each gets a named test)

These are the traps that broke the previous port. Violating one is silent and fatal.

1. **Two warps per frame.** Detection runs at `detSize = boardSize * detectScale = 800`;
   CNN crops come from a *separate* full-resolution **bordered** warp
   (`warp_board_for_crops`, border `cropBorderPx`). `refGray`, `refBgr` and every
   `CnnSnapshot.warped/gray` are at `detSize`.
2. **Shadow veto removes a square from `changed` but PRESERVES its z** — vacate evidence
   must survive. **Occlusion veto ZEROES z.** Swapping these breaks everything quietly.
3. The `>2 → occluded` state gate counts the **raw undilated** occluded core (third
   return of `_baseline_occlusion_and_shadow`), never the dilated set.
4. **Tainted/latched squares count toward `maxChanged`** (`blockedN = tainted.size`)
   even though their z is zeroed.
5. **Anchoring is path-specific — do not generalise it.** The *recovery* path
   (`_cnn_tick` match-ok and recovery-commit) anchors on `snap.gray` / `snap.warped`, the
   frame the CNN actually looked at (`tracker.py:1944-1964`, `:2021-2040`). The *verify*
   path anchors on `pending.cur` / `pending.curBgr`, the averaged frame the candidate was
   raised from (`:2164`, `:2191`). Neither path may anchor on `lastCur` — that is the bug
   class this invariant exists for.
6. `setRef(fromCommit = true)` must **NOT** rebuild the colour gamut. Only the quiet
   re-anchor may.
7. Census `eps` stays **0**, padding is **replicate**, never a wrap/roll.
8. `censusThr` (40.0) compares against the **RAW** census channel, not the
   median-normalized one. Keep a raw copy (`censRaw`) for the shadow veto.
9. **The alarm freezes noise learning AND blocks every commit, re-anchor, and pending
   candidate.** Release only via explicit user correction or a verified restore.
10. **`cnn_overrule` must be expressible**: the verify verdict carries a *replacement
    move*. (Legacy D3 could not — the real move landed a cycle late.)
11. Corner order is `[a8, h8, h1, a1]` for all geometry. CNN crop order is
    `all_squares()` = `a1,b1,…,h1,a2,…,h8` (rank-major from rank 1). Do not confuse them.
12. **`src/chesslab/config.py` is the only source of truth for defaults.**
    `docs/move-tracker-flow.md` and `src/chesslab/move_tracker/README.md` are STALE —
    they quote `census_thr=160` and `occlusion_color_thr=1.5`. The flow doc's *structure*
    and its "Key Decisions" table are still authoritative; only its numbers are not.
13. Every terminal in `_verify_tick`/`_verify_pair_tick` passes the multi-glance vote
    (`verifyObsVotes = 2` consecutive identical outcomes) — never act on one glance.
14. `LatestFrame` semantics: the frame source must **never** deliver the same frame twice.
    A repeated frame diffs to zero and reads as "stable" while a hand is waving.

---

## Phases and dependencies

Execution is **sequential by phase**; agents **inside** a phase run in parallel on
strictly disjoint files. The orchestrator (main session) reviews, runs the gate, and
commits between phases.

| Phase | Files | Concern | Module | Depends on |
|---|---|---|---|---|
| 00 | `00a-scaffold.md`, `00b-parity-fixtures.md` | legacy move, Gradle scaffold, API seam, fixture generator | all / python | — |
| 01 | `01a-diff.md`, `01b-census.md`, `01c-shadow-gamut.md`, `01d-motion-noise.md` | pixel primitives | `:core-engine` | 00 |
| 02 | `02a-scoring.md`, `02b-geometry.md`, `02c-cnn-observation.md` | scoring, geometry, CNN observation model | engine / geometry / cnn | 01 (02a only) |
| 03 | `03a-evidence.md`, `03b-vetoes.md`, `03c-hypothesis.md`, `03d-dispatch.md` | the detection state machine | `:core-engine` | 01, 02a |
| 04 | `04a-verify-single.md`, `04b-verify-pair.md`, `04c-recovery-alarm.md` | CNN observer, verify, recovery, alarm | `:core-engine`, `:core-cnn` | 02c, 03 |
| 05 | `05a-camera.md`, `05b-frame-pipeline.md`, `05c-onnx.md` | Android frame plumbing | `:app` | 02b, 02c |
| 06 | `06a-calibration.md`, `06b-tracking-ui.md`, `06c-service.md` | calibration & core UI | `:app` | 05 |
| 07 | `07a-settings.md`, `07b-debug.md`, `07c-analysis.md` | settings, debug menu, Stockfish | `:app` | 06 |
| 08 | `08a-games-pgn.md`, `08b-spectator.md`, `08c-tts.md` | companion features | `:app` | 06 |
| 09 | `09-validation.md` | live validation, legacy deletion | — | 08 |

**Parallelism inside a phase is safe only because file ownership is disjoint.** Each
phase file has an explicit "Files you own" list. An agent that needs to touch a file it
does not own **in the same phase** must STOP and record a blocker — it must not edit it.

### Ownership registry (authoritative — overrides any phase file that disagrees)

Phases are **sequential**, so a later phase may extend a file an earlier phase created.
Ownership conflicts are resolved here; a phase file contradicting this table is wrong.

| File | Created by | May be extended by | Notes |
|---|---|---|---|
| `android/gradle/libs.versions.toml` | 00a | the single build-owning agent of each later phase | 00a lands the catalog **complete**, including OpenCV, the bytedeco host natives, ONNX, Ktor, ZXing. A later phase adds an entry only if genuinely missing, and records it in `STATUS.md`. |
| `android/*/build.gradle.kts` | 00a | 07c (`:app`, Stockfish `externalNativeBuild`), 08b (`:app`, Ktor/ZXing) | 00a creates all four complete. `:core-geometry`'s OpenCV + bytedeco test deps are 00a's, **not** 02b's — 02b codes against them and records a blocker if missing. Within phase 07 only 07c edits `app/build.gradle.kts`; within phase 08 only 08b. |
| `.../engine/api/**` (the seam, incl. `CnnObservation.kt`, `DebugPayload` in `TrackerStatus.kt`) | **00a** | nobody without a `STATUS.md` discrepancy note | 04a's "fallback owner" clause is void — 00a creates `CnnObservation.kt`. 07b's `DebugPayload` type is declared by 00a as an empty-marker `data class DebugPayload` and filled in by 07b. |
| `.../engine/EngineState.kt` | 03a | 04a/04b/04c may **read/write fields**, never edit the file | 03a declares every field, including `PendingCandidate.frames/voteOutcome/voteCount/seq` for phase 04. A missing field is a blocker. |
| `app/src/main/AndroidManifest.xml` | 06c | nobody | 06c declares all 8 permissions up front, including INTERNET / ACCESS_NETWORK_STATE / ACCESS_WIFI_STATE / CHANGE_WIFI_MULTICAST_STATE for 08b. 08a must **not** edit it. |
| `.../ui/ChesslabNavHost.kt` | 06b | 07a (settings + debug routes), 08a (games route), 08b (spectator route) | The nav host is `ui/ChesslabNavHost.kt`. **There is no `ui/Nav.kt`** — 07a's reference to it means this file. One agent per phase touches it: 07a in phase 07, 08a in phase 08. |
| `.../ui/tracking/TrackingScreen.kt` | 06b | 07c (eval bar) | The path is `ui/tracking/TrackingScreen.kt`. 07b/07c references to `ui/TrackingScreen.kt` mean this file. |
| `.../settings/SettingsRepository.kt` | 06c | 07a (knob catalog keys, `debugEnabled`) | The path is `settings/SettingsRepository.kt`. 07a's and 07b's references to `service/SettingsRepository.kt` mean this file. |
| `.../service/TrackerService.kt` | 06c | 08c (one-line TTS registration) | Nobody in phase 07 edits it; 07a/07b call its binder API. |
| `scripts/emit_parity_fixtures.py` + `parity/**` fixtures | 00b | 00b only | Consumers (01*, 02*, 03*) code against 00b's emitted schema. **If a spec names a fixture key 00b does not emit, that is 00b's schema that wins** — record the gap in `STATUS.md` and have the orchestrator extend the generator. Never invent a fixture. |

---

## Protocol for implementing agents

- Work on branch **`android-rewrite`** (already created, branched from `main`).
  Never commit to `main`.
- **Implementing agents do NOT `git commit`.** The orchestrator reviews and commits with
  the names given in each phase's Steps. Leave the working tree with your changes in
  place and `STATUS.md` updated.
- **Trust the Python code over this spec** when they disagree — line-number anchors are
  paired with symbol names and may have drifted. Record every discrepancy in `STATUS.md`.
- If blocked, **STOP**, write the blocker to `STATUS.md`, do not improvise.
- Update your row in `STATUS.md` (`todo → in_progress → done`) and append a session-log
  line when done.
- **Do not read `android-legacy/**` for logic.** It is a known-wrong implementation.
  Reading it for build configuration or Android API usage is allowed and expected.
- **FROZEN — do not modify:** `src/chesslab/**` (Python is the reference),
  `android-legacy/**`, `specs/**` except this pack's `STATUS.md`, `synth/**`, `data/**`.
  The single exception is `scripts/emit_parity_fixtures.py`, owned by phase 00b.

## Build & test contract (memory-constrained)

- Shell: **PowerShell** for Gradle — `cd android; .\gradlew.bat <task>`. Git-bash mangles
  the wrapper. First build after phase 00 needs `git submodule update --init` for the
  Stockfish sources (known gotcha, `android/third_party/stockfish`).
- **Run tests ONCE, targeted, at the end of your phase.** Never the full suite, never
  `assembleDebug` inside a phase agent (from phase 05 on that is the orchestrator's gate).
  - engine: `.\gradlew.bat :core-engine:test --tests "<your class>"`
  - geometry / cnn: `.\gradlew.bat :core-geometry:test --tests "..."` / `:core-cnn:test`
  - app: `.\gradlew.bat :app:testDebugUnitTest --tests "<your class>"`
- Python side: `uv run pytest -q tests/<file>` scoped; `uv run ruff check <your files>`.

## Static-analysis contract

ktlint (gradle plugin 12.2.0 / ktlint 1.5.0) + detekt 1.23.8 are configured at the
android root by phase 00, with **empty baselines** — this pack starts green and must
stay green.

At the end of your phase, scoped to your module, once:
`.\gradlew.bat :<module>:ktlintFormat` then `.\gradlew.bat :<module>:detekt`.

**The formatter owns style — never hand-edit a style finding.** Zero findings. No
`@Suppress`, no baseline additions to get green: fix the code or record a blocker.
If `ktlintFormat` reformats a file you do not own, revert that drive-by.

## Dependency-management contract

All dependencies go through the Gradle **version catalog**
(`android/gradle/libs.versions.toml`), owned by phase 00a. Pin exact versions. Never
vendor jars or hand-edit lockfiles. A phase needing a dependency not in the catalog must
record it in `STATUS.md` with justification and a license check (this repo is
**GPL-3.0-or-later** — GPL-incompatible dependencies are a blocker, not a judgment call).

Python dependencies go through `uv` + `pyproject.toml`.

## Git hygiene (binding)

- One branch (`android-rewrite`); atomic conventional commits exactly as named in each
  phase's Steps (made by the orchestrator); no drive-by changes outside your declared
  files; **never `git add -A`** across scopes.
- Before the first commit of the new toolchain, `.gitignore` must cover
  `android/**/build/`, `android/.gradle/`, `android/local.properties`,
  `android/.kotlin/`. Verify this in phase 00a.
- Never `--no-verify`, never `--force`, never amend or rebase another agent's commits,
  never `git reset --hard` on shared state.
- If a gate fails, fix the cause — do not bypass it.

## Definition of done (per phase)

The phase file's acceptance criteria all pass; scoped tests green; ktlint/detekt clean
for the touched module; `STATUS.md` row `done` with a one-line summary. The orchestrator
runs the full gate between phases and `assembleDebug` from phase 05 on.

## Reference index (Python source of truth)

| Concern | Path |
|---|---|
| Tracker core | `src/chesslab/move_tracker/tracker.py` (3864 LOC) |
| — primitives | `:99-665` (`square_region`, `per_square_diff`, `census_transform`, `per_square_census_change`, `hsv_shadow_squares`, `board_color_gamut`, `occlusion_color_squares`, `motion_score`, `_baseline_occlusion_and_shadow`, `normalize_diffs`, `move_touched_squares`, `move_destination_squares`, `SquareNoise`, `loglik_scores`, `loglik_pair_scores`, `move_prior`, `Confirmer`) |
| — frame loop | `_loop` `:1490-1763` |
| — detection | `_try_detect` `:2834-3058`, `_detect_guards` `:3060`, `_compute_evidence` `:3084`, `_apply_vetoes` `:3141`, `_generate_hypothesis` `:3188`, `_pair_candidate` `:3279`, `_single_endpoint_candidate` `:3355`, `_dispatch` `:3322`, `_maybe_patch_anomaly` `:3377` |
| — CNN | `_verify_tick` `:2078`, `_verify_pair_tick` `:2306`, `_pending_voted` `:2290`, `_cnn_tick` `:1868`, `_cnn_worker` `:1771`, `_observe_snapshot` `:1796`, `_cnn_occlusion_filter` `:1328` |
| CNN model | `src/chesslab/move_tracker/cnn_recovery.py` (438 LOC) |
| Geometry | `src/chesslab/calibration.py` (1134 LOC) |
| Crops | `src/chesslab/labeling.py:112-182` |
| Preprocessing | `src/chesslab/serving.py:318-400` |
| Defaults | `src/chesslab/config.py:590-646` (+ `CROP` `:40-65`, `PHOTOMETRY` `:163-170`, `TRACKER` `:208-222`) |
| Flow doc | `docs/move-tracker-flow.md` (structure + Key-Decisions table authoritative; **numbers stale**) |
| Prior fixes | `specs/09-illegal-move-referee/`, `specs/16-android-correctness-parity/` |
| Python tests | `tests/test_move_tracker.py` — mirror these scenario names in Kotlin |
| Clips | `tests/data/testclips` |
