package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move

// `p(changed) = sigmoid(k * (z - zThr))` and `logit(sigmoid(x)) == x`, so a square adds `k * (z - zThr)`,
// clipped so one very hot square cannot dominate. Hot squares a move does NOT touch penalise it.

internal const val Z_THR_DEFAULT = 3.0

/** A CONSTANT: it rescales `ambiguityMarginLl`, `commitLlFloor` and `reanchorLlFloor` together — changing it
 *  means re-deriving all three, not a dial turn. */
internal const val LL_K = 1.0

internal const val LOGIT_CLIP = 12.0

internal const val PAIR_SOFT_FACTOR = 0.5

internal const val PAIR_PLIES = 2

/** Deckel gegen den Suchbaum; [endpointsOk] beschneidet ihn ohnehin auf die bewegten Felder. */
private const val SEQUENCE_NODE_CAP = 4000

internal fun logits(
    z: DoubleArray,
    zThr: Double,
    k: Double,
    out: DoubleArray = DoubleArray(Squares.COUNT),
): DoubleArray {
    require(z.size == Squares.COUNT) { "z size ${z.size} != ${Squares.COUNT}" }
    for (i in 0 until Squares.COUNT) {
        out[i] = (k * (z[i] - zThr)).coerceIn(-LOGIT_CLIP, LOGIT_CLIP)
    }
    return out
}

/** Stable sort, NO secondary key: equal scores are not order-comparable across implementations that
 *  enumerate moves differently. */
internal fun loglikScores(
    g: Game,
    z: DoubleArray,
    zThr: Double = Z_THR_DEFAULT,
    k: Double = LL_K,
): List<Pair<Move, Double>> {
    val moves = g.legalMoves()
    if (moves.isEmpty()) return emptyList()
    val logit = logits(z, zThr, k)
    val touched = IntArray(TOUCHED_MAX)
    val scored = ArrayList<Pair<Move, Double>>(moves.size)
    for (mv in moves) {
        val n = moveTouchedIndices(g, mv, touched)
        var sum = 0.0
        for (i in 0 until n) sum += logit[touched[i]]
        scored.add(mv to sum)
    }
    sortByValueDescending(scored)
    return scored
}

/** Die Naht, an der `ScoringTest` gegen die Python-Fixtures prueft; der ausgelieferte Pfad ruft
 *  `loglikSequenceScores` direkt. */
internal fun loglikPairScores(
    g: Game,
    z: DoubleArray,
    zThr: Double = Z_THR_DEFAULT,
    k: Double = LL_K,
    soft: Double? = null,
): List<Pair<List<Move>, Double>> = loglikSequenceScores(g, z, zThr, k, soft, PAIR_PLIES)

/** Jenseits von zwei nur der Abtausch auf DEMSELBEN Feld: frei gesucht erfand die dritte Ebene `Rg1` statt `Bc4 Bc5 O-O`. */
internal fun loglikSequenceScores(
    g: Game,
    z: DoubleArray,
    zThr: Double = Z_THR_DEFAULT,
    k: Double = LL_K,
    soft: Double? = null,
    maxPlies: Int = PAIR_PLIES,
): List<Pair<List<Move>, Double>> {
    val cut = soft ?: zThr * PAIR_SOFT_FACTOR
    val logit = logits(z, zThr, k)
    val scored = ArrayList<Pair<List<Move>, Double>>()
    val buffer = IntArray(TOUCHED_MAX)
    var nodes = 0

    fun walk(
        path: MutableList<Move>,
        claimed: Long,
    ) {
        if (path.size >= maxPlies || nodes > SEQUENCE_NODE_CAP) return
        val sameSquare = if (path.size >= PAIR_PLIES) path.last().to else null
        for (mv in g.legalMoves()) {
            if (!endpointsOk(z, mv, cut) || (sameSquare != null && mv.to != sameSquare)) continue
            nodes += 1
            val n = moveTouchedIndices(g, mv, buffer)
            // A shared square counts once — the exchange on one square is exactly that case.
            var union = claimed
            for (i in 0 until n) union = union.with(buffer[i])
            path.add(mv)
            if (path.size >= PAIR_PLIES) {
                var score = 0.0
                union.forEachSquare { score += logit[it] }
                scored.add(path.toList() to score)
            }
            // Leaves need only their touched squares, computed in the parent: no chesslib mutation for them.
            if (path.size < maxPlies) {
                g.push(mv)
                try {
                    walk(path, union)
                } finally {
                    g.pop()
                }
            }
            path.removeAt(path.size - 1)
        }
    }
    walk(ArrayList(), 0L)
    sortByValueDescending(scored)
    return scored
}

private fun endpointsOk(
    z: DoubleArray,
    mv: Move,
    soft: Double,
): Boolean = z[mv.from.ordinal] >= soft && z[mv.to.ordinal] >= soft

/** NO secondary key, never `sortedByDescending`: the key negation keeps `-0.0` behind `0.0`. */
internal fun <T> sortByValueDescending(scored: MutableList<Pair<T, Double>>) {
    scored.sortWith { a, b ->
        when {
            a.second < b.second -> 1
            a.second > b.second -> -1
            else -> 0
        }
    }
}
