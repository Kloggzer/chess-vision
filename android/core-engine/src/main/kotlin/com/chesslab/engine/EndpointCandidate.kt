package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move

/**
 * The best legal move that is strongly evidenced at its DESTINATION only. Port of
 * `_single_endpoint_candidate`.
 *
 * The origin sits below step 5's both-endpoints viability gate — a low-contrast vacated square
 * (white piece leaving a white square). Exactly **one** square may be strongly changed; with two
 * the evidence is a normal move and this rescue path must not fire.
 *
 * The result is only returned when it is UNAMBIGUOUS: a rival candidate to a *different*
 * destination within [com.chesslab.engine.api.TrackerConfig.ambiguityMarginLl] kills it, while a
 * rival to the SAME destination does not — the CNN then simply confirms this one move.
 *
 * The caller wraps it in a `vote = false` [Candidate]: the CNN verify IS its multi-frame
 * confirmation, so it skips both the confirmer and the absolute LL floor.
 *
 * @param scored the full `loglikScores` ranking, already sorted descending.
 */
internal fun EngineState.singleEndpointCandidate(
    z: DoubleArray,
    scored: List<Pair<Move, Double>>,
): Move? {
    var strong = 0L
    for (i in 0 until Squares.COUNT) {
        if (z[i] >= config.zThr) strong = strong.with(i)
    }
    if (strong.countOneBits() != 1) return null
    val target = java.lang.Long.numberOfTrailingZeros(strong)
    if (shadowVetoed.has(target)) return null
    val cands = scored.filter { (mv, sc) -> mv.to.ordinal == target && sc > 0.0 }
    return if (cands.isEmpty()) null else unambiguousTop(cands, config.ambiguityMarginLl)
}

/**
 * The top candidate, or `null` when a candidate to a DIFFERENT destination is within [margin]
 * of it.
 */
private fun unambiguousTop(
    cands: List<Pair<Move, Double>>,
    margin: Double,
): Move? {
    val (bestMv, bestSc) = cands[0]
    val rival =
        cands.drop(1).any { (mv, sc) ->
            mv.to != bestMv.to && bestSc - sc < margin
        }
    return if (rival) null else bestMv
}
