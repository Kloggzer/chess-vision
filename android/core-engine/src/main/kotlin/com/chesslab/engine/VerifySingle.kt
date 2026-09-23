package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.move.Move

private const val VERIFY_SHADOW = "shadow"

private const val VERIFY_OVERRULED = "overruled"

/** The overrule key additionally carries the CNN's uci ([pendingVoted]). */
private const val OUTCOME_SHADOW = "shadow"

private const val OUTCOME_COMMIT = "commit"

private const val OUTCOME_GHOST = "ghost"

private const val MIN_VERIFIED_SQUARES = 2

private const val CONFLICT_NOTE_LIMIT = 4

private const val UCI_SQUARES = 4

/** By OCCUPANCY, never identity: `empty` reads ~99.99 %, type 0.882, so confidently empty is evidence and
 *  confidently occupied only withholds confirmation. Rungs tuned on g8h6, b1c4, d4b3. */
internal object VerifySingle {
    fun tick(
        state: EngineState,
        cnn: CnnEvaluator?,
        snap: CnnSnapshot?,
    ): List<TrackerEvent> {
        val pend = state.pending
        return when {
            pend == null || state.board.fen() != pend.fen -> emptyList()
            // A candidate decided against a desynced board is fiction (invariant 9).
            state.alarm != null -> state.discardOnAlarm()
            // No model: the tracker must not stall — commit as the diff saw it.
            cnn == null -> state.fallbackCommit(pend)
            snap == null -> emptyList()
            // Right position AND at least as recent as the candidate: FEN is captured before async work, so a newer seq
            // cannot validate old-position evidence. No vote, but the liveness clock advances.
            snap.seq < pend.seq || snap.fen != pend.fen -> {
                state.pending = pend.copy(lastTickS = state.nowS)
                emptyList()
            }
            // `cleanCommitsOnly`: a glance with a hand may neither confirm nor reject.
            state.config.cleanCommitsOnly && state.modelHandSquares(snap) != 0L -> {
                state.pending = pend.copy(lastTickS = state.nowS)
                emptyList()
            }
            // Model-free arm, ON by default: `pOccluded` is 0.0 under every 13-class model, and 003957's `g4` committed
            // at rung 2 through a resting hand. HAND-SHAPED only — a lone flag is a leaning piece.
            state.handHoldsVerdict(snap) -> {
                state.pending = pend.copy(lastTickS = state.nowS)
                emptyList()
            }
            else -> state.evaluate(cnn, snap, pend)
        }
    }
}

/** BOTH arms: the grid map lagged an arriving hand by one read and `cnn_pair` committed an unplayed move,
 *  while the head had flagged 2–5 squares on those very glances. */
private fun EngineState.handHoldsVerdict(snap: CnnSnapshot): Boolean = (gridHandSquares(snap) or modelHandSquares(snap)) != 0L

private fun EngineState.discardOnAlarm(): List<TrackerEvent> {
    pending = null
    confirmer.reset()
    note = "board desynced (ILLEGAL MOVE alarm) — pending candidate discarded"
    return emptyList()
}

private fun EngineState.fallbackCommit(pend: PendingVerify): List<TrackerEvent> {
    val moves = pendingMoves(pend.ucis)
    return when {
        moves.isEmpty() -> emptyList()
        moves.size == 1 -> listOf(commitMove(moves[0], pend.cur, pend.curBgr))
        else -> listOf(commitSequence(moves, pend.cur, pend.curBgr))
    }
}

private fun EngineState.evaluate(
    cnn: CnnEvaluator,
    snap: CnnSnapshot,
    pend: PendingVerify,
): List<TrackerEvent> {
    val moves = pendingMoves(pend.ucis)
    return when {
        moves.isEmpty() -> emptyList()
        moves.size > 1 -> VerifyPair.tick(this, cnn, moves, board.copy(), snap)
        // The ladder must not see a commit that lands while it evaluates.
        else -> singleTick(cnn, pend, board.copy(), moves[0], snap.obs)
    }
}

