package com.chesslab.tracker.ui.tracking

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/**
 * The button has to say what it will take back, because since `TrackerEngine.undo` unwinds the last
 * COMMIT one press is no longer one ply. A user who learned the old behaviour and presses four
 * times after a four-ply recovery unwinds sixteen.
 */
class UndoLabelTest {
    @Test
    fun anOrdinaryCommitLeavesTheControlUnadorned() {
        assertEquals("Undo", undoLabel(emptyList()))
        assertEquals("Undo", undoLabel(listOf("Nf3")))
        assertNull(undoDetail(listOf("Nf3")), "one move needs no spelling out")
    }

    @Test
    fun aBridgeSaysHowManyPliesOnePressTakesBack() {
        val bridge = listOf("Bxb5", "Kb8", "Bd4", "Nf3")
        assertEquals("Undo 4 moves", undoLabel(bridge))
        assertEquals("One press takes back: Bxb5 + Kb8 + Bd4 + Nf3", undoDetail(bridge))
    }
}
