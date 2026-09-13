package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move
import kotlin.math.max

/** Sentinel for "there is no second-best". */
internal const val NO_SCORE = -1e9

/**
 * Fast play: two half-moves inside one settle window, accepted only when the best pair is clearly ahead
 * of both the second-best pair and the best single, and only past a viability re-filter STRICTER than
 * step 5's — `h2h4 + Be7` lost to a fabricated `Nf3 + Be7` built on 1.2/1.4 sensor noise.
 */
internal fun EngineState.pairCandidate(
    z: DoubleArray,
    bestSingle: Double,
): Candidate? {
    val soft = config.zThr * PAIR_SOFT_FACTOR
    val banned = rejectedPair?.takeIf { rejectedPairFen == board.fen() }
    val zp = captureTargetsRestored(z)
    val viable =
        loglikSequenceScores(board, zp, config.zThr, LL_K, maxPlies = FAST_PLIES)
            .filter { sequenceViable(it.first, zp, soft) && it.first.joinToString(" ") { m -> uciOf(m) } != banned }
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
 * A capture target is occupied before AND after, so the keep-alive's occupancy filter reads it as a
 * hand and zeroes it; a detect inside the keep-alive (the commit hold, 133 ms) then loses the pair
 * Kxd8 + Rxd3+ to the single (21-29-35, 2026-09-13). For pair scoring only, such a square keeps
 * the threshold's worth of evidence when the fresh observation reads it confidently occupied.
 */
private fun EngineState.captureTargetsRestored(z: DoubleArray): DoubleArray {
    val snap = freshSnapshot() ?: return z
    var restored = 0L
    keepaliveTainted.forEachSquare { i ->
        val name = Squares.ALL[i]
        val readOccupied = snap.obs.confident(name, config.cnnConfThr) && snap.obs.occupied(name)
        if (board.pieceCharAt(name) != null && readOccupied) restored = restored.with(i)
    }
    if (restored == 0L) return z
    val out = z.copyOf()
    restored.forEachSquare { out[it] = max(out[it], config.zThr) }
    return out
}

/**
 * The stricter re-filter. The **second** half is evaluated on the INTERMEDIATE board: on the pre-push
 * board its touched/destination squares would be wrong whenever the reply captures, castles or
 * en-passants into the position the first half created.
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
 * Wie viele Halbzuege schnelles Spiel hoechstens in einem Blick unterbringt. Drei, seit `f3xe5 c6xe5
 * d4xe5` als Paar gelesen einen Springer auf d4 erfand, der dort nie stand (2026-08-30); vier
 * brauchen eine eigene Messung.
 */
private const val FAST_PLIES = 3
