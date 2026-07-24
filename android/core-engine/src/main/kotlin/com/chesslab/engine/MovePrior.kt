package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move
import kotlin.math.min

/** Capture bonus of `move_prior` (`tracker.py:597`). */
internal const val PRIOR_CAPTURE = 0.5

/** Check bonus. */
internal const val PRIOR_CHECK = 0.3

/** Forward-move bonus. */
internal const val PRIOR_FORWARD = 0.2

/** `min(p, 1.0)` — the prior decides near-ties only, never against clear image evidence. */
internal const val PRIOR_CAP = 1.0

/**
 * Small plausibility prior in LL units (level A, without an engine). Port of
 * `move_prior` (`tracker.py:597`): capture `+0.5`, check `+0.3`, forward `+0.2`, capped at 1.0.
 *
 * "Forward" is relative to the side to move: `fwd = rank(to) - rank(from)` must be non-zero and
 * its sign must match the mover's direction. Never negative.
 *
 * Phase 03c decides WHEN the prior is added — it is never folded into [loglikScores].
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
