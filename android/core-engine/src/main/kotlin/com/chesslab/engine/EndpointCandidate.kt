package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move

/**
 * The best legal move evidenced at its DESTINATION only — the origin sat below the viability gate
 * (a white piece leaving a white square). Exactly ONE square may be strongly changed; two is a
 * normal move. The caller hands it to CNN verify with `vote = false`, which is what bounds it.
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
    return scored.firstOrNull { (mv, sc) -> mv.to.ordinal == target && sc > 0.0 }?.first
}
