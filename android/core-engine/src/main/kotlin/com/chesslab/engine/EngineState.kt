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
 * Owned by phase 03a; phases 03b/03c/03d and 04a/04b/04c read and write these fields but never edit
 * this file. Plain `var`s: `:core-engine` is driven by exactly one thread, so there is no
 * `synchronized`, no `Atomic*`, no `Mutex` and no `@Volatile` anywhere (entry.md hard rule 2) — the
 * whole race class Python's `self.lock` guards simply does not exist here.
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

    /** `ref_gray` */
    var refGray: GrayImage? = null

    /** `ref_bgr` */
    var refBgr: BgrImage? = null

    /** `ref_fen` */
    var refFen: String? = null

    /** `_ref_corners` */
    var refCorners: FloatArray? = null

    /** `_last_corners` */
    var lastCorners: FloatArray? = null

    /** `_ref_gamut` (type from 01c: `ColorGamut`, not the spec's `BoardColorGamut`). */
    var refGamut: ColorGamut? = null

    /** `_ref_census` — cached census codes of [refGray]. */
    var refCensus: ByteArray? = null

    /** `_ref_census_for` — IDENTITY key of [refCensus] (`is not`, never `!=`). */
    var refCensusFor: GrayImage? = null

    // -- frame loop -------------------------------------------------------------------------------

    /** `_frame_seq` */
    var frameSeq: Long = 0

    /** `FrameInput.seq` of the previous frame; invariant 14 (a frame is never delivered twice). */
    var lastInputSeq: Long = -1

    /** `prev_gray` */
    var prevGray: GrayImage? = null

    /** `_gray_buf` */
    val grayBuf: RunningMeanGray = RunningMeanGray(config.avgFrames(cnnOn = false))

    /** `_bgr_buf` */
    val bgrBuf: RunningMeanBgr = RunningMeanBgr(config.avgFrames(cnnOn = false))

    /** `stable_count` */
    var stableCount: Int = 0

    /** `_hold_until` */
    var holdUntil: Double = 0.0

    /** `_last_cur` */
    var lastCur: GrayImage? = null

    /** `_last_cur_bgr` */
    var lastCurBgr: BgrImage? = null

    /** `state`: waiting | moving | occluded | move */
    var state: String = STATE_WAITING

    /** `_motion` */
    var motion: Double = 0.0

    /** `_last_motion_ts` */
    var lastMotionTs: Double = 0.0

    /** `_motion_since_ref` */
    var motionSinceRef: Boolean = false

    /** `_occl_grid_active` */
    var occlGridActive: Boolean = false

    /** `_grid_coverage` */
    var gridCoverage: Double = 1.0

    /** `_fps` */
    var fps: Double = 0.0

    /** `_last_loop_ts` */
    var lastLoopTs: Double = 0.0

    /**
     * `_ts` / `_diff_ms` — per-stage wall time in ms.
     *
     * The engine NEVER writes a measured duration in here: measuring one would need a wall clock,
     * which this module must not have (see the class KDoc). `:app` fills it from outside; the map
     * exists so `TrackerStatus.stageTimingsMs` has a home (STATUS D03a-5).
     */
    val stageTimingsMs: MutableMap<String, Double> = mutableMapOf()

    // -- occlusion / taint (03b owns the logic, not the fields) ------------------------------------

    /** `_occlusion_expiry` — square -> expiry timestamp of the DILATED occlusion keep-alive. */
    val occlusionExpiry: MutableMap<String, Double> = mutableMapOf()

    /** `_occl_core_expiry` — the RAW UNDILATED core; the `>2 -> occluded` gate counts THIS. */
    val occlCoreExpiry: MutableMap<String, Double> = mutableMapOf()

    /** `_motion_occluded_squares` */
    var motionOccludedSquares: MutableSet<String> = mutableSetOf()

    /** `_tainted` — square -> expiry (Python counts frames; the port latches on [nowS]). */
    val tainted: MutableMap<String, Double> = mutableMapOf()

    /** `_occl_whitelist` — persistent-occlusion squares exempt from the veto. */
    val occlWhitelist: MutableSet<String> = mutableSetOf()

    /** `_occluded_since` — occlusion-latch timer (gamut escape hatch); `null` = not latched. */
    var occludedSince: Double? = null

    /** `_occluded_vetoed` */
    var occludedVetoed: List<String> = emptyList()

    /** `_shadow_vetoed` */
    var shadowVetoed: List<String> = emptyList()

    /** `_shadow_blocked` — candidate ucis rejected because their destination was vetoed. */
    val shadowBlocked: MutableList<String> = mutableListOf()

    // -- evidence -----------------------------------------------------------------------------------

    /** `noise` — the GRAY lane (01d defaults). */
    val noise: SquareNoise = SquareNoise()

    /**
     * `census_noise` — the CENSUS lane. Python is `SquareNoise(init_std=8.0, std_floor=2.5)`
     * (`tracker.py:761`); the two lanes must never be unified (STATUS D03a-3).
     */
    val censusNoise: SquareNoise =
        SquareNoise(initStd = CENSUS_NOISE_INIT_STD, stdFloor = CENSUS_NOISE_STD_FLOOR)

    /** `_cens_raw` — the RAW census channel, the shadow veto's threshold input (invariant 8). */
    var censRaw: MutableMap<String, Double>? = null

    /** normalized gray channel (status) */
    var lastDiffs: Map<String, Double> = emptyMap()

    /** normalized census channel (status) */
    var lastCens: Map<String, Double> = emptyMap()

    /** fused z (status heatmap) */
    var lastZ: Map<String, Double> = emptyMap()

    /** `_changed` */
    var changed: MutableSet<String> = mutableSetOf()

    /** `_changed_vals` (top 8) */
    var changedVals: List<Pair<String, Double>> = emptyList()

    /** `_struct_vals` (top 8) */
    var structVals: List<Pair<String, Double>> = emptyList()

    // -- scoring / hypothesis -----------------------------------------------------------------------

    /** `_best_score` */
    var bestScore: Double = 0.0

    /** `_second_score` */
    var secondScore: Double = 0.0

    /** `_candidate_uci` */
    var candidateUci: String? = null

    // -- game state ---------------------------------------------------------------------------------

    /**
     * `board` — 02a's [Game] wrapper, NOT a raw chesslib `Board`: `Game.fen()` is
     * `getFen(true, true)`, which is the only spelling that matches python-chess (STATUS D02a-1).
     */
    var board: Game = Game(startFen)

    /** `history` (SAN) */
    val history: MutableList<String> = mutableListOf()

    /** `last_move` (uci) */
    var lastMove: String? = null

    /** `note` */
    var note: String? = null

    /** `prior_last` */
    var priorLast: Boolean = false

    /** `recovered_last` */
    var recoveredLast: Boolean = false

    // -- pending / promotion / confirmation ----------------------------------------------------------

    /** `_pending` */
    var pending: PendingVerify? = null

    /** `_promo_pending` */
    var promoPending: PromoPending? = null

    /** `_verify_state`: null | "verifying" | "confirmed" | "ghost" */
    var verifyState: String? = null

    /** `_confirmer`. Python builds it with the resolved `confirm_frames` at construction time. */
    var confirmer: Confirmer = Confirmer(config.confirmFrames(cnnOn = false))

    /** `_recovery_confirmer` — the recovery-commit voting confirmer (phase 04c). */
    var recoveryConfirmer: Confirmer = Confirmer(config.confirmFrames(cnnOn = false))

    // -- stuck / anomaly -------------------------------------------------------------------------------

    /** `_stuck_reason` */
    var stuckReason: String? = null

    /** `_stuck_count` */
    var stuckCount: Int = 0

    /** `_anomaly_since` — square -> since when persistently changed but unexplained. */
    val anomalySince: MutableMap<String, Double> = mutableMapOf()

    // -- CNN coupling (03b reads snap; 04x owns the machines) --------------------------------------------

    /** `_cnn_snap` */
    var cnnSnap: CnnSnapshot? = null

    /** `cnn_run` */
    var cnnRun: Boolean = false

    /** `_cnn_failed` */
    var cnnFailed: Boolean = false

    /** `_cnn_busy` — one observation at a time. */
    var cnnBusy: Boolean = false

    /** `_observer_started_ts` — when the last observation was spawned (`_observer_due`). */
    var observerStartedTs: Double = 0.0

    /** `_last_cnn_ts` — recovery-observation cooldown anchor. */
    var lastCnnTs: Double = 0.0

    /** `cnn_status`: null | "ok" | "mismatch" */
    var cnnStatus: String? = null

    /** `cnn_conflicts` */
    var cnnConflicts: List<String> = emptyList()

    /** `_cnn_agreement` */
    var cnnAgreement: Double = 0.0

    /** `_cnn_best_move` */
    var cnnBestMove: String? = null

    /** `_alarm` — the latch. Non-null freezes noise learning and blocks every commit (invariant 9). */
    var alarm: TrackerEvent.Alarm? = null

    /** `_alarm["since"]` — kept separately because the seam's `Alarm` carries no timestamp. */
    var alarmSince: Double = 0.0

    /** `_desync_obs` — consecutive desync observations. */
    var desyncObs: Int = 0

    /** `_desync_conflicts` — the stable conflict set of the streak. */
    val desyncConflicts: MutableSet<String> = mutableSetOf()

    /** `_desync_last_seq` — last observation seq counted (dedup, Spec 11). */
    var desyncLastSeq: Long? = null

    // -- provenance -----------------------------------------------------------------------------------

    /** `_decision_log` */
    val decisionLog: MutableList<DecisionRecord> = mutableListOf()

    /** `_pending_capture` */
    var pendingCapture: PendingCapture? = null

    // -- derived geometry (Python rebuilds `_square_boxes` per call; the port caches, 01a) -------------

    /** `_det_boxes` (`tracker.py:820`) — `extendUp = 0.0`. */
    var detBoxes: SquareBoxes = squareBoxes(config.detSize, whitePov)

    /** The evidence boxes, `extendUp = config.overhang` — what `per_square_diff` builds per call. */
    var evidenceBoxes: SquareBoxes = squareBoxes(config.detSize, whitePov, config.overhang)

    /** Rebuild both box sets after `detSize` / `overhang` changed (live tuning). */
    fun rebuildBoxes() {
        detBoxes = squareBoxes(config.detSize, whitePov)
        evidenceBoxes = squareBoxes(config.detSize, whitePov, config.overhang)
    }

    // -- CNN-conditional derived knobs (tracker.py:739-742) --------------------------------------------
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
 * `_pending` (`tracker.py:3341-3343`) — a confirmed diff candidate awaiting CNN verification.
 *
 * [frames] counts the verify ticks; [voteOutcome]/[voteCount] are Python's `_outcome`/`_votes`
 * multi-glance vote (`_pending_voted` `:2290`, entry.md invariant 13 — never act on one glance).
 * [cur]/[curBgr] are the AVERAGED frame the candidate was raised from and the verify path's only
 * legal anchor (invariant 5).
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

/** `_promo_pending` (`tracker.py:3255-3258`) — waits for `choose_promotion()`. */
internal data class PromoPending(
    val from: String,
    val to: String,
    val cur: GrayImage,
    val curBgr: BgrImage?,
    val fen: String,
)

/** `_record_decision` (`tracker.py:2650-2674`) — the per-move provenance row. */
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
)

/** `_queue_session_capture` — the deferred auto-labeled session photo. */
internal data class PendingCapture(
    val san: String,
    val fen: String,
)
