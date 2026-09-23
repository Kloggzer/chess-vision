package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.move.Move

/** Evidenced at its DESTINATION only — the origin sat below the viability gate (a white piece leaving a
 *  white square). Exactly ONE strong square; two is a normal move. Verified with `vote = false`. */
internal fun EngineState.singleEndpointCandidate(
    z: DoubleArray,
    scored: List<Pair<Move, Double>>,
    cur: GrayImage,
    curBgr: BgrImage?,
): Move? {
    val target = soleStrongSquare(z)
    if (target == null || shadowVetoed.has(target)) return null
    val move = scored.firstOrNull { (mv, sc) -> mv.to.ordinal == target && sc > 0.0 }?.first
    // `a7a8{q,r,b,n}` sind ueber Belegtheit identisch, und der Verifier prueft nur die: er haette die erste
    // Variante des Generators bestaetigt statt der gespielten Figur.
    if (move != null && move.promotion != null && move.promotion != Piece.NONE) {
        raisePromotionPrompt(move, cur, curBgr)
        return null
    }
    return move
}

private fun EngineState.soleStrongSquare(z: DoubleArray): Int? {
    var strong = 0L
    for (i in 0 until Squares.COUNT) {
        if (z[i] >= config.zThr) strong = strong.with(i)
    }
    return if (strong.countOneBits() == 1) java.lang.Long.numberOfTrailingZeros(strong) else null
}
