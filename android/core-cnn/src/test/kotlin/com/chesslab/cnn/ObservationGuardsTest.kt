package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Die kleinen Sperren um die Beobachtung herum: Randwerte, Vorgabewerte und die Frage, ob die
 *  gemessene Verdeckungsschwelle auch auf der ROHEN Zeile ankommt. */
class ObservationGuardsTest {
    /** `coveredOut` vergleicht mit `>=`: die gemessene Schwelle ist erreicht, nicht erst ueberschritten. */
    @Test
    fun `a square exactly at the measured gate is already covered`() {
        val exactly = single(pOcc = 0.95, pEmpty = 0.05, pOccluded = 0.25).withCoverageThr(0.25)
        assertFalse(exactly.confident("e4", THR), "0,25 IST die Schwelle, nicht der letzte gute Wert")
        assertTrue(single(pOcc = 0.95, pEmpty = 0.05, pOccluded = 0.24).withCoverageThr(0.25).confident("e4", THR))
    }

    /**
     * Ohne Nebenbester ist die Antwort 1,0 und nicht 0,0: `runnerUpConf` existiert, um eine
     * automatische Umwandlung ABZULEHNEN, und wer nichts weiss, lehnt ab.
     */
    @Test
    fun `a missing runner-up rejects rather than waves through`() {
        assertEquals(1.0, single().runnerUpConf("e4"), EXACT)
        assertEquals(0.0, single().conf("e4"), EXACT)
    }

    /**
     * `withCoverageThr` muss die ROHE Zeile mitnehmen. Die Wiederherstellung liest ueber
     * `rawObservation()` an der bedingten Sicht vorbei, und dort galt sonst weiter `1.0 - thr`.
     */
    @Test
    fun `the measured gate reaches the raw observation too`() {
        val conditioned = priored().withCoverageThr(0.05)
        val raw = conditioned.rawObservation()

        assertNotNull(conditioned.raw, "der Vorflug braucht eine rohe Zeile")
        assertFalse(raw.confident("e4", THR), "0,10 liegt ueber dem gemessenen Tor 0,05")
        assertTrue(priored().rawObservation().confident("e4", THR), "unter `1 - thr` waere sie sicher")
    }

    /** Die Summe der zwoelf Figurenklassen wird bei 0 gekappt: Float-Drift darf keine negative
     *  Belegungsmasse erzeugen, die dann durch jeden Vergleich faellt. */
    @Test
    fun `the piece mass is clamped against float drift`() {
        val classes = EXPECTED_CLASSES
        val row = DoubleArray(classes.size)
        row[classes.indexOf("empty")] = 0.6
        row[classes.indexOf("occluded")] = 0.6
        val obs = observationFromProbs(mapOf("e4" to row), classes)

        assertEquals(0.0, obs.pOcc.getValue("e4"), EXACT)
    }

    private fun priored(): OccupancyObservation {
        val row = DoubleArray(PIECES13_CLASSES.size + 1)
        row[PIECES13_CLASSES.indexOf("wQ")] = 0.99
        row[PIECES13_CLASSES.size] = 0.10
        return observationFromProbs(
            mapOf("e4" to row),
            PIECES13_CLASSES,
            possible = mapOf("e4" to setOf("wQ", "empty")),
            priorLambda = 4.0,
        )
    }

    private fun single(
        pOcc: Double = 0.0,
        pEmpty: Double = 0.0,
        pOccluded: Double = 0.0,
    ) = OccupancyObservation(
        pOcc = mapOf("e4" to pOcc),
        pEmpty = mapOf("e4" to pEmpty),
        pOccluded = mapOf("e4" to pOccluded),
    )

    private companion object {
        const val THR = 0.85
        const val EXACT = 1e-12
    }
}
