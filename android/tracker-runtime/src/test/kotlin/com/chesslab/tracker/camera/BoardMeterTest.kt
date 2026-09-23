package com.chesslab.tracker.camera

import com.chesslab.engine.api.BgrImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BoardMeterTest {
    private fun board(value: (row: Int, col: Int) -> Int): BgrImage = lumaBoard(160) { x, y -> value(y / 20, x / 20) }

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
        val r = meterBoard(board { row, _ -> if (row == 0) 255 else 60 })
        assertEquals(0.125f, r.clippedFraction, 1e-3f)
        assertEquals(255f, r.highlightLevel, 0.51f)
    }

    @Test
    fun `saturation is judged per channel, not on luminance`() {
        // Rot bei 255, Luminanz nur 76: auf der Luminanz saehe das nach Luft aus.
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
        val range = ExposureRange(indices = -24..24, stepEv = 1f / 6f)
        val next = nextExposure(ExposureState(), meterBoard(board { _, _ -> 12 }), range.evLimits())
        assertTrue(next != null && next.ev > 0.0)
    }

    /** Die Feldkante kam nur aus der BREITE: ein Index-Fehler statt des `require`. */
    @Test
    fun `a non-square raster is refused by the guard, not by the pixel loop`() {
        val oblong = BgrImage(160, 120, ByteArray(160 * 120 * 3))
        assertThrows(IllegalArgumentException::class.java) { meterSharpness(oblong) }
        assertThrows(IllegalArgumentException::class.java) { meterBoard(oblong) }
    }
}
