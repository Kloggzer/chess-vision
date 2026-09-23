package com.chesslab.cnn

import com.chesslab.engine.api.STARTPOS
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
        val obs = FakeSquareClassifier(STARTPOS, overrides = mapOf("b1" to ("wB" to 0.99))).observe()
        assertFalse(
            hasOccupancyConflict(startBoard(), obs, THR, listOf("b1")),
            "wN read as wB is the N/B/R gap, not an illegal move",
        )
    }

    @Test
    fun `an empty-versus-occupied conflict does alarm`() {
        val obs = FakeSquareClassifier(STARTPOS, overrides = mapOf("b1" to ("empty" to 0.99))).observe()
        assertTrue(hasOccupancyConflict(startBoard(), obs, THR, listOf("b1")))
    }

    /** `hasOccupancyConflict` IS the alarm gate: without the confidence question every hand alarms. */
    @Test
    fun `an unconfident conflict square never reaches the alarm`() {
        val unsure = FakeSquareClassifier(STARTPOS, overrides = mapOf("e2" to ("empty" to 0.50))).observe()

        assertFalse(unsure.confident("e2", THR), "0,50 liegt unter der Schwelle")
        assertFalse(unsure.occupied("e2"), "die Zelle wird als leer gelesen")
        assertFalse(hasOccupancyConflict(startBoard(), unsure, THR, listOf("e2")))
    }

    @Test
    fun `an occupancy-only run sees the same occupancy conflict`() {
        // The test compares "expected empty" against "observed empty" and nothing else — the name
        // says so. Only the CONFIDENCE was read off the identity axis, and the null-label guard
        // then discarded every 2-class observation, so no shipped model could ever conflict.
        val obs = FakeSquareClassifier(STARTPOS, overrides = mapOf("b1" to ("empty" to 0.99))).observe()
        assertTrue(hasOccupancyConflict(startBoard(), obs.occupancyOnly(), THR, listOf("b1")))
    }

    @Test
    fun `an occupancy-only run reports no conflict on a board that agrees`() {
        val obs = FakeSquareClassifier(STARTPOS).observe()
        assertFalse(hasOccupancyConflict(startBoard(), obs.occupancyOnly(), THR, listOf("b1")))
    }

    @Test
    fun `a clean board resyncs with full agreement`() {
        val check = CnnRecovery().resyncCheckFull(startBoard(), FakeSquareClassifier(STARTPOS).observe())
        assertTrue(check.match)
        assertTrue(check.conflicts.isEmpty())
        assertNull(check.move)
        assertEquals(1.0, check.agreement)
    }

    @Test
    fun `the seam reports the confident-square count`() {
        val obs = FakeSquareClassifier(STARTPOS).observe()
        val result = CnnRecovery().resyncCheck(STARTPOS, obs)
        assertTrue(result.match)
        assertEquals(ALL_SQUARES.size, result.checked)
    }

    private fun startBoard() = boardOf(STARTPOS)

    private companion object {
        const val THR = 0.85
    }
}
