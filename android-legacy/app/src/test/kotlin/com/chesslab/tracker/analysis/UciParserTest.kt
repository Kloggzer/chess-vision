package com.chesslab.tracker.analysis

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Tests for [UciParser] on real Stockfish output lines: cp and mate scores,
 * principal variation extraction, bestmove/ponder, `(none)`, and noise lines.
 */
class UciParserTest {
    @Test
    fun `parses cp score depth and pv from a real info line`() {
        val line =
            "info depth 20 seldepth 28 multipv 1 score cp 35 nodes 1930523 nps 1591189 " +
                "hashfull 512 tbhits 0 time 1213 pv e2e4 e7e5 g1f3 b8c6 f1b5"

        val info = UciParser.parseInfo(line)

        assertEquals(20, info?.depth)
        assertEquals(Eval(cp = 35, mateIn = null), info?.eval)
        assertEquals(listOf("e2e4", "e7e5", "g1f3", "b8c6", "f1b5"), info?.pv)
    }

    @Test
    fun `parses negative cp score`() {
        val info = UciParser.parseInfo("info depth 12 score cp -142 nodes 5000 pv d7d5")
        assertEquals(Eval(cp = -142, mateIn = null), info?.eval)
    }

    @Test
    fun `parses mate score`() {
        val line = "info depth 245 seldepth 3 multipv 1 score mate 2 nodes 4322 nps 288133 pv h5f7 e8e7 f7e6"
        val info = UciParser.parseInfo(line)

        assertEquals(Eval(cp = null, mateIn = 2), info?.eval)
        assertEquals("h5f7", info?.pv?.firstOrNull())
    }

    @Test
    fun `parses negative mate score for side getting mated`() {
        val info = UciParser.parseInfo("info depth 10 score mate -3 pv a2a3")
        assertEquals(Eval(cp = null, mateIn = -3), info?.eval)
    }

    @Test
    fun `score with bound suffix still parses`() {
        val info = UciParser.parseInfo("info depth 18 score cp 21 lowerbound nodes 100 pv e2e4")
        assertEquals(Eval(cp = 21, mateIn = null), info?.eval)
    }

    @Test
    fun `info string and currmove noise return null`() {
        assertNull(UciParser.parseInfo("info string NNUE evaluation using nn-1c0000000000.nnue"))
        assertNull(UciParser.parseInfo("info depth 15 currmove e2e4 currmovenumber 1"))
        assertNull(UciParser.parseInfo("readyok"))
        assertNull(UciParser.parseInfo("bestmove e2e4"))
    }

    @Test
    fun `parses bestmove with ponder`() {
        assertEquals("e2e4", UciParser.parseBestMove("bestmove e2e4 ponder e7e5"))
    }

    @Test
    fun `parses bestmove without ponder including promotion`() {
        assertEquals("e7e8q", UciParser.parseBestMove("bestmove e7e8q"))
    }

    @Test
    fun `bestmove none returns null`() {
        assertNull(UciParser.parseBestMove("bestmove (none)"))
    }

    @Test
    fun `non bestmove line returns null`() {
        assertNull(UciParser.parseBestMove("info depth 1 score cp 0 pv e2e4"))
        assertNull(UciParser.parseBestMove("uciok"))
    }

    @Test
    fun `isBestMoveLine flags bestmove lines including none`() {
        assertTrue(UciParser.isBestMoveLine("bestmove e2e4 ponder e7e5"))
        assertTrue(UciParser.isBestMoveLine("bestmove (none)"))
        assertFalse(UciParser.isBestMoveLine("info depth 1 score cp 0"))
    }
}
