package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move
import kotlin.math.max

/** Python's `-1e9` sentinel for "there is no second-best" (`tracker.py:2947`, `:3306`). */
internal const val NO_SCORE = -1e9

/**
 * Fast play: two half-moves landed inside one settle window. Port of `_pair_candidate`
 * (`tracker.py:3279-3311`).
 *
 * A pair is accepted only when the best pair is clearly ahead of BOTH the second-best pair and the
 * best single move (`ambiguityMarginLl`), and only after a viability re-filter that is STRICTER
 * than step 5's: every touched square of **both** halves needs at least soft evidence
 * (`z >= zThr * 0.5`), and neither half may land on a shadow-vetoed square.
 *
 * Live evidence for the strict gate: `h2h4 + Be7` (h2 decayed to 1.3) lost to a fabricated
 * `Nf3 + Be7` whose g1/f3 "evidence" was 1.2/1.4 sensor noise — a move that was never played.
 *
 * On accept the pair's scores are written back to [EngineState.bestScore] /
 * [EngineState.secondScore] (`:3310`), because 03d's absolute LL floor reads them.
 */
internal fun EngineState.pairCandidate(
    z: Map<String, Double>,
    bestSingle: Double,
    shadowVeto: Set<String>,
): Candidate? {
    // Single exit: detekt's ReturnCount caps a function at two returns (STATUS D03a-7).
    var out: Candidate? = null
    val soft = config.zThr * PAIR_SOFT_FACTOR
    val viable =
        loglikPairScores(board, z, config.zThr, config.llK)
            .filter { pairViable(it.first, z, soft, shadowVeto) }
    if (viable.isNotEmpty()) {
        val (seq, best) = viable[0]
        val second = if (viable.size > 1) viable[1].second else NO_SCORE
        val rival = max(second, bestSingle)
        if (best >= 0.0 && best - rival >= config.ambiguityMarginLl) {
            bestScore = best
            secondScore = rival
            out = Candidate(moves = seq, priorUsed = false, vote = true)
        }
    }
    return out
}

/**
 * The stricter re-filter of `tracker.py:3293-3302`.
 *
 * The **second** half is evaluated on the INTERMEDIATE board (after the first half was pushed) —
 * on the pre-push board its touched/destination squares would be wrong whenever the reply
 * captures, castles or en-passants into the position the first half created.
 *
 * Python copies the board (`copy(stack=False)`); this port pushes and pops the live [Game]
 * instead. chesslib restores the complete state in `undoMove` and neither move generation nor
 * the square derivation reads the move stack, so the result is identical without a FEN reparse
 * per pair (same rationale as STATUS D02a-8).
 */
private fun EngineState.pairViable(
    seq: List<Move>,
    z: Map<String, Double>,
    soft: Double,
    shadowVeto: Set<String>,
): Boolean {
    val (mv1, mv2) = seq
    var touched = moveTouchedSquares(board, mv1)
    var dests = moveDestinationSquares(board, mv1)
    board.push(mv1)
    touched = touched + moveTouchedSquares(board, mv2)
    dests = dests + moveDestinationSquares(board, mv2)
    board.pop()
    return touched.all { (z[it] ?: 0.0) >= soft } && dests.none { it in shadowVeto }
}
