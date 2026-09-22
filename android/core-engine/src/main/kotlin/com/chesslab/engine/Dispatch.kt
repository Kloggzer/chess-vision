package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.move.Move
import java.math.BigDecimal
import java.math.RoundingMode
import kotlin.math.abs

/** The note the alarm gate leaves behind. */
internal const val NOTE_ALARM_BLOCKED =
    "board desynced (ILLEGAL MOVE alarm) — no moves committed until take-back or resync"

/** The debug list keeps the strongest 8 squares. */
private const val CHANGED_VALS_LIMIT = 8

private const val CHANGED_VALS_SOFT_FACTOR = 0.5

/** One decimal, HALF_EVEN like Python's `round`. */
private const val ROUND_ONE_DECIMAL = 10.0

/**
 * Step 9 — the ONE commit gate for every candidate kind: with CNN verify the candidate goes pending,
 * without it commits directly. **entry.md invariant 9 — the alarm blocks EVERYTHING**: under the desync
 * latch every diff-vs-reference reading is fiction (d4->b3), only take-back/resync/recovery clears it.
 */
internal fun EngineState.dispatch(
    moves: List<Move>,
    cur: GrayImage,
    curBgr: BgrImage?,
    priorUsed: Boolean,
    candidateNote: String?,
    seq: Long,
): List<TrackerEvent> {
    if (alarm != null) {
        confirmer.reset()
        note = NOTE_ALARM_BLOCKED
        return emptyList()
    }
    if (!cnnOn) {
        return if (moves.size == 1) {
            listOf(commitMove(moves[0], cur, curBgr, priorUsed = priorUsed))
        } else {
            listOf(commitSequence(moves, cur, curBgr, DECIDER_DIFF_PAIR))
        }
    }
    // `seq` is the decision's frame signature; verify accepts only observations with `obs.seq >= seq`.
    pending =
        PendingVerify(
            ucis = moves.map { uciOf(it) },
            uci = uciOf(moves[0]),
            fen = board.fen(),
            cur = cur,
            curBgr = curBgr,
            frames = 0,
            priorUsed = priorUsed,
            seq = seq,
            startedS = nowS,
            lastTickS = nowS,
            shadowVetoedAtLift = shadowVetoed,
            occludedVetoedAtLift = occludedVetoed,
        )
    // NOT `recoveryConfirmer.reset()`: entering verification is no evidence against what the CNN
    // reads. While `pending` stands the recovery streak freezes rather than restarts — a phantom the
    // diff re-proposed each cycle starved the vote at 1/2 forever (2026-08-08-00-39-57, `a2a4`).
    verifyState = VERIFY_STATE_VERIFYING
    note = candidateNote ?: "checking ${board.sanSequence(moves).joinToString(" + ")} via CNN…"
    return emptyList()
}

/**
 * The verdict of one CNN verification tick; the TYPE lives here because this is the commit seam.
 * **entry.md invariant 10:** [For.replacement] is what makes `cnn_overrule` expressible — without it
 * an overruled move can only be dropped and re-detected, landing a whole cycle late.
 */
internal sealed interface VerifyVerdict {
    data class For(
        val decider: String,
        val replacement: List<Move>? = null,
    ) : VerifyVerdict

    data object Against : VerifyVerdict
}

/**
 * **entry.md invariant 5 — anchoring is path-specific.** The verify path passes the averaged frame the
 * candidate was raised from (the default here), the recovery path the frame the CNN actually looked
 * at. Neither may ever anchor on `lastCur`.
 */
internal class CommitAnchor(
    val cur: GrayImage,
    val curBgr: BgrImage?,
)

/**
 * Commit a positive verdict: the replacement move when the CNN overruled the diff candidate,
 * otherwise the pending candidate itself.
 */
internal fun EngineState.applyVerdict(
    verdict: VerifyVerdict.For,
    pend: PendingVerify,
    anchor: CommitAnchor? = null,
): List<TrackerEvent> {
    val at = anchor ?: CommitAnchor(pend.cur, pend.curBgr)
    val moves = verdict.replacement ?: pendingMoves(pend.ucis)
    if (moves.isNotEmpty()) {
        verdictOutcome = pend.voteOutcome
        verdictShadowVetoed = pend.shadowVetoedAtLift
        verdictOccludedVetoed = pend.occludedVetoedAtLift
    }
    pending = null
    return when {
        moves.isEmpty() -> emptyList()
        moves.size == 1 ->
            listOf(
                commitMove(
                    moves[0],
                    at.cur,
                    at.curBgr,
                    decider = verdict.decider,
                    priorUsed = pend.priorUsed,
                    recovered = verdict.decider == DECIDER_CNN_RECOVERY,
                ),
            )
        else -> listOf(commitSequence(moves, at.cur, at.curBgr, verdict.decider))
    }
}

/** The legal move with this uci in the CURRENT position, or `null`. */
internal fun EngineState.legalMoveFor(uci: String): Move? = board.legalMoves().firstOrNull { uciOf(it) == uci }

/**
 * A pending candidate's ucis as moves, resolved IN SEQUENCE on a detached copy: a pair's second entry
 * is the OPPONENT's reply, legal only after the first was pushed. Matching it against the CURRENT
 * position dropped it, collapsed every pair to one move and baked the reply in — a one-ply desync.
 */
internal fun EngineState.pendingMoves(ucis: List<String>): List<Move> {
    val probe = board.copy()
    val out = mutableListOf<Move>()
    for (uci in ucis) {
        val move = probe.legalMoves().firstOrNull { uciOf(it) == uci } ?: break
        out += move
        probe.push(move)
    }
    return out
}

/** The debug list of squares at or just below `zThr`. */
internal fun topChangedVals(
    z: DoubleArray,
    zThr: Double,
): List<Pair<String, Double>> {
    val soft = zThr * CHANGED_VALS_SOFT_FACTOR
    val out = ArrayList<Pair<String, Double>>()
    for (i in 0 until Squares.COUNT) {
        // The gate reads the UNROUNDED value; only the emitted number is rounded.
        if (z[i] >= soft) out.add(Squares.ALL[i] to Math.rint(z[i] * ROUND_ONE_DECIMAL) / ROUND_ONE_DECIMAL)
    }
    sortByValueDescending(out)
    return if (out.size > CHANGED_VALS_LIMIT) ArrayList(out.subList(0, CHANGED_VALS_LIMIT)) else out
}

/**
 * `String.format` rounds HALF_UP and prints `0.00` where Python prints `-0.00`; this keeps the parity
 * format — HALF_EVEN on an exact `BigDecimal`, sign taken from the raw value.
 */
internal fun pyFixed(
    value: Double,
    scale: Int,
): String {
    val negative = value < 0.0 || (value == 0.0 && 1.0 / value < 0.0)
    val magnitude = BigDecimal(abs(value)).setScale(scale, RoundingMode.HALF_EVEN).toPlainString()
    return (if (negative) "-" else "") + magnitude
}
