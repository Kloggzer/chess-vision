package com.chesslab.tracker.analysis

import kotlin.math.exp

/**
 * Lichess' logistic, fitted — not derived. The constant is verbatim from `analysis.py`'s
 * `win_chance_white`; rounding it moves the bar.
 */
private const val WIN_CHANCE_K = 0.00368208

/** An even position is 50 %, and the curve spans 50 points either side of it. */
private const val EVEN_PERCENT = 50.0

/**
 * Lichess' `Cp.CEILING`, from scalachess' `eval.scala`. Every score they feed the logistic is
 * clamped to it first, so a mate and +30 pawns and +10 pawns are all the same 97.54 % — past a
 * queen, "how won" has stopped being a measurable difference.
 */
private const val CP_CEILING = 1_000

/** White win-expectancy in percent (0..100) for a centipawn score from WHITE's point of view. */
fun winChanceWhite(cp: Int): Double = EVEN_PERCENT + EVEN_PERCENT * (2.0 / (1.0 + exp(-WIN_CHANCE_K * cp)) - 1.0)

/**
 * The same curve with lichess' ceiling applied, which is how THEY read it — see [CP_CEILING].
 *
 * The review grades through this and the live eval bar does not, on purpose: the bar is parity with
 * `analysis.py`'s `win_chance_white`, which has no ceiling, and a bar that pinned at 97.5 while
 * claiming to be Python's would be a third behaviour. A GRADE is the borrowed judgement, so it uses
 * the borrowed clamp.
 */
fun winChanceCeiled(cp: Int): Double = winChanceWhite(cp.coerceIn(-CP_CEILING, CP_CEILING))

/** True when [cp] is past the ceiling, so this position's exact score no longer means anything. */
fun isDecided(cp: Int): Boolean = cp <= -CP_CEILING || cp >= CP_CEILING
