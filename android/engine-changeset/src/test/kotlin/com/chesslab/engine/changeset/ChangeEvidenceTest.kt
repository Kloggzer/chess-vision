package com.chesslab.engine.changeset

import com.chesslab.engine.board.BOARD_PX
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The board picture runs rank 8 down to rank 1; a square index counts up from `a1`.
 *
 * Getting this backwards is a tracker that looks entirely plausible and commits mirrored moves, so
 * it is asserted rather than trusted.
 */
class ChangeEvidenceTest {
    @Test
    fun `a1 is the bottom left cell of the picture`() {
        assertEquals(56, ChangeEvidence.deltaIndexOf(0))
    }

    @Test
    fun `h8 is the top right cell`() {
        assertEquals(7, ChangeEvidence.deltaIndexOf(63))
    }

    @Test
    fun `e2 and e4 sit one above the other in the same file`() {
        val e2 = ChangeEvidence.deltaIndexOf(12)
        val e4 = ChangeEvidence.deltaIndexOf(28)
        assertEquals(e2 % 8, e4 % 8, "same file")
        assertEquals(2, e2 / 8 - e4 / 8, "two ranks apart, e4 higher up the picture")
    }

    @Test
    fun `names round-trip through the index`() {
        assertEquals("a1", ChangeEvidence.nameOf(0))
        assertEquals("e4", ChangeEvidence.nameOf(28))
        assertEquals("h8", ChangeEvidence.nameOf(63))
    }

    /** A picture that differs on exactly one cell must name exactly that square. */
    @Test
    fun `one changed cell is found by name`() {
        val flat = ByteArray(BOARD_PX * BOARD_PX) { 60 }
        val marked = flat.copyOf()
        paint(marked, "d4")
        val changed = ChangeEvidence.of(flat, marked).changed().map(ChangeEvidence::nameOf)
        assertEquals(listOf("d4"), changed)
    }

    /** Light that moves every cell together is not change — the median subtraction eats it. */
    @Test
    fun `a uniform brightness shift is not change`() {
        val dim = ByteArray(BOARD_PX * BOARD_PX) { 60 }
        val bright = ByteArray(BOARD_PX * BOARD_PX) { 90 }
        assertTrue(ChangeEvidence.of(dim, bright).changed().isEmpty())
    }

    private fun paint(
        picture: ByteArray,
        square: String,
    ) {
        val index =
            ChangeEvidence.deltaIndexOf(
                ChangeEvidence.SQUARES.let {
                    (0 until it).first { i ->
                        ChangeEvidence.nameOf(i) == square
                    }
                },
            )
        val cell = BOARD_PX / 8
        val x0 = (index % 8) * cell
        val y0 = (index / 8) * cell
        for (y in y0 until y0 + cell) {
            for (x in x0 until x0 + cell) picture[y * BOARD_PX + x] = 220.toByte()
        }
    }
}
