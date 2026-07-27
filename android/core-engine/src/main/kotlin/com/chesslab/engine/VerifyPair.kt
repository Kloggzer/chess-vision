package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.ResyncResult
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.move.Move

/** `_verify_state` / `cnn_status` after a pair was read as "nothing actually moved". */
private const val VERIFY_STATE_SHADOW = "shadow"

/** `_verify_state` / `cnn_status` after a pair was discarded unverified. */
private const val VERIFY_STATE_GHOST = "ghost"

private const val CNN_STATUS_OK = "ok"

/** Vote keys of the two vote-gated terminals (`_pending_voted`). */
private const val OUTCOME_SHADOW = "shadow"

private const val OUTCOME_COMMIT = "commit"

/**
 * The fast-accept needs a real local majority: below this many confident touched squares the
 * agreement is 0.0, never "the fraction of what we have" — two lucky squares must not reach
 * `cnnMinAgreement`.
 */
private const val MIN_CHECKED_FOR_AGREEMENT = 3

/**
 * `_verify_pair_tick` — occupancy verify of a PAIR candidate (fast play: half-move + reply).
 *
 * The all-or-nothing whole-board match this replaces had a livelock: ONE chronically misread
 * confident square anywhere (the dark-square bB false positive) makes `before` AND `after`
 * unmatchable, so the candidate burned the window, was discarded, and the unchanged diff evidence
 * re-fired an identical candidate — forever. The governing insight of the fix: **a conflict that
 * already existed against the CURRENT position cannot discriminate between "move happened" and
 * "move did not happen"**, so it must not veto.
 *
 * Every upstream guard (fen identity, alarm discard, stale `snap.seq`, CNN-unavailable fallback)
 * has already run in `VerifySingle`; this is only the pair ladder.
 */
internal object VerifyPair {
    fun tick(
        state: EngineState,
        cnn: CnnEvaluator,
        moves: List<Move>,
        boardSnap: Game,
        snap: CnnSnapshot,
    ): List<TrackerEvent> {
        val obs = snap.obs
        val before = cnn.resyncCheck(boardSnap.fen(), obs)
        val afterBoard = boardSnap.copy()
        for (mv in moves) afterBoard.push(mv)
        val after = cnn.resyncCheck(afterBoard.fen(), obs)
        val conf = confidentMask(obs, cnn.confThr)
        // The LOCAL axis: only the squares the pair physically changes, so a stale misread
        // elsewhere is irrelevant. `nConf` is the WHOLE board — the two are not interchangeable.
        val checked = touchedMask(boardSnap, moves) and conf
        val pairAgree = pairAgreement(obs, afterBoard, checked)
        val nConf = conf.countOneBits()

        state.cnnAgreement = after.agreement
        val pend = state.pending
        // Python re-reads the pending identity here because it dropped the lock across the CNN
        // calls; single-threaded, only the base-truth FEN can still have moved on.
        if (pend == null || state.board.fen() != pend.fen) return emptyList()
        pend.frames++
        return when {
            before.match && nConf >= cnn.minConfidentBoard -> state.acceptShadow(pend)
            (after.match && nConf >= cnn.minConfidentBoard) || pairAgree >= cnn.minAgreement ->
                if (state.pendingVoted(OUTCOME_COMMIT, COMMIT_VOTES)) {
                    state.commitPair(moves, pend, DECIDER_CNN_PAIR)
                } else {
                    emptyList()
                }
            pend.frames >= state.config.verifyWindow -> state.pairWindowEnd(moves, pend, checked, before, after)
            else -> {
                state.note = "checking double move ${pairKey(moves)} via CNN… (${pend.frames}/${state.config.verifyWindow})"
                emptyList()
            }
        }
    }
}

/**
 * Rung 1 — the board still matches the CURRENT position on plenty of confident squares, so
 * nothing moved. The `minConfidentBoard` guard in the caller is the blind-glance protection: with
 * a hand over the board `resyncCheck` matches VACUOUSLY, and without the guard a near-blind glance
 * would reject a real pair and re-anchor the reference onto the covered image.
 */
