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

    @Test
    fun `two sources or zero conflicts yield no guess`() {
        val twoSources = CnnFixtures.rows(CnnFixtures.GUESS).first { it.str("name") == "two_sources" }
        assertNull(guessIllegalMove(twoSources.board(), twoSources.observation(), twoSources.num("confThr")))
        val clean = CnnFixtures.rows(CnnFixtures.GUESS).first { it.str("name") == "no_conflict" }
        assertNull(guessIllegalMove(clean.board(), clean.observation(), clean.num("confThr")))
    }

    /**
     * The shape is occupancy, so the confidence must be too: a destination the classes call 90 %
     * occupied but split between knight and bishop is a destination. Read off the identity axis it
     * was invisible, and the alarm lost its move shape on exactly the squares that matter.
     */
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
        // The shape test — exactly one vacated, exactly one received — never compared piece names,
        // only "empty vs not" on both sides. Stripping identity must therefore change nothing here.
        // It used to return null, which disarmed the alarm on every model this app ships.
        val row = CnnFixtures.rows(CnnFixtures.GUESS).first { it.str("name") == "one_source_one_destination" }
        val withIdentity = guessIllegalMove(row.board(), row.observation(), row.num("confThr"))
        assertEquals(withIdentity, guessIllegalMove(row.board(), row.observation().occupancyOnly(), row.num("confThr")))
        assertNotNull(withIdentity)
    }

    @Test
    fun `an occupancy-only run still refuses a shape that is not one move`() {
        // The discipline is the SHAPE, not the axis. Two vacated squares are not one move, and
        // dropping identity must not turn that into an alarm — otherwise this change would be the
        // "any contradiction alarms" variant that was measured on the clips and rejected.
        for (name in listOf("two_sources", "no_conflict")) {
            val row = CnnFixtures.rows(CnnFixtures.GUESS).first { it.str("name") == name }
            assertNull(guessIllegalMove(row.board(), row.observation().occupancyOnly(), row.num("confThr")), name)
        }
    }

    @Test
    fun `a conflict only in piece type is invisible to both axes`() {
        // Believed pawn, observed knight: occupancy agrees, so it is neither a source nor a
        // destination. The identity axis already ignored it; the occupancy axis cannot even see it.
        val row = CnnFixtures.rows(CnnFixtures.GUESS).first { it.str("name") == "identity_only_conflict" }
        assertNull(guessIllegalMove(row.board(), row.observation(), row.num("confThr")))
        assertNull(guessIllegalMove(row.board(), row.observation().occupancyOnly(), row.num("confThr")))
    }

    @Test
    fun `the seam delegates to the same guess`() {
        val row = CnnFixtures.rows(CnnFixtures.GUESS).first { it.str("name") == "one_source_one_destination" }
        val recovery = recoveryFor(row)
        assertEquals("e2e5", recovery.guessIllegalMove(row.str("fen"), row.observation(), row.num("confThr")))
    }

    private fun board(fen: String): Board = Board().also { it.loadFromFen(fen) }
}
