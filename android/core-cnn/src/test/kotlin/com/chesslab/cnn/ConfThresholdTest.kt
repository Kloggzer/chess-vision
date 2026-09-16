package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Die 0,85 bedeutete fuer jedes der sieben Modelle etwas anderes, weil jedes anders
 * ueberkonfident ist. Kalibriert heisst dieselbe Menge Felder je Modell eine andere Zahl.
 */
class ConfThresholdTest {
    @Test
    fun `a temperature of one leaves the threshold alone`() {
        assertEquals(0.85, calibratedConfThr(0.85, 1.0, CLASSES), EXACT)
    }

    /** Gemessen am Regressionssatz: mit T = 1,495 und dieser Schwelle ist der Lauf Ziffer fuer
     *  Ziffer die Referenz (385/14/1/167 bei 6 Alarmen, 2026-09-16). */
    @Test
    fun `the default model's 0_85 is really 0_58`() {
        assertEquals(0.584, calibratedConfThr(0.85, 1.495, CLASSES), 0.001)
    }

    @Test
    fun `a more overconfident model needs a lower number for the same demand`() {
        val mild = calibratedConfThr(0.85, 1.2603, CLASSES)
        val sharp = calibratedConfThr(0.85, 1.7551, CLASSES)

        assertTrue(sharp < mild, "je ueberkonfidenter, desto tiefer liegt dieselbe Forderung")
        assertEquals(0.703, mild, 0.001)
        assertEquals(0.480, sharp, 0.001)
    }

    private companion object {
        const val CLASSES = 13
        const val EXACT = 1e-12
    }
}
