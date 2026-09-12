package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.move.Move

/** Verify states this ladder produces (`"confirmed"` comes from the commit path). */
private const val VERIFY_SHADOW = "shadow"

private const val VERIFY_OVERRULED = "overruled"

/** Vote keys — see [pendingVoted]. The overrule key additionally carries the CNN's uci. */
private const val OUTCOME_SHADOW = "shadow"

private const val OUTCOME_COMMIT = "commit"

private const val OUTCOME_GHOST = "ghost"

/** `verifyMove` counts FROM and TO; below two readable touched squares it says nothing. */
private const val MIN_VERIFIED_SQUARES = 2

private const val CONFLICT_NOTE_LIMIT = 4

/** The two squares of a uci, promotion suffix excluded. */
private const val UCI_SQUARES = 4

/**
 * Pre-commit verification of a diff candidate through the CNN, by OCCUPANCY never identity: `empty`
 * reads ~99.99 %, piece type only 0.882, so a confidently empty square is evidence and a confidently
 * occupied one only withholds confirmation. Rungs tuned on occupancy incidents (g8h6, b1c4, d4b3).
 */
internal object VerifySingle {
    /** [snap] is `null` when the CNN is unavailable or the observation failed. */
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
            // No model → the tracker must not stall; commit the candidate as the diff saw it.
            cnn == null -> state.fallbackCommit(pend)
            snap == null -> emptyList()
            // A reading must belong to the candidate's position AND be at least as recent as its
            // frame. The observer captures FEN before asynchronous work: a newer frame sequence
            // alone cannot make old-position (possibly prior-conditioned) evidence valid.
            // Neither kind of stale reading may vote. The liveness clock still advances, or a
            // merely slow observer looks like a dead one and its candidate is dropped as stalled.
            snap.seq < pend.seq || snap.fen != pend.fen -> {
                state.pending = pend.copy(lastTickS = state.nowS)
                emptyList()
            }
            // `cleanCommitsOnly`: a glance with a hand in it may neither confirm nor reject — no
            // vote, no verdict; the liveness clock advances like the too-old case above.
            state.config.cleanCommitsOnly && state.modelHandSquares(snap) != 0L -> {
                state.pending = pend.copy(lastTickS = state.nowS)
                emptyList()
            }
            // Model-free arm of the same guard, ON by default: `pOccluded` is identically 0.0 under
            // every 13-class model, and 003957's fabricated `g4` committed at rung 2 through a
            // resting hand. The groove read must be HAND-SHAPED — a lone flag is a leaning piece.
            state.handHoldsVerdict(snap) -> {
                state.pending = pend.copy(lastTickS = state.nowS)
                emptyList()
            }
            else -> state.evaluate(cnn, snap, pend)
        }
    }
}

/**
 * BOTH hand arms — the groove read and the model's occluded head: in the h7h5 incident (session
 * 20260814-203552) the grid map lagged an arriving hand by one observation and `cnn_pair` committed
 * a move that was never played, while the head had flagged 2–5 squares on those very glances.
 */
private fun EngineState.handHoldsVerdict(snap: CnnSnapshot): Boolean = (gridHandSquares(snap) or modelHandSquares(snap)) != 0L

private fun EngineState.discardOnAlarm(): List<TrackerEvent> {
    pending = null
    confirmer.reset()
    note = "board desynced (ILLEGAL MOVE alarm) — pending candidate discarded"
    return emptyList()
}

/** The CNN-unavailable path commits with the plain diff deciders — no verdict was ever reached. */
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
    // The status surface shows the LOCAL agreement, not the whole-board one.
    cnnAgreement = sig.occAgree
    cnnBestMove = sig.cnnUci
    // Identity check, never equality: guards against a commit that landed while we computed.
    if (pending !== pend || board.fen() != pend.fen) return emptyList()
    pend.frames += 1
    pend.lastTickS = nowS
    return ladder(cnn, pend, sig, boardSnap, move)
}

/**
 * The five rungs, in order. Rungs 1–4 are gated by [pendingVoted]; the window end is not — the
 * window itself is the temporal damping there. Rung 2 votes on [COMMIT_VOTES], every other rung on
 * `verifyObsVotes`: only the rungs that CONTRADICT the diff need a second glance.
 */
