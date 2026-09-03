package com.chesslab.engine.api

import com.chesslab.engine.ALARM_BOARD_RESTORED
import com.chesslab.engine.DECIDER_USER
import com.chesslab.engine.EngineState
import com.chesslab.engine.FrameLoop
import com.chesslab.engine.FrameOutcome
import com.chesslab.engine.NOTE_GEOMETRY_SHIFTED
import com.chesslab.engine.STATE_WAITING
import com.chesslab.engine.STUCK_NO_LEGAL_MOVE
import com.chesslab.engine.Squares
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
import com.chesslab.engine.refuseIllegalMove
import com.chesslab.engine.san
import com.chesslab.engine.scoreViableMoves
import com.chesslab.engine.setRef
import com.chesslab.engine.sortedSquareNames
import com.chesslab.engine.squareNames
import com.chesslab.engine.takeBack
import com.chesslab.engine.topChangedVals
import com.chesslab.engine.trackAnomalies
import com.chesslab.engine.with

const val STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

/** The occlusion latch blocks the quiet re-anchor. */
private const val STUCK_OCCLUDED = "occluded"

/** The Bxc3 guard. */
private const val STUCK_CNN_DESYNC = "cnn_desync"

private const val NOTE_WAITING_OCCLUDED = "waiting for occluded squares to clear…"

private const val NOTE_CANNOT_ANCHOR = "ILLEGAL MOVE? board cannot be anchored to game state"

/** Alarm-release provenance reasons. */
private const val ALARM_ACCEPTED = "illegal_move_accepted"

private const val ALARM_UNDONE = "illegal_move_undone"

/** "last move undone" after a four-ply recovery would be an understatement on the easiest screen to miss. */
private fun undoneNote(plies: Int): String =
    if (plies == 1) {
        "last move undone (logged as bad example)"
    } else {
        "last $plies moves undone — they were committed as one (logged as bad examples)"
    }

/**
 * The public entry point of `:core-engine`: a pure state machine driven by exactly ONE thread — no
 * `synchronized`, no `Atomic*`, no `Mutex`, no `@Volatile` may ever appear in this module (see
 * `ClasspathPurityTest`), and no wall clock either — the engine's time is [FrameInput.timestampMs].
 */
