package com.chesslab.cnn

import com.chesslab.engine.api.BgrImage
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.math.abs
import kotlin.math.ln

/** The live observation shape: 64 squares at the bundled model's 128x128. */
private const val BATCH = 64
private const val SIDE = 128

/** JIT/measurement noise floor — the real difference is 12.6 MB, so this is not a close call. */
private const val ALLOC_NOISE_B = 64L * 1024

/**
 * Allocation of THIS thread across [body], in bytes (HotSpot's per-thread allocation counter).
 *
 * Reflective because this module compiles its unit tests against `android.jar`, which has no
 * `java.lang.management` — the tests themselves run on the host JDK, where the class is there.
 */
private fun allocatedBytes(body: () -> Unit): Long {
    val bean = Class.forName("java.lang.management.ManagementFactory").getMethod("getThreadMXBean").invoke(null)
    val counter = Class.forName("com.sun.management.ThreadMXBean").getMethod("getCurrentThreadAllocatedBytes")
    val before = counter.invoke(bean) as Long
    body()
    return counter.invoke(bean) as Long - before
}

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
    fun `preprocessInto writes exactly what preprocess returns, and allocates nothing`() {
        val crops = List(BATCH) { BgrImage(SIDE, SIDE, ByteArray(SIDE * SIDE * 3) { (it % 251).toByte() }) }
        val expected = preprocess(crops, SIDE, SIDE)
        val reused = FloatArray(expected.size)
        // Warm up: the first call loads classes and resizes nothing afterwards.
        preprocessInto(crops, SIDE, SIDE, reused)

        val allocating = allocatedBytes { preprocess(crops, SIDE, SIDE) }
        val reusing = allocatedBytes { preprocessInto(crops, SIDE, SIDE, reused) }
        println("preprocess allocates $allocating B, preprocessInto allocates $reusing B")

        assertArrayEquals(expected, reused, 0.0f)
        assertTrue(allocating > expected.size * 4L * 0.9, "preprocess should allocate the whole buffer: $allocating B")
        assertTrue(reusing < ALLOC_NOISE_B, "preprocessInto should allocate ~nothing, allocated $reusing B")
    }

    @Test
    fun `a wrong-sized out buffer is a programming error`() {
        assertThrows<IllegalArgumentException> {
            preprocessInto(listOf(BgrImage(2, 2, ByteArray(12))), 2, 2, FloatArray(11))
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
    fun `the 2-class occupancy list is accepted, anything else is not`() {
        assertEquals(listOf("empty", "occupied"), OCCUPANCY_CLASSES)
        assertEquals(OCCUPANCY_CLASSES, requireExpectedClasses(OCCUPANCY_CLASSES))
        assertThrows<IllegalArgumentException> { requireExpectedClasses(OCCUPANCY_CLASSES.reversed()) }
        assertThrows<IllegalArgumentException> { requireExpectedClasses(listOf("empty", "occupied", "occluded")) }
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

    /**
     * Per-crop standardisation, against numbers produced by `torch_data._PerCropStandardize`.
     *
     * Training and serving must normalise identically or the model sees inputs it never saw; a
     * golden vector from the Python side is the only way to state that as a fact. Note `std` is the
     * UNBIASED estimate — `torch.Tensor.std()` defaults to `correction=1`, and using the biased one
     * shifts every value by ~4% on a 12-element crop.
     */
    @Test
    fun perCropStandardisationMatchesTheTorchTransform() {
        val crop =
            BgrImage(
                width = 2,
                height = 2,
                data = byteArrayOf(10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120),
            )
        val expected =
            floatArrayOf(
                -0.970657f,
                -0.138665f,
                0.693326f,
                1.525318f,
                -1.247987f,
                -0.415996f,
                0.415996f,
                1.247987f,
                -1.525318f,
                -0.693326f,
                0.138665f,
                0.970657f,
            )
        val out = preprocess(listOf(crop), outW = 2, outH = 2, perCrop = true)
        assertEquals(expected.size, out.size)
        for (i in expected.indices) {
            assertEquals(expected[i], out[i], 1e-5f, "element $i")
        }
    }
}
