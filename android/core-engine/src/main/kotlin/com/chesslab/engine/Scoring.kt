package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move

// Log-likelihood scoring of legal moves against the fused per-square z-map.
//
// `p(square changed) = sigmoid(k * (z - zThr))` and `logit(sigmoid(x)) == x`, so a square's
// contribution to a move that "explains" it is `k * (z - zThr)`, clipped so one extremely hot square
// cannot dominate. Hot squares a move does NOT touch therefore penalise it relative to moves that do.

internal const val Z_THR_DEFAULT = 3.0

/**
 * The log-likelihood temperature, and a CONSTANT: it scales every per-square logit, so it silently
 * rescales `ambiguityMarginLl`, `commitLlFloor` and `reanchorLlFloor` together — three knobs tuned
 * against incidents measured at this scale. Changing it means re-deriving those three, not a dial turn.
 */
internal const val LL_K = 1.0

internal const val LOGIT_CLIP = 12.0

/** The soft gate when the caller passes none. */
internal const val PAIR_SOFT_FACTOR = 0.5

/** Was ein Paar ist, und die kuerzeste Sequenz, die als Kandidat zaehlt. */
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

/**
 * Per legal move: the sum of [logits] over its touched squares, sorted DESCENDING. Stable sort, no
 * secondary key — equal scores are NOT order-comparable across implementations that enumerate the
 * legal moves in a different order.
 */
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

/**
 * LL score for MOVE PAIRS — die Naht, an der `ScoringTest` gegen die Python-Fixtures prueft.
 * Der ausgelieferte Pfad ruft `loglikSequenceScores` direkt; der Wrapper haelt die Paritaet
 * an genau der Form fest, die Python rechnet.
 */
internal fun loglikPairScores(
    g: Game,
    z: DoubleArray,
    zThr: Double = Z_THR_DEFAULT,
    k: Double = LL_K,
    soft: Double? = null,
): List<Pair<List<Move>, Double>> = loglikSequenceScores(g, z, zThr, k, soft, PAIR_PLIES)

/**
 * Dasselbe fuer bis zu [maxPlies] Halbzuege, jenseits von zwei nur der Abtausch auf DEMSELBEN Zielfeld:
 * `f3xe5 c6xe5 d4xe5` als Paar gelesen erfindet eine Figur, frei gesucht erfand die dritte Ebene ein
 * `Rg1` statt `Bc4 Bc5 O-O` (2026-08-30).
 */
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
        // From the third ply on ONLY the exchange on the same square: a free search invented
        // `Rg1` for `Bc4 Bc5 O-O` — more squares explained, still wrong.
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
            // Leaves need only their touched squares, computed in the parent position.
            // Avoid validating and mutating chesslib for a recursion that immediately returns.
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

/**
 * A stable, purely numeric descending sort with NO secondary key. Never add a tie-break and never use
 * `sortedByDescending` — the key negation keeps `-0.0` behind `0.0` where a comparator on the raw value
 * would not.
 */
internal fun <T> sortByValueDescending(scored: MutableList<Pair<T, Double>>) {
    scored.sortWith { a, b ->
        when {
            a.second < b.second -> 1
            a.second > b.second -> -1
            else -> 0
        }
    }
}
