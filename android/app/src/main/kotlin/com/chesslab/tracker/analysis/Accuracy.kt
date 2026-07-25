package com.chesslab.tracker.analysis

/** Centipawn-loss upper bounds, exclusive. Lichess-like; stated here so the file is self-contained. */
private const val BEST_MAX_CP_LOSS = 10
private const val GOOD_MAX_CP_LOSS = 50
private const val INACCURACY_MAX_CP_LOSS = 100
private const val MISTAKE_MAX_CP_LOSS = 250

/**
 * Grade a played move by its centipawn loss, where
 * `cpLoss = eval(best line before the move) - eval(after the played move)`, both from the MOVER's
 * point of view. A negative loss (the played move beats the engine line at this depth) is [BEST].
 *
 * `<10` best, `<50` good, `<100` inaccuracy, `<250` mistake, else blunder; [isBookPly] overrides.
 */
fun classify(
    cpLoss: Int,
    isBookPly: Boolean = false,
): MoveQuality =
    when {
        isBookPly -> MoveQuality.BOOK
        cpLoss < BEST_MAX_CP_LOSS -> MoveQuality.BEST
        cpLoss < GOOD_MAX_CP_LOSS -> MoveQuality.GOOD
        cpLoss < INACCURACY_MAX_CP_LOSS -> MoveQuality.INACCURACY
        cpLoss < MISTAKE_MAX_CP_LOSS -> MoveQuality.MISTAKE
        else -> MoveQuality.BLUNDER
    }

/**
 * Centipawn loss of a played move. Both evaluations are WHITE-POV (what the analyzer publishes);
 * flipping for Black here is what makes [classify]'s "mover's point of view" true.
 *
 * Computed opportunistically: the caller only has [beforeWhitePov] when a fresh analysis of the
 * position before the move happened to exist. Nothing re-analyses history during a live game.
 */
fun cpLoss(
    beforeWhitePov: Int,
    afterWhitePov: Int,
    whiteMoved: Boolean,
): Int = if (whiteMoved) beforeWhitePov - afterWhitePov else afterWhitePov - beforeWhitePov
