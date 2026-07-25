package com.chesslab.tracker.analysis

import kotlin.math.exp

/**
 * Lichess' logistic, fitted — not derived. The constant is verbatim from `analysis.py`'s
 * `win_chance_white`; rounding it moves the bar.
 */
private const val WIN_CHANCE_K = 0.00368208

/** An even position is 50 %, and the curve spans 50 points either side of it. */
private const val EVEN_PERCENT = 50.0

/** White win-expectancy in percent (0..100) for a centipawn score from WHITE's point of view. */
fun winChanceWhite(cp: Int): Double = EVEN_PERCENT + EVEN_PERCENT * (2.0 / (1.0 + exp(-WIN_CHANCE_K * cp)) - 1.0)
