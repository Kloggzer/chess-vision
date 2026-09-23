package com.chesslab.tracker.analysis

import kotlin.math.exp

/** Lichess' thresholds are on `winningChances` (-1..+1), so its 0.3 is 15 POINTS here, not 30 — chess.com's
 *  published cutoffs land on the same 5/10. Centipawns were the defect: 32 of 83 plies changed class,
 *  and trading a forced mate for +81 pawns was a "blunder" at 100 % -> 100 %. */
private const val BLUNDER_WIN_DROP = 15.0
private const val MISTAKE_WIN_DROP = 10.0
private const val INACCURACY_WIN_DROP = 5.0

/** Lichess' fitted curve verbatim (`AccuracyPercent.scala`), with its `+ 1` bonus, clamped to 0..100.
 *  Rounding any constant moves the score; `AccuracyTest` pins them. */
private const val ACCURACY_SCALE = 103.1668100711649
private const val ACCURACY_DECAY = 0.04354415386753951
private const val ACCURACY_SHIFT = -3.166924740191411
private const val ACCURACY_UNCERTAINTY_BONUS = 1.0

private const val FULL_PERCENT = 100.0

/** Lichess' `harmonicMean` guard: without it one 0 % move divides the whole game to zero. */
private const val ACCURACY_FLOOR = 1.0

/** No "best vs good" cutoff of our own: on the 83-ply device game the engine's own moves lost at most
 *  1.56 points, so a threshold would only restate [playedEngineMove]. */
fun classify(
    winDrop: Double,
    playedEngineMove: Boolean,
): MoveQuality =
    when {
        winDrop >= BLUNDER_WIN_DROP -> MoveQuality.BLUNDER
        winDrop >= MISTAKE_WIN_DROP -> MoveQuality.MISTAKE
        winDrop >= INACCURACY_WIN_DROP -> MoveQuality.INACCURACY
        playedEngineMove -> MoveQuality.BEST
        else -> MoveQuality.GOOD
    }

fun accuracyPercent(winDrop: Double): Double =
    (ACCURACY_SCALE * exp(-ACCURACY_DECAY * winDrop) + ACCURACY_SHIFT + ACCURACY_UNCERTAINTY_BONUS)
        .coerceIn(0.0, FULL_PERCENT)

/** HARMONIC mean, not lichess' volatility weighting — ours, and the screen says so. The worst moves
 *  dominate it: arithmetic 87.4 against harmonic 80.7 (White) flattered the device game. */
fun gameAccuracy(perMove: List<Double>): Double? {
    if (perMove.isEmpty()) return null
    return perMove.size / perMove.sumOf { 1.0 / it.coerceAtLeast(ACCURACY_FLOOR) }
}