class TrackerEngine(
    config: TrackerConfig,
    startFen: String = STARTPOS,
    /**
     * Every decision — committed OR rejected — the moment it is made, and the only way one leaves
     * the module; called on the engine's own thread, must not block. It carries the [DebugDecision],
     * not prose, so a consumer can count by reason (2026-08-01: a `Qxd4` cycle was unanswerable).
     */
    private val decisionSink: (DebugDecision) -> Unit = {},
    /**
     * Frame-loop STATE transitions on the engine's own clock. The decision rows cannot carry them:
     * on rec-20260808-003957 the typical move is committed on the FIRST row it appears in, so all
     * the waiting happened before, in states that write nothing. One call per TRANSITION.
     */
    private val stateSink: (String, String, Double) -> Unit = { _, _, _ -> },
) {
    internal val state = EngineState(config, startFen, decisionSink = decisionSink)

    private val loop = FrameLoop(state) { cur, curBgr -> state.setRef(cur, curBgr) }

    /**
     * The whole per-frame loop plus detection. `Stuck` and `Note` are emitted only on a CHANGE; one
     * event per frame would be pure spam on a bus the UI reads.
     */
    fun onFrame(input: FrameInput): List<TrackerEvent> =
        // The catch is where a refused fabrication leaves the engine (2026-08-09); the alarm stops
        // commits and names uci and position.
        try {
            val noteBefore = state.note
            val stuckBefore = state.stuckReason
            val stateBefore = state.state
            val events = mutableListOf<TrackerEvent>()
            val outcome = loop.step(input)
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

    /**
     * Inject the evaluator behind the observation model — `:core-engine` may not depend on
     * `:core-cnn`. `null` is the CNN-unavailable case, which the verify path resolves by committing
     * the pending candidate rather than stalling; attaching also arms `cnn_run`.
     */
    fun attachCnn(evaluator: CnnEvaluator?) {
        cnn = evaluator
        state.cnnRun = evaluator != null
        // Attaching flips `cnnOn`, and `avgFrames` is CNN-conditional (2 with, 3 without).
        state.syncAvgWindow()
        state.syncConfirmWindow()
    }

    /**
     * Observer results. Pending work has **priority** over the periodic check: a promotion prompt
     * consumes identity observations first, an ordinary candidate goes through the ghost filter.
     */
    fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent> =
        // The other entry a refusal can come back out of (see [onFrame]).
        try {
            // Background gates and recovery must see pixels alone — their job is precisely to repair
            // a stale/wrong FEN. Only a pending diff candidate and the promotion prompt may use the
            // position-conditioned view.
            val rawSnap = snap.copy(obs = snap.obs.rawObservation())
            state.cnnSnap = rawSnap
            state.cnnSnapsSeen += 1
            when {
                state.promoPending != null -> confirmPromotionFromCnn(state, snap, ::choosePromotion)
                state.pending != null -> {
                    state.cnnSnapsToVerify += 1
                    VerifySingle.tick(state, cnn, snap)
                }
                else -> state.cnnTick(cnn, rawSnap)
            }
        } catch (refused: IllegalMoveException) {
            state.refuseIllegalMove(refused)
        }

    private var debugEnabled = false

    /**
     * Arm the extra [TrackerStatus.debug] payload. Off by default: assembling it walks 64 squares
     * twice and copies the decision ring on every published frame, and the 15 fps budget is not
     * negotiable. The decision log itself is recorded either way, at most once per move.
     */
    fun setDebugEnabled(on: Boolean) {
        debugEnabled = on
    }

    /** Immutable UI snapshot; the debug screen is a pure function of it. */
    fun status(): TrackerStatus = state.toStatus(debugEnabled)

    /**
     * The game FEN alone — the CNN observer reads this per frame as its discard-on-change guard,
     * while the rest of the snapshot must not be built at the analyzer's rate.
     */
    fun fen(): String = state.board.fen()

    /**
     * A user correction: the alarm latch is released and the undone plies' decision rows dropped.
     * It takes back the LAST COMMIT whatever its size — a CNN recovery is one unit (four plies,
     * 2026-08-02) — and RECORDS it in [EngineState.takenBack], the only memory of a human rejection.
     */
    fun undo(): List<TrackerEvent> {
        if (state.history.isNotEmpty()) {
            // Bounded by the history: a count left over from before a `setFen` must not overshoot.
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
        // Unconditional, not via `clearAlarm`: that one returns early without a latch, so an undo
        // on a healthy board left the streak standing against a position that no longer exists.
        state.clearDesyncStreak()
        // AFTER the trim: the `decider = "user"` row is stamped with the current `history.size`, and
        // the trim drops every row above the restored size — written first, it deleted itself.
        return state.clearAlarm(ALARM_UNDONE)
    }

    /**
     * The position chokepoint. It was the only adoption path taking a FEN from outside unchecked,
     * so an unparseable string threw four layers out and an en-prise king was adopted silently
     * (2026-08-09). Refused positions REPORT.
     */
    fun setFen(fen: String): List<TrackerEvent> {
        if (!reachable(fen, needsMoves = false)) {
            val why = "position refused: '$fen' is unreadable or leaves the side not to move in check"
            state.note = why
            return listOf(TrackerEvent.Note(why))
        }
        state.adoptPosition(fen)
        state.history.clear()
        state.decisionLog.clear()
        state.note = "Reference set"
        // The user accepted reality by resyncing — release the illegal-move latch (invariant 9).
        return state.clearAlarm(ALARM_ACCEPTED)
    }

    /**
     * "The physical board matches the shown FEN, refresh the visual reference". The FEN is trusted;
     * `holdUntil` is zeroed because this is a deliberate user action, not a post-motion settle.
     */
    fun captureBaseline(): List<TrackerEvent> {
        state.clearReferenceState()
        state.holdUntil = 0.0
        // "The board matches the shown FEN" contradicts the take-back veto's premise, and this is
        // the button the veto's own note points at.
        state.takenBack = null
        val events = state.clearAlarm(ALARM_ACCEPTED)
        state.note = "Baseline: re-capturing reference from the next clear frame…"
        return events
    }

    /**
     * Die Rektifizierung hat sich geaendert — dieselbe Antwort wie auf eine neue Ebenengroesse.
     * Nicht [captureBaseline]: der Latch bleibt. Ein verrutschtes Brett sagt nichts darueber, ob
     * Stellung und Brett wieder zusammenpassen, und Invariante 9 haengt genau daran.
     */
    fun rectificationChanged(): List<TrackerEvent> {
        state.discardVisualReference()
        state.note = NOTE_GEOMETRY_SHIFTED
        return emptyList()
    }

    /** The Q/R/B/N answer for a pending promotion. */
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

    /**
     * The illegal-move alarm's "adopt what the CNN sees": a **minimal edit**, not a blind rebuild —
     * only label-confident squares take the observed piece, identity being the model's weak axis.
     * The history is dropped, and an observation without both kings is REJECTED, not adopted.
     */
    fun acceptCnnPosition(): List<TrackerEvent> {
        val fen = state.adoptableCnnFen(cnn?.confThr ?: state.config.cnnConfThr) ?: return listOf(TrackerEvent.Note(state.note.orEmpty()))
        // setFen clears the history and the latch; captureBaseline re-captures the reference.
        val events = setFen(fen) + captureBaseline()
        state.note = "CNN position adopted — alarm cleared, re-capturing reference…"
        return events
    }

    /**
     * The honest door: adopt the observed position, KEEP the history, append nothing. Where
     * [acceptCnnPosition] declares continuity broken and clears the record, this one records the
     * discontinuity (one `cnn_resync` row) and continues — the missing bridge is the feature.
     */
    fun resyncToBoard(): List<TrackerEvent> {
        val fen = state.adoptableCnnFen(cnn?.confThr ?: state.config.cnnConfThr) ?: return listOf(TrackerEvent.Note(state.note.orEmpty()))
        return state.performResync(fen, how = "user")
    }

    /**
     * Live tuning: the averaging buffers and the confirmers are rebuilt when their length changed,
     * and the cached square boxes follow `detSize` / `overhang`. Changing the detection plane
     * invalidates the reference — a baseline from a different warp cannot be compared safely.
     */
    fun updateConfig(config: TrackerConfig) {
        val previous = state.config
        state.config = config
        // Against the window the buffers are ACTUALLY sized for: comparing new against previous with
        // the new `cnnOn` on both sides cancelled out exactly when the change was the one flipping it.
        state.syncAvgWindow()
        // Same correction, same reason, for the confirm window.
        state.syncConfirmWindow()
        if (config.detSize != previous.detSize || config.overhang != previous.overhang) {
            state.rebuildBoxes()
        }
        if (config.detSize != previous.detSize) {
            state.discardVisualReference()
        }
    }
}

/**
 * The ordered detection pipeline. The order IS the contract; every candidate kind passes 6b -> 9.
 * 1. guards, 2. evidence + taints, 3. vetoes, 4. noise learning, 5. scoring + quiet/re-anchor,
 * 6. hypothesis, 6b. absolute LL floor, 7. motion gate, 8. confirmer, 9. dispatch.
 */
internal fun EngineState.tryDetect(
    cur: GrayImage,
    curBgr: BgrImage?,
    seq: Long,
    cnn: CnnEvaluator? = null,
): List<TrackerEvent> {
    if (!detectGuards()) return emptyList()
    // 2. Evidence — every gate and the LL scoring operate on the SAME fused z (`lastZ`).
    computeEvidence(cur)
    applyTaints()
    var hot = 0L
    for (i in 0 until Squares.COUNT) {
        if (lastZ[i] >= config.zThr) hot = hot.with(i)
    }
    changedVals = topChangedVals(lastZ, config.zThr)
    // 3. Vetoes (shadow keeps z as vacate evidence; occlusion zeroed it in step 2).
    applyVetoes(cur, curBgr, hot)
    trackAnomalies()
    // 4. Noise learning on the post-veto sets, on EVERY stable frame — even while stuck.
    learnNoise()
    // 5. LL scoring + viability filter, then the quiet/re-anchor branch.
    val moves = scoreViableMoves(lastZ)
    val events = mutableListOf<TrackerEvent>()
    val promoBefore = promoPending
    if (!(changed == 0L && quietOutcome(moves, cur, curBgr, events, cnn))) {
        // 6. Hypothesis — the ONE place that turns evidence into a candidate.
        val cand = generateHypothesis(lastZ, moves, cur, curBgr)
        if (cand != null && commitGates(cand)) {
            anomalySince = 0L
            events += dispatch(cand.moves, cur, curBgr, cand.priorUsed, cand.note, seq)
        }
    }
    val promo = promoPending
    if (promo != null && promo !== promoBefore) events += TrackerEvent.PromotionPending(promo.from, promo.to)
    return events
}

/**
 * Step 5's quiet branch: pull the reference forward or refuse to; `true` means the frame is HANDLED.
 * The bail-outs are ordered — a latched hand would be baked in, an illegal position must never become
 * base truth (invariant 9), and the desync veto (Bxc3, 2026-07-21) bounds a rejected real move.
 */
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
                // The only verifiably CLEAN moment: re-anchor AND run the deferred jobs.
                // `fromCommit = false` — invariant 6.
                confirmer.reset()
                clearStuck()
                anomalySince = 0L
                setRef(cur, curBgr)
                if (tainted == 0L) flushSessionCapture()
                events += TrackerEvent.ReAnchored
            }
        }
    } else if (moves.best < 0.0) {
        // Weak but move-consistent evidence (white-on-white?) → KEEP the reference: neither
        // re-anchor nor stuck, and the confirmer keeps collecting.
        note = "weak move evidence (${board.san(obsMove)}?) — waiting"
    } else {
        handled = false
    }
    return handled
}

