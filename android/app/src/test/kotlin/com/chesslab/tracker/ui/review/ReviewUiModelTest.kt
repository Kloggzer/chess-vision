package com.chesslab.tracker.ui.review

import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.PlyGrade
import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.analysis.SideSummary
import com.chesslab.tracker.ui.analysisLine
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class ReviewUiModelTest {
    @Test
    fun scoreSheetShowsWinningChancesLostByTheMove() {
        assertEquals("−35 %", moveImpactLabel(plyGrade(MoveQuality.BLUNDER, before = 47.0, after = 12.0)))
        assertEquals("−8 %", moveImpactLabel(plyGrade(MoveQuality.INACCURACY, before = 60.0, after = 51.6)))
        assertEquals("0 %", moveImpactLabel(plyGrade(MoveQuality.BEST, before = 60.0, after = 50.0)))
        // A move that gave away less than half a point reads a plain zero, never `−0 %`.
        assertEquals("0 %", moveImpactLabel(plyGrade(MoveQuality.GOOD, before = 60.0, after = 59.7)))
        assertNull(moveImpactLabel(null))
    }

    /**
     * The position column speaks ONE unit with the rest of the app: win expectancy. It printed
     * `White +1.2` — a pawn count — beside a `−10 %` cost, over a background drawn from the
     * percentage, until specs/47.
     */
    @Test
    fun positionColumnReadsWinExpectancyAndKeepsMateInWords() {
        assertEquals("96 %", positionLeadLabel(96.4, null))
        assertEquals("4 %", positionLeadLabel(3.6, null))
        assertEquals("50 %", positionLeadLabel(50.0, null))
        assertEquals("Mate in 3", positionLeadLabel(97.5, 3))
        assertEquals("Mate in 2", positionLeadLabel(2.5, -2))
        assertEquals("Checkmate", positionLeadLabel(2.5, 0))
        assertEquals("—", positionLeadLabel(null, null))
    }

    /**
     * The engine's state is a property of the SCREEN, so it is decided here and not inside one tab.
     *
     * The bug it closes: `Review this game`, `Starting the engine…` and the progress bar all lived
     * under Moments, so tapping the button from the board tab produced no visible change anywhere.
     */
    @Test
    fun theEngineStateIsWhatEveryTabShows() {
        val partial = gameGrade().copy(scored = 30, positions = 84)
        val complete = gameGrade().copy(scored = 84, positions = 84)

        assertEquals(AnalysisPhase.NOT_STARTED, analysisPhase(ReviewUi()))
        assertEquals(AnalysisPhase.PARTIAL, analysisPhase(ReviewUi(grade = partial)))
        assertEquals(AnalysisPhase.MISSING_ENGINE, analysisPhase(ReviewUi(engineMissing = true)))
        // A finished review has nothing left to say, so the card is absent rather than empty.
        assertNull(analysisPhase(ReviewUi(grade = complete)))
        // And a run in flight is the BANNER's, not the screen's — two progress bars, one above the
        // other, was what drawing it in both places produced.
        assertNull(analysisPhase(ReviewUi(running = true, grade = partial)))
        assertNull(analysisPhase(ReviewUi(running = true)))
    }

    /** A run that outlives the screen has to be legible from anywhere — see `AnalysisBanner`. */
    @Test
    fun aRunInFlightSaysWhichGameAndHowFar() {
        assertEquals("Reviewing 2026-08-02_2159 · 30 / 84", analysisLine("2026-08-02_2159", 30, 84))
        assertEquals("Reviewing 2026-08-02_2159 · starting the engine", analysisLine("2026-08-02_2159", null, null))
        assertEquals("Reviewing 2026-08-02_2159 · starting the engine", analysisLine("2026-08-02_2159", 0, 0))
        assertEquals("Reviewing a game…", analysisLine(null, 1, 2))
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
