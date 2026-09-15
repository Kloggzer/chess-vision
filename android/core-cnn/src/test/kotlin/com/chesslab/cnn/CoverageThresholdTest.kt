package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Die Verdeckungsschwelle ist GEMESSEN (`coverage_gate` je Modell, 0,05 bis 0,35) und hing hier am
 * Klassen-Schwellwert: `1.0 - thr`. Zwei Schwellen fuer eine Frage, und `cnnConfThr` zu senken
 * lockerte die Verdeckung mit. `Taint.kt` beantwortete dieselbe Frage laengst mit der Messung.
 */
class CoverageThresholdTest {
    @Test
    fun `without a measured gate the class threshold still decides`() {
        assertFalse(obs(pOccluded = 0.20).confident("e4", THR), "0,20 liegt ueber 1 - 0,85")
        assertTrue(obs(pOccluded = 0.10).confident("e4", THR))
    }

    @Test
    fun `the measured gate replaces it, in both directions`() {
        val square = obs(pOccluded = 0.20)

        assertTrue(square.withCoverageThr(0.35).confident("e4", THR), "das 128er Modell misst 0,35")
        assertFalse(square.withCoverageThr(0.05).confident("e4", THR), "die drei p4-Laeufe messen 0,05")
    }

    @Test
    fun `lowering the class threshold no longer loosens the coverage gate`() {
        val square = obs(pOccluded = 0.20).withCoverageThr(0.25)

        assertTrue(square.confident("e4", THR))
        assertTrue(square.confident("e4", 0.60), "0,60 wuerde als 1 - thr = 0,40 durchlassen")
    }

    @Test
    fun `labelConfident carries the same gate`() {
        assertFalse(obs(pOccluded = 0.30).withCoverageThr(0.25).labelConfident("e4", THR))
        assertTrue(obs(pOccluded = 0.20).withCoverageThr(0.25).labelConfident("e4", THR))
    }

    private fun obs(pOccluded: Double) =
        OccupancyObservation(
            pOcc = mapOf("e4" to 0.95),
            pEmpty = mapOf("e4" to 0.05),
            pOccluded = mapOf("e4" to pOccluded),
            label = mapOf("e4" to "wP"),
            conf = mapOf("e4" to 0.95),
        )

    private companion object {
        const val THR = 0.85
    }
}
