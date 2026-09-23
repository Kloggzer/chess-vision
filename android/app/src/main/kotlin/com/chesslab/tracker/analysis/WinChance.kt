package com.chesslab.tracker.analysis

import kotlin.math.exp

/** Lichess' logistic, fitted — not derived; rounding it moves the bar. */
private const val WIN_CHANCE_K = 0.00368208

private const val EVEN_PERCENT = 50.0

/** Lichess' `Cp.CEILING` (scalachess `eval.scala`): a mate, +30 and +10 pawns all read 97.54 %. */
private const val CP_CEILING = 1_000

fun winChanceWhite(cp: Int): Double = EVEN_PERCENT + EVEN_PERCENT * (2.0 / (1.0 + exp(-WIN_CHANCE_K * cp)) - 1.0)

/** With lichess' ceiling. The review grades through it; the live bar does not, on purpose: it keeps
 *  parity with `analysis.py`'s `win_chance_white`, which has no ceiling. */
fun winChanceCeiled(cp: Int): Double = winChanceWhite(cp.coerceIn(-CP_CEILING, CP_CEILING))

fun isDecided(cp: Int): Boolean = cp <= -CP_CEILING || cp >= CP_CEILING
