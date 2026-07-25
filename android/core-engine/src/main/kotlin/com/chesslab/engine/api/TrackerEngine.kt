package com.chesslab.engine.api

import com.chesslab.engine.Candidate
import com.chesslab.engine.Confirmer
import com.chesslab.engine.DECIDER_USER
import com.chesslab.engine.DecisionRecord
import com.chesslab.engine.EngineState
import com.chesslab.engine.FrameLoop
import com.chesslab.engine.FrameOutcome
import com.chesslab.engine.Game
import com.chesslab.engine.STATE_WAITING
import com.chesslab.engine.STUCK_NO_LEGAL_MOVE
import com.chesslab.engine.Squares
import com.chesslab.engine.ViableMoves
import com.chesslab.engine.applyTaints
import com.chesslab.engine.applyVetoes
import com.chesslab.engine.clearStuck
import com.chesslab.engine.commitMove
import com.chesslab.engine.computeEvidence
import com.chesslab.engine.detectGuards
import com.chesslab.engine.dispatch
import com.chesslab.engine.flushSessionCapture
import com.chesslab.engine.generateHypothesis
import com.chesslab.engine.learnNoise
import com.chesslab.engine.legalMoveFor
import com.chesslab.engine.markStuck
import com.chesslab.engine.moveTouchedMask
import com.chesslab.engine.pyFixed
import com.chesslab.engine.san
import com.chesslab.engine.scoreViableMoves
import com.chesslab.engine.setRef
import com.chesslab.engine.sortedSquareNames
import com.chesslab.engine.squareNames
import com.chesslab.engine.topChangedVals
import com.chesslab.engine.uciOf
import com.chesslab.engine.with

/** Standard chess starting position (FEN). */
const val STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

/** `_mark_stuck("occluded")` — the occlusion latch blocks the quiet re-anchor. */
private const val STUCK_OCCLUDED = "occluded"

/** `_mark_stuck("cnn_desync")` — the Bxc3 guard. */
private const val STUCK_CNN_DESYNC = "cnn_desync"

private const val NOTE_WAITING_OCCLUDED = "waiting for occluded squares to clear…"

private const val NOTE_CANNOT_ANCHOR = "ILLEGAL MOVE? board cannot be anchored to game state"

/** `n_touched` of a move with no observed candidate. */
private const val TOUCHED_FALLBACK = 2

/** The re-anchor floor is scaled by `n_touched / 2`. */
private const val TOUCHED_BASE = 2.0

/** `(time.time() - snap.ts) < 5.0` — the cnn_desync veto's freshness window. */
private const val DESYNC_MAX_AGE_S = 5.0

/** `', '.join(dis[:4])` — the desync note lists at most four squares. */
private const val DESYNC_NOTE_LIMIT = 4

private const val MS_PER_S = 1000.0

/** `_clear_alarm` provenance reasons. */
private const val ALARM_ACCEPTED = "illegal_move_accepted"

private const val ALARM_UNDONE = "illegal_move_undone"

private val PROMO_PIECES = setOf('q', 'r', 'b', 'n')

/**
 * The public entry point of `:core-engine` — the whole per-frame state machine.
 *
 * It is a pure state machine driven by exactly ONE thread: no `synchronized`, no `Atomic*`,
 * no `Mutex`, no `@Volatile` may ever appear in this module (see `ClasspathPurityTest`), and no
 * wall clock either — the engine's time is [FrameInput.timestampMs].
 *
 * The signatures are frozen by phase 00a; a change requires a discrepancy note in
 * `specs/17-android-rewrite/STATUS.md` first.
 */
