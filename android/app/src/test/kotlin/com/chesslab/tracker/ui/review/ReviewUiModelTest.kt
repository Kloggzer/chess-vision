package com.chesslab.tracker.ui.review

import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.PlyGrade
import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.analysis.SideSummary
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class ReviewUiModelTest {
    @Test
    fun archivedReviewsStartAtTheBeginningWhileLiveGamesFollowTheEnd() {
        assertEquals(0, initialReviewPly(live = false, plies = 83))
        assertEquals(83, initialReviewPly(live = true, plies = 83))
    }

    @Test
    fun scoreSheetShowsWinningChancesLostByTheMove() {
        assertEquals("−35%", moveImpactLabel(plyGrade(MoveQuality.BLUNDER, before = 47.0, after = 12.0)))
        assertEquals("−8%", moveImpactLabel(plyGrade(MoveQuality.INACCURACY, before = 60.0, after = 51.6)))
        assertEquals("0%", moveImpactLabel(plyGrade(MoveQuality.BEST, before = 60.0, after = 50.0)))
        assertNull(moveImpactLabel(null))
    }

    @Test
    fun positionColumnNamesTheSideAheadWithoutExposingExtremeScores() {
        assertEquals("White +9.0", positionLeadLabel(900, null))
        assertEquals("Black +8.0", positionLeadLabel(-800, null))
        assertEquals("Equal", positionLeadLabel(0, null))
        assertEquals("White winning", positionLeadLabel(8_200, null))
        assertEquals("Mate in 3", positionLeadLabel(10_000, 3))
        assertEquals("Mate in 2", positionLeadLabel(-10_000, -2))
        assertEquals("Checkmate", positionLeadLabel(-10_000, 0))
        assertEquals("—", positionLeadLabel(null, null))
    }

    @Test
    fun theDashboardNamesMissedMatesAndTheForcedFinish() {
        val whiteMiss = plyGrade(MoveQuality.GOOD, 100.0, 70.0).copy(mateBefore = true, mateInBefore = 3)
        val blackMiss = whiteMiss.copy(ply = 2, san = "Kh7", mateInBefore = 2)
        val forced = whiteMiss.copy(ply = 3, mateBefore = false, mateInBefore = null, forcedMateLine = true)
        val grade = gameGrade(whiteMiss, blackMiss, forced)

        assertEquals("White missed 1 mating chance · Black missed 1 mating chance.", mateStory(grade))
        assertEquals("White · 1. e4 · missed mate in 3", findingTitle(whiteMiss))
        assertEquals("2/3 moves graded", accuracyDenominator(2, 3))
        assertEquals("White wins", resultHeadline("1-0"))
    }

    @Test
    fun whatDecidedTheGameNamesWhoFollowedTheFinalMateAndItsDistance() {
        val whiteFollow =
            plyGrade(MoveQuality.BEST, 100.0, 100.0).copy(
                ply = 3,
                mateBefore = true,
                mateAfter = true,
                mateInBefore = 2,
                forcedMateLine = true,
            )
        val blackReply =
            whiteFollow.copy(
                ply = 4,
                mateBefore = false,
                mateAfter = false,
                mateInBefore = null,
            )
        val grade = gameGrade(whiteFollow, blackReply).copy(evalMate = listOf(2, 1, 0))

        assertEquals("White · forced mate", followedMateStory(grade))
    }

    private fun plyGrade(
        quality: MoveQuality,
        before: Double,
        after: Double,
    ) = PlyGrade(
        ply = 1,
        san = "e4",
        quality = quality,
        winBefore = before,
        winAfter = after,
        accuracy = 100.0,
        depth = 20,
        bestSan = "e4",
        bestUci = "e2e4",
        bestLine = listOf("e4"),
        decided = false,
    )

    private fun gameGrade(vararg plies: PlyGrade) =
        GameGrade(
            byPly = plies.associateBy { it.ply },
            winWhite = emptyList(),
            evalCp = emptyList(),
            evalMate = emptyList(),
            white = SideSummary(plies = 2, scored = 1, accuracy = 80.0, counts = emptyMap()),
            black = SideSummary(plies = 1, scored = 1, accuracy = 70.0, counts = emptyMap()),
            budget = ReviewBudget(),
            scored = 0,
            positions = 0,
        )
}
