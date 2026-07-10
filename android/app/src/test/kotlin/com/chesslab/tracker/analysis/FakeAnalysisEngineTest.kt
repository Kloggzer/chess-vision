package com.chesslab.tracker.analysis

import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

/**
 * Tests for [FakeAnalysisEngine]: canned evals, neutral default, and
 * [AnalysisEngine.analyzeGame] alignment with the input FEN list.
 */
class FakeAnalysisEngineTest {
    private val startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    private val afterE4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"

    @Test
    fun `returns canned eval and best move for known fen`() =
        runTest {
            val engine =
                FakeAnalysisEngine(
                    cannedEvals = mapOf(startFen to Eval(cp = 30, mateIn = null)),
                    cannedBestMoves = mapOf(startFen to "e2e4"),
                )

            val analysis = engine.analyze(startFen)

            assertEquals(Eval(cp = 30, mateIn = null), analysis.eval)
            assertEquals("e2e4", analysis.bestUci)
            assertEquals(listOf("e2e4"), analysis.pv)
            assertEquals(AnalysisEngine.DEFAULT_DEPTH, analysis.depth)
        }

    @Test
    fun `unknown fen evaluates to neutral zero`() =
        runTest {
            val analysis = FakeAnalysisEngine().analyze(afterE4, depth = 8)

            assertEquals(Eval(cp = 0, mateIn = null), analysis.eval)
            assertEquals(null, analysis.bestUci)
            assertEquals(8, analysis.depth)
        }

    @Test
    fun `analyzeGame aligns outputs to input fens`() =
        runTest {
            val engine = FakeAnalysisEngine(cannedEvals = mapOf(afterE4 to Eval(cp = -20, mateIn = null)))
            val fens = listOf(startFen, afterE4, startFen)

            val results = engine.analyzeGame(fens)

            assertEquals(fens.size, results.size)
            assertEquals(fens, results.map { it.fen })
            assertEquals(Eval(cp = 0, mateIn = null), results[0].eval)
            assertEquals(Eval(cp = -20, mateIn = null), results[1].eval)
        }
}
