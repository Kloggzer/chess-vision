package com.chesslab.tracker.ui.review

import com.chesslab.engine.api.STARTPOS
import com.chesslab.tracker.R
import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.OpeningSummary
import com.chesslab.tracker.analysis.PlyGrade
import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.analysis.SideSummary
import com.chesslab.tracker.games.GameResult
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.ReviewPly
import com.chesslab.tracker.games.ReviewSegment
import com.chesslab.tracker.ui.analysisLine
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
private const val AFTER_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"

class ReviewUiModelTest {
    @Test
    fun openingDurationUsesNormalMoveNotationInsteadOfHalfMoves() {
        assertEquals("Theory through 6.", openingTheoryLabel(OpeningSummary("C60", "Ruy Lopez", 11, false)))
        assertEquals("In theory through 6...", openingTheoryLabel(OpeningSummary("C60", "Ruy Lopez", 12, true)))
    }

    @Test
    fun openingContinuationMakesSideToMoveAndMoveNumbersExplicit() {
        assertEquals(
            "3… a6 4. Ba4 Nf6",
            openingContinuationLabel(OpeningSummary("C60", "Ruy Lopez", 5, false, listOf("a6", "Ba4", "Nf6"))),
        )
        assertEquals(
            "4. Ba4 Nf6 5. O-O",
            openingContinuationLabel(OpeningSummary("C60", "Ruy Lopez", 6, false, listOf("Ba4", "Nf6", "O-O"))),
        )
        assertEquals(
            "4… Nf6",
            openingMoveLabel(OpeningSummary("C60", "Ruy Lopez", 5, false, listOf("a6", "Ba4", "Nf6")), 2),
        )
    }

    @Test
    fun reviewHeaderUsesPlayersAndNavigationUsesChessTerms() {
        val game =
            GameView(
                id = "2026-08-02_2159",
                live = false,
                startFen = "",
                result = "1-0",
                segments = emptyList(),
                white = "Alice",
                black = "Bob",
            )

        assertEquals("Alice – Bob", reviewTitle(game, "White wins"))
        assertEquals("Alice · White", playerAndSide(game, plyGrade(MoveQuality.MISTAKE, 60.0, 45.0)))
        assertEquals(
            "Bob · Black",
            playerAndSide(game, plyGrade(MoveQuality.MISTAKE, 60.0, 45.0).copy(whiteMoved = false)),
        )
        assertEquals("Start", reviewPositionLabel(0, 83))
        assertEquals("1. White · 1/83", reviewPositionLabel(1, 83))
        assertEquals("1… Black · 2/83", reviewPositionLabel(2, 83))
    }

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
        assertEquals(AnalysisPhase.ERROR, analysisPhase(ReviewUi(error = "Stockfish stopped")))
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
        val blackMiss = whiteMiss.copy(ply = 2, san = "Kh7", whiteMoved = false, mateInBefore = 2)
        val forced = whiteMiss.copy(ply = 3, mateBefore = false, mateInBefore = null, forcedMateLine = true)
        val grade = gameGrade(whiteMiss, blackMiss, forced)

        assertEquals("White missed 1 mating chance · Black missed 1 mating chance.", mateStory(grade))
        assertEquals("2/3 moves graded", accuracyDenominator(2, 3))
        // The words live in strings.xml now; what this pins is that each result maps to its own key.
        assertEquals(R.string.games_result_white, resultHeadline(GameResult.WHITE))
        assertEquals(R.string.games_result_unfinished, resultHeadline(GameResult.UNFINISHED))
        assertEquals(
            GameResult.entries.size,
            GameResult.entries
                .map { resultHeadline(it) }
                .toSet()
                .size,
            "two results that read the same are one result",
        )
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

