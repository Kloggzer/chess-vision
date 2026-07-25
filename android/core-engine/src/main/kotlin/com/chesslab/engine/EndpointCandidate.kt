package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move

/**
 * The best legal move that is strongly evidenced at its DESTINATION only. Port of
 * `_single_endpoint_candidate` (`tracker.py:3355-3375`).
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
    z: Map<String, Double>,
    scored: List<Pair<Move, Double>>,
    shadowVeto: Set<String>,
): Move? {
    // Exactly TWO returns — detekt's ReturnCount cap (STATUS D03a-7).
    val strong = Squares.ALL.filter { (z[it] ?: 0.0) >= config.zThr }
    if (strong.size != 1) return null
    val target = strong[0]
    val cands =
        scored.filter { (mv, sc) ->
            val to = Squares.ALL[mv.to.ordinal]
            to == target && sc > 0.0 && to !in shadowVeto
        }
    return if (cands.isEmpty()) null else unambiguousTop(cands, config.ambiguityMarginLl)
}

/**
 * `tracker.py:3371-3374` — the top candidate, or `null` when a candidate to a DIFFERENT
 * destination is within [margin] of it.
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
