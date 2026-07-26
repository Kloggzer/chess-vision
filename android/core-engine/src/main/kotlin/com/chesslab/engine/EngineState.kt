package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent

/**
 * The ONE mutable state object of the engine — every field of Python's `MoveTracker` that survives
 * between frames, each named with its Python counterpart.
 *
 * Plain `var`s: `:core-engine` is driven by exactly one thread, so there is no `synchronized`, no
 * `Atomic*`, no `Mutex` and no `@Volatile` anywhere (entry.md hard rule 2) — the whole race class
 * Python's `self.lock` guards simply does not exist here.
 *
 * Square SETS are `Long` bitboards (`Bitboard.kt`) and per-square scalars are `DoubleArray(64)`
 * indexed by [Squares.ALL]; both are converted to names only in `toStatus()`.
 *
 * **Determinism (binding):** [nowS] is set ONCE per `onFrame` from `FrameInput.timestampMs`, and
 * every Python `time.time()` maps to it. There is no wall clock in this module.
 */
internal class EngineState(
    // live-tunable; TrackerEngine.updateConfig swaps it
    var config: TrackerConfig,
    startFen: String = STARTPOS,
    // profile.white_pov
    val whitePov: Boolean = true,
) {
    // -- clock: the engine is deterministic; nowS comes from FrameInput.timestampMs / 1000.0. ----

    /** Replaces every `time.time()` call. Set once per frame by [FrameLoop.step]. */
    var nowS: Double = 0.0

    // -- base truth (image, FEN) pair ------------------------------------------------------------

    var refGray: GrayImage? = null // `ref_gray`
    var refBgr: BgrImage? = null // `ref_bgr`
    var refFen: String? = null // `ref_fen`
    var refCorners: FloatArray? = null // `_ref_corners`
    var lastCorners: FloatArray? = null // `_last_corners`

    private var gamutValue: ColorGamut? = null
    private var gamutPending: BgrImage? = null

    /**
     * `_ref_gamut` (type from 01c: `ColorGamut`, not the spec's `BoardColorGamut`).
     *
     * **Built on read, not on write.** The quiet re-anchor fires on every stable frame and each one
     * would rebuild the gamut from a full BGR->Lab plus BGR->HSV pass over the whole detection
     * plane — 88 ms of a 247 ms frame on the phone — while the only consumer
     * ([FrameLoop.updateBaselineOcclusion]) reads it exclusively in the `moving`/`occluded` states.
     * Every rebuild but the last before motion starts was therefore thrown away unread.
     *
     * Deferring is value-identical because [markGamutStale] captures the exact plane the eager
     * rebuild would have used, so a later re-anchor or commit swapping `refBgr` cannot retarget it.
     */
    var refGamut: ColorGamut?
        get() {
            gamutPending?.let {
                gamutValue = buildGamut(it)
                gamutPending = null
            }
            return gamutValue
        }
        set(value) {
            gamutValue = value
            gamutPending = null
        }

    /** The quiet re-anchor's half of [refGamut]: remember the plane, pay for it only if read. */
    fun markGamutStale(bgr: BgrImage) {
        gamutPending = bgr
    }

    /** `_ref_census` — cached census codes of [refGray]. */
    var refCensus: ByteArray? = null

    /** `_ref_census_for` — IDENTITY key of [refCensus] (`is not`, never `!=`). */
    var refCensusFor: GrayImage? = null

    /** The codes `computeEvidence` derived for the current frame, and their IDENTITY key. */
    var curCensus: ByteArray? = null
    var curCensusFor: GrayImage? = null

    // -- frame loop -------------------------------------------------------------------------------

    var frameSeq: Long = 0 // `_frame_seq`

    /** `FrameInput.seq` of the previous frame; invariant 14 (a frame is never delivered twice). */
    var lastInputSeq: Long = -1

    var prevGray: GrayImage? = null // `prev_gray`

    // `cnn_run` / `_cnn_failed` — declared HERE, before the two averaging buffers, and not with the
    // rest of the CNN coupling below: they are two of the three inputs to [cnnOn], and [avgFrames]
    // is CNN-conditional, so the buffers below cannot be sized without them.
    var cnnRun: Boolean = false

    var cnnFailed: Boolean = false

    /**
     * The window [grayBuf] and [bgrBuf] are currently sized for.
     *
     * It is NOT `config.avgFrames(cnnOn = false)`. That was the bug: the buffers were built for the
     * without-CNN window (3) and the live gate reads [avgFrames], which becomes 2 the moment the CNN
     * attaches — `updateConfig` resized them on a CONFIG change and nothing resized them on a CNN
     * attach, so the frame loop waited for a third frame that the mean was never going to need.
     * [syncAvgWindow] closes that: every path that can flip [cnnOn] calls it.
     */
    private var avgWindow: Int = avgFrames
    val grayBuf: RunningMeanGray = RunningMeanGray(avgWindow) // `_gray_buf`
    val bgrBuf: RunningMeanBgr = RunningMeanBgr(avgWindow) // `_bgr_buf`

    /**
     * Re-size the averaging buffers when [avgFrames] moved — a config change, a CNN attach or the
     * CNN failing mid-game.
     *
     * A resize DROPS what is buffered, which is Python building a fresh `_RunningMean`, so this is a
     * no-op when the window did not move; that is the whole point of tracking [avgWindow] rather
     * than resizing unconditionally.
     */
    fun syncAvgWindow() {
        val want = avgFrames
        if (want == avgWindow) return
        avgWindow = want
        grayBuf.resize(want)
        bgrBuf.resize(want)
    }

    var stableCount: Int = 0 // `stable_count`
    var holdUntil: Double = 0.0 // `_hold_until`
    var lastCur: GrayImage? = null // `_last_cur`
    var lastCurBgr: BgrImage? = null // `_last_cur_bgr`
    var state: String = STATE_WAITING // `state`: waiting | moving | occluded | move
    var motion: Double = 0.0 // `_motion`
    var lastMotionTs: Double = 0.0 // `_last_motion_ts`
    var motionSinceRef: Boolean = false // `_motion_since_ref`
    var occlGridActive: Boolean = false // `_occl_grid_active`
    var gridCoverage: Double = 1.0 // `_grid_coverage`
    var fps: Double = 0.0 // `_fps`
    var lastLoopTs: Double = 0.0 // `_last_loop_ts`

    /**
     * `_ts` / `_diff_ms` — per-stage wall time in ms.
     *
     * The engine NEVER writes a measured duration in here: measuring one would need a wall clock,
     * which this module must not have (see the class KDoc). `:app` fills it from outside; the map
     * exists so `TrackerStatus.stageTimingsMs` has a home.
     */
    val stageTimingsMs: MutableMap<String, Double> = mutableMapOf()

    // -- occlusion / taint --------------------------------------------------------------------------

    /**
     * `_occlusion_expiry` — expiry timestamp of the DILATED occlusion keep-alive, per square.
     * An untouched slot is `0.0`, which is always in the past, so there is no separate latch mask
     * and nothing to prune.
     */
    val occlusionExpiry = DoubleArray(Squares.COUNT)

    /** `_occl_core_expiry` — the RAW UNDILATED core; the `>2 -> occluded` gate counts THIS. */
    val occlCoreExpiry = DoubleArray(Squares.COUNT)

    var motionOccluded: Long = 0L // `_motion_occluded_squares`

    /**
     * `_tainted` — the LATCHED squares (Python counts frames; the port latches on [nowS]).
     * Unlike the expiry-only sets above this needs its own mask: a taint outlives its timer until
     * the release rule in `Taint.kt` fires.
     */
    var tainted: Long = 0L

    /** Expiry timestamp per tainted square; only meaningful for squares set in [tainted]. */
    val taintExpiry = DoubleArray(Squares.COUNT)

    /** `_occl_whitelist` — persistent-occlusion squares exempt from the veto. */
    var occlWhitelist: Long = 0L

    /** `_occluded_since` — occlusion-latch timer (gamut escape hatch); `null` = not latched. */
    var occludedSince: Double? = null

    var occludedVetoed: Long = 0L // `_occluded_vetoed`
    var shadowVetoed: Long = 0L // `_shadow_vetoed`

    /** `_shadow_blocked` — candidate ucis rejected because their destination was vetoed. */
    val shadowBlocked: MutableList<String> = mutableListOf()

    // -- evidence -----------------------------------------------------------------------------------

    val noise: SquareNoise = SquareNoise() // `noise` — the GRAY lane.

    /**
     * `census_noise` — the CENSUS lane. Python is `SquareNoise(init_std=8.0, std_floor=2.5)`;
     * the two lanes must never be unified (STATUS D03a-3).
     */
    val censusNoise: SquareNoise =
        SquareNoise(initStd = CENSUS_NOISE_INIT_STD, stdFloor = CENSUS_NOISE_STD_FLOOR)

    /**
     * `_cens_raw` — the RAW census channel, the shadow veto's threshold input (invariant 8).
     * Points at [censValues] while the channel ran this frame, `null` otherwise.
     */
    var censRaw: DoubleArray? = null

    /** normalized gray channel — also `_diffs` for noise learning and the status heatmap. */
    val lastDiffs = DoubleArray(Squares.COUNT)

    /** normalized census channel, or `null` when the channel was off / dropped this frame. */
    var lastCens: DoubleArray? = null

    /** fused z — the one evidence array every gate and the LL scoring read. */
    val lastZ = DoubleArray(Squares.COUNT)

    // Per-frame evidence scratch, owned per engine so two engines can never alias each other.
    val diffRaw = DoubleArray(Squares.COUNT)
    val zGray = DoubleArray(Squares.COUNT)
    val censValues = DoubleArray(Squares.COUNT)
    val censNorm = DoubleArray(Squares.COUNT)
    val zCensus = DoubleArray(Squares.COUNT)

    // The same policy, for the three pixel stages whose scratch used to live at FILE scope — roughly
    // 11.5 MB of it, shared by every engine in the process. See each class for the details.
    val baselineScratch = BaselineScratch()
    val shadowVetoScratch = ShadowVetoScratch()
    val gamutScratch = GamutScratch()
    val handScratch = HandVetoScratch()

    var changed: Long = 0L // `_changed`
    var changedVals: List<Pair<String, Double>> = emptyList() // `_changed_vals` (top 8)
    var structVals: List<Pair<String, Double>> = emptyList() // `_struct_vals` (top 8)

    // -- scoring / hypothesis -----------------------------------------------------------------------

    var bestScore: Double = 0.0 // `_best_score`
    var secondScore: Double = 0.0 // `_second_score`
    var candidateUci: String? = null // `_candidate_uci`

    // -- game state ---------------------------------------------------------------------------------

    /**
     * `board` — the [Game] wrapper, NOT a raw chesslib `Board`: `Game.fen()` is
     * `getFen(true, true)`, which is the only spelling that matches python-chess (STATUS D02a-1).
     */
    var board: Game = Game(startFen)

    val history: MutableList<String> = mutableListOf() // `history` (SAN)
    var lastMove: String? = null // `last_move` (uci)
    var note: String? = null // `note`
    var priorLast: Boolean = false // `prior_last`
    var recoveredLast: Boolean = false // `recovered_last`

    // -- pending / promotion / confirmation ----------------------------------------------------------

    var pending: PendingVerify? = null // `_pending`
    var promoPending: PromoPending? = null // `_promo_pending`
    var verifyState: String? = null // `_verify_state`: null | "verifying" | "confirmed" | "ghost"

    /**
     * The window both confirmers are currently built for — the same defect [avgWindow] had.
     *
     * Python resolves `confirm_frames` ONCE at construction, from a CNN state that is also fixed at
     * construction, and never rebuilds the confirmer. Kotlin attaches its CNN asynchronously and
     * lets `cnnVerify` be tuned live, so the value can move under it: built for `cnnOn = false` (2)
     * and never reconciled, while the live gate ([confirmFrames]) reads 1 the moment the CNN
     * attaches. The status note printed `${'$'}{confirmer.count}/${'$'}confirmFrames` from those two
     * disagreeing sources.
     */
    private var confirmWindow: Int = confirmFrames

    /** `_confirmer`. Python builds it with the resolved `confirm_frames` at construction time. */
    var confirmer: Confirmer = Confirmer(confirmWindow)

    /** `_recovery_confirmer` — the recovery-commit voting confirmer (phase 04c). */
    var recoveryConfirmer: Confirmer = Confirmer(confirmWindow)

    /**
     * Rebuild both confirmers when [confirmFrames] moved — a config change, a CNN attach, or the
     * CNN failing mid-game.
     *
     * A rebuild DROPS the in-flight streak, which is why this is a no-op when the window did not
     * move. When it did move, dropping is correct: a streak counted towards two confirmations means
     * nothing once one is required.
     */
    fun syncConfirmWindow() {
        val want = confirmFrames
        if (want == confirmWindow) return
        confirmWindow = want
        confirmer = Confirmer(want)
        recoveryConfirmer = Confirmer(want)
    }

    // -- stuck / anomaly -------------------------------------------------------------------------------

    var stuckReason: String? = null // `_stuck_reason`
    var stuckCount: Int = 0 // `_stuck_count`

    /** `_anomaly_since` — squares persistently changed but unexplained, and since when. */
    var anomalySince: Long = 0L

    val anomalyStart = DoubleArray(Squares.COUNT)

    // -- CNN coupling (03b reads snap; 04x owns the machines) --------------------------------------------

    var cnnSnap: CnnSnapshot? = null // `_cnn_snap`

    // `cnn_run` and `_cnn_failed` belong here by topic; they are declared up with the frame loop
    // because the averaging buffers are sized from them.

    var cnnBusy: Boolean = false // `_cnn_busy` — one observation at a time.

    /** `_observer_started_ts` — when the last observation was spawned (`_observer_due`). */
    var observerStartedTs: Double = 0.0

    var lastCnnTs: Double = 0.0 // `_last_cnn_ts` — recovery-observation cooldown anchor.
    var cnnStatus: String? = null // `cnn_status`: null | "ok" | "mismatch"
    var cnnConflicts: List<String> = emptyList() // `cnn_conflicts`
    var cnnAgreement: Double = 0.0 // `_cnn_agreement`
    var cnnBestMove: String? = null // `_cnn_best_move`

    /** `_alarm` — the latch. Non-null freezes noise learning and blocks every commit (invariant 9). */
    var alarm: TrackerEvent.Alarm? = null

    /** `_alarm["since"]` — kept separately because the seam's `Alarm` carries no timestamp. */
    var alarmSince: Double = 0.0

    var desyncObs: Int = 0 // `_desync_obs` — consecutive desync observations.
    var desyncConflicts: Long = 0L // `_desync_conflicts` — the stable conflict set of the streak.

    /** `_desync_last_seq` — last observation seq counted (dedup, Spec 11). */
    var desyncLastSeq: Long? = null

    /** `_desync_since` — wall time the current streak started; the held-for note reads it. */
    var desyncSince: Double = 0.0

    // -- provenance -----------------------------------------------------------------------------------

    // `_decision_log` — ring-capped (see DecisionLog); the list contract is unchanged.
    val decisionLog: MutableList<DecisionRecord> = DecisionLog()
    var pendingCapture: PendingCapture? = null // `_pending_capture`

    // -- derived geometry (Python rebuilds `_square_boxes` per call; the port caches) ------------------

    var detBoxes: SquareBoxes = squareBoxes(config.detSize, whitePov) // `_det_boxes` — `extendUp = 0.0`.

    /** The evidence boxes, `extendUp = config.overhang` — what `per_square_diff` builds per call. */
    var evidenceBoxes: SquareBoxes = squareBoxes(config.detSize, whitePov, config.overhang)

    /** Rebuild both box sets after `detSize` / `overhang` changed (live tuning). */
    fun rebuildBoxes() {
        detBoxes = squareBoxes(config.detSize, whitePov)
        evidenceBoxes = squareBoxes(config.detSize, whitePov, config.overhang)
    }

    // -- CNN-conditional derived knobs ----------------------------------------------------------------
    val cnnOn: Boolean get() = config.cnnVerify && cnnRun && !cnnFailed

    val settleFrames: Int get() = config.settleFrames(cnnOn)

    val avgFrames: Int get() = config.avgFrames(cnnOn)

    val confirmFrames: Int get() = config.confirmFrames(cnnOn)

    val detSize: Int get() = config.detSize
}

