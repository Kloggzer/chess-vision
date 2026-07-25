package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.move.Move
import java.math.BigDecimal
import java.math.RoundingMode
import kotlin.math.abs

/** `tracker.py:3258` — the UI turns this note into the Q/R/B/N dialog. */
internal const val NOTE_PROMOTION_PENDING = "Promotion detected — please choose piece (Q/R/B/N)"

/** `tracker.py:3274` — ambiguous without the prior. */
internal const val NOTE_AMBIGUOUS_PLAIN = "ambiguous change — please move cleanly / wait briefly"

/** `near[:3]` — the ambiguity note lists at most three candidates (`tracker.py:3271`). */
private const val NEAR_NOTE_LIMIT = 3

/**
 * Outcome of the ambiguity gate.
 *
 * [move] `null` means the FRAME IS HANDLED (promotion pending, or an ambiguous note was set) and
 * `generateHypothesis` returns `null`. Otherwise [move] is the resolved candidate — either the
 * unchanged `obsMove`, the queen promotion variant (with CNN), or the prior's rerank winner.
 */
internal class Resolution(
    val move: Move?,
    val priorUsed: Boolean,
)

/**
 * The ambiguity gate, the promotion special case and the prior rerank. Port of
 * `tracker.py:3245-3276`.
 *
 * The margin is in LL units and therefore light-independent. Three mutually exclusive branches:
 *
 * 1. **Promotion** — all near candidates are promo variants of the same from/to. The diff channel
 *    fundamentally cannot tell a queen from a knight, so without CNN the UI is asked
 *    ([EngineState.promoPending]) and with CNN the best variant (queen) is passed through for
 *    verify to correct via the target square's label. This branch NEVER runs the prior rerank.
 * 2. **Prior rerank** (`usePrior`) — the near set is rescored with `movePrior` and accepted only
 *    when the reranked top beats #2 by the FULL margin. A single near candidate can never pass:
 *    the guard is `size > 1`, so the margin check cannot be skipped.
 * 3. **Plain** — a note, no candidate.
 */
internal fun EngineState.resolveAmbiguity(
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
): Resolution {
    // Single exit: detekt's ReturnCount caps a function at two returns (STATUS D03a-7).
    var out = Resolution(moves.obsMove, priorUsed = false)
    if (moves.best - moves.second < config.ambiguityMarginLl) {
        val near = moves.viable.filter { moves.best - it.second < config.ambiguityMarginLl }
        out =
            when {
                isPromotionTie(near) -> resolvePromotion(near, cur, curBgr, moves.obsMove)
                config.usePrior -> rerankWithPrior(near)
                else -> {
                    confirmer.reset()
                    note = NOTE_AMBIGUOUS_PLAIN
                    Resolution(null, priorUsed = false)
                }
            }
    }
    return out
}

/** `all(mv.promotion …)` **and** exactly one `(from, to)` pair (`tracker.py:3252-3253`). */
private fun isPromotionTie(near: List<Pair<Move, Double>>): Boolean =
    near.all { it.first.promotion != null && it.first.promotion != Piece.NONE } &&
        near.map { it.first.from to it.first.to }.toSet().size == 1

/**
 * `tracker.py:3254-3261`. Without CNN the promotion waits for `choosePromotion` (03d); with CNN
 * the caller falls through with the best variant (queen) and verify corrects it via the label.
 */
private fun EngineState.resolvePromotion(
    near: List<Pair<Move, Double>>,
    cur: GrayImage,
    curBgr: BgrImage?,
    obsMove: Move?,
): Resolution {
    val out: Resolution
    if (!cnnOn) {
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
        out = Resolution(null, priorUsed = false)
    } else {
        // With CNN: pass the best variant through; verify corrects it via the target square label.
        out = Resolution(obsMove, priorUsed = false)
    }
    return out
}

/** `tracker.py:3262-3272` — `movePrior` (02a) breaks the near-tie, or the frame stays ambiguous. */
private fun EngineState.rerankWithPrior(near: List<Pair<Move, Double>>): Resolution {
    val rescored =
        near
            .map { (mv, s) -> mv to s + movePrior(board, mv) }
            .toMutableList()
    // Python's `sorted(key=lambda t: -t[1])`: stable, purely numeric, no tie-break (D02a-10).
    rescored.sortWith { a, b ->
        when {
            a.second < b.second -> 1
            a.second > b.second -> -1
            else -> 0
        }
    }
    val out: Resolution
    if (rescored.size > 1 && rescored[0].second - rescored[1].second >= config.ambiguityMarginLl) {
        out = Resolution(rescored[0].first, priorUsed = true)
    } else {
        confirmer.reset()
        note = ambiguousNote(near)
        out = Resolution(null, priorUsed = false)
    }
    return out
}

/** `"ambiguous: Nbd2 (+3.1) / Nfd2 (+2.4) — please move cleanly / wait briefly"`. */
private fun EngineState.ambiguousNote(near: List<Pair<Move, Double>>): String {
    val listed =
        near.take(NEAR_NOTE_LIMIT).joinToString(" / ") { (mv, s) ->
            "${board.san(mv)} (${signedOneDecimal(s)})"
        }
    return "ambiguous: $listed — please move cleanly / wait briefly"
}

/**
 * Python's `f"{s:+.1f}"`.
 *
 * `String.format("%+.1f", …)` would round HALF_UP on the exact decimal value of the double while
 * Python rounds HALF_EVEN, and it would print `+0.0` for a small negative value where Python
 * prints `-0.0`. Both are reproduced here: the sign comes from the raw value, the magnitude from
 * an exact `BigDecimal` with `HALF_EVEN`.
 */
private fun signedOneDecimal(value: Double): String {
    val negative = value < 0.0 || (value == 0.0 && 1.0 / value < 0.0)
    val magnitude = BigDecimal(abs(value)).setScale(1, RoundingMode.HALF_EVEN).toPlainString()
    return (if (negative) "-" else "+") + magnitude
}
