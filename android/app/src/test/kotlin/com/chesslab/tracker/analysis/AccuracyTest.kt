package com.chesslab.tracker.analysis

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** Tight enough that a typo in any digit of a borrowed constant fails this file. */
private const val EPS = 1e-9

class AccuracyTest {
    /**
     * Lichess' judgement thresholds, pinned. `Advice.scala`:
     * `winningChanceJudgements = List(.3 -> Blunder, .2 -> Mistake, .1 -> Inaccuracy)` — on
     * `winningChances`, which runs **-1..+1**. `winPercent = 50 + 50 * winningChances`, so those are
     * 15 / 10 / 5 points on the scale this file uses.
     *
     * The widely quoted "a 30 % change is a blunder" is the same constant read on the ±1 scale.
     * Taking it as percentage points doubles every band, and chess.com's PUBLISHED Expected-Points
     * cutoffs (inaccuracy 0.05, mistake 0.10) agree with 5 and 10, not with 10 and 20.
     */
    @Test
    fun judgementThresholdsAreLichessOnTheirOwnScale() {
        assertEquals(MoveQuality.BLUNDER, classify(15.0, playedEngineMove = false))
        assertEquals(MoveQuality.MISTAKE, classify(14.999, playedEngineMove = false))
        assertEquals(MoveQuality.MISTAKE, classify(10.0, playedEngineMove = false))
        assertEquals(MoveQuality.INACCURACY, classify(9.999, playedEngineMove = false))
        assertEquals(MoveQuality.INACCURACY, classify(5.0, playedEngineMove = false))
        assertEquals(MoveQuality.GOOD, classify(4.999, playedEngineMove = false))
    }

    /**
     * BEST is a FACT, not a threshold of ours: the player found the engine's own first choice.
     * A bad enough drop still outranks it — playing the engine's move out of a position that
     * collapsed anyway is not what a reader would call "best".
     */
    @Test
    fun bestMeansTheEngineMoveAndNothingElse() {
        assertEquals(MoveQuality.BEST, classify(0.0, playedEngineMove = true))
        assertEquals(MoveQuality.BEST, classify(4.999, playedEngineMove = true))
        assertEquals(MoveQuality.INACCURACY, classify(5.0, playedEngineMove = true))
        assertEquals(MoveQuality.GOOD, classify(0.0, playedEngineMove = false))
    }

    /**
     * Lichess' fitted accuracy curve, pinned digit for digit against values computed outside this
     * codebase. `AccuracyPercent.scala`:
     * `103.1668100711649 * exp(-0.04354415386753951 * winDiff) + -3.166924740191411`, then their
     * `+ 1 // uncertainty bonus`, clamped to 0..100.
     *
     * A fitted curve cannot be re-derived, so it is used with attribution — the same arrangement
     * `WinChance.kt` already has with their logistic.
     */
    @Test
    fun accuracyCurveIsLichessVerbatim() {
        assertEquals(100.0, accuracyPercent(0.0), EPS, "the uncertainty bonus takes a perfect move over 100; it clamps")
        assertEquals(96.60397651008962, accuracyPercent(1.0), EPS)
        assertEquals(80.81529992041436, accuracyPercent(5.0), EPS)
        assertEquals(64.57982845372067, accuracyPercent(10.0), EPS)
        assertEquals(41.016818741417126, accuracyPercent(20.0), EPS)
        assertEquals(25.772047746869696, accuracyPercent(30.0), EPS)
        assertEquals(9.527819142930593, accuracyPercent(50.0), EPS)
        assertEquals(0.0, accuracyPercent(100.0), EPS, "and it clamps at the bottom too")
    }

    /**
     * The aggregation is OURS and the screen says so — lichess averages this with a
     * volatility-weighted mean whose weight floors at 0.5, which is exactly how a long decided
     * finish leaks into their score.
     *
     * The harmonic mean is the half worth keeping: one terrible move is not averaged away. The
     * `max(1.0, …)` guard is lichess', from `Maths.harmonicMean`.
     */
    @Test
    fun gameAccuracyIsTheHarmonicMeanAndOneDisasterSurvivesIt() {
        assertNull(gameAccuracy(emptyList()))
        assertEquals(100.0, gameAccuracy(List(20) { 100.0 })!!, EPS)
        // Nineteen perfect moves and one at zero: the arithmetic mean would read 95.
        assertEquals(16.806722689075632, gameAccuracy(List(19) { 100.0 } + 0.0)!!, EPS)
    }

    /**
     * Lichess ceils every score to ±1000 cp before the logistic (`Cp.CEILING`, and `fromMate` maps a
     * mate straight onto it). So a mate, +30 pawns and +10 pawns are one number, and the difference
     * between them is not a move quality.
     */
    @Test
    fun theWinCurveSaturatesAtLichessCeiling() {
        assertEquals(97.54474363414323, winChanceCeiled(1_000), EPS)
        assertEquals(winChanceCeiled(1_000), winChanceCeiled(10_000), EPS, "a mate is the ceiling and no more")
        assertEquals(winChanceCeiled(1_000), winChanceCeiled(3_000), EPS)
        assertEquals(2.4552563658567763, winChanceCeiled(-1_000), EPS)
        assertEquals(50.0, winChanceCeiled(0), EPS)
        // The uncapped curve is the LIVE eval bar's, kept at parity with `analysis.py`.
        assertEquals(59.10258971916128, winChanceWhite(100), EPS)
    }
}