private fun EngineState.singleTick(
    cnn: CnnEvaluator,
    pend: PendingVerify,
    boardSnap: Game,
    move: Move,
    obs: CnnObservation,
): List<TrackerEvent> {
    val sig = Signals(cnn, boardSnap, move, obs)
    // The status shows the LOCAL agreement, not the whole-board one.
    cnnAgreement = sig.occAgree
    cnnBestMove = sig.cnnUci
    // Identity, not equality: guards against a commit that landed while we computed.
    if (pending !== pend || board.fen() != pend.fen) return emptyList()
    pend.frames += 1
    pend.lastTickS = nowS
    return ladder(cnn, pend, sig, boardSnap, move)
}

/** Rungs 1–4 are gated by [pendingVoted], the window end is not. Rung 2 needs [COMMIT_VOTES], the rest
 *  `verifyObsVotes`: only rungs that CONTRADICT the diff need a second glance. */
private fun EngineState.ladder(
    cnn: CnnEvaluator,
    pend: PendingVerify,
    sig: Signals,
    boardSnap: Game,
    move: Move,
): List<TrackerEvent> {
    val votes = config.verifyObsVotes
    val bound = pend.frames >= config.verifyWindow || verifyExpired(pend)
    // Eine zutreffende Sprosse ohne Stimmen hielt den Kandidaten sonst unbegrenzt: Sprosse 5 kam nie, und jeder
    // Blick frischte `lastTickS` auf, also griff auch der Wachhund nicht.

    fun waiting(): List<TrackerEvent> = if (bound) windowEnd(cnn, pend, sig, boardSnap, move) else emptyList()
    // Inside the motion hold no verdict and no vote until the move's squares were SEEN settled.
    if (earlyCommit && !sightSettled(boardSnap, move)) {
        note = "early: waiting to see ${board.san(move)} settled (${sights.size} sights)"
        return emptyList()
    }
    return when {
        // 1) `minConfidentBoard` is the blind-glance guard: under a hand `resyncCheck` matches VACUOUSLY, and a
        //    near-blind glance would reject a real move and re-anchor on the covered image.
        sig.match && sig.confidentCount >= cnn.minConfidentBoard ->
            if (pendingVoted(OUTCOME_SHADOW, votes)) shadowTerminal(pend) else waiting()

        // 2) BEFORE the veto, so a genuine move is not killed by a misread destination.
        sig.commits(cnn.minAgreement, pend.uci, early = earlyCommit) ->
            if (pendingVoted(OUTCOME_COMMIT, COMMIT_VOTES)) commitTerminal(pend) else waiting()

        // 3) Destination confidently EMPTY while the origin did NOT clearly empty: the hand-wave ghost.
        //    `!fromLeftConf` protects castling — that already committed at rung 2.
        sig.toEmptyConf && !sig.fromLeftConf ->
            if (pendingVoted(OUTCOME_GHOST, votes)) {
                reject(VERIFY_STATE_GHOST, "Ghost move rejected (CNN: ${sig.toSq} still empty)", listOf(sig.toSq))
            } else {
                waiting()
            }

        // 4) The verdict carries the replacement, so the real move lands in THIS cycle (invariant 10).
        sig.overrules(cnn, cnn.minAgreement, pend.uci) ->
            if (pendingVoted("overrule:${sig.cnnUci}", votes)) overruleTerminal(pend, sig, move) else waiting()

        bound -> windowEnd(cnn, pend, sig, boardSnap, move)

        else -> {
            // Unentschieden ist keine Stimme, und [pendingVoted] verlangt AUFEINANDERFOLGENDE.
            pend.voteOutcome = null
            pend.voteCount = 0
            note = "checking ${board.san(move)} via CNN… (${pend.frames}/${config.verifyWindow})"
            emptyList()
        }
    }
}

