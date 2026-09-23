package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.move.Move
import java.math.BigDecimal
import java.math.RoundingMode
import kotlin.math.abs

internal const val NOTE_ALARM_BLOCKED =
    "board desynced (ILLEGAL MOVE alarm) — no moves committed until take-back or resync"

private const val CHANGED_VALS_LIMIT = 8

private const val CHANGED_VALS_SOFT_FACTOR = 0.5

private const val ROUND_ONE_DECIMAL = 10.0

/** The ONE commit gate for every candidate kind. **Invariant 9 — the alarm blocks EVERYTHING**: under the
 *  latch every diff-vs-reference reading is fiction; only take-back/resync/recovery clears it. */
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
    // NOT `recoveryConfirmer.reset()`: verification is no evidence against the CNN. The streak freezes while
    // `pending` stands — a phantom re-proposed each cycle starved the vote at 1/2 forever.
    verifyState = VERIFY_STATE_VERIFYING
    note = candidateNote ?: "checking ${board.sanSequence(moves).joinToString(" + ")} via CNN…"
    return emptyList()
}

/** **Invariant 10:** [For.replacement] makes `cnn_overrule` expressible — otherwise an overruled move is
 *  dropped and re-detected a whole cycle late. */
internal sealed interface VerifyVerdict {
    data class For(
        val decider: String,
        val replacement: List<Move>? = null,
    ) : VerifyVerdict
}

/** **Invariant 5 — anchoring is path-specific**: verify anchors on the averaged candidate frame (default),
 *  recovery on the frame the CNN looked at. Never on `lastCur`. */
internal class CommitAnchor(
    val cur: GrayImage,
    val curBgr: BgrImage?,
)

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

internal fun EngineState.legalMoveFor(uci: String): Move? = board.legalMoves().firstOrNull { uciOf(it) == uci }

/** Resolved IN SEQUENCE on a copy: a pair's second entry is the reply, legal only after the first. Matched
 *  against the CURRENT position it dropped, and the pair collapsed into a one-ply desync. */
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

/** `String.format` rounds HALF_UP and prints `0.00` where Python prints `-0.00`: HALF_EVEN on an exact
 *  `BigDecimal`, sign from the raw value. */
internal fun pyFixed(
    value: Double,
    scale: Int,
): String {
    val negative = value < 0.0 || (value == 0.0 && 1.0 / value < 0.0)
    val magnitude = BigDecimal(abs(value)).setScale(scale, RoundingMode.HALF_EVEN).toPlainString()
    return (if (negative) "-" else "") + magnitude
}
