package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.move.Move

/** `_verify_state` values this ladder produces (`"confirmed"` comes from the commit path). */
private const val VERIFY_SHADOW = "shadow"

private const val VERIFY_GHOST = "ghost"

private const val VERIFY_OVERRULED = "overruled"

/** Vote keys — see [pendingVoted]. The overrule key additionally carries the CNN's uci. */
private const val OUTCOME_SHADOW = "shadow"

private const val OUTCOME_COMMIT = "commit"

private const val OUTCOME_GHOST = "ghost"

/** `verify_move` counts FROM and TO; below two readable touched squares it says nothing. */
private const val MIN_VERIFIED_SQUARES = 2

/** `", ".join(after["conflicts"][:4])`. */
private const val CONFLICT_NOTE_LIMIT = 4

/** `uci[:2]` / `uci[2:4]` — the two squares of a uci, promotion suffix excluded. */
private const val UCI_SQUARES = 4

/**
 * `_verify_tick` — pre-commit verification of a diff candidate through the CNN, autonomously over
 * several frames.
 *
 * Verification is by OCCUPANCY, never by piece identity: the model is ~99.99% on `empty` and ~88%
 * per square. A *confidently empty* reading is therefore evidence, a *confidently occupied* one
 * only withholds confirmation.
 *
 * This KDoc used to justify that asymmetry with "only ~40% on piece type", and that number is
 * stale by a factor of two. Measured on `occ-v10bn35-13c-hn` over the 7 217 occupied crops of
 * `occ-warm-13c-hn`'s test split: **0.882 overall**, 0.818 across the Q/R/N/B set a capture tie is
 * between, and the confusions are B<->R, B<->P, R<->P — never a queen. Whether the ladder below
 * should now USE identity is an open measurement question, not a settled one: nothing here has been
 * re-measured against the identity axis, and the rungs are tuned on incidents (g8h6, b1c4, d4b3)
 * whose evidence is occupancy. Do not read the corrected number as a licence to change the rungs.
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
            // Spec-11 seq contract: an observation of a frame OLDER than the frame the candidate
            // was decided on may neither confirm nor reject it. Not a rejection, not a vote — an
            // ignore, and the VOTE counter stays put.
            //
            // The liveness clock is a different thing and must advance. `expireStalledVerify` calls
            // itself "a watchdog for an observer that STOPPED, not one that is merely slow", and
            // says the slow case belongs to `verifyExpired` inside the ladder — but the ladder is
            // only reached PAST this gate, so the two were swapped: an observer that answered about
            // an older frame looked identical to one that had died, and its candidate was dropped
            // as stalled. Bounded by construction: the next crop frame is cut after dispatch, so at
            // most ONE observation per pending can be too old, and this can buy at most one period.
            snap.seq < pend.seq -> {
                state.pending = pend.copy(lastTickS = state.nowS)
                emptyList()
            }
            // The `cleanCommitsOnly` experiment: a glance with a hand in it may neither confirm
            // nor reject — no vote, no verdict, for the single AND the pair ladder (the pair is
            // only reached through `evaluate`). Alive though: the liveness clock advances exactly
            // like the too-old case above, so a covered board does not read as a dead observer.
            state.config.cleanCommitsOnly && snap.obs.readsOccludedAnywhere() -> {
                state.pending = pend.copy(lastTickS = state.nowS)
                emptyList()
            }
            else -> state.evaluate(cnn, snap, pend)
        }
    }
}

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
        // Python `self.board.copy(stack=False)` — the ladder must not see a commit that lands while
        // it evaluates.
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
    // Python re-validates under the lock after the evaluation; single-threaded this is a plain
    // identity check, and it still guards against a commit that landed while we computed.
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
        // 1) Occupancy says the believed board is unchanged → shadow, not a move. The
        //    `minConfidentBoard` guard is the blind-glance protection: with a hand over the board
        //    `resyncCheck` matches VACUOUSLY, and without the guard a near-blind glance would
        //    reject a real move and re-anchor the reference on the covered image.
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
                reject(VERIFY_GHOST, "Ghost move rejected (CNN: ${sig.toSq} still empty)", listOf(sig.toSq))
            } else {
                emptyList()
            }

        // 4) cnn_overrule — the CNN sees a DIFFERENT move whose occupancy is unambiguous. The
        //    verdict carries the replacement move, so the real move lands in THIS cycle
        //    (invariant 10; the legacy port could only drop the candidate and re-detect).
        sig.overrules(cnn, cnn.minAgreement, pend.uci) ->
            if (pendingVoted("overrule:${sig.cnnUci}", votes)) overruleTerminal(pend, sig, move) else emptyList()

        pend.frames >= config.verifyWindow || verifyExpired(pend) -> windowEnd(cnn, pend, sig, boardSnap, move)

        else -> {
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
            reject(VERIFY_GHOST, "Move not confirmed (CNN: ${sig.fromSq} still occupied) — discarded", listOf(sig.fromSq))

        // Both endpoints stayed occluded the whole window. NEVER auto-accept under a hand — that
        // was the old hole where a covering hand committed fiction.
        !(sig.toConf || sig.fromConf) ->
            reject(VERIFY_GHOST, "Verification timed out under occlusion — no move committed")

        else -> {
            // Clear view but no strong endpoint signal. Before trusting the diff, check the WHOLE
            // board against the POST-move position (the b1d4 incident: endpoint-local reasoning
            // never looked at the square the piece actually landed on).
            val after = cnn.resyncCheck(boardSnap.copy().also { it.push(move) }.fen(), sig.obs)
            if (after.conflicts.isNotEmpty()) {
                val shown = after.conflicts.take(CONFLICT_NOTE_LIMIT).joinToString(", ")
                reject(
                    VERIFY_GHOST,
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
 * `_reject` — discard the candidate; base truth stays where it was.
 *
 * Recorded, not just noted. This ladder is where a legitimate move most plausibly dies — the
 * whole-board contradiction test below has ZERO tolerance for a wrongly-read square while the
 * recovery path tolerates 1-2 of them — and until 2026-08-01 it wrote nothing but a `note` that the
 * next frame overwrote. A rejection that leaves no trace is indistinguishable from a move the
 * tracker never saw, which is exactly the ambiguity that cost two rounds of debugging.
 */
