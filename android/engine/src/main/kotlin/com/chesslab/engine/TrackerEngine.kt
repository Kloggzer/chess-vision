package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.OccupancySafeguard
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerState
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.engine.api.Uncertainty
import com.chesslab.engine.api.VerifyVerdict
import com.github.bhlangonijr.chesslib.move.Move
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Orchestration of the move-tracker detection pipeline on pre-warped, white-POV board images
 * (ports the frame state machine of tracker.py:1033 `_loop` + `_try_detect` dispatch; geometry,
 * warping and camera live in phases 02/03). Deterministic: all timing derives from the frame
 * timestamps / the injected [clock]; no wall-clock reads in the logic.
 */
class TrackerEngine(
    private val config: TrackerConfig = TrackerConfig(),
    private val clock: () -> Long = System::nanoTime,
) {
    private val state = EngineState()
    private val averager = FrameAverager(AVG_FRAMES)
    private var prevGray: GrayImage? = null
    private var lastPublicState: TrackerState? = null
    private val queued = mutableListOf<TrackerEvent>()
    private var lastNowS = 0.0
    private val uncertaintyFlow = MutableStateFlow(Uncertainty())

    /** Phase 05 plugs in the CNN safeguard; null = pure diff tracking with confirmFrames voting. */
    var safeguard: OccupancySafeguard? = null
        set(value) {
            field = value
            detector.confirmer = Confirmer(if (value != null) 1 else config.confirmFrames)
        }

    private val detector = Detector(config, state) { safeguard }

    /** Uncertainty signal for dynamic-resolution (phase 03) and the CNN safeguard (phase 05). */
    val uncertainty: StateFlow<Uncertainty> = uncertaintyFlow

    /** Debug-card snapshot (ports tracker.py:2433 `status`). */
    val status: TrackerStatus
        get() =
            TrackerStatus(
                fen = state.game.fen(),
                state = publicState(),
                lastMove = state.lastMove,
                history = state.history.toList(),
                note = state.note,
                inCheck = state.game.result().inCheck,
                gameOver = state.game.result().over,
                refFen = state.refFen,
                motion = state.motion,
                stableCount = state.stableCount,
                motionSinceRef = state.motionSinceRef,
                changed = state.changed,
                changedVals = state.changedVals,
                structVals = state.structVals,
                shadowVetoed = state.shadowVetoed,
                occludedVetoed = state.occludedVetoed,
                tainted = state.tainted.keys.sorted(),
                bestScore = state.bestScore,
                secondScore = state.secondScore,
                candidate = state.candidateUci,
                confirmCount = detector.confirmer.count,
                stuckReason = state.stuckReason,
                stuckCount = state.stuckCount,
                pendingMove = state.pending?.ucis?.joinToString(" "),
                promotionPending = state.promoPending?.let { it.fromSquare to it.toSquare },
                priorLast = state.priorLast,
                noiseMean = state.noise.mean.toMap(),
                noiseStd = state.noise.std.toMap(),
            )

    /**
     * Feed one warped stable-candidate frame (gray + BGR of the SAME rectified board view);
     * `timestampNs` is a monotonic timestamp (defaults to the injected clock). Returns the
     * events produced by this frame (including events queued by undo/forcePromote/verdicts).
     */
    fun onFrame(
        gray: GrayImage,
        bgr: BgrImage,
        timestampNs: Long = clock(),
    ): List<TrackerEvent> {
        val events = mutableListOf<TrackerEvent>()
        events += queued
        queued.clear()
        val now = timestampNs / NS_PER_S
        lastNowS = now
        val prev = prevGray
        val motion =
            if (prev == null || prev.data.size != gray.data.size) {
                0.0
            } else {
                Motion.motionScore(prev, gray, config.motionPxThr)
            }
        prevGray = gray
        state.motion = motion
        refreshOcclusion(gray, bgr, now)
        if (motion > config.motionThr) handleMotionSpike(now) else handleStableFrame(gray, bgr, now, events)
        val public = publicState()
        if (public != lastPublicState) {
            lastPublicState = public
            events.add(TrackerEvent.StateChanged(public))
        }
        uncertaintyFlow.value =
            Uncertainty(
                lowMargin =
                    state.candidateUci != null &&
                        state.bestScore - state.secondScore < 2 * config.ambiguityMarginLl,
                stuck = state.stuckReason != null,
                pendingVerify = state.pending != null,
            )
        return events
    }

    /**
     * Per-square occlusion against the baseline reference — runs during motion/occlusion
     * states; the keep-alive bridges the gap between the hand leaving and motion-hold expiry
     * (ports tracker.py:1092-1102).
     */
    private fun refreshOcclusion(
        gray: GrayImage,
        bgr: BgrImage,
        now: Double,
    ) {
        val ref = state.refGray
        if (ref != null && state.state !in listOf("waiting", "move") && ref.data.size == gray.data.size) {
            val result =
                Motion.baselineOcclusionAndShadow(
                    gray,
                    ref,
                    BoardGeometry(gray.width),
                    config.motionPxThr * OCC_THR_FACTOR,
                    Motion.StructuralInputs(
                        refCodes = state.refCensusCodes(),
                        occlCensusThr = config.occlCensusThr,
                        curBgr = bgr,
                        gamut = state.refGamut,
                        colorThr = config.occlusionColorThr,
                    ),
                )
            for (sq in result.occluded) state.occlusionExpiry[sq] = now + OCC_KEEPALIVE_S
            for (sq in result.core) state.occlCoreExpiry[sq] = now + OCC_KEEPALIVE_S
            state.shadowVetoed = result.shadow.sorted()
        }
        state.motionOccluded = state.occlusionExpiry.filterValues { now < it }.keys
        state.occludedVetoed = state.motionOccluded.sorted()
    }

    /** Hand/camera moving: discard buffers, arm the motion gate (ports tracker.py:1104-1116). */
    private fun handleMotionSpike(now: Double) {
        state.stableCount = 0
        state.motionSinceRef = true
        state.lastMotionTs = now
        detector.confirmer.reset()
        averager.clear()
        state.state = "moving"
        state.holdUntil = now + config.motionHoldS
    }

    /** Stable frame: settle, average, capture reference or detect (ports tracker.py:1117-1164). */
    private fun handleStableFrame(
        gray: GrayImage,
        bgr: BgrImage,
        now: Double,
        events: MutableList<TrackerEvent>,
    ) {
        state.stableCount++
        averager.append(gray, bgr)
        val ready = state.stableCount >= SETTLE_FRAMES && now >= state.holdUntil
        val cur = if (averager.size >= AVG_FRAMES) averager.meanGray() else null
        val curBgr = if (averager.size >= AVG_FRAMES) averager.meanBgr() else null
        if (cur != null && curBgr != null) detectOrCapture(cur, curBgr, ready, now, events)
        if (state.state !in listOf("move", "occluded")) state.state = "waiting"
    }

    /** Capture the reference on a clear settled view, or run detection (ports tracker.py:1148-1162). */
    private fun detectOrCapture(
        cur: GrayImage,
        curBgr: BgrImage,
        ready: Boolean,
        now: Double,
        events: MutableList<TrackerEvent>,
    ) {
        when {
            state.refGray == null && ready -> state.setRef(cur, curBgr)
            // Initial/re-capture of base truth: only from a clear, settled view.
            state.refGray == null -> state.note = "waiting for clear view of the board…"
            // Gate on the RAW occluded core, not the dilated set: a single strong square
            // (piece arrival) dilates to 5 and would lock the occluded state — detection
            // must see piece-like changes (ports tracker.py 8c30888).
            ready &&
                state.state != "move" &&
                state.occlCoreExpiry.count { now < it.value } > 2 -> state.state = "occluded"
            ready && state.state != "move" -> detector.tryDetect(cur, curBgr, now, events)
            else -> Unit
        }
    }

    /** Set board to start/FEN and re-capture the reference from the next clear view. */
    fun reset(fen: String = STARTPOS) {
        state.game = Game(fen)
        state.history.clear()
        state.lastMove = null
        state.invalidateRef()
        state.clearStuck()
        state.pending = null
        state.promoPending = null
        state.tainted.clear()
        state.occlusionExpiry.clear()
        state.occlCoreExpiry.clear()
        state.motionOccluded = emptySet()
        state.priorLast = false
        state.lastDecision = null
        state.state = "waiting"
        state.note = "Reference set"
        state.motionSinceRef = false
        state.lastMotionTs = 0.0
        state.holdUntil = 0.0
        state.stableCount = 0
        detector.confirmer.reset()
        detector.patcher.reset()
        averager.clear()
        prevGray = null
    }

    /**
     * Undo the last move. Implicit feedback: the undone move was WRONG — a hard-negative
     * [TrackerEvent.FeedbackRecorded] is queued for phase 07 (ports tracker.py:2673).
     */
    fun undo(): Boolean {
        val possible = state.history.isNotEmpty()
        if (possible) {
            val san = state.history.removeLast()
            val uci = state.lastMove ?: ""
            state.game.pop()
            state.lastMove = null
            state.invalidateRef()
            state.clearStuck()
            state.pending = null
            state.promoPending = null
            state.tainted.clear()
            state.priorLast = false
            detector.confirmer.reset()
            detector.patcher.reset()
            averager.clear()
            state.lastDecision?.let { queued.add(TrackerEvent.FeedbackRecorded(san, uci, "bad", it)) }
            state.lastDecision = null
            state.note = "last move undone (logged as bad example)"
        }
        return possible
    }

    /** User choice for a pending promotion ("Q"/"R"/"B"/"N" or a SAN like "e8=Q"). */
    fun forcePromote(san: String): Boolean {
        val pp = state.promoPending
        val letter = san.trim().uppercase().lastOrNull { it in "QRBN" }
        val move =
            if (pp != null && letter != null && state.game.fen() == pp.fen) {
                state.game.legalMoves().firstOrNull {
                    uciOf(it) == pp.fromSquare + pp.toSquare + letter.lowercaseChar()
                }
            } else {
                null
            }
        if (move != null) {
            state.promoPending = null
            state.commit(listOf(move), pp!!.curGray to pp.curBgr, "user_promotion" to false, queued)
        }
        return move != null
    }

    /** Phase 05 wiring feeds safeguard verdicts back; commits/rejects the pending candidate. */
    fun onVerifyVerdict(verdict: VerifyVerdict) {
        val pending = state.pending
        if (pending == null || pending.ucis != verdict.ucis || state.game.fen() != pending.fen) return
        when (verdict) {
            is VerifyVerdict.For -> {
                val moves =
                    buildList {
                        val g = state.game.copy()
                        for (u in pending.ucis) {
                            val mv = g.legalMoves().first { uciOf(it) == u }
                            add(mv)
                            g.push(mv)
                        }
                    }
                state.commit(moves, pending.curGray to pending.curBgr, "safeguard" to pending.priorUsed, queued)
            }
            is VerifyVerdict.Against -> {
                state.pending = null
                detector.confirmer.reset()
                if (verdict.boardUnchanged) {
                    // Shadow/no move: the observation still matches the pre-move position.
                    state.clearStuck()
                    state.setRef(pending.curGray, pending.curBgr)
                }
                state.note = "candidate rejected by safeguard (${verdict.reason})"
            }
            is VerifyVerdict.Timeout -> {
                state.pending = null
                detector.confirmer.reset()
                state.note = "verification timed out — no move committed"
            }
        }
    }

    /**
     * Commit a CNN-recovery move sequence decided on [curGray]/[curBgr] — the frame the
     * recovery LOOKED AT, never the live buffer (ports tracker.py:1461-1495). Recovery means
     * the tracker WAS behind: one motion window is granted so the recency gate does not hold
     * a reply hostage. Consumed by phase 05.
     */
    fun applyRecoveredMoves(
        ucis: List<String>,
        fenBefore: String,
        curGray: GrayImage,
        curBgr: BgrImage?,
    ): Boolean {
        val applicable = ucis.isNotEmpty() && state.pending == null && state.game.fen() == fenBefore
        val moves = if (applicable) resolveSequence(ucis) else null
        if (moves == null) return false
        state.commit(moves, curGray to curBgr, "cnn_recovery" to false, queued)
        state.motionSinceRef = true
        state.lastMotionTs = lastNowS
        detector.confirmer.reset()
        return true
    }

    /** Resolve a UCI sequence against the current position; null when any move is illegal. */
    private fun resolveSequence(ucis: List<String>): List<Move>? {
        val g = state.game.copy()
        val moves = mutableListOf<Move>()
        for (u in ucis) {
            val mv = g.legalMoves().firstOrNull { uciOf(it) == u } ?: return null
            moves.add(mv)
            g.push(mv)
        }
        return moves
    }

    /**
     * CNN says the board still matches the believed state while the diff is stuck on
     * shadow/drift: pull the reference forward, NO move (ports tracker.py:1428-1444).
     * Consumed by phase 05.
     */
    fun resyncReference(
        fenBefore: String,
        curGray: GrayImage,
        curBgr: BgrImage?,
    ): Boolean {
        if (state.stuckReason == null || state.pending != null || state.game.fen() != fenBefore) return false
        state.setRef(curGray, curBgr)
        state.clearStuck()
        detector.confirmer.reset()
        state.note = "CNN: board unchanged — reference pulled forward (no move)"
        return true
    }

    private fun publicState(): TrackerState =
        when {
            state.pending != null -> TrackerState.VERIFYING
            state.stuckReason != null -> TrackerState.STUCK
            state.state == "occluded" -> TrackerState.OCCLUDED
            state.refGray == null -> TrackerState.WAITING_BOARD
            else -> TrackerState.TRACKING
        }

    private companion object {
        const val NS_PER_S = 1e9
        const val SETTLE_FRAMES = 4
        const val AVG_FRAMES = 3
        const val OCC_KEEPALIVE_S = 0.1
        const val OCC_THR_FACTOR = 4.0
    }
}
