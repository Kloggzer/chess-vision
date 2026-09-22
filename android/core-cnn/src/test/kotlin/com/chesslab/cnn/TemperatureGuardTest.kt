package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** `spec.temperature` wird an DREI Stellen gelesen; zwei sperren `<= 0`, `softmaxAt` teilte
 *  ungeprueft. Negativ dreht die Softmax um: der Argmax wird die UNwahrscheinlichste Klasse. */
class TemperatureGuardTest {
    private val logProbs = floatArrayOf(-0.1f, -2.4f, -5.0f, -3.3f)

    @Test
    fun `a temperature of zero leaves the probabilities alone`() {
        val out = softmaxAt(logProbs, 0.0)

        assertTrue(out.all { it.isFinite() }, "0 als Temperatur machte aus jeder Zeile NaN")
        assertArrayEquals(softmax(logProbs), out, EXACT)
    }

    /** Ohne Sperre gewinnt Klasse 2 mit 0,65 — genau die Richtung, in der Phantome entstehen. */
    @Test
    fun `a negative temperature never inverts the argmax`() {
        val plain = softmax(logProbs)
        val out = softmaxAt(logProbs, -T_DEFAULT)

        assertEquals(plain.indices.maxBy { plain[it] }, out.indices.maxBy { out[it] })
        assertArrayEquals(plain, out, EXACT)
    }

    /** Dieselbe Zahl, dieselbe Antwort: was keine Temperatur ist, eicht auch nichts. */
    @Test
    fun `all three readers of the temperature refuse the same values`() {
        for (t in listOf(0.0, -T_DEFAULT, -1.0)) {
            assertEquals(ENGINE_THR, calibratedConfThr(ENGINE_THR, t, CLASSES), EXACT_D, "confThr bei $t")
            assertEquals(LAMBDA, priorOnTempered(LAMBDA, t), EXACT_D, "prior bei $t")
            assertArrayEquals(softmax(logProbs), softmaxAt(logProbs, t), EXACT, "softmax bei $t")
        }
    }

    /** Die Sperre darf keinen ausgelieferten Lauf bewegen: alle sieben liegen ueber 1. */
    @Test
    fun `every shipped temperature still divides exactly as before`() {
        for (t in SHIPPED) {
            val expected = FloatArray(logProbs.size) { (logProbs[it] / t).toFloat() }

            assertArrayEquals(softmaxAt(expected, 1.0), softmaxAt(logProbs, t), EXACT, "T = $t")
        }
    }

    private companion object {
        /** `config.json` der sieben gebundelten Modelle, `p4a-80-clahe` ist die Vorgabe. */
        val SHIPPED = listOf(1.2603, 1.495, 1.5285, 1.5963, 1.6684, 1.7202, 1.7551)
        const val T_DEFAULT = 1.495
        const val ENGINE_THR = 0.85
        const val LAMBDA = 4.0
        const val CLASSES = 13
        const val EXACT = 0f
        const val EXACT_D = 1e-12
    }
}
