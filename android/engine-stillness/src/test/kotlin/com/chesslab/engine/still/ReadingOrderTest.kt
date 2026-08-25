package com.chesslab.engine.still

import com.github.bhlangonijr.chesslib.Square
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * The one mistake in this module that would not announce itself: the search indexes squares by
 * chesslib's `Square.squareAt`, the reading is filled by [BOARD_SQUARES]. If those ever disagree,
 * every move is explained against the wrong square and the result still looks like chess.
 */
class ReadingOrderTest {
    @Test
    fun `the reading order is chesslib's order`() {
        assertEquals(BOARD_SQUARES.size, Square.entries.size - 1)
        BOARD_SQUARES.forEachIndexed { i, name ->
            assertEquals(name.uppercase(), Square.squareAt(i).name, "square $i")
        }
    }

    @Test
    fun `it starts at a1 and ends at h8`() {
        assertEquals("a1", BOARD_SQUARES.first())
        assertEquals("h1", BOARD_SQUARES[7])
        assertEquals("a2", BOARD_SQUARES[8])
        assertEquals("h8", BOARD_SQUARES.last())
    }
}
