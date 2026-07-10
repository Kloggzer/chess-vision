package com.chesslab.tracker.ui

import com.chesslab.tracker.analysis.Eval
import com.chesslab.tracker.analysis.FakeAnalysisEngine
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.PositionAnalysis
import com.chesslab.tracker.record.PgnBuilder
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Analysis-screen model tests: an injected [FakeAnalysisEngine] (never the native engine) drives
 * a game's per-position analysis, which the move list maps to [MoveQuality] chips; plus White-POV
 * eval formatting.
 */
class AnalysisModelTest {
    @Test
    fun `move qualities derive from the injected fake engine`() =
        runTest {
            val line = parseGameLine(PgnBuilder.build(listOf("e4", "e5")))
            // Craft evals so e4 is a best move (loss 0) and e5 a blunder (loss 280).
            val canned =
                mapOf(
                    line.fens[0] to Eval(cp = 20, mateIn = null),
                    line.fens[1] to Eval(cp = -20, mateIn = null),
                    line.fens[2] to Eval(cp = 300, mateIn = null),
                )
            val engine = FakeAnalysisEngine(cannedEvals = canned)

            val analyses = engine.analyzeGame(line.fens)

            assertEquals(line.fens.size, analyses.size)
            assertEquals(MoveQuality.BEST, moveQualityAt(analyses, 0))
            assertEquals(MoveQuality.BLUNDER, moveQualityAt(analyses, 1))
        }

    @Test
    fun `eval is formatted from white pov`() {
        val whiteToMove = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        val blackToMove = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
        assertEquals("+0.20", formatEvalWhite(pos(whiteToMove, cp = 20)))
        // Black to move, cp = -20 (Black is worse) -> White is +20.
        assertEquals("+0.20", formatEvalWhite(pos(blackToMove, cp = -20)))
        assertEquals("-1.50", formatEvalWhite(pos(whiteToMove, cp = -150)))
    }

    @Test
    fun `mate score formats from white pov`() {
        val blackToMove = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
        // Black to move and mating in 2 -> White is getting mated: "-M2".
        assertEquals("-M2", formatEvalWhite(PositionAnalysis(blackToMove, Eval(cp = null, mateIn = 2), null, emptyList(), 8)))
    }

    private fun pos(
        fen: String,
        cp: Int,
    ) = PositionAnalysis(fen = fen, eval = Eval(cp = cp, mateIn = null), bestUci = null, pv = emptyList(), depth = 8)
}