private fun EngineState.acceptShadow(pend: PendingVerify): List<TrackerEvent> {
    if (!pendingVoted(OUTCOME_SHADOW, config.verifyObsVotes)) return emptyList()
    pending = null
    confirmer.reset()
    // also resets the recovery confirmer
    clearStuck()
    // Invariant 5: the verify path anchors on the averaged frame the candidate was raised from.
    setRef(pend.cur, pend.curBgr, fromCommit = true)
    verifyState = VERIFY_STATE_SHADOW
    cnnStatus = VERIFY_STATE_SHADOW
    cnnConflicts = emptyList()
    note = "Shadow/no move (CNN: board unchanged)"
    return emptyList()
}

/** Rung 2 / the window-end accept — `_commit_pair`. `commitSequence` sets `verifyState`. */
private fun EngineState.commitPair(
    moves: List<Move>,
    pend: PendingVerify,
    decider: String,
): List<TrackerEvent> {
    cnnStatus = CNN_STATUS_OK
    cnnConflicts = emptyList()
    return listOf(commitSequence(moves, pend.cur, pend.curBgr, decider))
}

/**
 * Rung 3 — the window is up. NOT vote-gated: the window itself is the damping.
 *
 * - clear view and every post-move conflict already present against the current position: the
 *   misread is chronic and cannot discriminate, so the diff evidence stands and the pair commits;
 * - no touched square was EVER readable: occlusion timeout, discard — never auto-accept under a
 *   covering hand;
 * - otherwise a NEW conflict appeared: the pair as believed did not happen.
 */
private fun EngineState.pairWindowEnd(
    moves: List<Move>,
    pend: PendingVerify,
    checked: Long,
    before: ResyncResult,
    after: ResyncResult,
): List<TrackerEvent> {
    val key = pairKey(moves)
    val preexisting = ofSquares(after.conflicts).without(ofSquares(before.conflicts)) == 0L
    return when {
        checked != 0L && preexisting -> {
            val events = commitPair(moves, pend, DECIDER_DIFF_AFTER_VERIFY)
            note = "Double move $key accepted (CNN conflicts pre-existed the candidate)"
            events
        }
        checked == 0L -> {
            rejectPair("Verification timed out under occlusion — no move committed", emptyList())
            emptyList()
        }
        else -> {
            rejectPair("Double move $key not confirmed by CNN — discarded", after.conflicts)
            emptyList()
        }
    }
}

/** `_reject_pair` — drop the candidate; base truth stays where it is. */
private fun EngineState.rejectPair(
    noteText: String,
    conflicts: List<String>,
) {
    pending = null
    confirmer.reset()
    recoveryConfirmer.reset()
    verifyState = VERIFY_STATE_GHOST
    cnnStatus = VERIFY_STATE_GHOST
    cnnConflicts = conflicts
    note = noteText
}

/**
 * The squares BOTH half-moves touch. The reply is evaluated on the MID board (after the first
 * half-move only) — its capture / castling / en-passant squares depend on that position.
 */
private fun touchedMask(
    boardSnap: Game,
    moves: List<Move>,
): Long {
    val mid = boardSnap.copy()
    mid.push(moves[0])
    return moveTouchedMask(boardSnap, moves[0]) or moveTouchedMask(mid, moves[1])
}

private fun confidentMask(
    obs: CnnObservation,
    thr: Double,
): Long {
    var mask = 0L
    for (i in 0 until Squares.COUNT) {
        if (obs.confident(Squares.ALL[i], thr)) mask = mask.with(i)
    }
    return mask
}

/** Occupancy agreement of the confident touched squares with the position after BOTH half-moves. */
private fun pairAgreement(
    obs: CnnObservation,
    afterBoard: Game,
    checked: Long,
): Double {
    val n = checked.countOneBits()
    if (n < MIN_CHECKED_FOR_AGREEMENT) return 0.0
    var hits = 0
    checked.forEachSquare { i ->
        if (obs.occupied(Squares.ALL[i]) == (afterBoard.pieceCharAt(i) != null)) hits++
    }
    return hits.toDouble() / n
}

private fun pairKey(moves: List<Move>): String = moves.joinToString(" ") { uciOf(it) }
