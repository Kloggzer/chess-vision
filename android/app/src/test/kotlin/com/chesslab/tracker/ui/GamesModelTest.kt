package com.chesslab.tracker.ui

import com.chesslab.tracker.analysis.Eval
import com.chesslab.tracker.analysis.PositionAnalysis
import com.chesslab.tracker.record.PgnBuilder
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Pure games/analysis-model tests: PGN→FEN derivation, White-POV eval conversion, eval-bar
 * clamping and whole-game accuracy — none of which touch a native engine.
 */
class GamesModelTest {
    private fun analysisAt(
        fen: String,
        cp: Int,
    ): PositionAnalysis = PositionAnalysis(fen = fen, eval = Eval(cp = cp, mateIn = null), bestUci = null, pv = emptyList(), depth = 8)

    @Test
    fun `fens derivation aligns with move count`() {
        val sans = listOf("e4", "e5", "Nf3", "Nc6")
        val pgn = PgnBuilder.build(sans)
        val line = parseGameLine(pgn)

        assertEquals(sans, line.sans)
        // One FEN per position: the start plus one after each move.
        assertEquals(sans.size + 1, line.fens.size)
        assertTrue(line.fens.first().startsWith("rnbqkbnr/pppppppp"))
        assertEquals("e2" to "e4", line.moves.first())
    }

    @Test
    fun `white pov cp flips the side-to-move relative score`() {
        // After 1. e4 it is Black to move; a +30 (Black better) score is -30 from White's POV.
        val blackToMove = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
        assertEquals(-30, whitePovCp(analysisAt(blackToMove, cp = 30)))
        val whiteToMove = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        assertEquals(30, whitePovCp(analysisAt(whiteToMove, cp = 30)))
    }

    @Test
    fun `eval bar fraction clamps extreme scores`() {
        assertEquals(0.5f, evalBarFraction(0))
        assertEquals(1f, evalBarFraction(100_000))
        assertEquals(0f, evalBarFraction(-100_000))
        assertTrue(evalBarFraction(400) in 0.5f..1f)
    }

    @Test
    fun `all-equal game grades as full accuracy`() {
        val fens = parseGameLine(PgnBuilder.build(listOf("e4", "e5", "Nf3"))).fens
        val analyses = fens.map { analysisAt(it, cp = 0) }
        assertEquals(100, gameAccuracyPercent(analyses))
    }

    @Test
    fun `accuracy is null without moves`() {
        assertNull(gameAccuracyPercent(listOf(analysisAt("8/8/8/8/8/8/8/8 w - - 0 1", cp = 0))))
    }
}
