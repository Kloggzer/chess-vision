package com.chesslab.cnn

import com.chesslab.engine.api.BgrImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.math.abs
import kotlin.math.ln

class PreprocessTest {
    @Test
    fun `a 2x2 BGR crop becomes the expected NCHW float sequence`() {
        // Pixel order is BGR; the four pixels are (0,0,0) (255,255,255) (10,20,30) (200,100,50).
        val bytes =
            byteArrayOf(
                0,
                0,
                0,
                -1,
                -1,
                -1,
                10,
                20,
                30,
                -56,
                100,
                50,
            )
        val out = preprocess(listOf(BgrImage(2, 2, bytes)), 2, 2)
        assertEquals(12, out.size, "1 * 3 * 2 * 2")
        val blue = intArrayOf(0, 255, 10, 200)
        val green = intArrayOf(0, 255, 20, 100)
        val red = intArrayOf(0, 255, 30, 50)
        for (i in 0 until 4) {
            assertNear(norm(red[i], 0), out[i], "R[$i]")
            assertNear(norm(green[i], 1), out[4 + i], "G[$i]")
            assertNear(norm(blue[i], 2), out[8 + i], "B[$i]")
        }
    }

    @Test
    fun `a wrong-sized crop is a programming error`() {
        assertThrows<IllegalArgumentException> {
            preprocess(listOf(BgrImage(2, 2, ByteArray(12))), 4, 4)
        }
    }

    @Test
    fun `softmax of log-probabilities reproduces the probabilities`() {
        val probs = floatArrayOf(0.1f, 0.65f, 0.2f, 0.05f)
        val logProbs = FloatArray(probs.size) { ln(probs[it].toDouble()).toFloat() }
        val back = softmax(logProbs)
        for (i in probs.indices) assertNear(probs[i], back[i], "softmax[$i]")
    }

    @Test
    fun `EXPECTED_CLASSES is the canonical 14-class order`() {
        assertEquals(14, EXPECTED_CLASSES.size)
        assertEquals("empty", EXPECTED_CLASSES.first())
        assertEquals("occluded", EXPECTED_CLASSES.last())
        assertEquals(listOf("wP", "wN", "wB", "wR", "wQ", "wK"), EXPECTED_CLASSES.subList(1, 7))
        assertEquals(listOf("bP", "bN", "bB", "bR", "bQ", "bK"), EXPECTED_CLASSES.subList(7, 13))
    }

    @Test
    fun `the asset class list is asserted, not replaced`() {
        assertEquals(EXPECTED_CLASSES, requireExpectedClasses(EXPECTED_CLASSES))
        assertThrows<IllegalArgumentException> { requireExpectedClasses(EXPECTED_CLASSES.reversed()) }
    }

    @Test
    fun `the ImageNet constants are the config-py values`() {
        assertEquals(listOf(0.485f, 0.456f, 0.406f), IMAGENET_MEAN)
        assertEquals(listOf(0.229f, 0.224f, 0.225f), IMAGENET_STD)
    }

    private fun norm(
        value: Int,
        channel: Int,
    ): Float = (value / 255.0f - IMAGENET_MEAN[channel]) / IMAGENET_STD[channel]

    private fun assertNear(
        expected: Float,
        actual: Float,
        what: String,
    ) {
        assertTrue(abs(expected - actual) <= 1e-6f, "$what: expected $expected, got $actual")
    }
}
