package com.chesslab.tracker.analysis

import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

class MateLineResolverTest {
    @Test
    fun aTruncatedCachedLineIsExtendedUntilTheBoardIsActuallyMated() =
        runTest {
            val process =
                ScriptedEngineProcess(
                    engineScript(
                        infoLines = listOf("info depth 18 score mate 1 pv h5f7"),
                        bestMove = "bestmove h5f7",
                    ),
                )
            val resolver =
                MateLineResolver(
                    engines = EngineService { UciEngine("fake") { process } },
                    lane = EngineLane.REVIEW,
                    budget = ReviewBudget(nodes = 1, capMs = 50, threads = 1, hashMb = 1),
                )

            val result =
                resolver.resolve(
                    START_FEN,
                    listOf("e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6"),
                )

            assertTrue(result.complete)
            assertEquals("h5f7", result.uciLine.last())
            assertTrue(result.sanLine.last().endsWith("#"))
            assertEquals(7, result.uciLine.size)
        }

    @Test
    fun aHandshakeThatFailsKeepsTheSeedInsteadOfThrowing() =
        runTest {
            val mute = ScriptedEngineProcess(engineScript(emptyList())).apply { dieOn = "uci" }
            val resolver = MateLineResolver(EngineService { UciEngine("fake") { mute } }, EngineLane.LIVE)

            val result = resolver.resolve(START_FEN, listOf("e2e4"))

            assertEquals(listOf("e2e4"), result.uciLine)
            assertEquals(false, result.complete)
        }
}
