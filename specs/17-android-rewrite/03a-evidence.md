# Phase 03a — engine state, guards, evidence, frame loop

> Read `entry.md` completely first. Python is the source of truth:
> `src/chesslab/move_tracker/tracker.py`. Module `:core-engine`, package
> `com.chesslab.engine`. Phases 03a–03d run **in parallel** on disjoint files.

## Why

Everything downstream reads z-values. If the evidence stage is off by one rule — median
normalization skipped, the raw census copy lost, the channel-local guard missing, the
dark gate applied post-CLAHE — every veto, every score and every commit is wrong in a way
no later phase can repair. This phase also owns the frame loop's ordering, which is where
the previous port silently diverged (buffers not cleared when the grid gate released,
`_set_ref` called on a non-ready frame, the `>2 → occluded` gate reading the dilated set).

**You additionally own the shared mutable state.** `EngineState.kt` is created by you
**FIRST**, complete, before you write anything else. 03b/03c/03d read and write its fields
but must never edit the file. Ship it as your first commit so the other three can compile
against it immediately.

## Files you own

```
android/core-engine/src/main/kotlin/com/chesslab/engine/EngineState.kt   (create FIRST, complete)
android/core-engine/src/main/kotlin/com/chesslab/engine/Guards.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/Evidence.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/FrameLoop.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/GuardsTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/EvidenceTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/FrameLoopTest.kt
```

## Design (decided — do not redesign)

### 1. `EngineState.kt` — the one mutable state object (declare in full)

`internal class EngineState(var config: TrackerConfig, startFen: String, val whitePov: Boolean)`.
Plain `var`s, no synchronisation (entry.md hard rule 2). Every field below is named with
its Python counterpart; declare **all** of them, even the ones your own files never touch —
03b/c/d code against this list.

