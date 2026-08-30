package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move
import kotlin.math.max

/** Python's `-1e9` sentinel for "there is no second-best". */
internal const val NO_SCORE = -1e9

/**
 * Fast play: two half-moves landed inside one settle window. Port of `_pair_candidate`.
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
 * [EngineState.secondScore], because the absolute LL floor reads them.
 */
internal fun EngineState.pairCandidate(
    z: DoubleArray,
    bestSingle: Double,
): Candidate? {
    val soft = config.zThr * PAIR_SOFT_FACTOR
    val viable =
        loglikSequenceScores(board, z, config.zThr, LL_K, maxPlies = FAST_PLIES)
            .filter { sequenceViable(it.first, z, soft) }
    if (viable.isEmpty()) return null
    val (seq, best) = viable[0]
    val second = if (viable.size > 1) viable[1].second else NO_SCORE
    val rival = max(second, bestSingle)
    if (best < 0.0 || best - rival < config.ambiguityMarginLl) return null
    bestScore = best
    secondScore = rival
    return Candidate(moves = seq, priorUsed = false, vote = true)
}

/**
 * The stricter re-filter.
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
private fun EngineState.sequenceViable(
    seq: List<Move>,
    z: DoubleArray,
    soft: Double,
): Boolean {
    var touched = 0L
    var dests = 0L
    for (mv in seq) {
        touched = touched or moveTouchedMask(board, mv)
        dests = dests or moveDestinationMask(board, mv)
        board.push(mv)
    }
    repeat(seq.size) { board.pop() }
    return allAbove(touched, z, soft) && dests and shadowVetoed == 0L
}

/**
 * Wie viele Halbzuege schnelles Spiel hoechstens in einem Blick unterbringt.
 *
 * Drei, seit `f3xe5 c6xe5 d4xe5` als Paar gelesen einen Springer auf d4 erfand, der dort nie
 * stand (gemessen 2026-08-30). Vier waeren der naechste Schritt und brauchen eine eigene Messung.
 */
private const val FAST_PLIES = 3
