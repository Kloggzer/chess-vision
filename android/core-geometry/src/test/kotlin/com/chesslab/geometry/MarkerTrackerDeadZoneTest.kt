package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.math.abs

/** Drei Sperren des Glaetters, die kein Paritaets-Satz beruehrt: der Rand der Totzone, ihr
 *  MASS, und ob ein bloss gesaeter Punkt sich als gehalten ausgibt. */
class MarkerTrackerDeadZoneTest {
    /** "at or below this freezes" — genau auf der Schwelle steht die Ecke noch still. */
    @Test
    fun `a move exactly on the threshold still freezes`() {
        val tracker = live()
        tracker.update(mapOf(0 to doubleArrayOf(104.0, 200.0)))

        assertEquals(100.0, tracker.points().getValue(0)[0], EXACT, "4,0 ist die Totzone, nicht ihr Ende")
    }

    /**
     * Die Distanz ist L1, nicht euklidisch. `(2,5 | 2,5)` ist mit L1 eine Bewegung (5,0) und
     * euklidisch keine (3,54) — wer das Mass tauscht, friert echte Bewegung ein.
     */
    @Test
    fun `the dead zone is measured in L1, not euclidean`() {
        val tracker = live()
        tracker.update(mapOf(0 to doubleArrayOf(102.5, 202.5)))

        assertTrue(abs(tracker.points().getValue(0)[0] - 100.0) > EXACT, "L1 5,0 liegt ausserhalb der Totzone")
    }

    /** Ein gesaeter Punkt ist weder live noch gehalten — er ist unbestaetigt. */
    @Test
    fun `a seeded corner counts as neither live nor held`() {
        val tracker = MarkerTracker()
        tracker.seed((0..3).associateWith { doubleArrayOf(it * 10.0, 0.0) })

        assertEquals(0, tracker.nHeld(), "gesaet ist keine gehaltene Messung")
        assertEquals(0, tracker.nLive())
        assertEquals(MarkerStatus.SEED, tracker.status(0))
    }

    /** Ein Marker, der EINMAL live gesehen wurde — danach gilt die Totzone. */
    private fun live(): MarkerTracker = MarkerTracker().also { it.update(mapOf(0 to doubleArrayOf(100.0, 200.0))) }

    private companion object {
        const val EXACT = 1e-9
    }
}
