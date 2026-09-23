package com.chesslab.engine.api

import com.chesslab.engine.ALARM_BOARD_RESTORED
import com.chesslab.engine.DECIDER_USER
import com.chesslab.engine.EngineState
import com.chesslab.engine.FrameLoop
import com.chesslab.engine.FrameOutcome
import com.chesslab.engine.NOTE_ALARM_BLOCKED
import com.chesslab.engine.NOTE_GEOMETRY_SHIFTED
import com.chesslab.engine.STATE_WAITING
import com.chesslab.engine.STUCK_NO_LEGAL_MOVE
import com.chesslab.engine.Squares
import com.chesslab.engine.VERIFY_STATE_GHOST
import com.chesslab.engine.VERIFY_STATE_SHADOW
import com.chesslab.engine.VerifySingle
import com.chesslab.engine.ViableMoves
import com.chesslab.engine.adoptPosition
import com.chesslab.engine.adoptableCnnFen
import com.chesslab.engine.applyTaints
import com.chesslab.engine.applyVetoes
import com.chesslab.engine.clearDesyncStreak
import com.chesslab.engine.clearStuck
import com.chesslab.engine.cnnTick
import com.chesslab.engine.commitMove
import com.chesslab.engine.computeEvidence
import com.chesslab.engine.debugPayload
import com.chesslab.engine.decisionRow
import com.chesslab.engine.desyncEvidence
import com.chesslab.engine.detectGuards
import com.chesslab.engine.dispatch
import com.chesslab.engine.flushSessionCapture
import com.chesslab.engine.freshCnnOccludedSquares
import com.chesslab.engine.freshSnapshot
import com.chesslab.engine.generateHypothesis
import com.chesslab.engine.learnNoise
import com.chesslab.engine.legalMoveFor
import com.chesslab.engine.markStuck
import com.chesslab.engine.performResync
import com.chesslab.engine.reachable
import com.chesslab.engine.recordSight
import com.chesslab.engine.refuseIllegalMove
import com.chesslab.engine.san
import com.chesslab.engine.scoreViableMoves
import com.chesslab.engine.setRef
import com.chesslab.engine.sightSettled
import com.chesslab.engine.sortedSquareNames
import com.chesslab.engine.squareNames
import com.chesslab.engine.takeBack
import com.chesslab.engine.topChangedVals
import com.chesslab.engine.trackAnomalies
import com.chesslab.engine.uciOf
import com.chesslab.engine.with

const val STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

private const val STUCK_OCCLUDED = "occluded"

/** The Bxc3 guard. */
private const val STUCK_CNN_DESYNC = "cnn_desync"

private const val NOTE_WAITING_OCCLUDED = "waiting for occluded squares to clear…"

private const val NOTE_CANNOT_ANCHOR = "ILLEGAL MOVE? board cannot be anchored to game state"

private const val ALARM_ACCEPTED = "illegal_move_accepted"

private const val ALARM_UNDONE = "illegal_move_undone"

/** "last move undone" after a four-ply recovery would be an understatement. */
private fun undoneNote(plies: Int): String =
    if (plies == 1) {
        "last move undone (logged as bad example)"
    } else {
        "last $plies moves undone — they were committed as one (logged as bad examples)"
    }

/**
 *  A pure state machine on exactly ONE thread — no `synchronized`, `Atomic*`, `Mutex` or `@Volatile`
 *  (`ClasspathPurityTest`) — and time is [FrameInput.timestampMs]. */