```kotlin
internal class EngineState(
    var config: TrackerConfig,          // live-tunable; TrackerEngine.updateConfig swaps it
    startFen: String,
    val whitePov: Boolean,              // profile.white_pov
) {
    // -- clock: the engine is deterministic; nowS comes from FrameInput.timestampMs / 1000.0.
    var nowS: Double = 0.0                              // replaces every time.time() call

    // -- base truth (image, FEN) pair --------------------------------------------------
    var refGray: GrayImage? = null                      // ref_gray
    var refBgr: BgrImage? = null                        // ref_bgr
    var refFen: String? = null                          // ref_fen
    var refCorners: FloatArray? = null                  // _ref_corners
    var lastCorners: FloatArray? = null                 // _last_corners
    var refGamut: BoardColorGamut? = null               // _ref_gamut          (type from 01c)
    var refCensus: ByteArray? = null                    // _ref_census         (cache)
    var refCensusFor: GrayImage? = null                 // _ref_census_for     (identity key)

    // -- frame loop --------------------------------------------------------------------
    var frameSeq: Long = 0                              // _frame_seq
    var prevGray: GrayImage? = null                     // prev_gray
    val grayBuf: RunningMeanGray = RunningMeanGray()    // _gray_buf   (03a, FrameLoop.kt)
    val bgrBuf: RunningMeanBgr = RunningMeanBgr()       // _bgr_buf
    var stableCount: Int = 0                            // stable_count
    var holdUntil: Double = 0.0                         // _hold_until
    var lastCur: GrayImage? = null                      // _last_cur
    var lastCurBgr: BgrImage? = null                    // _last_cur_bgr
    var state: String = "waiting"                       // state: waiting|moving|occluded|move
    var motion: Double = 0.0                            // _motion
    var lastMotionTs: Double = 0.0                      // _last_motion_ts
    var motionSinceRef: Boolean = false                 // _motion_since_ref
    var occlGridActive: Boolean = false                 // _occl_grid_active
    var gridCoverage: Double = 1.0                      // _grid_coverage
    var fps: Double = 0.0                               // _fps
    var lastLoopTs: Double = 0.0                        // _last_loop_ts
    val stageTimingsMs: MutableMap<String, Double> = mutableMapOf()   // _ts / _diff_ms

    // -- occlusion / taint (03b owns the logic, not the fields) -------------------------
    val occlusionExpiry: MutableMap<String, Double> = mutableMapOf()  // _occlusion_expiry
    val occlCoreExpiry: MutableMap<String, Double> = mutableMapOf()   // _occl_core_expiry
    var motionOccludedSquares: MutableSet<String> = mutableSetOf()    // _motion_occluded_squares
    val tainted: MutableMap<String, Double> = mutableMapOf()          // _tainted  (sq -> expiry)
    var occludedVetoed: List<String> = emptyList()                    // _occluded_vetoed
    var shadowVetoed: List<String> = emptyList()                      // _shadow_vetoed
    val shadowBlocked: MutableList<String> = mutableListOf()          // _shadow_blocked

    // -- evidence ----------------------------------------------------------------------
    val noise: SquareNoise = SquareNoise()              // noise            (type from 01d)
    val censusNoise: SquareNoise = SquareNoise()        // census_noise
    var censRaw: MutableMap<String, Double>? = null     // _cens_raw  (RAW census, veto input)
    var lastDiffs: Map<String, Double> = emptyMap()     // normalized gray channel (status)
    var lastCens: Map<String, Double> = emptyMap()      // normalized census channel (status)
    var lastZ: Map<String, Double> = emptyMap()         // fused z (status heatmap)
    var changed: MutableSet<String> = mutableSetOf()    // _changed
    var changedVals: List<Pair<String, Double>> = emptyList()   // _changed_vals (top 8)
    var structVals: List<Pair<String, Double>> = emptyList()    // _struct_vals  (top 8)

    // -- scoring / hypothesis ----------------------------------------------------------
    var bestScore: Double = 0.0                         // _best_score
    var secondScore: Double = 0.0                       // _second_score
    var candidateUci: String? = null                    // _candidate_uci

    // -- game state --------------------------------------------------------------------
    var board: Board = Board(startFen)                  // board (chesslib)
    val history: MutableList<String> = mutableListOf()  // history (SAN)
    var lastMove: String? = null                        // last_move (uci)
    var note: String? = null                            // note
    var priorLast: Boolean = false                      // prior_last
    var recoveredLast: Boolean = false                  // recovered_last

    // -- pending / promotion / confirmation --------------------------------------------
    var pending: PendingVerify? = null                  // _pending
    var promoPending: PromoPending? = null              // _promo_pending
    var verifyState: String? = null                     // _verify_state
    var confirmer: Confirmer = Confirmer(1)             // _confirmer        (type from 02a)
    var recoveryConfirmer: Confirmer = Confirmer(1)     // _recovery_confirmer

    // -- stuck / anomaly ---------------------------------------------------------------
    var stuckReason: String? = null                     // _stuck_reason
    var stuckCount: Int = 0                             // _stuck_count
    val anomalySince: MutableMap<String, Double> = mutableMapOf()     // _anomaly_since

    // -- CNN coupling (03b reads snap; 04x owns the machines) --------------------------
    var cnnSnap: CnnSnapshot? = null                    // _cnn_snap
    var cnnRun: Boolean = false                         // cnn_run
    var cnnFailed: Boolean = false                      // _cnn_failed
    var cnnStatus: String? = null                       // cnn_status
    var cnnConflicts: List<String> = emptyList()        // cnn_conflicts
    var cnnAgreement: Double = 0.0                      // _cnn_agreement
    var cnnBestMove: String? = null                     // _cnn_best_move
    var alarm: TrackerEvent.Alarm? = null               // _alarm
    var desyncObs: Int = 0                              // _desync_obs
    val desyncConflicts: MutableSet<String> = mutableSetOf()          // _desync_conflicts

    // -- provenance --------------------------------------------------------------------
    val decisionLog: MutableList<DecisionRecord> = mutableListOf()    // _decision_log
    var pendingCapture: PendingCapture? = null                        // _pending_capture

    // -- CNN-conditional derived knobs (tracker.py:739-742) ----------------------------
    val cnnOn: Boolean get() = config.cnnVerify && cnnRun && !cnnFailed
    val settleFrames: Int get() = config.settleFrames(cnnOn)
    val avgFrames: Int get() = config.avgFrames(cnnOn)
    val confirmFrames: Int get() = config.confirmFrames(cnnOn)
    val detSize: Int get() = config.detSize
}

internal data class PendingVerify(                       // tracker.py:3341-3343 `_pending`
    val ucis: List<String>, val uci: String, val fen: String,
    val cur: GrayImage, val curBgr: BgrImage?,
    var frames: Int, val priorUsed: Boolean, val seq: Long,
)
internal data class PromoPending(                        // tracker.py:3255-3258 `_promo_pending`
    val from: String, val to: String,
    val cur: GrayImage, val curBgr: BgrImage?, val fen: String,
)
internal data class DecisionRecord(                      // tracker.py:2650-2674 `_record_decision`
    val tsS: Double, val ply: Int, val move: String?, val san: String?,
    val fenBefore: String?, val fenAfter: String, val decider: String, val reason: String,
    val priorUsed: Boolean, val bestScore: Double, val secondScore: Double, val margin: Double,
    val changed: List<String>, val changedVals: List<Pair<String, Double>>,
    val shadowVetoed: List<String>, val occludedVetoed: List<String>,
    val gridCoverage: Double, val zThr: Double, val motion: Double,
    val cnnRun: Boolean, val cnnAgreement: Double, val cnnBestMove: String?,
)
internal data class PendingCapture(val san: String, val fen: String)  // _queue_session_capture
```

