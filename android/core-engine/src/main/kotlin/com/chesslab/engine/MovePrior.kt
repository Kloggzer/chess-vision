package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move
import kotlin.math.min

internal const val PRIOR_CAPTURE = 0.5

internal const val PRIOR_CHECK = 0.3

internal const val PRIOR_FORWARD = 0.2

/** The prior decides near-ties only, never against clear image evidence. */
internal const val PRIOR_CAP = 1.0

/**
 * Small plausibility prior in LL units, without an engine: capture, check and forward bonuses capped at
 * 1.0. "Forward" is relative to the side to move and never negative. The caller decides WHEN it is
 * added — it is never folded into [loglikScores].
 */
internal fun movePrior(
    g: Game,
    mv: Move,
): Double {
    var p = 0.0
    if (isCapture(g, mv)) p += PRIOR_CAPTURE
    if (givesCheck(g, mv)) p += PRIOR_CHECK
    val fwd = mv.to.rank.ordinal - mv.from.rank.ordinal
    if ((fwd > 0) == g.whiteToMove && fwd != 0) p += PRIOR_FORWARD
    return min(p, PRIOR_CAP)
}