private fun EngineState.windowEnd(
    cnn: CnnEvaluator,
    pend: PendingVerify,
    sig: Signals,
    boardSnap: Game,
    move: Move,
): List<TrackerEvent> =
    when {
        // Origin still occupied and nothing arrived: the move most likely never happened. The ONE place
        // `fromOccConf` may reject — earlier, a false "still occupied" would kill a real move.
        sig.fromOccConf && !sig.toArrivedConf ->
            reject(VERIFY_STATE_GHOST, "Move not confirmed (CNN: ${sig.fromSq} still occupied) — discarded", listOf(sig.fromSq))

        // Both endpoints occluded the whole window: NEVER auto-accept under a hand.
        if (config.windowEndBothEnds) !(sig.toConf && sig.fromConf) else !(sig.toConf || sig.fromConf) ->
            reject(VERIFY_STATE_GHOST, "Verification timed out under occlusion — no move committed")

        else -> {
            // Before trusting the diff, the WHOLE board against the post-move position (b1d4: endpoint-local reasoning
            // never looked at the square the piece landed on).
            val after = cnn.resyncCheck(boardSnap.copy().also { it.push(move) }.fen(), sig.obs)
            if (after.conflicts.isNotEmpty()) {
                val shown = after.conflicts.take(CONFLICT_NOTE_LIMIT).joinToString(", ")
                reject(
                    VERIFY_STATE_GHOST,
                    "Move not confirmed (board contradicts post-move position: $shown) — discarded",
                    after.conflicts,
                )
            } else {
                cnnStatus = "ok"
                cnnConflicts = emptyList()
                val events = applyVerdict(VerifyVerdict.For(DECIDER_DIFF_AFTER_VERIFY), pend)
                note += "  (CNN uncertain — diff accepted)"
                events
            }
        }
    }

private fun EngineState.shadowTerminal(pend: PendingVerify): List<TrackerEvent> {
    clearStuck()
    // Invariant 5: the AVERAGED candidate frame, never the CNN's frame. `fromCommit = true` keeps the gamut (6).
    setRef(pend.cur, pend.curBgr, fromCommit = true)
    return reject(VERIFY_SHADOW, "Shadow/no move (CNN: board unchanged)")
}

private fun EngineState.commitTerminal(pend: PendingVerify): List<TrackerEvent> {
    cnnStatus = "ok"
    cnnConflicts = emptyList()
    return applyVerdict(VerifyVerdict.For(DECIDER_CNN_OCCUPANCY), pend)
}

private fun EngineState.overruleTerminal(
    pend: PendingVerify,
    sig: Signals,
    move: Move,
): List<TrackerEvent> {
    val replacement = sig.cnnUci?.let { legalMoveFor(it) } ?: return emptyList()
    // The pending move's SAN only exists BEFORE the replacement is pushed.
    val oldSan = board.san(move)
    cnnStatus = "ok"
    cnnConflicts = emptyList()
    val events = applyVerdict(VerifyVerdict.For(DECIDER_CNN_OVERRULE, listOf(replacement)), pend)
    verifyState = VERIFY_OVERRULED
    note += "  (CNN overruled $oldSan)"
    return events
}

/** Recorded: this ladder is where a real move most plausibly dies, and a silent rejection looks like a
 *  move never seen. */
private fun EngineState.reject(
    verify: String,
    reason: String,
    conflicts: List<String> = emptyList(),
): List<TrackerEvent> {
    recordRejection(pending?.ucis?.firstOrNull() ?: "", "$verify — $reason", foldConsecutive = false)
    pending = null
    confirmer.reset()
    // Recovery's whole-board vote is NOT reset: one bad candidate once starved two-vote recovery for 22 s (Nf6).
    verifyState = verify
    cnnStatus = verify
    cnnConflicts = conflicts
    note = reason
    return emptyList()
}

