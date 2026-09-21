package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Die Entartungs-Sperren der Umrechnerei: eine Temperatur, die keine ist, und eine Zeile, von
 *  der die Strafe nichts uebrig laesst. Beide enden sonst in `NaN` oder `Infinity`. */
class PriorGuardsTest {
    @Test
    fun `a temperature of zero divides nothing`() {
        assertEquals(LAMBDA, priorOnTempered(LAMBDA, 0.0), EXACT)
        assertTrue(priorOnTempered(LAMBDA, -1.5).isFinite(), "auch negativ darf nichts explodieren")
    }

    /** Eine Strafe, die die ganze Zeile auf 0 druckt, hat keinen Nenner. Ohne die Sperre kommt
     *  lauter `NaN` zurueck, und `NaN` faellt durch JEDEN Vergleich. */
    @Test
    fun `a penalty that erases the row returns the row it was given`() {
        val classes = listOf("empty", "wP", "wN")
        val probs = doubleArrayOf(0.0, 0.4, 0.6)
        val out = applyPrior(probs, classes, setOf("empty"), lambda = 800.0)

        assertTrue(out.none { it.isNaN() }, "keine NaN-Zeile: ${out.toList()}")
        assertEquals(probs.toList(), out.toList())
    }

    /** `calibratedConfThr` teilte ungeprueft durch die Temperatur: bei 0 kam `NaN`, bei einem
     *  negativen Wert wurde aus 0,85 eine 0,005 — die Richtung, in der Phantome entstehen. */
    @Test
    fun `a temperature that is not one stays the engine's demand`() {
        assertEquals(ENGINE_THR, calibratedConfThr(ENGINE_THR, 0.0, CLASSES), EXACT)
        assertEquals(ENGINE_THR, calibratedConfThr(ENGINE_THR, -1.495, CLASSES), EXACT)
    }

    private companion object {
        const val LAMBDA = 4.0
        const val ENGINE_THR = 0.85
        const val CLASSES = 13
        const val EXACT = 1e-12
    }
}
