package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** "Nicht gemessen" sah aus wie perfekte Geometrie (`0.0`), und die Zahl wandert in `docs/`. */
class RectifyReceiptTest {
    @Test
    fun `ohne ein einziges Brett steht kein Versatz da, sondern null`() {
        val mean = meanWorstSquareOffset(written = 0, offsetSum = 0.0)

        val receipt = rectifyReceipt("v.mp4", lens = false, size = null, written = emptyList(), missed = listOf(0, 3), mean = mean)

        assertTrue("\"meanWorstSquareOffsetPx\": null" in receipt, receipt)
        assertTrue("0.0" !in receipt, "keine 0,0 als Ersatz fuer eine fehlende Messung: $receipt")
    }

    @Test
    fun `mit Brettern steht der gemessene Mittelwert da`() {
        val mean = meanWorstSquareOffset(written = 2, offsetSum = 2.5)

        val receipt = rectifyReceipt("v.mp4", lens = true, size = 928, written = listOf(0, 3), missed = emptyList(), mean = mean)

        assertTrue("\"meanWorstSquareOffsetPx\": 1.25" in receipt, receipt)
        assertTrue("\"written\": 2" in receipt && "\"missed\": 0" in receipt, receipt)
    }
}