class TrackerEngine(
    config: TrackerConfig,
    startFen: String = STARTPOS,
) {
    internal val state = EngineState(config, startFen)

    private val loop = FrameLoop(state) { cur, curBgr -> state.setRef(cur, curBgr) }

    /**
     * The whole per-frame loop plus `_try_detect`.
     *
     * `Stuck` and `Note` are emitted only on a CHANGE (Python rewrites both every frame; one event
     * per frame would be pure spam on a bus that phase 06 turns into UI).
     */
    fun onFrame(input: FrameInput): List<TrackerEvent> {
        val noteBefore = state.note
        val stuckBefore = state.stuckReason
        val events = mutableListOf<TrackerEvent>()
        val outcome = loop.step(input)
        if (outcome is FrameOutcome.Detect) {
            events += state.tryDetect(outcome.cur, outcome.curBgr, outcome.seq)
        }
        val stuck = state.stuckReason
        if (stuck != null && stuck != stuckBefore) events += TrackerEvent.Stuck(stuck)
        val note = state.note
        if (note != null && note != noteBefore) events += TrackerEvent.Note(note)
        return events
    }

    /**
     * Observer results. Phase 04a/04b/04c own `_verify_tick` / `_verify_pair_tick` / `_cnn_tick`;
     * until they land the observation is only stored, exactly as `_observe_snapshot` does — the
     * taint filter in step 2 already reads it.
     */
    fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent> {
        state.cnnSnap = snap
        return emptyList()
    }

    /** Immutable UI snapshot; the debug screen is a pure function of it. */
    fun status(): TrackerStatus = state.toStatus()

    /**
     * `undo` — the undone move was WRONG, so it is a user correction: the alarm latch is released
     * and the decision rows of the undone plies are dropped.
     */
    fun undo(): List<TrackerEvent> {
        val events = state.clearAlarm(ALARM_UNDONE).toMutableList()
        if (state.history.isNotEmpty()) {
            state.board.pop()
            state.history.removeAt(state.history.size - 1)
            state.lastMove = null
            state.clearReferenceState()
            state.recoveredLast = false
            state.priorLast = false
            while (state.decisionLog.isNotEmpty() && state.decisionLog.last().ply > state.history.size) {
                state.decisionLog.removeAt(state.decisionLog.size - 1)
            }
            state.pendingCapture = null
            state.note = "last move undone (logged as bad example)"
        }
        return events
    }

    /** `reset_to_start()` — start position plus "I just set up this position". */
    fun resetToStart(): List<TrackerEvent> = setFen(STARTPOS)

    /** `reset_to_start(fen)`. */
    fun setFen(fen: String): List<TrackerEvent> {
        state.board = Game(fen)
        state.history.clear()
        state.lastMove = null
        state.clearReferenceState()
        state.pendingCapture = null
        state.recoveredLast = false
        state.priorLast = false
        state.cnnStatus = null
        state.cnnConflicts = emptyList()
        state.holdUntil = 0.0
        state.refGamut = null
        state.decisionLog.clear()
        state.motionSinceRef = false
        state.lastMotionTs = 0.0
        state.lastCnnTs = 0.0
        state.occlGridActive = false
        state.gridCoverage = 1.0
        state.note = "Reference set"
        // The user accepted reality by resyncing — release the illegal-move latch (invariant 9).
        return state.clearAlarm(ALARM_ACCEPTED)
    }

    /**
     * `capture_baseline` — "the physical board matches the shown FEN, refresh the visual
     * reference". The FEN is trusted; `holdUntil` is zeroed because this is a deliberate user
     * action, not a post-motion settle.
     */
    fun captureBaseline(): List<TrackerEvent> {
        state.clearReferenceState()
        state.holdUntil = 0.0
        val events = state.clearAlarm(ALARM_ACCEPTED)
        state.note = "Baseline: re-capturing reference from the next clear frame…"
        return events
    }

    /** `choose_promotion` — the Q/R/B/N answer for a pending promotion. */
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

    /** Owner: phase 04c (`accept_cnn_position`). */
    fun acceptCnnPosition(): List<TrackerEvent> = emptyList() // phase 04c

    /**
     * Live tuning. Mirrors `app.py`'s `_live_tuning_kwargs` side effects: the averaging buffers and
     * the confirmers are rebuilt when their length changed, and the cached square boxes follow
     * `detSize` / `overhang`. It must NOT touch the reference.
     */
    fun updateConfig(config: TrackerConfig) {
        val previous = state.config
        state.config = config
        val cnnOn = state.cnnOn
        if (config.avgFrames(cnnOn) != previous.avgFrames(cnnOn)) {
            state.grayBuf.resize(config.avgFrames(cnnOn))
            state.bgrBuf.resize(config.avgFrames(cnnOn))
        }
        if (config.confirmFrames(cnnOn) != previous.confirmFrames(cnnOn)) {
            state.confirmer = Confirmer(config.confirmFrames(cnnOn))
            state.recoveryConfirmer = Confirmer(config.confirmFrames(cnnOn))
        }
        if (config.detSize != previous.detSize || config.overhang != previous.overhang) {
            state.rebuildBoxes()
        }
    }
}

