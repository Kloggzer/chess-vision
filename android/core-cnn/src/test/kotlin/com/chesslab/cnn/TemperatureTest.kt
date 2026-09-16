package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Die Temperatur macht die Wahrscheinlichkeiten ehrlich, den Argmax laesst sie in Ruhe: alle
 *  sieben Modelle liegen ueber 1, `cnnConfThr` sah sie ungelesen schaerfer als geeicht. */
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

    /** Der Kopf gibt Log-Wahrscheinlichkeiten aus; Softmax ist verschiebungsinvariant, also ist
     *  Teilen durch T dort dasselbe wie auf den rohen Logits — darauf wurde sie gefittet. */
    @Test
    fun `shifting the input leaves the scaled result unchanged`() {
        val shifted = FloatArray(logProbs.size) { logProbs[it] - 7.5f }

        assertArrayEquals(softmaxAt(logProbs, T_SHIPPED), softmaxAt(shifted, T_SHIPPED), TOLERANCE)
    }

    private companion object {
        /** `p4a-80-clahe`, die Vorgabe. */
        const val T_SHIPPED = 1.495
        const val TOLERANCE = 1e-6f
    }
}
