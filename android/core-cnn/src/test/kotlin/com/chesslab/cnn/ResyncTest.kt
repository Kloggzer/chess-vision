package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ResyncTest {
    @Test
    fun `resync_check matches every golden row`() {
        val rows = CnnFixtures.rows(CnnFixtures.RESYNC)
        assertEquals(3, rows.size, "row count")
        for (row in rows) {
            val name = row.str("name")
            val check = recoveryFor(row).resyncCheckFull(row.board(), row.observation())
            assertEquals(row.bool("match"), check.match, "$name match")
            assertEquals(row.strings("conflicts"), check.conflicts, "$name conflicts")
            assertEquals(row.strOrNull("move"), check.move, "$name move")
            assertClose(row.num("agreement"), check.agreement, "$name agreement")
        }
    }

    @Test
    fun `has_occupancy_conflict matches every golden row`() {
        val rows = CnnFixtures.rows(CnnFixtures.RESYNC) + CnnFixtures.rows(CnnFixtures.GUESS)
        assertEquals(7, rows.size, "row count")
        for (row in rows) {
            val name = row.str("name")
            val actual =
                hasOccupancyConflict(row.board(), row.observation(), row.num("confThr"), row.strings("conflicts"))
            assertEquals(row.bool("hasOccupancyConflict"), actual, "$name hasOccupancyConflict")
        }
    }

    @Test
    fun `an identity-only conflict must never alarm`() {
        val obs = FakeSquareClassifier(START_FEN, overrides = mapOf("b1" to ("wB" to 0.99))).observe()
        assertFalse(
            hasOccupancyConflict(startBoard(), obs, THR, listOf("b1")),
            "wN read as wB is the N/B/R gap, not an illegal move",
        )
    }

    @Test
    fun `an empty-versus-occupied conflict does alarm`() {
        val obs = FakeSquareClassifier(START_FEN, overrides = mapOf("b1" to ("empty" to 0.99))).observe()
        assertTrue(hasOccupancyConflict(startBoard(), obs, THR, listOf("b1")))
    }

    @Test
    fun `without identity there is no occupancy conflict`() {
        val obs = FakeSquareClassifier(START_FEN, overrides = mapOf("b1" to ("empty" to 0.99))).observe()
        assertFalse(hasOccupancyConflict(startBoard(), obs.occupancyOnly(), THR, listOf("b1")))
    }

    @Test
    fun `a clean board resyncs with full agreement`() {
        val check = CnnRecovery().resyncCheckFull(startBoard(), FakeSquareClassifier(START_FEN).observe())
        assertTrue(check.match)
        assertTrue(check.conflicts.isEmpty())
        assertNull(check.move)
        assertEquals(1.0, check.agreement)
    }

    @Test
    fun `the seam reports the confident-square count`() {
        val obs = FakeSquareClassifier(START_FEN).observe()
        val result = CnnRecovery().resyncCheck(startBoard(), obs)
        assertTrue(result.match)
        assertEquals(ALL_SQUARES.size, result.checked)
    }

    private companion object {
        const val THR = 0.85
        const val START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

        fun startBoard(): Board = Board().also { it.loadFromFen(START_FEN) }
    }
}
