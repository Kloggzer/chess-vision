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

/** `_changed_vals` keeps the strongest 8 squares. */
private const val CHANGED_VALS_LIMIT = 8

/** The `z_thr * 0.5` soft gate of the `_changed_vals` debug list. */
private const val CHANGED_VALS_SOFT_FACTOR = 0.5

/** Python's `round(v, 1)` — one decimal, half-to-EVEN. */
private const val ROUND_ONE_DECIMAL = 10.0

/**
 * Step 9 — the ONE commit gate for every candidate kind (`_dispatch`).
 *
 * With CNN verify the candidate becomes pending and must survive occupancy verification (single
 * AND pair); without CNN it commits directly. The pair path does NOT get a shortcut: it arrived
 * here through the same LL floor, motion gate and confirmer as every single move.
 *
 * **entry.md invariant 9 — the alarm blocks EVERYTHING.** When the desync latch is set, the game
 * state provably mismatches the physical board, so every diff-vs-reference interpretation is
 * fiction (the d4->b3 incident: moving a rogue piece between two illegal positions committed a
 * plausible pawn push). Only alarm resolution moves the state: take-back, user resync, or a CNN
 * recovery sequence that resolves ALL conflict squares.
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
    // `seq` is the decision's frame signature — the newest frame in the averaged buffer. Phase 04's
    // verify accepts only observations with `obs.seq >= seq` (Spec 11).
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
        )
    // NOT `recoveryConfirmer.reset()`. A candidate merely ENTERING verification is no evidence
    // against what the CNN reads; only a commit is, and `clearStuck` already resets there. While
    // `pending` stands every observation goes to the verify ladder, so the recovery streak freezes
    // rather than restarts — a phantom the diff re-proposes each cycle used to starve the vote at
    // 1/2 forever (2026-08-08-00-39-57, `a2a4` against the CNN's correct `c3e4`).
    verifyState = VERIFY_STATE_VERIFYING
    note = candidateNote ?: "checking ${board.sanSequence(moves).joinToString(" + ")} via CNN…"
    return emptyList()
}

/**
 * The verdict of one CNN verification tick. Phase 04 owns the ladders that produce it; the TYPE is
 * declared here because it is the commit seam.
 *
 * **entry.md invariant 10:** [For.replacement] is what makes Python's `cnn_overrule` expressible.
 * The legacy port had no such field, so an overruled move could only be dropped and re-detected —
 * the real move landed a whole cycle late.
 */
internal sealed interface VerifyVerdict {
    data class For(
        val decider: String,
        val replacement: List<Move>? = null,
    ) : VerifyVerdict

    data object Against : VerifyVerdict
}

/**
 * The frame a verified commit anchors its new reference on.
 *
 * **entry.md invariant 5 — anchoring is path-specific.** The verify path passes `pending.cur` /
 * `pending.curBgr` (the averaged frame the candidate was raised from, the default here); the
 * recovery path passes `snap.gray` / `snap.warped` (the frame the CNN actually looked at). Neither
 * may ever anchor on `lastCur`.
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
    if (moves.isNotEmpty()) verdictOutcome = pend.voteOutcome
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
 * A pending candidate's ucis as moves — resolved IN SEQUENCE, not all against the current position.
 *
 * `_pending_ucis` is a list of one or two: for a pair (fast play) the second entry is the
 * OPPONENT's reply, generated on the board after the first was pushed. In the pre-move position its
 * from-square still holds an enemy piece, so `legalMoveFor` — legal in the CURRENT position —
 * always returned null for it. `mapNotNull` then silently dropped the reply, every pair collapsed
 * to `size == 1`, `VerifyPair.tick` became unreachable, and the commit anchored the reference on a
 * frame that already showed BOTH half-moves: the reply was baked into the reference and could never
 * be detected again. A silent, permanent one-ply desync, on the path built to prevent exactly that,
 * and only with the CNN attached (`pairBeforeSingle` runs `if (cnnOn)`).
 *
 * Python does not filter at all — `[chess.Move.from_uci(u) for u in ...]` (`tracker.py:2194`).
 * Resolving against a detached copy, pushing as we go, is the same thing without hand-building a
 * `Move` and guessing its promotion piece: each uci is matched where it was generated.
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

/** `_changed_vals`: the debug list of squares at or just below `z_thr`. */
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
 * Python's `f"{value:.<scale>f}"`.
 *
 * `String.format` rounds HALF_UP on the exact decimal value of the double while Python rounds
 * HALF_EVEN, and it prints `0.00` where Python prints `-0.00`. Both are reproduced: the sign comes
 * from the raw value, the magnitude from an exact `BigDecimal`.
 */
internal fun pyFixed(
    value: Double,
    scale: Int,
): String {
    val negative = value < 0.0 || (value == 0.0 && 1.0 / value < 0.0)
    val magnitude = BigDecimal(abs(value)).setScale(scale, RoundingMode.HALF_EVEN).toPlainString()
    return (if (negative) "-" else "") + magnitude
}