    @Test
    fun importedBlackToMovePositionsKeepTheirSideAndFullmoveNumber() {
        val blackMiss =
            plyGrade(MoveQuality.BLUNDER, 90.0, 30.0).copy(
                whiteMoved = false,
                moveNumber = 42,
                mateBefore = true,
                mateAfter = false,
                mateInBefore = 2,
            )

        assertEquals("Black missed 1 mating chance.", mateStory(gameGrade(blackMiss)))
    }

    @Test
    fun aForcedMateGradesTheDefenseInsteadOfCallingEveryReplyGood() {
        val defender =
            plyGrade(MoveQuality.GOOD, 2.0, 2.0).copy(
                whiteMoved = false,
                forcedMateLine = true,
                mateDistanceBefore = 3,
                mateDistanceAfter = 2,
            )

        assertEquals("Mate sooner", verdictLabel(defender))
        assertEquals("Mate in 3 → 2", verdictDetail(defender))
        assertEquals("Best defense", verdictLabel(defender.copy(playedBest = true, mateDistanceAfter = 3)))
        assertEquals("Mate stays in 3", verdictDetail(defender.copy(playedBest = true, mateDistanceAfter = 3)))
    }

    @Test
    fun aNonBestMoveCanKeepTheForcedMateWithoutBeingCalledGood() {
        val continuation =
            plyGrade(MoveQuality.GOOD, 98.0, 98.0).copy(
                forcedMateLine = true,
                mateBefore = true,
                mateAfter = true,
                mateInBefore = 4,
                mateDistanceBefore = 4,
                mateDistanceAfter = 3,
                playedBest = false,
            )

        assertEquals("Mate kept", verdictLabel(continuation))
        assertEquals("Still mate in 3", verdictDetail(continuation))
    }

    @Test
    fun checkmateIsTerminalAndTheMateExplanationNamesTheWinner() {
        assertTrue(isCheckmatePosition("8/8/8/8/8/5K2/6Q1/7k b - - 0 1"))
        assertFalse(isCheckmatePosition("8/8/8/8/8/5K2/6Q1/7k w - - 0 1"))
        assertEquals(
            "White can force checkmate in 4. Any reply loses.",
            mateExplanation(
                MateLineRequest(
                    ply = 1,
                    side = "White",
                    startFen = "",
                    uciLine = emptyList(),
                    sanLine = emptyList(),
                    missed = false,
                    mateIn = 4,
                    bestSan = "Qg7+",
                ),
            ),
        )
    }

    /**
     * The arrow on the board and the move named beside it are ONE ply's engine move.
     *
     * They were a ply apart: the card showed the alternative to the move just played while the board
     * drew the best move from the resulting position. *"Die Zuordnung der Pfeile stimmt nicht, die
     * werden um ein[s] versetzt dargestellt"* — and it is the same answer for a White ply and a
     * Black one, which is the second half of the same report.
     */
    @Test
    fun theBoardsArrowAndTheVerdictsEngineMoveAreTheSamePly() {
        val game =
            GameView(
                id = "2026-08-11_1200",
                live = false,
                startFen = STARTPOS,
                result = "*",
                segments = listOf(ReviewSegment(STARTPOS, listOf(ply(1, "e4", AFTER_E4), ply(2, "e5", AFTER_E5)), null)),
            )
        val grade =
            gameGrade(
                plyGrade(MoveQuality.BEST, 50.0, 50.0).copy(ply = 1, bestUci = "e2e4", bestSan = "e4"),
                plyGrade(MoveQuality.BLUNDER, 50.0, 20.0).copy(ply = 2, bestUci = "c7c5", bestSan = "c5"),
            )

        assertEquals(1, reviewSelection(game, grade, 0).advice?.ply, "the start position advises the opening move")
        assertEquals("e2e4", reviewSelection(game, grade, 1).advice?.bestUci, "White's ply advises White's alternative")
        assertEquals("c7c5", reviewSelection(game, grade, 2).advice?.bestUci, "and Black's ply advises Black's")
    }

    private fun ply(
        number: Int,
        san: String,
        fenAfter: String,
    ) = ReviewPly(number, san, "", fenAfter, decider = null)

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