/** `state` values of the tracker; `"move"` and `"occluded"` are the two that suppress detection. */
internal const val STATE_WAITING = "waiting"

internal const val STATE_MOVING = "moving"

internal const val STATE_OCCLUDED = "occluded"

internal const val STATE_MOVE = "move"

/**
 * `_pending` — a confirmed diff candidate awaiting CNN verification.
 *
 * [frames] counts the verify ticks; [voteOutcome]/[voteCount] are Python's `_outcome`/`_votes`
 * multi-glance vote (entry.md invariant 13 — never act on one glance). [cur]/[curBgr] are the
 * AVERAGED frame the candidate was raised from and the verify path's only legal anchor
 * (invariant 5).
 */
internal data class PendingVerify(
    val ucis: List<String>,
    val uci: String,
    val fen: String,
    val cur: GrayImage,
    val curBgr: BgrImage?,
    var frames: Int,
    val priorUsed: Boolean,
    val seq: Long,
    var voteOutcome: String? = null,
    var voteCount: Int = 0,
)

/** Alias for the name phases 04a/04b use for the same object. */
internal typealias PendingCandidate = PendingVerify

/** `_promo_pending` — waits for `choose_promotion()`. */
internal data class PromoPending(
    val from: String,
    val to: String,
    val cur: GrayImage,
    val curBgr: BgrImage?,
    val fen: String,
)

/** `_record_decision` — the per-move provenance row. */
internal data class DecisionRecord(
    val tsS: Double,
    val ply: Int,
    val move: String?,
    val san: String?,
    val fenBefore: String?,
    val fenAfter: String,
    val decider: String,
    val reason: String,
    val priorUsed: Boolean,
    val bestScore: Double,
    val secondScore: Double,
    val margin: Double,
    val changed: List<String>,
    val changedVals: List<Pair<String, Double>>,
    val shadowVetoed: List<String>,
    val occludedVetoed: List<String>,
    val gridCoverage: Double,
    val zThr: Double,
    val motion: Double,
    val cnnRun: Boolean,
    val cnnAgreement: Double,
    val cnnBestMove: String?,
    // Provenance the debug screen needs and Python does not record. Defaulted, so the existing
    // construction sites keep their exact shape; `accepted = false` marks a REJECTED candidate,
    // which Python never logs at all.
    val stuckReason: String? = null,
    val verifyOutcome: String? = null,
    val accepted: Boolean = true,
)

/** `_queue_session_capture` — the deferred auto-labeled session photo. */
internal data class PendingCapture(
    val san: String,
    val fen: String,
)
