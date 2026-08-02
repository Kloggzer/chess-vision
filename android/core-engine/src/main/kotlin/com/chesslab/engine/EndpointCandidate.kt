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
 * **The "unambiguous" filter below is structurally inert, and this is the parity shape, not a
 * guard.** Python drops the candidate when a rival to a *different* destination sits within
 * [com.chesslab.engine.api.TrackerConfig.ambiguityMarginLl] of it — but the candidate list was
 * already filtered to the ONE strong square, so every entry shares that destination and the test
 * cannot be true (STATUS D03c-3, pinned from both sides by `rivalsToTheSameDestinationDoNotBlock`).
 * The port keeps the shape so the two implementations read alike; do not read it as protection.
 * What actually bounds this path is the single-strong-square rule above, the shadow veto, and the
 * CNN verify the `vote = false` candidate is handed to.
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
 * Python's "a candidate to a DIFFERENT destination within [margin] kills it" loop. Every element
 * of [cands] reaches the same square by construction, so `rival` is always `false` and this always
 * returns `cands[0]` — see the caller for why the dead shape is kept.
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
