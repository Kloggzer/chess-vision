package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move

// Log-likelihood scoring of legal moves against the fused per-square z-map.
//
// Python reference: `loglik_scores` and `loglik_pair_scores`.
//
// `p(square changed) = sigmoid(k * (z - zThr))` and `logit(sigmoid(x)) == x`, so a square's
// contribution to a move that "explains" it is directly `k * (z - zThr)`, clipped to +/-12 so
// one extremely hot square cannot dominate. Hot squares a move does NOT touch therefore
// penalise it relative to moves that do.

/** `zThr` default of `config.TRACK_DEFAULTS`. */
internal const val Z_THR_DEFAULT = 3.0

/**
 * The log-likelihood temperature — `ll_k` of the `MoveTracker` constructor, and a CONSTANT.
 *
 * It scales every per-square logit, so it silently rescales `ambiguityMarginLl`, `commitLlFloor`
 * and `reanchorLlFloor` together — three knobs whose own thresholds were tuned against incidents
 * measured at this scale (`f6h5 @ 0.44`, `h2h4 + Be7` against a fabricated `Nf3 + Be7`). Python
 * exposes it on the constructor only: no CLI flag, not in `TRACK_DEFAULTS`, and 1.0 in all 18
 * parity fixtures. It was a `TrackerConfig` field with a slider until 2026-08-02, which offered a
 * user the one edit that invalidates three other calibrated numbers at once and reads as none of
 * them. Changing it means re-deriving those three, not turning a dial.
 */
internal const val LL_K = 1.0

/** `np.clip(..., -12.0, 12.0)`. */
internal const val LOGIT_CLIP = 12.0

/** `soft = z_thr * 0.5` when the caller passes none. */
internal const val PAIR_SOFT_FACTOR = 0.5

/** `logit = clip(k * (z - zThr), -12, +12)` per square. */
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
 * Per legal move: the sum of [logits] over [moveTouchedSquares]. Sorted DESCENDING; empty when
 * there is no legal move.
 *
 * The sort is stable and has no secondary key, exactly like Python's
 * `scored.sort(key=lambda t: -t[1])`. chesslib and python-chess enumerate legal moves in
 * different orders, so equal scores are NOT order-comparable across the two implementations.
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
 * LL score for MOVE PAIRS (half-move + reply) — rescues fast play without a CNN.
 *
 * The order of the two plies is fixed by side-to-move; there is no second ordering. Only pairs
 * whose from AND to endpoints both carry at least weak evidence (`z >= soft`) are candidates —
 * the gate looks at the endpoints ONLY, never at the full touched set. The score sums the
 * logits over the UNION of both plies' touched squares, so a shared square counts once.
 */
internal fun loglikPairScores(
    g: Game,
    z: DoubleArray,
    zThr: Double = Z_THR_DEFAULT,
    k: Double = LL_K,
    soft: Double? = null,
): List<Pair<List<Move>, Double>> {
    val cut = soft ?: zThr * PAIR_SOFT_FACTOR
    val logit = logits(z, zThr, k)
    val first = IntArray(TOUCHED_MAX)
    val second = IntArray(TOUCHED_MAX)
    val scored = ArrayList<Pair<List<Move>, Double>>()
    for (mv1 in g.legalMoves()) {
        if (!endpointsOk(z, mv1, cut)) continue
        val n1 = moveTouchedIndices(g, mv1, first)
        g.push(mv1)
        for (mv2 in g.legalMoves()) {
            // mv1's target square may be reused by mv2 (capture exchange) — mv2's endpoint
            // evidence still counts, but the shared square is only summed once.
            if (!endpointsOk(z, mv2, cut)) continue
            val n2 = moveTouchedIndices(g, mv2, second)
            scored.add(listOf(mv1, mv2) to unionSum(logit, first, n1, second, n2))
        }
        g.pop()
    }
    sortByValueDescending(scored)
    return scored
}

/** Sum of the logits over the UNION of two index runs — a shared square counts once. */
private fun unionSum(
    logit: DoubleArray,
    first: IntArray,
    firstSize: Int,
    second: IntArray,
    secondSize: Int,
): Double {
    var sum = 0.0
    for (i in 0 until firstSize) sum += logit[first[i]]
    for (i in 0 until secondSize) {
        if (!containsIndex(first, firstSize, second[i])) sum += logit[second[i]]
    }
    return sum
}

private fun containsIndex(
    values: IntArray,
    size: Int,
    needle: Int,
): Boolean {
    for (i in 0 until size) {
        if (values[i] == needle) return true
    }
    return false
}

private fun endpointsOk(
    z: DoubleArray,
    mv: Move,
    soft: Double,
): Boolean = z[mv.from.ordinal] >= soft && z[mv.to.ordinal] >= soft

/**
 * Python's `sort(key=lambda t: -score)`: a stable, purely numeric descending sort with NO
 * secondary key. Never add a tie-break, and never `sortedByDescending` — Python has no tie-break,
 * and its key negation keeps `-0.0` behind `0.0` where a comparator on the raw value would not
 * (STATUS D02a-10).
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
