package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** `hasOccupancyConflict` IST das Alarmtor: stimmt die Belegung nicht, UND ist das Feld
 *  verlaesslich gelesen. Ohne die zweite Frage alarmiert jede Hand. */
class AlarmGateTest {
    @Test
    fun `an unconfident conflict square never reaches the alarm`() {
        val board = Board()
        val unsure = obs(conf = 0.50)

        assertFalse(unsure.confident("e2", THR), "0,50 liegt unter der Schwelle")
        assertTrue(unsure.occupied("e2").not(), "die Zelle wird als leer gelesen")
        assertFalse(
            hasOccupancyConflict(board, unsure, THR, listOf("e2")),
            "ein unsicheres Feld ist kein Beleg fuer einen illegalen Zug",
        )
    }

    @Test
    fun `the same conflict read with confidence does alarm`() {
        assertTrue(hasOccupancyConflict(Board(), obs(conf = 0.99), THR, listOf("e2")))
    }

    private fun obs(conf: Double) = FakeSquareClassifier(START_FEN, overrides = mapOf("e2" to ("empty" to conf))).observe()

    private companion object {
        const val THR = 0.85
        const val START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    }
}
