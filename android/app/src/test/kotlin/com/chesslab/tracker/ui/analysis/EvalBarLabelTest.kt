package com.chesslab.tracker.ui.analysis

import com.chesslab.tracker.analysis.AnalysisLine
import com.chesslab.tracker.analysis.AnalysisResult
import com.chesslab.tracker.analysis.GateBlock
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

private fun result(
    cp: Int? = null,
    mate: Int? = null,
    gameOver: Boolean = false,
) = AnalysisResult("fen", gameOver, cp, mate, 50.0, emptyList(), 12)

class EvalBarLabelTest {
    @Test
    fun labelIsPawnsWithAnExplicitSign() {
        assertEquals("+1.4", evalLabel(result(cp = 140)))
        assertEquals("-0.3", evalLabel(result(cp = -30)))
        assertEquals("+0.0", evalLabel(result(cp = 0)))
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
    fun lineScoresUseTheSameSignConventionAsTheBar() {
        assertEquals("+0.35", lineScore(AnalysisLine("e2e4", "e4", 35, null)))
        assertEquals("-M2", lineScore(AnalysisLine("e2e4", "e4", null, -2)))
    }
}
