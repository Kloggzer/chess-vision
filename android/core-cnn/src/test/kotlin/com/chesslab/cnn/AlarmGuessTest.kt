package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class AlarmGuessTest {
    @Test
    fun `guess_illegal_move matches every golden row`() {
        val rows = CnnFixtures.rows(CnnFixtures.GUESS)
        assertEquals(4, rows.size, "row count")
        for (row in rows) {
            val name = row.str("name")
            val guess = guessIllegalMove(row.board(), row.observation(), row.num("confThr"))
            assertEquals(row.strOrNull("guess"), guess, "$name guess")
        }
    }

    /** The shape is occupancy, so the confidence must be too: on the identity axis a 90 % occupied square split
     *  between knight and bishop was invisible. */
    @Test
    fun `a destination sure in occupancy but split in identity still counts`() {
        val board = Board()
        val rows = LinkedHashMap<String, DoubleArray>()
        for ((sq, label) in expectedLabels(board)) {
            rows[sq] = DoubleArray(PIECES13_CLASSES.size).also { it[PIECES13_CLASSES.indexOf(label)] = 0.99 }
        }
        rows["e2"] = DoubleArray(PIECES13_CLASSES.size).also { it[PIECES13_CLASSES.indexOf("empty")] = 0.99 }
        rows["e4"] =
            DoubleArray(PIECES13_CLASSES.size).also {
                it[PIECES13_CLASSES.indexOf("wN")] = 0.45
                it[PIECES13_CLASSES.indexOf("wB")] = 0.45
                it[PIECES13_CLASSES.indexOf("empty")] = 0.1
            }
        val obs = observationFromProbs(rows, PIECES13_CLASSES)
        assertEquals("e2e4", guessIllegalMove(board, obs, 0.85))
        assertTrue(hasOccupancyConflict(board, obs, 0.85, listOf("e4")))
    }

    @Test
    fun `an occupancy-only run guesses the same move as its identity twin`() {
        // This used to return null, which disarmed the alarm on every model this app ships.
        val row = CnnFixtures.rows(CnnFixtures.GUESS).first { it.str("name") == "one_source_one_destination" }
        val withIdentity = guessIllegalMove(row.board(), row.observation(), row.num("confThr"))
        assertEquals(withIdentity, guessIllegalMove(row.board(), row.observation().occupancyOnly(), row.num("confThr")))
        assertNotNull(withIdentity)
    }

    @Test
    fun `an occupancy-only run still refuses a shape that is not one move`() {
        // The discipline is the SHAPE, not the axis: dropping identity must not become "any contradiction alarms".
        for (name in listOf("two_sources", "no_conflict", "identity_only_conflict")) {
            val row = CnnFixtures.rows(CnnFixtures.GUESS).first { it.str("name") == name }
            assertNull(guessIllegalMove(row.board(), row.observation().occupancyOnly(), row.num("confThr")), name)
        }
    }

    @Test
    fun `the seam delegates to the same guess`() {
        val row = CnnFixtures.rows(CnnFixtures.GUESS).first { it.str("name") == "one_source_one_destination" }
        val recovery = recoveryFor(row)
        assertEquals("e2e5", recovery.guessIllegalMove(row.str("fen"), row.observation(), row.num("confThr")))
    }
}