class TrackerEngine(
    config: TrackerConfig,
    startFen: String = STARTPOS,
    /** Every decision, committed OR rejected, as a [DebugDecision], not prose, so a consumer can count by reason.
     *  On the engine's thread: must not block. */
    private val decisionSink: (DebugDecision) -> Unit = {},
    /** Decision rows cannot carry them: the typical move commits on the FIRST row it appears in, so the wait
     *  happened in states that write nothing. One call per TRANSITION. */
    private val stateSink: (String, String, Double) -> Unit = { _, _, _ -> },
) {
    internal val state = EngineState(config, startFen, decisionSink = decisionSink)

    private val loop = FrameLoop(state) { cur, curBgr -> state.setRef(cur, curBgr) }

    fun verifyWaiting(): Boolean = state.pending != null

    /** `Stuck` and `Note` only on a CHANGE: one per frame would spam the bus the UI reads. */
    fun onFrame(input: FrameInput): List<TrackerEvent> =
        // Where a refused fabrication leaves the engine: the alarm stops commits and names uci and position.
        try {
            val noteBefore = state.note
            val stuckBefore = state.stuckReason
            val stateBefore = state.state
            val events = mutableListOf<TrackerEvent>()
            val outcome = loop.step(input)
            state.lastFrameGate = if (outcome is FrameOutcome.Skip) outcome.reason else "detect"
            if (outcome is FrameOutcome.Detect) {
                events += state.tryDetect(outcome.cur, outcome.curBgr, outcome.seq, cnn)
            }
            val stuck = state.stuckReason
            if (stuck != null && stuck != stuckBefore) events += TrackerEvent.Stuck(stuck)
            val note = state.note
            if (note != null && note != noteBefore) events += TrackerEvent.Note(note)
            if (state.state != stateBefore) stateSink(stateBefore, state.state, state.nowS)
            events
        } catch (refused: IllegalMoveException) {
            state.refuseIllegalMove(refused)
        }

    private var cnn: CnnEvaluator? = null

    /** `:core-engine` may not depend on `:core-cnn`. `null` makes verify commit rather than stall. */
    fun attachCnn(evaluator: CnnEvaluator?) {
        cnn = evaluator
        state.cnnRun = evaluator != null
        // Attaching flips `cnnOn`, and `avgFrames` is CNN-conditional (2 with, 3 without).
        state.syncAvgWindow()
        state.syncConfirmWindow()
    }

    /** Pending work has **priority**: a promotion prompt consumes identity first, a candidate goes through the ghost filter. */
    fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent> =
        try {
            // Background gates and recovery see pixels alone — they repair a stale FEN; only a pending candidate and the
            // promotion prompt use the conditioned view. The model's own coverage threshold applies ONCE, here, to both.
            val gated = snap.copy(obs = snap.obs.withCoverageThr(state.config.pOccludedThr))
            val rawSnap = gated.copy(obs = gated.obs.rawObservation())
            state.cnnSnap = rawSnap
            state.recordSight(rawSnap)
            state.cnnSnapsSeen += 1
            when {
                state.promoPending != null -> confirmPromotionFromCnn(state, gated, ::choosePromotion)
                state.pending != null -> {
                    state.cnnSnapsToVerify += 1
                    val pendingFen = state.pending?.fen
                    val events = VerifySingle.tick(state, cnn, gated)
                    // The next frame can re-propose the rejected candidate: unconditioned recovery gets this reading first.
                    val terminal = state.verifyState == VERIFY_STATE_GHOST || state.verifyState == VERIFY_STATE_SHADOW
                    if (state.pending == null && state.board.fen() == pendingFen && terminal) {
                        events + state.cnnTick(cnn, rawSnap, afterRejectedVerify = true)
                    } else {
                        events
                    }
                }
                else -> state.cnnTick(cnn, rawSnap)
            }
        } catch (refused: IllegalMoveException) {
            state.refuseIllegalMove(refused)
        }

    private var debugEnabled = false

    /** Off by default: it walks 64 squares twice and copies the decision ring per frame. */
    fun setDebugEnabled(on: Boolean) {
        debugEnabled = on
    }

    fun status(): TrackerStatus = state.toStatus(debugEnabled)

    /** The observer reads this per frame; the full snapshot must not be built at the analyzer's rate. */
    fun fen(): String = state.board.fen()

    /** The LAST COMMIT whatever its size (a CNN recovery is one unit); remembered in [EngineState.takenBack]. */
    fun undo(): List<TrackerEvent> {
        if (state.history.isNotEmpty()) {
            // Bounded by the history: a count from before a `setFen` must not overshoot.
            val plies = state.lastCommitSize.coerceIn(1, state.history.size)
            state.takeBack(plies)
            state.lastCommitSize = 0
            state.lastMove = null
            state.clearReferenceState()
            state.recoveredLast = false
            state.priorLast = false
            while (state.decisionLog.isNotEmpty() && state.decisionLog.last().ply > state.history.size) {
                state.decisionLog.removeAt(state.decisionLog.size - 1)
            }
            state.pendingCapture = null
            state.note = undoneNote(plies)
        }
        // Not via `clearAlarm`, which returns early without a latch: the streak would outlive its position.
        state.clearDesyncStreak()
        // AFTER the trim: the `decider = "user"` row is stamped with `history.size`, and written first it deleted itself.
        return state.clearAlarm(ALARM_UNDONE)
    }

    /** The position chokepoint: unchecked, a bad FEN threw four layers out and an en-prise king was adopted. */
    fun setFen(fen: String): List<TrackerEvent> {
        if (!reachable(fen)) {
            val why = "position refused: '$fen' is unreadable or leaves the side not to move in check"
            state.note = why
            return listOf(TrackerEvent.Note(why))
        }
        state.adoptPosition(fen)
        state.history.clear()
        state.decisionLog.clear()
        state.note = "Reference set"
        // The user accepted reality by resyncing — release the latch (invariant 9).
        return state.clearAlarm(ALARM_ACCEPTED)
    }

    /** The FEN is trusted; `holdUntil` is zeroed because this is a deliberate user action. */
    fun captureBaseline(): List<TrackerEvent> {
        state.clearReferenceState()
        state.holdUntil = 0.0
        // This button contradicts the take-back veto's premise, and the veto's own note points at it.
        state.takenBack = null
        val events = state.clearAlarm(ALARM_ACCEPTED)
        state.note = "Baseline: re-capturing reference from the next clear frame…"
        return events
    }

    /** NICHT [captureBaseline]: der Latch bleibt, denn Invariante 9 haengt daran. */
    fun rectificationChanged(): List<TrackerEvent> {
        state.discardVisualReference()
        state.note = NOTE_GEOMETRY_SHIFTED
        return emptyList()
    }

    fun choosePromotion(piece: Char): List<TrackerEvent> {
        val symbol = piece.lowercaseChar()
        val pending = state.promoPending
        val move =
            if (pending == null || symbol !in PROMO_PIECES) {
                null
            } else {
                state.legalMoveFor("${pending.from}${pending.to}$symbol")
            }
        return when {
            symbol !in PROMO_PIECES -> listOf(TrackerEvent.Note("invalid piece: '$piece' (q/r/b/n)"))
            pending == null -> listOf(TrackerEvent.Note("no promotion pending"))
            // Invariante 9: diese Tuer ging an `dispatch` vorbei direkt in `commitMove`.
            state.alarm != null -> {
                state.promoPending = null
                state.note = NOTE_ALARM_BLOCKED
                listOf(TrackerEvent.Note(NOTE_ALARM_BLOCKED))
            }
            state.board.fen() != pending.fen -> {
                state.promoPending = null
                listOf(TrackerEvent.Note("Position has changed"))
            }
            move == null -> listOf(TrackerEvent.Note("${pending.from}${pending.to}$symbol is not legal"))
            else -> {
                state.promoPending = null
                listOf(state.commitMove(move, pending.cur, pending.curBgr))
            }
        }
    }

    /** A **minimal edit**: only label-confident squares take the observed piece. History dropped; an
     *  observation without both kings is REJECTED. */
    fun acceptCnnPosition(): List<TrackerEvent> {
        val fen = state.adoptableCnnFen(cnn?.confThr ?: state.config.cnnConfThr) ?: return listOf(TrackerEvent.Note(state.note.orEmpty()))
        val events = setFen(fen) + captureBaseline()
        state.note = "CNN position adopted — alarm cleared, re-capturing reference…"
        return events
    }

    /** Adopts the observed position, KEEPS the history, appends nothing — one `cnn_resync` row records the gap. */
    fun resyncToBoard(): List<TrackerEvent> {
        val fen = state.adoptableCnnFen(cnn?.confThr ?: state.config.cnnConfThr) ?: return listOf(TrackerEvent.Note(state.note.orEmpty()))
        return state.performResync(fen, how = "user")
    }

    fun updateConfig(config: TrackerConfig) {
        val previous = state.config
        state.config = config
        // Against the window ACTUALLY allocated: with the new `cnnOn` on both sides, the flipping change cancelled out.
        state.syncAvgWindow()
        state.syncConfirmWindow()
        if (config.detSize != previous.detSize || config.overhang != previous.overhang) {
            state.rebuildBoxes()
            // Census codes key on the IDENTITY of `refGray`, which does not change here: new boxes would compare against
            // codes cached over the old ones.
            state.refCensusFor = null
            state.curCensusFor = null
        }
        // Any knob that moves the MEASUREMENT plane invalidates the reference: `diffClaheClip` rebuilds the CLAHE
        // operator in the runtime.
        if (config.detSize != previous.detSize || config.diffClaheClip != previous.diffClaheClip) {
            state.discardVisualReference()
        }
    }
}

