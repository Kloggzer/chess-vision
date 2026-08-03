package com.chesslab.tracker.ui.analysis

import com.chesslab.tracker.analysis.AnalysisLine
import com.chesslab.tracker.analysis.AnalysisResult
import com.chesslab.tracker.analysis.GateBlock
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.PlyGrade
import com.chesslab.tracker.analysis.winChanceWhite
import com.chesslab.tracker.ui.percent
import com.chesslab.tracker.ui.review.moveImpactLabel
import com.chesslab.tracker.ui.review.positionLeadLabel
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

private fun result(
    cp: Int? = null,
    mate: Int? = null,
    gameOver: Boolean = false,
    winWhite: Double? = cp?.let(::winChanceWhite),
) = AnalysisResult("fen", gameOver, cp, mate, winWhite, emptyList(), 12)

class EvalBarLabelTest {
    /**
     * The LIVE bar and the REVIEW bar share a drawing and a slot; until specs/47 one read `+0.3`
     * and the other `61 %`.
     *
     * They then read the same UNIT in two PRESENTATIONS — `63%` here, `63 %` one tab away — for
     * another day. specs/48 made [com.chesslab.tracker.ui.percent] the only place that decides, and
     * widened `SLOT_WIDTH` so the space is not a reason to disagree.
     */
    @Test
    fun labelIsWhitesWinExpectancy() {
        assertEquals("63 %", evalLabel(result(cp = 140)))
        assertEquals("47 %", evalLabel(result(cp = -30)))
        assertEquals("50 %", evalLabel(result(cp = 0)))
    }

    @Test
    fun mateLabelsCarryTheSideNotTheDistanceSign() {
        assertEquals("M3", evalLabel(result(mate = 3)))
        assertEquals("-M3", evalLabel(result(mate = -3)))
    }

    @Test
    fun aFinishedGameAndNoAnalysisBothShowNothing() {
        assertEquals("–", evalLabel(null))
        assertEquals("–", evalLabel(result(cp = 400, gameOver = true)))
    }

    @Test
    fun blockReasonsAreUserReadable() {
        assertNull(blockText(null))
        assertEquals("paused — tracking below 15 fps", blockText(GateBlock.FRAME_BUDGET))
        assertEquals("analysis is off", blockText(GateBlock.OFF))
    }

    @Test
    fun lineScoresUseTheSameUnitAsTheBar() {
        assertEquals("53 %", lineScore(AnalysisLine("e2e4", "e4", 35, null)))
        assertEquals("-M2", lineScore(AnalysisLine("e2e4", "e4", null, -2)))
    }

    /**
     * **One quantity, one unit — and one presentation** (specs/48 rule 5).
     *
     * Four files write a percentage for the reader and each used to format its own. This asserts
     * they are the same string for the same number, which no per-file test can.
     */
    @Test
    fun everyWriterOfAPercentageWritesTheSameString() {
        val expected = percent(53.0)
        assertEquals(expected, lineScore(AnalysisLine("e2e4", "e4", 35, null)))
        assertEquals(expected, evalLabel(result(winWhite = 53.0, cp = 35)))
        assertEquals(expected, positionLeadLabel(53.0, null))
        assertEquals("−$expected", moveImpactLabel(blunder(before = 100.0, after = 47.0)))
    }

    private fun blunder(
        before: Double,
        after: Double,
    ) = PlyGrade(
        ply = 1,
        san = "e4",
        quality = MoveQuality.BLUNDER,
        winBefore = before,
        winAfter = after,
        accuracy = 0.0,
        depth = 20,
        bestSan = "d4",
        bestUci = "d2d4",
        bestLine = listOf("d4"),
        decided = false,
    )
}