private fun EngineState.reject(
    verify: String,
    reason: String,
    conflicts: List<String> = emptyList(),
): List<TrackerEvent> {
    recordRejection(pending?.ucis?.firstOrNull() ?: "", "$verify — $reason")
    pending = null
    confirmer.reset()
    recoveryConfirmer.reset()
    verifyState = verify
    cnnStatus = verify
    cnnConflicts = conflicts
    note = reason
    return emptyList()
}

/**
 * The five occupancy signals of one glance, plus the whole-board resync result.
 *
 * Deliberately asymmetric:
 * - `toEmptyConf` — destination confidently EMPTY: the piece never arrived, reliable AGAINST.
 * - `fromLeftConf` — origin confidently EMPTY: the piece left, reliable FOR.
 * - `toArrivedConf` — non-capture destination confidently OCCUPIED: decent FOR.
 * - `fromOccConf` — origin confidently OCCUPIED: UNRELIABLE, never a hard reject before the window
 *   end (a false positive would kill a real d2d4).
 * - `occAgree`/`occN` — `verify_move`, LOCAL to the touched squares and therefore immune to a
 *   stale misread anywhere else on the board.
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
     * Rung 2. "Piece left FROM" is NEVER commit evidence on its own — the b1c4 / h2h4-nudge
     * incidents (2026-07-09): b1 confidently emptied while the knight sat illegally on c4, and
     * from-left alone committed the best LEGAL move Na3. A non-castling commit needs positive
     * DESTINATION evidence; castling is the exception the clause exists for, because the king on
     * g1 is routinely misread as empty.
     *
     * `toArrivedOk` additionally requires `!fromOccConf` — the d4b3 rook incident: a foreign piece
     * landed on b3, b2b3 was proposed, b3 read occupied and committed while the b2 pawn
     * demonstrably never moved. Both signals contradicting → HOLD and let the window end decide.
     */
    fun commits(
        minAgreement: Double,
        pendingUci: String,
    ): Boolean {
        val fromLeftOk =
            fromLeftConf && (castling || (cnnUci == pendingUci && cnnAgreement >= minAgreement))
        val toArrivedOk = toArrivedConf && !fromOccConf
        return fromLeftOk || toArrivedOk || (occAgree >= minAgreement && occN >= MIN_VERIFIED_SQUARES)
    }

    /**
     * Rung 4 — the aggressive one: it DISCARDS a move the deterministic evidence supports, so it
     * must clear a higher bar than a confirmation. The whole-board score is not that bar.
     * `scoreMoves` accepts on a margin of `cnnMarginSquares = 1`, which cannot be raised (a capture
     * differs from its non-capture sibling by exactly one square), and ONE missed piece on the true
     * destination is exactly one square. Measured over 1366 clip observations the model's errors are
     * 8826 misses (piece→empty) against 226 phantoms (empty→piece), and they are systematic per
     * square (S17-SIM-3: f4 misread in 90 of 186 observations), so neither the margin nor more
     * votes outrun them. So the overruling move must be READ, not inferred from an absence: origin
     * confidently EMPTY, destination confidently OCCUPIED — the 39×-rarer error direction.
     * blender-queenside's phantom Bg5 never had g5 read confidently at all.
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