/** The order IS the contract: 1 guards, 2 evidence + taints, 3 vetoes, 4 noise, 5 scoring + quiet/re-anchor,
 *  6 hypothesis, 6b LL floor, 7 motion gate, 8 confirmer, 9 dispatch. */
internal fun EngineState.tryDetect(
    cur: GrayImage,
    curBgr: BgrImage?,
    seq: Long,
    cnn: CnnEvaluator? = null,
): List<TrackerEvent> {
    if (!detectGuards()) return emptyList()
    // 2. Every gate and the LL scoring operate on the SAME fused z (`lastZ`).
    computeEvidence(cur)
    applyTaints()
    var hot = 0L
    for (i in 0 until Squares.COUNT) {
        if (lastZ[i] >= config.zThr) hot = hot.with(i)
    }
    changedVals = topChangedVals(lastZ, config.zThr)
    // 3. Shadow keeps z as vacate evidence; occlusion zeroed it in step 2.
    applyVetoes(cur, curBgr, hot)
    trackAnomalies()
    // 4. On EVERY stable frame — even while stuck.
    learnNoise()
    val moves = scoreViableMoves(lastZ)
    val events = mutableListOf<TrackerEvent>()
    val promoBefore = promoPending
    if (!(changed == 0L && quietOutcome(moves, cur, curBgr, events, cnn))) {
        val cand = generateHypothesis(lastZ, moves, cur, curBgr)
        if (cand != null && commitGates(cand)) {
            // A hypothesis from half-seen squares must not even become pending: an early wrong `Nb6` poisoned confirmer
            // and ambiguity until the alarm.
            if (earlyCommit && !sightSettled(board, cand.moves)) {
                note = "early: ${cand.moves.joinToString(" ") { uciOf(it) }} not seen settled yet (${sights.size} sights)"
            } else {
                anomalySince = 0L
                events += dispatch(cand.moves, cur, curBgr, cand.priorUsed, cand.note, seq)
            }
        }
    }
    val promo = promoPending
    if (promo != null && promo !== promoBefore) events += TrackerEvent.PromotionPending(promo.from, promo.to)
    return events
}

