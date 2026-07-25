package com.chesslab.tracker.ui.tracking

import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class MoveListModelTest {
    @Test
    fun pairsMovesIntoNumberedRows() {
        val moves =
            listOf(
                MoveEntry("e4", "e2e4", "diff"),
                MoveEntry("e5", "e7e5", "diff"),
                MoveEntry("Nf3", "g1f3", "diff"),
            )
        val rows = moveRows(moves)
        assertEquals(2, rows.size)
        assertEquals(1, rows[0].number)
        assertEquals("e4", rows[0].white?.san)
        assertEquals("e5", rows[0].black?.san)
        assertEquals(2, rows[1].number)
        assertEquals("Nf3", rows[1].white?.san)
        assertNull(rows[1].black)
    }

    @Test
    fun sequenceCommitExpandsToNRows() {
        val event =
            TrackerEvent.SequenceCommitted(
                ucis = listOf("e2e4", "e7e5", "g1f3"),
                sans = listOf("e4", "e5", "Nf3"),
                fenAfter = "",
                decider = "cnn_recovery",
            )
        val entries = movesOf(event)
        assertEquals(3, entries.size)
        assertEquals(listOf("e4", "e5", "Nf3"), entries.map { it.san })
        assertEquals(2, moveRows(entries).size)
        // A position adopted mid-game can start on Black's ply; the numbering must not lie.
        val shifted = moveRows(entries, startsWithBlack = true)
        assertNull(shifted[0].white)
        assertEquals("e4", shifted[0].black?.san)
    }

    @Test
    fun deciderIsCarriedPerMove() {
        val single =
            movesOf(TrackerEvent.MoveCommitted("e2e4", "e4", "fen", "cnn_overrule", priorUsed = true))
        assertEquals(listOf("cnn_overrule"), single.map { it.decider })
        val sequence =
            movesOf(
                TrackerEvent.SequenceCommitted(
                    ucis = listOf("e2e4", "e7e5"),
                    sans = listOf("e4", "e5"),
                    fenAfter = "fen",
                    decider = "recovery",
                ),
            )
        assertTrue(sequence.all { it.decider == "recovery" })
        // Non-commit events contribute nothing to the score sheet.
        assertTrue(movesOf(TrackerEvent.ReAnchored).isEmpty())
        assertTrue(movesOf(TrackerEvent.Note("x")).isEmpty())
    }
}
