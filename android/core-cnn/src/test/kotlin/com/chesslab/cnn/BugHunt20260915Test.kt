package com.chesslab.cnn

import com.chesslab.engine.api.BgrImage
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertNotSame
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

/**
 * Zwei Naehte, an denen `:core-cnn` still das Falsche tut statt laut zu scheitern.
 */
class BugHunt20260915Test {
    @Test
    fun `per-crop normalisation on a non-RGB stack is refused, not silently dropped`() {
        val crops = listOf(crop(SIDE, fill = 10), crop(SIDE, fill = 240))
        val out = FloatArray(crops.size * InputRepr.GRAY_SOBEL.channels * SIDE * SIDE)

        assertThrows(IllegalArgumentException::class.java) {
            preprocessInto(crops, SIDE, SIDE, out, perCrop = true, repr = InputRepr.GRAY_SOBEL)
        }
    }

    @Test
    fun `applyPrior never hands back the caller's row`() {
        val probs = DoubleArray(PIECES13_CLASSES.size) { 1.0 / PIECES13_CLASSES.size }

        val untouched = applyPrior(probs, PIECES13_CLASSES, allowed = null, lambda = 1.0)

        assertNotSame(probs, untouched, "a caller that mutates the result would rewrite the input row")
        assertArrayEquals(probs, untouched, 0.0)
    }

    private fun crop(
        side: Int,
        fill: Int,
    ): BgrImage = BgrImage(side, side, ByteArray(side * side * BGR) { fill.toByte() })

    private companion object {
        const val SIDE = 4
        const val BGR = 3
    }
}