/** `true` means HANDLED. Ordered bail-outs: a latched hand would be baked in, an illegal position never
 *  becomes base truth (invariant 9), and the desync veto (Bxc3) bounds a rejected real move. */
internal fun EngineState.quietOutcome(
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
    events: MutableList<TrackerEvent>,
    cnn: CnnEvaluator? = null,
): Boolean {
    val obsMove = moves.obsMove
    var handled = true
    if (obsMove == null) {
        val desync = cnnDesync()
        when {
            tainted != 0L -> {
                markStuck(STUCK_OCCLUDED)
                note = NOTE_WAITING_OCCLUDED
            }
            alarm != null -> {
                markStuck(STUCK_NO_LEGAL_MOVE)
                note = NOTE_CANNOT_ANCHOR
            }
            desync != null -> {
                markStuck(STUCK_CNN_DESYNC)
                events += desyncEvidence(cnn, desync.snap, desync.conflicts)
            }
            else -> {
                // The only verifiably CLEAN moment: re-anchor AND run the deferred jobs (`fromCommit = false`, invariant 6).
                confirmer.reset()
                clearStuck()
                anomalySince = 0L
                setRef(cur, curBgr)
                // `tainted != 0L` ist der erste Zweig dieses `when`, hier also bewiesen 0.
                flushSessionCapture()
                events += TrackerEvent.ReAnchored
            }
        }
    } else if (moves.best < 0.0) {
        // Weak but consistent evidence (white-on-white?): KEEP the reference; the confirmer keeps collecting.
        note = "weak move evidence (${board.san(obsMove)}?) — waiting"
    } else {
        handled = false
    }
    return handled
}