/**
 * The confident OCCUPANCY conflicts between a fresh observation and the believed position — a
 * misread piece TYPE is not a desync. Same blind-glance bar as `onMatchOk` and the verify rungs:
 * one confident square on a dark board vetoed for 25 minutes while `identityRead` read the same
 * glance as inconclusive and reset the streak (2026-08-29).
 */
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

/** The observation that vetoed the re-anchor, and the squares it vetoed on. */
private class Desync(
    val snap: CnnSnapshot,
    val conflicts: List<String>,
)

/**
 * The immutable UI snapshot, a pure function of the state — the ONE place that turns the engine's
 * bitboards and 64-element arrays into the square-name maps the UI wants.
 */
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
        // The same computation the re-anchor veto uses, surfaced instead of only counted.
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
        note = note,
        debug = if (debugEnabled) debugPayload() else null,
    )

/**
 * The visual state every user-correction path drops: base truth, the averaging buffers, the
 * confirmer, the stuck marker, the occlusion latch and the anomaly timers. Deliberately the
 * INTERSECTION of the three callers — each adds its own remainder, so no path clears more.
 */
internal fun EngineState.clearReferenceState() {
    refGray = null
    refBgr = null
    refFen = null
    confirmer.reset()
    grayBuf.clear()
    bgrBuf.clear()
    clearStuck()
    tainted = 0L
    occlWhitelist = 0L
    occludedSince = null
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

/** A `Squares.ALL`-keyed view of a 64-value channel — built for the UI, never for the engine. */
private fun squareValueMap(values: DoubleArray): Map<String, Double> {
    val out = LinkedHashMap<String, Double>(Squares.COUNT)
    for (i in 0 until Squares.COUNT) {
        out[Squares.ALL[i]] = values[i]
    }
    return out
}

/**
 * The ONLY release of the illegal-move latch. **entry.md invariant 9:** nothing in the detection
 * pipeline may call this — the alarm does not heal by drift, by timeout, or by "it looks fine now".
 * A [logReason] marks a user correction (`decider = "user"` row); the verified restores pass `null`.
 */
internal fun EngineState.clearAlarm(logReason: String?): List<TrackerEvent> {
    if (alarm == null) return emptyList()
    alarm = null
    alarmSince = 0.0
    clearDesyncStreak()
    if (logReason == null) return listOf(TrackerEvent.AlarmCleared(ALARM_BOARD_RESTORED))
    decisionLog.add(decisionRow(DECIDER_USER, logReason))
    return listOf(TrackerEvent.AlarmCleared(logReason))
}
