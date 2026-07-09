package com.chesslab.tracker.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class OccupancyObservationTest {
    private val classes = listOf("empty", "wP", "bK", "occluded")

    @Test
    fun `derives occupancy and identity from probs`() {
        val obs =
            OccupancyObservation.fromProbs(
                mapOf(
                    "e2" to floatArrayOf(0.02f, 0.95f, 0.02f, 0.01f),
                    "e4" to floatArrayOf(0.94f, 0.03f, 0.02f, 0.01f),
                ),
                classes,
            )
        assertTrue(obs.occupied("e2"))
        assertFalse(obs.occupied("e4"))
        assertEquals("wP", obs.label["e2"])
        assertEquals("empty", obs.label["e4"])
        assertEquals(0.95, obs.conf.getValue("e2"), 1e-6)
        // pOcc = 1 - pEmpty - pOccluded (sum of the piece classes).
        assertEquals(0.97, obs.pOcc.getValue("e2"), 1e-6)
    }

    @Test
    fun `works without an occluded class (13-class run)`() {
        val obs =
            OccupancyObservation.fromProbs(
                mapOf("a1" to floatArrayOf(0.1f, 0.8f, 0.1f)),
                listOf("empty", "wP", "bK"),
            )
        assertEquals(0.0, obs.pOccluded.getValue("a1"))
        assertTrue(obs.occupied("a1"))
    }

    @Test
    fun `occluded-dominant squares are never confident`() {
        val obs =
            OccupancyObservation(
                pOcc = mapOf("d4" to 0.9),
                pEmpty = mapOf("d4" to 0.05),
                pOccluded = mapOf("d4" to 0.2),
                label = mapOf("d4" to "wP"),
                conf = mapOf("d4" to 0.9),
            )
        // Occupancy is confident-high, but pOccluded >= 1 - thr blocks confidence.
        assertFalse(obs.confident(0.85).getValue("d4"))
    }

    @Test
    fun `confidence needs a dominant occupancy statement`() {
        val obs =
            OccupancyObservation.fromProbs(
                mapOf(
                    "b2" to floatArrayOf(0.9f, 0.05f, 0.04f, 0.01f),
                    "b3" to floatArrayOf(0.5f, 0.45f, 0.04f, 0.01f),
                ),
                classes,
            )
        val conf = obs.confident(0.85)
        assertTrue(conf.getValue("b2"))
        assertFalse(conf.getValue("b3"))
    }

    @Test
    fun `label confidence excludes occluded label`() {
        val obs =
            OccupancyObservation(
                pOcc = mapOf("a1" to 0.9, "a2" to 0.1),
                pEmpty = mapOf("a1" to 0.05, "a2" to 0.05),
                pOccluded = mapOf("a1" to 0.05, "a2" to 0.85),
                label = mapOf("a1" to "wR", "a2" to "occluded"),
                conf = mapOf("a1" to 0.9, "a2" to 0.99),
            )
        val lc = obs.labelConfident(0.85)
        assertTrue(lc.getValue("a1"))
        assertFalse(lc.getValue("a2"))
    }
}