/** OCCUPANCY only: a misread TYPE is no desync, and one confident square once vetoed for 25 minutes. */
private fun EngineState.cnnDesync(): Desync? {
    val snap = freshSnapshot() ?: return null
    val thr = config.cnnConfThr
    if (snap.fen != board.fen() || Squares.ALL.count { snap.obs.confident(it, thr) } < config.minConfidentBoard) {
        return null
    }
    var conflicts = 0L
    for (i in 0 until Squares.COUNT) {
        val square = Squares.ALL[i]
        val believed = board.pieceCharAt(i) != null
        if (snap.obs.confident(square, thr) && snap.obs.occupied(square) != believed) {
            conflicts = conflicts.with(i)
        }
    }
    return if (conflicts == 0L) null else Desync(snap, conflicts.squareNames())
}

private class Desync(
    val snap: CnnSnapshot,
    val conflicts: List<String>,
)

/** The ONE place bitboards and 64-arrays become the square-name maps the UI wants. */
internal fun EngineState.toStatus(debugEnabled: Boolean = false): TrackerStatus =
    TrackerStatus(
        state = state,
        fen = board.fen(),
        z = squareValueMap(lastZ),
        diffs = squareValueMap(lastDiffs),
        census = lastCens?.let { squareValueMap(it) } ?: emptyMap(),
        changed = changed.sortedSquareNames().toSet(),
        shadowVetoed = shadowVetoed.sortedSquareNames().toSet(),
        occlusionVetoed = occludedVetoed.sortedSquareNames().toSet(),
        cnnConflicts = cnnDesync()?.conflicts?.toSet() ?: emptySet(),
        cnnOccluded = freshCnnOccludedSquares(),
        bestLl = bestScore,
        secondLl = secondScore,
        bestUci = candidateUci,
        stuckReason = stuckReason,
        alarm = alarm,
        confirmerKey = confirmer.key,
        confirmerCount = confirmer.count,
        verifyState = verifyState,
        pendingUci = pending?.ucis?.joinToString(" "),
        pendingFrames = pending?.frames ?: 0,
        stageTimingsMs = stageTimingsMs.toMap(),
        fps = fps,
        motion = motion,
        note = note,
        debug = if (debugEnabled) debugPayload() else null,
    )

/** The INTERSECTION of the three callers' needs; each adds its own remainder, so none clears more than it must. */
internal fun EngineState.clearReferenceState() {
    refGray = null
    refBgr = null
    refFen = null
    refProvisionalUntil = 0.0
    confirmer.reset()
    grayBuf.clear()
    bgrBuf.clear()
    clearStuck()
    tainted = 0L
    // The keep-alive subset outlived its parent and restored pair evidence for a taint nobody holds.
    keepaliveTainted = 0L
    // An unchanged FEN TEXT is not the same epoch: the latch suppressed a legitimate pair after a reset.
    rejectedPair = null
    rejectedPairFen = null
    shadowVetoed = 0L
    shadowBlocked.clear()
    occludedVetoed = 0L
    motionOccluded = 0L
    occlusionExpiry.fill(0.0)
    occlCoreExpiry.fill(0.0)
    anomalySince = 0L
    cnnSnap = null
    pending = null
    promoPending = null
    verifyState = null
    state = STATE_WAITING
}

private fun squareValueMap(values: DoubleArray): Map<String, Double> {
    val out = LinkedHashMap<String, Double>(Squares.COUNT)
    for (i in 0 until Squares.COUNT) {
        out[Squares.ALL[i]] = values[i]
    }
    return out
}

/** The ONLY release of the latch, never from the detection pipeline (invariant 9): no drift, no timeout.
 *  A [logReason] marks a user correction. */
internal fun EngineState.clearAlarm(logReason: String?): List<TrackerEvent> {
    if (alarm == null) return emptyList()
    alarm = null
    alarmSince = 0.0
    clearDesyncStreak()
    if (logReason == null) return listOf(TrackerEvent.AlarmCleared(ALARM_BOARD_RESTORED))
    decisionLog.add(decisionRow(DECIDER_USER, logReason))
    return listOf(TrackerEvent.AlarmCleared(logReason))
}