/** Deliberately asymmetric: confidently EMPTY is evidence, confidently OCCUPIED is not — `fromOccConf` may
 *  never reject before the window end. `occAgree` is LOCAL to the touched squares. */
private class Signals(
    cnn: CnnEvaluator,
    boardSnap: Game,
    move: Move,
    val obs: CnnObservation,
) {
    val fromSq: String = Squares.ALL[move.from.ordinal]
    val toSq: String = Squares.ALL[move.to.ordinal]

    val toConf: Boolean = obs.confident(toSq, cnn.confThr)
    val fromConf: Boolean = obs.confident(fromSq, cnn.confThr)

    private val capture: Boolean = isCapture(boardSnap, move)
    private val castling: Boolean = isCastling(boardSnap, move)

    private val mover: String? =
        boardSnap.pieceCharAt(move.from.ordinal)?.let { (if (it.isUpperCase()) "w" else "b") + it.uppercaseChar() }

    // Occupancy cannot see a capture's arrival (`Bxe4` committed 17 frames before the bishop landed): the
    // identity read must show the capturer on the target.
    val captureArrived: Boolean = !capture || (obs.labelConfident(toSq, cnn.confThr) && obs.label(toSq) == mover)

    val toEmptyConf: Boolean = toConf && !obs.occupied(toSq)
    val fromLeftConf: Boolean = fromConf && !obs.occupied(fromSq)
    val toArrivedConf: Boolean = toConf && obs.occupied(toSq) && !capture
    val fromOccConf: Boolean = fromConf && obs.occupied(fromSq)

    private val fen: String = boardSnap.fen()

    private val verified: Pair<Double, Int> = cnn.verifyMove(fen, uciOf(move), obs)
    val occAgree: Double = verified.first
    val occN: Int = verified.second

    private val occCheck = cnn.resyncCheck(fen, obs)
    val match: Boolean = occCheck.match
    val cnnUci: String? = occCheck.move
    val cnnAgreement: Double = occCheck.agreement

    val confidentCount: Int = Squares.ALL.count { obs.confident(it, cnn.confThr) }

    /** "Piece left FROM" is never commit evidence alone (it committed Na3 with the knight illegally on c4);
     *  castling is the exception — the king on g1 reads empty. `toArrivedOk` needs `!fromOccConf` (d4b3). */
    fun commits(
        minAgreement: Double,
        pendingUci: String,
        early: Boolean,
    ): Boolean {
        val fromLeftOk =
            fromLeftConf && (castling || (cnnUci == pendingUci && cnnAgreement >= minAgreement))
        val toArrivedOk = toArrivedConf && !fromOccConf
        // `verifyMove` is LOCAL, so g3 vs gxh3 with a pawn on h3 agrees 2/2 either way: a confident different
        // derivation from the CNN is not a confirmation.
        val contradicted = cnnUci != null && cnnUci != pendingUci && cnnAgreement >= minAgreement
        // Only INSIDE the motion hold: the lifted capturer also empties FROM. After the hold, demanding identity cost
        // one capture per recording 467 ms.
        val arrived = !early || captureArrived
        return arrived && (fromLeftOk || toArrivedOk || (!contradicted && occAgree >= minAgreement && occN >= MIN_VERIFIED_SQUARES))
    }

    /** The overruling move must be READ, not inferred from an absence: origin confidently EMPTY, destination
     *  confidently OCCUPIED — 39× rarer (8826 misses against 226 phantoms), so no margin helps. */
    fun overrules(
        cnn: CnnEvaluator,
        minAgreement: Double,
        pendingUci: String,
    ): Boolean {
        val uci = cnnUci ?: return false
        if (uci == pendingUci || cnnAgreement < minAgreement) return false
        val from = uci.substring(0, 2)
        val to = uci.substring(2, UCI_SQUARES)
        val left = obs.confident(from, cnn.confThr) && !obs.occupied(from)
        return left && obs.confident(to, cnn.confThr) && obs.occupied(to)
    }
}
