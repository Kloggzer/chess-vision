package com.chesslab.tracker.camera

import com.chesslab.engine.api.BgrImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BoardMeterTest {
    private fun board(
        size: Int = 160,
        value: (row: Int, col: Int) -> Int,
    ): BgrImage {
        val cell = size / 8
        val data = ByteArray(size * size * 3)
        for (y in 0 until size) {
            for (x in 0 until size) {
                val v = value(y / cell, x / cell).coerceIn(0, 255).toByte()
                val i = (y * size + x) * 3
                data[i] = v
                data[i + 1] = v
                data[i + 2] = v
            }
        }
        return BgrImage(size, size, data)
    }

    @Test
    fun `each cell gets its own mean`() {
        val r = meterBoard(board { row, col -> row * 8 + col })
        assertEquals(0f, r.cellMeans[0], 0.51f)
        assertEquals(63f, r.cellMeans[63], 0.51f)
    }

    @Test
    fun `a flat board reads flat`() {
        val r = meterBoard(board { _, _ -> 100 })
        assertTrue(r.cellMeans.all { kotlin.math.abs(it - 100f) < 1f })
        assertEquals(0f, r.clippedFraction, 1e-6f)
    }

    @Test
    fun `saturation is counted`() {
        // Acht von 64 Feldern ausgebrannt = 12,5 % der Flaeche.
        val r = meterBoard(board { row, _ -> if (row == 0) 255 else 60 })
        assertEquals(0.125f, r.clippedFraction, 1e-3f)
        assertEquals(255f, r.highlightLevel, 0.51f)
    }

    @Test
    fun `saturation is judged per channel, not on luminance`() {
        // Rot bei 255, Luminanz nur 76: auf der Luminanz gerechnet saehe das nach Luft aus.
        val size = 160
        val data = ByteArray(size * size * 3)
        for (i in 0 until size * size) data[i * 3 + 2] = 255.toByte()
        val r = meterBoard(BgrImage(size, size, data))
        assertEquals(1f, r.clippedFraction, 1e-3f) { "der rote Kanal ist ausgebrannt" }
        assertTrue(r.cellMeans[0] < 100f) { "die Luminanz bleibt niedrig: ${r.cellMeans[0]}" }
    }

    @Test
    fun `the highlight anchor sits below the top two percent`() {
        val r = meterBoard(board { row, _ -> if (row == 0) 250 else 40 })
        assertTrue(r.highlightLevel >= 250f) { "Anker ${r.highlightLevel}" }
    }

    @Test
    fun `a board smaller than the grid is refused`() {
        val e = runCatching { meterBoard(BgrImage(4, 4, ByteArray(4 * 4 * 3))) }.exceptionOrNull()
        assertTrue(e is IllegalArgumentException)
    }

    @Test
    fun `metering feeds the policy`() {
        // Die Naht selbst: ein dunkles Brett muss durch die Messung hindurch zu mehr Licht fuehren.
        val range = ExposureRange(indices = -24..24, stepEv = 1f / 6f)
        val next = nextExposure(ExposureState(), meterBoard(board { _, _ -> 12 }), range.evLimits())
        assertTrue(next != null && next.ev > 0.0)
    }
}
