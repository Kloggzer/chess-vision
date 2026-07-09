package com.chesslab.tracker.ui

import com.chesslab.engine.STARTPOS
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class ChessBoardTest {
    @Test
    fun `start position places all 32 pieces on the right squares`() {
        val placement = parseFenPlacement(STARTPOS)
        assertEquals(32, placement.size)
        assertEquals('R', placement["a1"])
        assertEquals('K', placement["e1"])
        assertEquals('p', placement["d7"])
        assertEquals('k', placement["e8"])
        assertNull(placement["e4"])
    }

    @Test
    fun `empty runs are skipped`() {
        val placement = parseFenPlacement("8/8/8/4p3/8/8/8/8 w - - 0 1")
        assertEquals(mapOf("e5" to 'p'), placement)
    }
}
