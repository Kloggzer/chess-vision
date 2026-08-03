package com.chesslab.tracker.analysis

/**
 * Quality label for a played move, derived from the win expectancy it gave away — see `classify`.
 *
 * `BOOK` was here and is gone: no opening book ships, so nothing could set it and only its own unit
 * test ever produced one.
 */
enum class MoveQuality { BEST, GOOD, INACCURACY, MISTAKE, BLUNDER }
