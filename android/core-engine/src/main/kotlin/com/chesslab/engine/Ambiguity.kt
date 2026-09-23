package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.move.Move
import java.math.BigDecimal
import java.math.RoundingMode
import kotlin.math.abs

internal const val NOTE_PROMOTION_PENDING = "Promotion detected — please choose piece (Q/R/B/N)"

internal const val NOTE_AMBIGUOUS_PLAIN = "ambiguous change — please move cleanly / wait briefly"

private const val NEAR_NOTE_LIMIT = 3

/** [move] `null` means the FRAME IS HANDLED (promotion pending or ambiguous note) and no hypothesis follows. */
internal class Resolution(
    val move: Move?,
    val priorUsed: Boolean,
)

/** The margin is in LL units, so light-independent. The diff channel cannot tell a queen from a knight: a
 *  promotion tie always asks the UI. The rerank accepts only when its top beats #2 by the FULL margin. */
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

private fun EngineState.resolvePromotion(
    near: List<Pair<Move, Double>>,
    cur: GrayImage,
    curBgr: BgrImage?,
): Resolution {
    raisePromotionPrompt(near[0].first, cur, curBgr)
    return Resolution(null, priorUsed = false)
}

/** Invariante 9 gilt schon hier: beide Aufrufer sitzen vor dem Alarm-Gate, und ein offener Prompt leitet
 *  jeden Snapshot an Erholung und Resync vorbei. */
internal fun EngineState.raisePromotionPrompt(
    move: Move,
    cur: GrayImage,
    curBgr: BgrImage?,
) {
    if (alarm != null) {
        confirmer.reset()
        note = NOTE_ALARM_BLOCKED
        return
    }
    promoPending =
        PromoPending(
            from = Squares.ALL[move.from.ordinal],
            to = Squares.ALL[move.to.ordinal],
            cur = cur,
            curBgr = curBgr,
            fen = board.fen(),
        )
    note = NOTE_PROMOTION_PENDING
}

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

/** `%+.1f` rounds HALF_UP and prints `+0.0` for a small negative; parity wants HALF_EVEN on an exact `BigDecimal`. */
private fun signedOneDecimal(value: Double): String {
    val negative = value < 0.0 || (value == 0.0 && 1.0 / value < 0.0)
    val magnitude = BigDecimal(abs(value)).setScale(1, RoundingMode.HALF_EVEN).toPlainString()
    return (if (negative) "-" else "+") + magnitude
}
