package com.chesslab.tracker.analysis

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private val BUDGET = ReviewBudget()

private fun grade(
    scores: List<Score>,
    startsWithBlack: Boolean = false,
) = grade((1..scores.size - 1).toList(), startsWithBlack, scores, BUDGET)

class GameReviewTest {
    /**
     * The sign flip is the whole reason `cpLoss` exists, and it is the classic bug: a losing move by
     * Black moves the WHITE-POV score up, not down.
     */
    @Test
    fun aLossIsMeasuredFromTheMoversPointOfView() {
        // +20 -> -180 with White to move: White dropped 200 cp.
        val white = grade(listOf(Score(20, 18), Score(-180, 18)))
        assertEquals(200, white.plies.single().cpLoss)
        assertEquals(MoveQuality.MISTAKE, white.plies.single().quality)

        // The same swing after Black's move is Black's loss, and White's sheet stays empty.
        val black = grade(listOf(Score(-20, 18), Score(180, 18)), startsWithBlack = true)
        assertEquals(200, black.plies.single().cpLoss)
        assertEquals(0, black.white.plies)
        assertEquals(1, black.black.plies)
    }

    @Test
    fun pliesAreSplitBetweenTheSidesThatPlayedThem() {
        val scores = listOf(Score(0, 18), Score(-300, 18), Score(0, 18), Score(-300, 18))
        val graded = grade(scores)
        assertEquals(listOf(1, 2, 3), graded.plies.map { it.ply })
        assertEquals(2, graded.white.plies, "plies 1 and 3")
        assertEquals(1, graded.black.plies, "ply 2")
        assertEquals(2, graded.white.count(MoveQuality.BLUNDER))
        // Ply 2 took White's -300 back to 0: that is Black losing 300, on Black's sheet.
        assertEquals(1, graded.black.count(MoveQuality.BLUNDER))
    }

    /**
     * A mate is scored far outside every band, so throwing one away is a blunder and shortening one
     * is not a loss at all — both ends of the subtraction are the same number.
     */
    @Test
    fun mateIsScoredOutsideTheBandsAndShorteningItCostsNothing() {
        val kept = grade(listOf(Score(10_000, 12), Score(10_000, 14)))
        assertEquals(0, kept.plies.single().cpLoss)
        assertEquals(MoveQuality.BEST, kept.plies.single().quality)

        val thrown = grade(listOf(Score(10_000, 12), Score(50, 18)))
        assertEquals(MoveQuality.BLUNDER, thrown.plies.single().quality)
    }

    /**
     * A grade is a claim only as deep as the search behind it, and the shallower of the two searches
     * bounds it: a loss measured against a position the engine only reached depth 9 on is a depth-9
     * claim whatever the other end managed.
     */
    @Test
    fun aPlyIsWeightedByTheShallowerOfItsTwoSearches() {
        assertEquals(9, grade(listOf(Score(0, 20), Score(0, 9))).plies.single().depth)
        assertEquals(9, grade(listOf(Score(0, 9), Score(0, 20))).plies.single().depth)
    }

    /**
     * A move that beats the engine's line at this depth is a NEGATIVE loss. It grades BEST, but it
     * must not subtract from the average — that would let a lucky best move pay for a blunder.
     */
    @Test
    fun averageLossNeverPaysForABlunderWithALuckyBestMove() {
        val graded = grade(listOf(Score(0, 18), Score(-400, 18), Score(-800, 18), Score(-400, 18)))
        assertEquals(2, graded.white.plies)
        assertEquals(MoveQuality.BLUNDER, graded.plies[0].quality)
        assertEquals(MoveQuality.BEST, graded.plies[2].quality, "White regained 400 cp: a negative loss")
        assertEquals(200, graded.white.averageCpLoss, "(400 + 0) / 2, never (400 - 400) / 2")
    }

    @Test
    fun findingsAreTheMistakesAndBlundersOnly() {
        val graded = grade(listOf(Score(0, 18), Score(-5, 18), Score(-5, 18), Score(-400, 18)))
        assertEquals(listOf(3), graded.findings().map { it.ply })
        assertTrue(graded.of(99) == null, "asking for a ply that is not there is null, not a crash")
        assertEquals(3, graded.of(3)?.ply)
    }
}