Rules baked in: `nowS` is set once per `onFrame` from `FrameInput.timestampMs` and every
Python `time.time()` becomes `state.nowS`. No `System.currentTimeMillis()` anywhere in
`:core-engine` — the parity fixtures replay recorded timestamps.

### 2. `Guards.kt` — `detectGuards(): Boolean` (`_detect_guards` :3060-3082)

In order, each returning `false`:

1. `state.pending != null || state.promoPending != null` (:3063).
2. `refGray == null || refFen != board.fen()` → **clear** `refGray`, `refBgr`, `refFen`
   to null and return false. The (image, FEN) pair is the base-truth invariant (:3067-3070).
3. `cornersJumped()` → clear the same three, `confirmer.reset()`, `clearStuck()`,
   note `"Board geometry shifted (marker/camera) — re-capturing reference"` (:3075-3081).

`cornersJumped()` (`_corners_jumped` :2578-2588) — false when either `refCorners` or
`lastCorners` is null; true when **any** corner's `|dx|` or `|dy|` exceeds
`config.cornerJumpPx` (6.0). Compare axis-wise, not Euclidean; zip stops at the shorter
list (Python `strict=False`).

### 3. `Evidence.kt` — `computeEvidence(cur: GrayImage): Evidence` (`_compute_evidence` :3084-3139)

Return `internal data class Evidence(val diffs: Map<String,Double>, val cens: Map<String,Double>?, val z: MutableMap<String,Double>)`.

1. `diffs = perSquareDiff(refGray!!, cur, detSize, whitePov, extendUp = config.overhang)`
   then `diffs = normalizeDiffs(diffs)` (01a), then `z = noise.z(diffs)` (01d).
2. `state.censRaw = null` **unconditionally first** (:3102) — a stale raw map would freeze
   the shadow veto after tuning `censusZWeight` to 0.
3. Only if `config.censusZWeight > 0`:
   - `cens = perSquareCensusChange(refGray!!, cur, detSize, whitePov, extendUp = overhang, refCodes = refCensusCodes())` (01b),
   - `state.censRaw = cens.toMutableMap()` — **RAW copy, before normalization** (entry.md
     invariant 8; :3115),
   - `cens = normalizeDiffs(cens)`, `zs = censusNoise.z(cens)`, `w = censusZWeight`,
   - **channel-local guard** (:3119-3130): `hot = zs.count { w * it >= config.zThr }`;
     if `hot > config.maxChanged + 2` → if `alarm == null` call
     `censusNoise.update(cens)` (learn the disturbance, no exclude, default alpha scale),
     then set `cens = null`, `censRaw = null`, `structVals = emptyList()` and **do not fuse**;
   - else `structVals` = top-8 of `zs` with `w * v >= zThr * 0.5` sorted descending, and
     fuse `z[s] = max(zGray, w * zs[s])` for every square (:3135).
