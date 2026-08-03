package com.chesslab.tracker.analysis

import kotlin.math.exp

/**
 * Lichess' judgement thresholds, in WIN-EXPECTANCY POINTS lost by the mover.
 *
 * From lila's `Advice.scala`:
 * `winningChanceJudgements = List(.3 -> Blunder, .2 -> Mistake, .1 -> Inaccuracy)`. **Those are on
 * `winningChances`, which runs -1..+1, not on the 0..100 percentage** — and `winPercent = 50 + 50 *
 * winningChances`, so 0.3 is **15 points here, not 30**. The forum answer everyone quotes ("a 30 %
 * change is a blunder") is the same constant read on the ±1 scale, and taking it as percentage
 * points doubles every band.
 *
 * Corroboration that 15/10/5 is the right reading: chess.com PUBLISHES its Expected-Points cutoffs
 * (Inaccuracy 0.05-0.10, Mistake 0.10-0.20, Blunder >=0.20 of a 0..1 win probability), and its
 * inaccuracy and mistake floors land on the same 5 and 10. Doubling ours would make lichess exactly
 * twice chess.com at every rung.
 *
 * **Centipawns used to be the unit and that was the defect.** Measured 2026-08-03 on the device
 * game `2026-08-02_2159`, at the shipped budget: **32 of 83 plies change class** when the same
 * search is read this way instead. Three of them were badged BLUNDER while the win expectancy did
 * not move at all — ply 63 `Rxc6+` lost 1 866 cp and went 100.0 % -> 100.0 %, because trading a
 * forced mate for "only" +81 pawns is a large subtraction and no change whatever to the game. A
 * centipawn threshold cannot see that and no clamp fixes it; the unit was wrong.
 */
private const val BLUNDER_WIN_DROP = 15.0
private const val MISTAKE_WIN_DROP = 10.0
private const val INACCURACY_WIN_DROP = 5.0

/**
 * Lichess' fitted accuracy curve, verbatim from lila's `AccuracyPercent.scala`:
 * `103.1668100711649 * exp(-0.04354415386753951 * winDiff) - 3.166924740191411`, then their
 * `+ 1 // uncertainty bonus`, clamped to 0..100. Rounding any of it moves the score.
 *
 * A fitted formula is not derived and cannot be re-derived; it is used with attribution, exactly as
 * [winChanceWhite] already uses their logistic. `AccuracyTest` pins the constants.
 */
private const val ACCURACY_SCALE = 103.1668100711649
private const val ACCURACY_DECAY = 0.04354415386753951
private const val ACCURACY_SHIFT = -3.166924740191411
private const val ACCURACY_UNCERTAINTY_BONUS = 1.0

private const val FULL_PERCENT = 100.0

/**
 * Lichess' `Maths.harmonicMean` guard, verbatim: `acc + 1 / Math.max(1, v)`. Without it a single
 * 0 %-accuracy move divides the whole game to zero.
 */
private const val ACCURACY_FLOOR = 1.0

/**
 * Grade a played move by the win expectancy its mover gave away, [winDrop] in points (0..100).
 *
 * [playedEngineMove] is what makes [MoveQuality.BEST] a fact rather than a threshold: it means the
 * player found the engine's own first choice. Every other band is lichess'. There is deliberately no
 * "best vs good" cutoff of our own — measured over the 83-ply device game, the 29 plies that WERE
 * the engine's move lost at most 1.56 points, so a threshold would only have re-stated this.
 */
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

/** One move's accuracy in percent for a [winDrop] in points. See the constants above for the source. */
fun accuracyPercent(winDrop: Double): Double =
    (ACCURACY_SCALE * exp(-ACCURACY_DECAY * winDrop) + ACCURACY_SHIFT + ACCURACY_UNCERTAINTY_BONUS)
        .coerceIn(0.0, FULL_PERCENT)

/**
 * A side's accuracy: the HARMONIC mean of its per-move accuracies.
 *
 * **This aggregation is ours, and the screen says so.** Lichess averages this with a
 * volatility-weighted mean, whose weight is the population standard deviation of the win percentages
 * in a `clamp(plies / 10, 2, 8)` window around the move, squeezed to 0.5..12. That half is
 * reproducible, but it is also the half that leaks: a move in a flat, already-decided position has
 * standard deviation 0 and still enters at the 0.5 weight floor.
 *
 * The harmonic mean is the half worth keeping: it is dominated by the WORST terms, so one blunder
 * cannot be averaged away by twenty quiet moves. Measured over the device game: arithmetic 87.4
 * against harmonic 80.7 for White, 85.1 against 72.0 for Black — the plain mean flatters both.
 */
fun gameAccuracy(perMove: List<Double>): Double? {
    if (perMove.isEmpty()) return null
    return perMove.size / perMove.sumOf { 1.0 / it.coerceAtLeast(ACCURACY_FLOOR) }
}