private fun EngineState.ladder(
    cnn: CnnEvaluator,
    pend: PendingVerify,
    sig: Signals,
    boardSnap: Game,
    move: Move,
): List<TrackerEvent> {
    val votes = config.verifyObsVotes
    return when {
        // 1) Occupancy says the believed board is unchanged → shadow. `minConfidentBoard` is the
        //    blind-glance guard: under a hand `resyncCheck` matches VACUOUSLY, and a near-blind
        //    glance would reject a real move and re-anchor the reference on the covered image.
        sig.match && sig.confidentCount >= cnn.minConfidentBoard ->
            if (pendingVoted(OUTCOME_SHADOW, votes)) shadowTerminal(pend) else emptyList()

        // 2) Positive confirmation on the reliable axes, checked BEFORE the veto so a genuine move
        //    is not killed by a mis-read destination.
        sig.commits(cnn.minAgreement, pend.uci) ->
            if (pendingVoted(OUTCOME_COMMIT, COMMIT_VOTES)) commitTerminal(pend) else emptyList()

        // 3) Hard veto: destination confidently EMPTY while the origin did NOT clearly empty →
        //    nothing moved at all (the hand-wave ghost). `!fromLeftConf` protects castling, whose
        //    from-square DOES empty — that case already committed at rung 2.
        sig.toEmptyConf && !sig.fromLeftConf ->
            if (pendingVoted(OUTCOME_GHOST, votes)) {
                reject(VERIFY_STATE_GHOST, "Ghost move rejected (CNN: ${sig.toSq} still empty)", listOf(sig.toSq))
            } else {
                emptyList()
            }

        // 4) cnn_overrule — the CNN sees a DIFFERENT move whose occupancy is unambiguous. The
        //    verdict carries the replacement, so the real move lands in THIS cycle (invariant 10).
        sig.overrules(cnn, cnn.minAgreement, pend.uci) ->
            if (pendingVoted("overrule:${sig.cnnUci}", votes)) overruleTerminal(pend, sig, move) else emptyList()

        pend.frames >= config.verifyWindow || verifyExpired(pend) -> windowEnd(cnn, pend, sig, boardSnap, move)

        else -> {
            // Eine brauchbare, aber unentschiedene Lesung ist keine Stimme, und [pendingVoted]
            // verlangt AUFEINANDERFOLGENDE: sonst zaehlen shadow, neutral, shadow als zwei.
            pend.voteOutcome = null
            pend.voteCount = 0
            note = "checking ${board.san(move)} via CNN… (${pend.frames}/${config.verifyWindow})"
            emptyList()
        }
    }
}

/** 5) Undecided for the whole window — resolve on what the endpoints and the whole board say. */
private fun EngineState.windowEnd(
    cnn: CnnEvaluator,
    pend: PendingVerify,
    sig: Signals,
    boardSnap: Game,
    move: Move,
): List<TrackerEvent> =
    when {
        // Origin still occupied and nothing arrived → the move most likely never happened. This is
        // the ONE place `fromOccConf` may reject; anywhere earlier a false "still occupied" would
        // kill a real move.
        sig.fromOccConf && !sig.toArrivedConf ->
            reject(VERIFY_STATE_GHOST, "Move not confirmed (CNN: ${sig.fromSq} still occupied) — discarded", listOf(sig.fromSq))

        // Both endpoints stayed occluded the whole window. NEVER auto-accept under a hand — that
        // was the old hole where a covering hand committed fiction.
        if (config.windowEndBothEnds) !(sig.toConf && sig.fromConf) else !(sig.toConf || sig.fromConf) ->
            reject(VERIFY_STATE_GHOST, "Verification timed out under occlusion — no move committed")

        else -> {
            // Clear view but no strong endpoint signal. Before trusting the diff, check the WHOLE
            // board against the POST-move position (the b1d4 incident: endpoint-local reasoning
            // never looked at the square the piece actually landed on).
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
    // Invariant 5: the verify path anchors on the AVERAGED frame the candidate was raised from,
    // never on the frame the CNN looked at. `fromCommit = true` keeps the gamut (invariant 6).
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

/**
 * Discard the candidate; base truth stays where it was. Recorded, not merely noted: this ladder is
 * where a legitimate move most plausibly dies, and a rejection that leaves no trace is
 * indistinguishable from a move the tracker never saw.
 */
private fun EngineState.reject(
    verify: String,
    reason: String,
    conflicts: List<String> = emptyList(),
): List<TrackerEvent> {
    recordRejection(pending?.ucis?.firstOrNull() ?: "", "$verify — $reason", foldConsecutive = false)
    pending = null
    confirmer.reset()
    // Recovery's independent whole-board vote is NOT reset here: this rejection only says the diff
    // candidate failed its local check. Resetting it let one bad candidate starve two-vote recovery
    // for 22 seconds (live Nf6 incident).
    verifyState = verify
    cnnStatus = verify
    cnnConflicts = conflicts
    note = reason
    return emptyList()
}

/**
 * The occupancy signals of one glance plus the whole-board resync, deliberately asymmetric:
 * confidently EMPTY is reliable evidence, confidently OCCUPIED is not — `fromOccConf` may never reject
 * before the window end (a false positive kills a real d2d4). `occAgree` is LOCAL to the touched squares.
 */
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

    /**
     * Rung 2. "Piece left FROM" is never commit evidence alone (b1c4 / h2h4-nudge, 2026-07-09: it
     * committed Na3 while the knight sat illegally on c4); castling is the exception, as the king on
     * g1 is routinely misread as empty. `toArrivedOk` needs `!fromOccConf` — d4b3 rook incident.
     */
    fun commits(
        minAgreement: Double,
        pendingUci: String,
    ): Boolean {
        val fromLeftOk =
            fromLeftConf && (castling || (cnnUci == pendingUci && cnnAgreement >= minAgreement))
        val toArrivedOk = toArrivedConf && !fromOccConf
        // `verifyMove` is LOCAL to the candidate's squares, so g3 vs gxh3 with a pawn already on h3
        // agrees 2/2 either way; the CNN's own derived move is the square it did look at
        // (00-39-57 ply 15, 2026-09-12). A confident different derivation is not a confirmation.
        val contradicted = cnnUci != null && cnnUci != pendingUci && cnnAgreement >= minAgreement
        return fromLeftOk || toArrivedOk || (!contradicted && occAgree >= minAgreement && occN >= MIN_VERIFIED_SQUARES)
    }

    /**
     * Rung 4 discards a move the deterministic evidence supports, so the overruling move must be READ,
     * not inferred from an absence: origin confidently EMPTY, destination confidently OCCUPIED — the
     * 39×-rarer direction. 8826 misses against 226 phantoms, systematic per square, so no margin helps.
     */
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