4. `censusZWeight == 0` → `structVals = emptyList()`, `cens = null`.
5. Record `stageTimingsMs["evidence"]`.

`refCensusCodes()` (`_ref_census_codes` :3178-3186) lives here: recompute
`censusTransform(refGray)` iff `refCensusFor !== refGray` (**identity**, not equality —
`AnomalyPatcher` mutates `refGray` in place and invalidates by setting `refCensusFor = null`).

### 4. `FrameLoop.kt` — the per-frame body (`_loop` :1490-1763, detection part only)

Camera read, reconnect, overlay encode, perf files and the CNN worker spawn are **not
yours** (phase 05 / 04). Port exactly the block between `_frame_seq += 1` (:1563) and
`if self.state not in ("move", "occluded")` (:1696):

`internal fun FrameLoop.step(input: FrameInput): FrameOutcome` where `FrameOutcome` is
`Detect(cur, curBgr, seq)` | `Skip(reason)` — `TrackerEngine` (03d) calls `tryDetect` on
`Detect`. Order, non-negotiable:

1. `state.nowS = input.timestampMs / 1000.0`; `state.frameSeq += 1`; `state.lastCorners = input.corners`.
2. **Dark-frame gate** (:1577-1584): if `config.darkLumaThr > 0 && input.lumaPreClahe < config.darkLumaThr`
   → note `"frame too dark (%.0f < %s) — detection paused"`, return `Skip("dark")`.
   The luma is **PRE-CLAHE** (`:app` measures it on the warp before `_gray`) — measuring it
   after CLAHE defeats the gate entirely.
3. FPS EMA: `fps = 0.9*fps + 0.1*(1/dt)` when `fps != 0`, else `1/dt` (:1596-1600).
4. `prevGray = prevGray ?: grayDet`; `motion = max(motionScore(prevGray, grayDet, config.motionPxThr), input.motionRoiScore)`; `prevGray = grayDet` (:1602-1605). `motionScore` is 01d.
5. **Baseline occlusion** (:1611-1627), only when `refGray != null && state !in ("waiting","move")`:
   call `baselineOcclusionAndShadow(grayDet, refGray, detSize, config.motionPxThr * 4, whitePov, detBoxes, refCodes = refCensusCodes(), occlCensusThr = config.occlCensusThr, curBgr = bgrDet, gamut = refGamut, colorThr = config.occlusionColorThr)` (01c, returns
   `(rawOcc, rawShadow, occCore)`); stamp `occlusionExpiry[sq] = nowS + 0.1` for `rawOcc`,
   `occlCoreExpiry[sq] = nowS + 0.1` for `occCore` (the **raw undilated core** — entry.md
   invariant 3), `shadowVetoed = rawShadow.sorted()`.
   Then **unconditionally** (outside the guard):
   `motionOccludedSquares = occlusionExpiry.filter { nowS < it.value }.keys`;
   `occludedVetoed = motionOccludedSquares.sorted()`.
6. **Motion branch** `motion > config.motionThr` (:1629-1641): `stableCount = 0`;
   `motionSinceRef = true`; `lastMotionTs = nowS`; `confirmer.reset()`; `grayBuf.clear()`;
   `bgrBuf.clear()`; `state = if (input.gridLineCoverage < config.minGridLineCoverage) { occlGridActive = true; "occluded" } else "moving"`;
   `holdUntil = nowS + config.motionHoldS`. Return `Skip("moving")`.
