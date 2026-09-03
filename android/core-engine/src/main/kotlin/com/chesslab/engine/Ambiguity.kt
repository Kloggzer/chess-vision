package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.move.Move
import java.math.BigDecimal
import java.math.RoundingMode
import kotlin.math.abs

/** The UI turns this note into the Q/R/B/N dialog. */
internal const val NOTE_PROMOTION_PENDING = "Promotion detected — please choose piece (Q/R/B/N)"

/** Ambiguous without the prior. */
internal const val NOTE_AMBIGUOUS_PLAIN = "ambiguous change — please move cleanly / wait briefly"

/** The ambiguity note lists at most three candidates. */
private const val NEAR_NOTE_LIMIT = 3

/**
 * Outcome of the ambiguity gate. [move] `null` means the FRAME IS HANDLED (promotion pending, or an
 * ambiguous note was set) and `generateHypothesis` returns `null`.
 */
internal class Resolution(
    val move: Move?,
    val priorUsed: Boolean,
)

/**
 * The ambiguity gate, the promotion special case and the prior rerank; the margin is in LL units and so
 * light-independent. The diff channel cannot tell a queen from a knight, so a promotion tie always asks
 * the UI and never reranks. The rerank accepts only when its top beats #2 by the FULL margin.
 */
internal fun EngineState.resolveAmbiguity(
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
): Resolution {
    if (moves.best - moves.second >= config.ambiguityMarginLl) return Resolution(moves.obsMove, priorUsed = false)
    val near = moves.viable.filter { moves.best - it.second < config.ambiguityMarginLl }
    return when {
        isPromotionTie(near) -> resolvePromotion(near, cur, curBgr)
        config.usePrior -> rerankWithPrior(near)
        else -> {
            confirmer.reset()
            note = NOTE_AMBIGUOUS_PLAIN
            Resolution(null, priorUsed = false)
        }
    }
}

private fun isPromotionTie(near: List<Pair<Move, Double>>): Boolean =
    near.all { it.first.promotion != null && it.first.promotion != Piece.NONE } &&
        near.map { it.first.from to it.first.to }.toSet().size == 1

/**
 * Every promotion waits for `choosePromotion`. An identity-capable CNN may call the same public
 * path after stable high-confidence observations; otherwise the Q/R/B/N dialog remains open.
 */
private fun EngineState.resolvePromotion(
    near: List<Pair<Move, Double>>,
    cur: GrayImage,
    curBgr: BgrImage?,
): Resolution {
    val mv = near[0].first
    promoPending =
        PromoPending(
            from = Squares.ALL[mv.from.ordinal],
            to = Squares.ALL[mv.to.ordinal],
            cur = cur,
            curBgr = curBgr,
            fen = board.fen(),
        )
    note = NOTE_PROMOTION_PENDING
    return Resolution(null, priorUsed = false)
}

/** `movePrior` breaks the near-tie, or the frame stays ambiguous. */
private fun EngineState.rerankWithPrior(near: List<Pair<Move, Double>>): Resolution {
    val rescored = near.mapTo(ArrayList(near.size)) { (mv, s) -> mv to s + movePrior(board, mv) }
    sortByValueDescending(rescored)
    if (rescored.size > 1 && rescored[0].second - rescored[1].second >= config.ambiguityMarginLl) {
        return Resolution(rescored[0].first, priorUsed = true)
    }
    confirmer.reset()
    note = ambiguousNote(near)
    return Resolution(null, priorUsed = false)
}

private fun EngineState.ambiguousNote(near: List<Pair<Move, Double>>): String {
    val listed =
        near.take(NEAR_NOTE_LIMIT).joinToString(" / ") { (mv, s) ->
            "${board.san(mv)} (${signedOneDecimal(s)})"
        }
    return "ambiguous: $listed — please move cleanly / wait briefly"
}

/**
 * `String.format("%+.1f", …)` rounds HALF_UP and prints `+0.0` for a small negative; this keeps the
 * parity format — HALF_EVEN on an exact `BigDecimal`, sign taken from the raw value.
 */
private fun signedOneDecimal(value: Double): String {
    val negative = value < 0.0 || (value == 0.0 && 1.0 / value < 0.0)
    val magnitude = BigDecimal(abs(value)).setScale(1, RoundingMode.HALF_EVEN).toPlainString()
    return (if (negative) "-" else "+") + magnitude
}
