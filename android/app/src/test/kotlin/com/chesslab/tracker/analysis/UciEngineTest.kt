package com.chesslab.tracker.analysis

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class UciEngineTest {
    private fun started(script: (String) -> List<String>): Pair<UciEngine, ScriptedEngineProcess> {
        val proc = ScriptedEngineProcess(script)
        val engine = UciEngine("fake") { proc }
        engine.start(threads = 2, hashMb = 64)
        return engine to proc
    }

    @Test
    fun engineOptionsAreThreadsTwoHashSixtyFour() {
        val (_, proc) = started(engineScript(emptyList()))
        assertTrue("setoption name Threads value 2" in proc.commands, proc.commands.toString())
        assertTrue("setoption name Hash value 64" in proc.commands, proc.commands.toString())
    }

    @Test
    fun analyseReturnsOneLinePerMultiPvSlot() {
        val (engine, proc) =
            started(
                engineScript(
                    listOf(
                        "info depth 12 multipv 1 score cp 35 nodes 900 pv e2e4 e7e5",
                        "info depth 12 multipv 2 score cp 12 pv d2d4 d7d5",
                        "info depth 12 multipv 3 score mate 4 pv g1f3 b8c6",
                    ),
                ),
            )
        val lines = engine.analyse("startpos-fen", movetimeMs = 400, multiPv = 3)
        assertEquals(3, lines.size)
        assertEquals(PvLine(35, null, 12, listOf("e2e4", "e7e5")), lines[0])
        assertEquals(PvLine(12, null, 12, listOf("d2d4", "d7d5")), lines[1])
        assertEquals(PvLine(null, 4, 12, listOf("g1f3", "b8c6")), lines[2])
        assertTrue("go movetime 400" in proc.commands)
    }

    @Test
    fun laterInfoLinesReplaceEarlierOnesInTheSameSlot() {
        val (engine, _) =
            started(
                engineScript(
                    listOf(
                        "info depth 4 multipv 1 score cp 10 pv e2e4",
                        "info string NNUE evaluation using nn-x.nnue",
                        "info depth 18 multipv 1 score cp 44 pv d2d4",
                    ),
                ),
            )
        assertEquals(listOf(PvLine(44, null, 18, listOf("d2d4"))), engine.analyse("fen", 400, 1))
    }

    @Test
    fun parsingIgnoresLinesWithoutAScore() {
        assertNull(parseUciInfo("info string hello"))
        assertNull(parseUciInfo("info depth 1 currmove e2e4 currmovenumber 1"))
        assertNull(parseUciInfo("bestmove e2e4"))
        assertTrue(isBestMoveLine("bestmove (none)"))
    }

    @Test
    fun scoresAreWhitePov() {
        // The engine always reports the SIDE TO MOVE. Black to move, "+120" means Black is better.
        assertEquals(-120, PvLine(120, null, 9, listOf("e7e5")).toWhitePov(whiteToMove = false).cp)
        assertEquals(-3, PvLine(null, 3, 9, listOf("e7e5")).toWhitePov(whiteToMove = false).mate)
        assertEquals(120, PvLine(120, null, 9, listOf("e2e4")).toWhitePov(whiteToMove = true).cp)
    }
}