7. **Stable branch** (:1643-1697): `stableCount++`; append `grayDet`/`bgrDet` to the buffers;
   `var ready = stableCount >= settleFrames && nowS >= holdUntil`.
   Only if `grayBuf.size >= avgFrames`:
   - **grid gate first** on the LATEST gray, not the mean (:1654). Coverage arrives in
     `FrameInput.gridLineCoverage`; `config.minGridLineCoverage <= 0` disables the gate
     (`occludedByGrid` returns false, `gridCoverage` untouched — `_occluded_by_grid` :1319-1326).
     Occluded → `occlGridActive = true`, `state = "occluded"`, note
     `"waiting for clear view of the board…"` when `refGray == null` else
     `"Board partly covered (grid lines hidden) — waiting for clear view"`; skip the rest.
   - **gate just cleared** (:1663-1672): if `occlGridActive` → `occlGridActive = false`;
     `holdUntil = max(holdUntil, nowS + config.motionHoldS)`; `grayBuf.clear()`;
     `bgrBuf.clear()`; `ready = false`. Clearing the buffers is what keeps residual hand
     pixels out of the first post-occlusion mean — do not "optimise" it away.
   - `cur = grayBuf.meanUint8()`, `curBgr = bgrBuf.meanUint8()`, store into `lastCur`/`lastCurBgr`.
   - `refGray == null` → if `ready` call `setRef(cur, curBgr)` (03d's `Commit.kt`, quiet
     variant, `fromCommit = false`), else note `"waiting for clear view of the board…"`.
   - `else if (ready && state != "move")` → `coreNow = occlCoreExpiry.filter { nowS < it.value }.keys`;
     **`if (coreNow.size > 2) state = "occluded"` else return `Detect(cur, curBgr, frameSeq)`**
     (:1689-1695). Raw core only.
8. `if (state !in setOf("move", "occluded")) state = "waiting"` (:1696-1697).

`_RunningMean` (:149-178) ports as `internal class RunningMeanGray(maxlen)` /
`RunningMeanBgr(maxlen)` in this file: `DoubleArray` sum, `append` does
`sum -= evicted; sum += new` and **recomputes the sum from the full window every 64
appends** (`count % 64 == 0`, :169-170) to kill float drift; `clear()` drops buffer, sum
and count; `meanUint8()` rounds like NumPy `astype(np.uint8)` after division — match 01a's
rounding helper. `maxlen` is `config.avgFrames(cnnOn)`; when the CNN flag flips,
`TrackerEngine.updateConfig` (03d) resizes — expose `fun resize(maxlen: Int)` that clears.

## Steps

### 1. `EngineState.kt` — commit `feat(android-engine): EngineState — the single mutable tracker state`
Create the file exactly as declared above, complete, first. Push nothing else in this commit.

### 2. `Guards.kt` — commit `feat(android-engine): detect guards — pending, (image,FEN) base truth, corner jump`

### 3. `Evidence.kt` — commit `feat(android-engine): evidence — gray + census channels, raw census copy, channel guard`

### 4. `FrameLoop.kt` — commit `feat(android-engine): frame loop — dark gate, motion/stable branches, running means, grid gating`

### 5. Tests — commit `test(android-engine): guards, evidence and frame-loop parity`

## Tests

`GuardsTest`, `EvidenceTest`, `FrameLoopTest` in `com.chesslab.engine`. Step-scoped Tier B
fixtures from phase 00b live in `core-engine/src/test/resources/parity/steps/` (one JSON
per recorded frame: `seq, refFen, corners, diffs{}, census{}, censRaw{}, z{}, state,
changed[], note`). Mirror these Python scenarios from `tests/test_move_tracker.py`:

- `test_stale_ref_fen_forces_recapture` (:839) → `GuardsTest.staleRefFenForcesRecapture`
- `test_valid_move_advances_base_truth_with_fen` (:827) → `GuardsTest.baseTruthIsImageAndFenPair`
- `test_global_exposure_shift_not_stuck` (:801) → `EvidenceTest.globalExposureShiftNotStuck`
- `test_normalize_diffs_isolates_hot_fields` (:66) → `EvidenceTest.medianNormalizationIsolatesHotSquares`
- `test_dark_on_dark_seen_by_census_not_gray` (:2174) → `EvidenceTest.darkOnDarkSeenByCensusOnly`
- `test_global_jitter_median_normalized` (:2281) → `EvidenceTest.globalJitterDoesNotFireCensus`
- `test_raw_core_vs_dilated` (:2304) → `FrameLoopTest.occludedGateCountsRawCoreNotDilated`
- `test_mean_equals_stack`, `test_drift_resync_after_64`, `test_clear_and_reuse` (:561/:571/:581)
  → `FrameLoopTest.runningMean*`
