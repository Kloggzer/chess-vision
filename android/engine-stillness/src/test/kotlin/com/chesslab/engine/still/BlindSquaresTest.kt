package com.chesslab.engine.still

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The difference between "your board is wrong" and "I cannot see there".
 *
 * Live on 2026-08-26: the board was correct after `d4 d5`, and the model read b1, f1 and e2 as
 * empty. The alarm fired on them and tracking stopped — on three squares nobody had touched.
 */
class BlindSquaresTest {
    @Test
    fun `one disagreement is noise`() {
        val blind = BlindSquares()
        blind.sawExplained(listOf("b1", "f1", "e2"))
        assertTrue(blind.known().isEmpty())
    }

    @Test
    fun `the same squares over two explained readings are a blind spot`() {
        val blind = BlindSquares()
        blind.sawExplained(listOf("b1", "f1", "e2"))
        blind.sawExplained(listOf("b1", "f1", "e2"))
        assertEquals(setOf("b1", "f1", "e2"), blind.known())
    }

    /** One clean reading proves the square CAN be read, so the count starts over rather than decays. */
    @Test
    fun `a square that reads correctly once is not blind`() {
        val blind = BlindSquares()
        blind.sawExplained(listOf("b1", "f1"))
        blind.sawExplained(listOf("b1"))
        blind.sawExplained(listOf("b1"))
        assertEquals(setOf("b1"), blind.known())
    }

    /** A resync or a new baseline removes the reason to distrust anything. */
    @Test
    fun `forgetting clears the distrust`() {
        val blind = BlindSquares()
        repeat(3) { blind.sawExplained(listOf("e2")) }
        blind.forget()
        assertTrue(blind.known().isEmpty())
    }
}
