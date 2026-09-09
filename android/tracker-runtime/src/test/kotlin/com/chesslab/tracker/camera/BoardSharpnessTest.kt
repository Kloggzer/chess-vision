package com.chesslab.tracker.camera

import com.chesslab.engine.api.BgrImage
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BoardSharpnessTest {
    private fun board(
        size: Int = 128,
        value: (x: Int, y: Int) -> Int,
    ): BgrImage {
        val data = ByteArray(size * size * 3)
        for (y in 0 until size) {
            for (x in 0 until size) {
                val v = value(x, y).coerceIn(0, 255).toByte()
                val i = (y * size + x) * 3
                data[i] = v
                data[i + 1] = v
                data[i + 2] = v
            }
        }
        return BgrImage(size, size, data)
    }

    /** Ein Schachbrettmuster je Feld: Kanten ueberall, also Varianz ueberall. */
    private fun textured(period: Int) = board { x, y -> if ((x / period + y / period) % 2 == 0) 30 else 220 }

    @Test
    fun `a flat board has no sharpness at all`() {
        assertTrue(meterSharpness(board { _, _ -> 128 }) == 0f)
    }

    @Test
    fun `fine texture reads sharper than coarse`() {
        assertTrue(meterSharpness(textured(2)) > meterSharpness(textured(8)))
    }

    @Test
    fun `blurring the same board lowers the reading`() {
        val sharp = textured(4)
        val soft = blurred(sharp)
        assertTrue(meterSharpness(soft) < meterSharpness(sharp) * 0.5f) {
            "scharf ${meterSharpness(sharp)}, weich ${meterSharpness(soft)}"
        }
    }

    @Test
    fun `a hand over a corner does not move the median`() {
        val clean = textured(4)
        // Texturlos ueber sechzehn Felder — genau der Fall, an dem eine Ganzbild-Varianz kippt.
        val covered =
            board { x, y ->
                when {
                    x < 64 && y < 64 -> 90
                    (x / 4 + y / 4) % 2 == 0 -> 30
                    else -> 220
                }
            }
        val drop = meterSharpness(covered) / meterSharpness(clean)
        assertTrue(drop > 0.9f) { "Median fiel auf $drop" }
    }

    @Test
    fun `a board smaller than the grid is refused`() {
        val e = runCatching { meterSharpness(BgrImage(16, 16, ByteArray(16 * 16 * 3))) }.exceptionOrNull()
        assertTrue(e is IllegalArgumentException)
    }

    /** 3x3-Kastenfilter, der billigste Weg zu einem nachweislich weicheren Bild. */
    private fun blurred(source: BgrImage): BgrImage {
        val out = ByteArray(source.data.size)
        val w = source.width
        for (y in 0 until source.height) {
            for (x in 0 until w) {
                var sum = 0
                for (dy in -1..1) {
                    for (dx in -1..1) {
                        val sx = (x + dx).coerceIn(0, w - 1)
                        val sy = (y + dy).coerceIn(0, source.height - 1)
                        sum += source.data[(sy * w + sx) * 3].toInt() and 0xFF
                    }
                }
                val v = (sum / 9).toByte()
                val i = (y * w + x) * 3
                out[i] = v
                out[i + 1] = v
                out[i + 2] = v
            }
        }
        return BgrImage(w, source.height, out)
    }
}