- `test_detect_scale_half_det_size_and_e2e4` (:2134) → `FrameLoopTest.detectScaleHalfDetSize`

Named invariant tests (entry.md):

- `GuardsTest.cornerJumpBeyondSixPxClearsReference` — invariant "geometry invalidation";
  5.9 px keeps the ref, 6.1 px clears it on any single corner axis.
- `EvidenceTest.censusThrComparesAgainstRawCensus` — invariant 8: after normalization the
  raw copy is unchanged and a square normalized below 40 still has `censRaw >= 40`.
- `EvidenceTest.censusChannelDroppedWhenTooManyHotSquares` — `hot = maxChanged + 3` →
  `cens == null`, `censRaw == null`, `z == zGray`.
- `EvidenceTest.censusDisturbanceNotLearnedWhileAlarmLatched` — same input with
  `alarm != null` → `censusNoise` unchanged (invariant 9).
- `EvidenceTest.censRawClearedWhenWeightTunedToZero` — set `censusZWeight = 0` on the
  second frame → `censRaw == null` (regression for the frozen-veto-input bug, :3099-3102).
- `FrameLoopTest.darkFrameGateIsPreClahe` — `lumaPreClahe = 17.9` → `Skip("dark")` and
  **no** state/buffer mutation; 18.1 proceeds.
- `FrameLoopTest.gridGateReleaseExtendsHoldAndClearsBuffers` — coverage goes 0.3 → 0.9:
  `ready == false`, both buffers empty, `holdUntil >= nowS + motionHoldS` (:1663-1672).
- `FrameLoopTest.readyRequiresSettleFramesAndHold` — `stableCount >= settleFrames` alone
  is not enough while `nowS < holdUntil`.
- `FrameLoopTest.setRefOnlyWhenRefGrayNull` — a second ready frame with a live ref must
  not call `setRef` (:1676-1682).
- `FrameLoopTest.repeatedFrameNeverDeliveredTwice` — invariant 14: feeding the identical
  `FrameInput.seq` twice is rejected (`require(input.seq > lastSeq)`).

Run once:
`.\gradlew.bat :core-engine:test --tests "com.chesslab.engine.GuardsTest" --tests "com.chesslab.engine.EvidenceTest" --tests "com.chesslab.engine.FrameLoopTest"`

## Acceptance criteria

- `grep -n "censRaw" .../engine/Evidence.kt` hits, and the assignment happens **before**
  the `normalizeDiffs(cens)` line.
- `grep -n "maxChanged + 2" .../engine/Evidence.kt` hits exactly once (channel guard).
- `grep -n "lumaPreClahe" .../engine/FrameLoop.kt` hits; `grep -rn "System.currentTimeMillis\|Instant.now" android/core-engine/src/main` returns nothing.
- `grep -n "occlCoreExpiry" .../engine/FrameLoop.kt` shows the `> 2` gate reading
  `occlCoreExpiry`, never `occlusionExpiry`.
- `grep -rn "synchronized\|@Volatile\|Atomic\|Mutex" android/core-engine/src/main` returns nothing.
- All named tests green; ktlint/detekt clean for `:core-engine`.
- `EngineState.kt` compiles standalone and declares every field listed above.

## Do NOT

- Do not edit `Vetoes.kt`, `NoiseLearning.kt`, `Taint.kt` (03b), `Hypothesis.kt`,
  `PairCandidate.kt`, `EndpointCandidate.kt`, `Ambiguity.kt` (03c), `Dispatch.kt`,
  `Commit.kt`, `AnomalyPatcher.kt`, `TrackerEngine.kt` (03d).
- Do not apply the vetoes, the taint filter or the noise update inside `Evidence.kt` — they
  are steps 3 and 4 and belong to 03b.
- Do not call `setRef` yourself beyond the `refGray == null` case; commit-time re-anchoring
  is 03d's.
- Do not introduce a wall clock, threads, coroutines or OpenCV into `:core-engine`.
- Do not "fix" `censusZWeight == 0` by keeping the previous frame's census — that is the bug.
