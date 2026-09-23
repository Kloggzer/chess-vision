package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move
import kotlin.math.max

internal const val NO_SCORE = -1e9

/** Clearly ahead of the second pair AND the best single, past a re-filter STRICTER than step 5's —
 *  `h2h4 + Be7` lost to a fabricated `Nf3 + Be7` built on 1.2/1.4 sensor noise. */
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

/** A capture target is occupied before AND after, so the keep-alive reads it as a hand and zeroes it; a
 *  detect inside the commit hold then lost Kxd8 + Rxd3+ to the single. Restored for pair scoring only. */
private fun EngineState.captureTargetsRestored(z: DoubleArray): DoubleArray {
    // Dieselbe Stellung: hier wird Evidenz ERZEUGT, eine Lesung von davor hob sonst ein leeres Feld auf `zThr`.
    val snap = freshSnapshot()?.takeIf { it.fen == board.fen() } ?: return z
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

/** The **second** half is evaluated on the INTERMEDIATE board, or a reply that captures, castles or takes en
 *  passant has the wrong squares. */
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

/** Drei, seit `f3xe5 c6xe5 d4xe5` als Paar gelesen einen Springer erfand; vier brauchen eine eigene Messung. */
private const val FAST_PLIES = 3