/**
 * `_try_detect` — the ordered detection pipeline. The order IS the contract; every candidate kind
 * (single, pair, endpoint) passes the same steps 6b -> 9.
 *
 * 1. guards, 2. evidence + taints, 3. vetoes, 4. noise learning, 5. scoring + quiet/re-anchor,
 * 6. hypothesis, 6b. absolute LL floor, 7. motion gate, 8. confirmer, 9. dispatch.
 */
internal fun EngineState.tryDetect(
    cur: GrayImage,
    curBgr: BgrImage?,
    seq: Long,
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
    // 4. Noise learning on the post-veto sets, on EVERY stable frame — even while stuck.
    learnNoise()
    // 5. LL scoring + viability filter, then the quiet/re-anchor branch.
    val moves = scoreViableMoves(lastZ)
    val events = mutableListOf<TrackerEvent>()
    val promoBefore = promoPending
    if (!(changed == 0L && quietOutcome(moves, cur, curBgr, events))) {
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
 * Step 5's quiet branch — nothing changed, so either pull the reference forward or refuse to.
 * Returns `true` when the frame is HANDLED (no hypothesis this frame).
 *
 * The re-anchor floor scales with the number of physically touched squares: castling (4) gets
 * `-8.0`, so weak-but-equal per-square evidence does not penalise it against a normal move (2).
 *
 * The three bail-outs are ORDERED and each one exists because of a specific incident:
 * 1. an occlusion latch would bake the hand into the reference;
 * 2. an illegal position must NEVER become base truth (invariant 9);
 * 3. the CNN desync veto (Bxc3, 2026-07-21) — a real move whose commit was rejected leaves the
 *    board physically ahead of the game state, and re-anchoring would make that desync silent and
 *    permanent. Marking stuck hands the standoff to the CNN recovery.
 */
internal fun EngineState.quietOutcome(
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
    events: MutableList<TrackerEvent>,
): Boolean {
    val obsMove = moves.obsMove
    val nTouched = if (obsMove == null) TOUCHED_FALLBACK else moveTouchedMask(board, obsMove).countOneBits()
    val scaledFloor = config.reanchorLlFloor * (nTouched / TOUCHED_BASE)
    var handled = true
    if (obsMove == null || moves.best < scaledFloor) {
        val desync = cnnDesyncConflicts()
        when {
            tainted != 0L -> {
                markStuck(STUCK_OCCLUDED)
                note = NOTE_WAITING_OCCLUDED
            }
            alarm != null -> {
                markStuck(STUCK_NO_LEGAL_MOVE)
                note = NOTE_CANNOT_ANCHOR
            }
            desync != 0L -> {
                markStuck(STUCK_CNN_DESYNC)
                val listed = desync.squareNames().take(DESYNC_NOTE_LIMIT).joinToString(", ")
                note = "quiet board but CNN disagrees on $listed — holding reference (recovery will resolve)"
            }
            else -> {
                // The only verifiably CLEAN moment: re-anchor AND run the deferred jobs (the gamut
                // rebuild inside setRef, the session photo). `fromCommit = false` — invariant 6.
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
 * The confident OCCUPANCY conflicts between a fresh observation and the believed position.
 * Occupancy is the reliable axis: "b4 confidently EMPTY while a bishop is believed there" is a
 * desync, a misread piece TYPE is not.
 *
 * `snap.obs is None` is unreachable here — the frozen seam declares `CnnSnapshot.obs` non-null
 * (same finding as STATUS D03b-2).
 */
private fun EngineState.cnnDesyncConflicts(): Long {
    val snap = cnnSnap ?: return 0L
    if (snap.fen != board.fen() || nowS - snap.tsMs / MS_PER_S >= DESYNC_MAX_AGE_S) return 0L
    val thr = config.cnnConfThr
    var conflicts = 0L
    for (i in 0 until Squares.COUNT) {
        val square = Squares.ALL[i]
        val believed = board.pieceCharAt(i) != null
        if (snap.obs.confident(square, thr) && snap.obs.occupied(square) != believed) {
            conflicts = conflicts.with(i)
        }
    }
    return conflicts
}

/**
 * Steps 6b, 7 and 8 — the three gates between a candidate and dispatch. `true` = commit it.
 *
 * - **6b, absolute LL floor**: a sole-viable candidate has an infinite margin, so a weak phantom
 *   (`f6h5 @ 0.44` swallowed a live castle) sails through every margin check. Endpoint candidates
 *   (`vote = false`) stay exempt — they are CNN-verified by design.
 * - **7, motion gate**: a real move is always preceded by a hand, and it becomes visible within
 *   seconds of the hand leaving. BOTH conditions are needed — `motionSinceRef` alone was armed
 *   forever by a single wobble spike.
 * - **8, confirmer**: the same candidate over N stable frames. The endpoint candidate skips the
 *   vote; the CNN verify IS its multi-frame confirmation.
 */
internal fun EngineState.commitGates(cand: Candidate): Boolean {
    val sans = board.sanSequence(cand.moves).joinToString(" + ")
    var pass = true
    if (cand.vote && config.commitLlFloor > 0 && bestScore < config.commitLlFloor) {
        confirmer.reset()
        note =
            "$sans? evidence too weak (${pyFixed(bestScore, 2)} < ${pyFixed(config.commitLlFloor, 1)}) — " +
            "not committing"
        pass = false
    }
    if (pass && config.requireMotionForMove) {
        val age = nowS - lastMotionTs
        if (!motionSinceRef || age > config.motionRecencyS) {
            confirmer.reset()
            val why = if (!motionSinceRef) "no motion since last move" else "last motion ${pyFixed(age, 0)}s ago"
            note = "$sans? ignored — $why (drift/light, not a real move)"
            pass = false
        }
    }
    if (pass) {
        val key = cand.moves.joinToString(" ") { uciOf(it) }
        candidateUci = key
        if (cand.vote && !confirmer.feed(key)) {
            note = "detecting $sans… (${confirmer.count}/$confirmFrames)"
            pass = false
        }
    }
    return pass
}

/**
 * The immutable UI snapshot (`status()`), a pure function of the state. This is the ONE place that
 * turns the engine's bitboards and 64-element arrays into the square-name maps the UI wants.
 */
internal fun EngineState.toStatus(): TrackerStatus =
    TrackerStatus(
        state = state,
        fen = board.fen(),
        z = squareValueMap(lastZ),
        diffs = squareValueMap(lastDiffs),
        census = lastCens?.let { squareValueMap(it) } ?: emptyMap(),
        changed = changed.sortedSquareNames().toSet(),
        shadowVetoed = shadowVetoed.sortedSquareNames().toSet(),
        occlusionVetoed = occludedVetoed.sortedSquareNames().toSet(),
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
    )

/**
 * The visual state every user-correction path drops: base truth, the averaging buffers, the
 * confirmer, the stuck marker, the occlusion latch and the anomaly timers.
 *
 * It is deliberately the INTERSECTION of `reset_to_start`, `capture_baseline` and `undo` — each
 * caller adds its own remainder, so no path clears more than Python does.
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
 * `_clear_alarm` — release the illegal-move latch.
 *
 * **entry.md invariant 9:** only explicit user corrections and a VERIFIED board restore may call
 * this; nothing in the detection pipeline heals the alarm silently. The discontinuity lands in the
 * decision log with `decider = "user"`.
 */
internal fun EngineState.clearAlarm(logReason: String): List<TrackerEvent> {
    val latched = alarm ?: return emptyList()
    alarm = null
    alarmSince = 0.0
    desyncObs = 0
    desyncConflicts = 0L
    desyncLastSeq = null
    decisionLog.add(
        DecisionRecord(
            tsS = nowS,
            ply = history.size,
            move = null,
            san = null,
            fenBefore = null,
            fenAfter = board.fen(),
            decider = DECIDER_USER,
            reason = logReason,
            priorUsed = false,
            bestScore = bestScore,
            secondScore = secondScore,
            margin = bestScore - secondScore,
            changed = changed.sortedSquareNames(),
            changedVals = changedVals.toList(),
            shadowVetoed = shadowVetoed.sortedSquareNames(),
            occludedVetoed = occludedVetoed.sortedSquareNames(),
            gridCoverage = gridCoverage,
            zThr = config.zThr,
            motion = motion,
            cnnRun = cnnRun,
            cnnAgreement = cnnAgreement,
            cnnBestMove = cnnBestMove,
        ),
    )
    return listOf(TrackerEvent.AlarmCleared(latched.kind))
}
