package com.chesslab.tracker.analysis

/** Centipawn-loss upper bound (exclusive) for [MoveQuality.BEST]. */
private const val BEST_MAX_CP_LOSS = 10

/** Centipawn-loss upper bound (exclusive) for [MoveQuality.GOOD]. */
private const val GOOD_MAX_CP_LOSS = 50

/** Centipawn-loss upper bound (exclusive) for [MoveQuality.INACCURACY]. */
private const val INACCURACY_MAX_CP_LOSS = 100

/** Centipawn-loss upper bound (exclusive) for [MoveQuality.MISTAKE]. */
private const val MISTAKE_MAX_CP_LOSS = 250

/**
 * Classify a played move by its centipawn loss:
 * `cpLoss = eval(position before the move, engine best) - eval(position after the played move)`,
 * both evaluated from the mover's point of view, so a perfect move has loss 0 and a
 * negative loss (played move better than the engine line at the compared depth) still
 * grades as [MoveQuality.BEST].
 *
 * Thresholds (lichess-like, decided in the spec — tune later):
 * `<10` best, `<50` good, `<100` inaccuracy, `<250` mistake, else blunder.
 *
 * @param cpLossWhitePov centipawn loss of the played move (see above).
 * @param isBookPly true if the ply is still in known opening theory — overrides grading.
 */
fun classify(
    cpLossWhitePov: Int,
    isBookPly: Boolean,
): MoveQuality =
    when {
        isBookPly -> MoveQuality.BOOK
        cpLossWhitePov < BEST_MAX_CP_LOSS -> MoveQuality.BEST
        cpLossWhitePov < GOOD_MAX_CP_LOSS -> MoveQuality.GOOD
        cpLossWhitePov < INACCURACY_MAX_CP_LOSS -> MoveQuality.INACCURACY
        cpLossWhitePov < MISTAKE_MAX_CP_LOSS -> MoveQuality.MISTAKE
        else -> MoveQuality.BLUNDER
    }
