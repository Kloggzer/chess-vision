package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Alle sieben Modelle liegen ueber T = 1: `cnnConfThr` sah sie ungelesen schaerfer als geeicht. */
class TemperatureTest {
    private val logProbs = floatArrayOf(-0.1f, -2.4f, -5.0f, -3.3f)

    @Test
    fun `a temperature of one is the plain softmax`() {
        assertArrayEquals(softmax(logProbs), softmaxAt(logProbs, 1.0), 0f)
    }

    @Test
    fun `a fitted temperature above one flattens without moving the winner`() {
        val plain = softmax(logProbs)
        val scaled = softmaxAt(logProbs, T_SHIPPED)

        assertEquals(plain.indices.maxBy { plain[it] }, scaled.indices.maxBy { scaled[it] })
        assertTrue(scaled.max() < plain.max(), "ueberkonfident heisst: die Spitze muss sinken")
        assertEquals(1.0f, scaled.sum(), TOLERANCE)
    }

    /** Softmax ist verschiebungsinvariant: Teilen durch T auf Log-Wahrscheinlichkeiten ist dasselbe wie auf
     *  den rohen Logits, auf denen sie gefittet wurde. */
    @Test
    fun `shifting the input leaves the scaled result unchanged`() {
        val shifted = FloatArray(logProbs.size) { logProbs[it] - 7.5f }

        assertArrayEquals(softmaxAt(logProbs, T_SHIPPED), softmaxAt(shifted, T_SHIPPED), TOLERANCE)
    }

    /** Negativ wird der Argmax die UNwahrscheinlichste Klasse, bei 0 jede Zeile NaN, und 0,85 wird 0,005. */
    @Test
    fun `all three readers of the temperature refuse the same values`() {
        for (t in listOf(0.0, -T_SHIPPED, -1.0)) {
            assertEquals(ENGINE_THR, calibratedConfThr(ENGINE_THR, t, CLASSES), EXACT_D, "confThr bei $t")
            assertEquals(LAMBDA, priorOnTempered(LAMBDA, t), EXACT_D, "prior bei $t")
            assertArrayEquals(softmax(logProbs), softmaxAt(logProbs, t), 0f, "softmax bei $t")
        }
    }

    @Test
    fun `every shipped temperature still divides exactly as before`() {
        for (t in SHIPPED) {
            val expected = FloatArray(logProbs.size) { (logProbs[it] / t).toFloat() }

            assertArrayEquals(softmaxAt(expected, 1.0), softmaxAt(logProbs, t), 0f, "T = $t")
        }
    }

    @Test
    fun `a temperature of one leaves the threshold alone`() {
        assertEquals(ENGINE_THR, calibratedConfThr(ENGINE_THR, 1.0, CLASSES), EXACT_D)
    }

    /** Am Regressionssatz: mit T = 1,495 und dieser Schwelle ist der Lauf Ziffer fuer Ziffer die Referenz. */
    @Test
    fun `the default model's 0_85 is really 0_58`() {
        assertEquals(0.584, calibratedConfThr(ENGINE_THR, T_SHIPPED, CLASSES), 0.001)
    }

    @Test
    fun `a more overconfident model needs a lower number for the same demand`() {
        val mild = calibratedConfThr(ENGINE_THR, SHIPPED.first(), CLASSES)
        val sharp = calibratedConfThr(ENGINE_THR, SHIPPED.last(), CLASSES)

        assertTrue(sharp < mild, "je ueberkonfidenter, desto tiefer liegt dieselbe Forderung")
        assertEquals(0.703, mild, 0.001)
        assertEquals(0.480, sharp, 0.001)
    }

    private companion object {
        val SHIPPED = listOf(1.2603, 1.495, 1.5285, 1.5963, 1.6684, 1.7202, 1.7551)
        const val T_SHIPPED = 1.495
        const val ENGINE_THR = 0.85
        const val LAMBDA = 4.0
        const val CLASSES = 13
        const val TOLERANCE = 1e-6f
        const val EXACT_D = 1e-12
    }
}
