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

    /**
     * The `--input-repr` channel stacks, against numbers produced by
     * `torch_data.build_transform(..., input_repr=…)`.
     *
     * Golden numbers, not properties. The gradient channel is one specific kernel
     * (`cv2.Sobel` ksize 3) with one specific border rule (`BORDER_REFLECT_101`) and one specific
     * normalisation; a port that gets any of the three wrong still produces a plausible-looking
     * edge map, and the model would silently see an input it never trained on. The 4x4 crop below
     * is a bright/dark quadrant split, so every interior pixel has a real edge to disagree about.
     */
    @Test
    fun grayPlusSobelMatchesTheTorchTransform() {
        assertRepr(InputRepr.GRAY_SOBEL, GRAY_SOBEL_GOLDEN)
    }

    @Test
    fun rgbPlusSobelMatchesTheTorchTransform() {
        assertRepr(InputRepr.RGB_SOBEL, RGB_SOBEL_GOLDEN)
    }

    @Test
    fun sobelAloneMatchesTheTorchTransform() {
        assertRepr(InputRepr.SOBEL, SOBEL_GOLDEN)
    }

    /**
     * The same transform at the size the app actually runs, 128x128.
     *
     * The 4x4 goldens above cannot see an index bug that only appears at a real stride — the
     * border arithmetic is written in terms of `w` and `h`, and a 4-wide crop is small enough that
     * a wrong row offset can still land inside the crop. A sum over all 32768 floats plus nine
     * probes (both plane starts, both plane ends, an interior point) pins the layout as well as
     * the arithmetic without carrying 32768 literals.
     */
    @Test
    fun grayPlusSobelMatchesTheTorchTransformAtTheLiveCropSize() {
        val data = ByteArray(SIDE * SIDE * 3)
        for (y in 0 until SIDE) {
            for (x in 0 until SIDE) {
                val p = (y * SIDE + x) * 3
                data[p] = ((x * 7 + y * 13) % 251).toByte()
                data[p + 1] = ((x * 29 + y * 3) % 241).toByte()
                data[p + 2] = ((x * 5 + y * 61) % 239).toByte()
            }
        }
        val out = preprocess(listOf(BgrImage(SIDE, SIDE, data)), SIDE, SIDE, repr = InputRepr.GRAY_SOBEL)
        assertEquals(2 * SIDE * SIDE, out.size)
        var sum = 0.0
        for (v in out) sum += v
        assertEquals(31109.4727, sum, 0.05, "sum over the whole 2-channel stack")
        val probes =
            mapOf(
                0 to -1.986726f,
                1 to -1.651553f,
                127 to -0.210515f,
                128 to -1.613968f,
                16383 to 0.279438f,
                16384 to -0.704316f,
                16385 to 0.447979f,
                20000 to 1.297973f,
                32767 to -0.704316f,
            )
        for ((i, expected) in probes) assertEquals(expected, out[i], 1e-5f, "element $i")
    }

    @Test
    fun `the representation decides the buffer width`() {
        val crop = BgrImage(4, 4, DISTINCT_CROP)
        assertEquals(4 * 4 * 2, preprocess(listOf(crop), 4, 4, repr = InputRepr.GRAY_SOBEL).size)
        assertThrows<IllegalArgumentException> {
            preprocessInto(listOf(crop), 4, 4, FloatArray(4 * 4 * 3), repr = InputRepr.GRAY_SOBEL)
        }
    }

    @Test
    fun `an unknown input_repr is refused by name`() {
        assertEquals(InputRepr.GRAY_SOBEL, InputRepr.of("gray+sobel"))
        assertEquals(2, InputRepr.of("gray+sobel").channels)
        assertThrows<IllegalArgumentException> { InputRepr.of("edges") }
    }

    private fun assertRepr(
        repr: InputRepr,
        expected: FloatArray,
    ) {
        val out = preprocess(listOf(BgrImage(4, 4, DISTINCT_CROP)), outW = 4, outH = 4, repr = repr)
        assertEquals(expected.size, out.size, "channel count")
        for (i in expected.indices) assertEquals(expected[i], out[i], 1e-5f, "element $i")
    }
}

/**
 * 4x4 BGR, sixteen DISTINCT pixels — deliberately not a quadrant pattern.
 *
 * A crop with repeated rows/columns cannot tell `BORDER_REFLECT_101` apart from `BORDER_REPLICATE`
 * (mirroring row 0 onto row 1 and repeating row 0 give the same numbers when the two rows are
 * equal), and the first version of this fixture did exactly that: the border mutation ran green.
 */
private val DISTINCT_CROP =
    byteArrayOf(
        5,
        15,
        25,
        60,
        70,
        80,
        -56,
        -46,
        -36,
        120,
        10,
        30,
        -6,
        -16,
        -26,
        10,
        10,
        10,
        90,
        -116,
        -66,
        33,
        66,
        99,
        -16,
        30,
        15,
        15,
        -16,
        30,
        30,
        15,
        -16,
        -128,
        -128,
        0,
        0,
        -128,
        -1,
        -1,
        0,
        -128,
        -128,
        -1,
        0,
        70,
        70,
        70,
    )

/**
 * The four corners are exactly `(0 - SOBEL_MEAN) / SOBEL_STD`, and that is not a fixture accident:
 * under reflect-101 the left and right taps of `gx` land on the same mirrored column at x=0, so the
 * derivative across a mirrored boundary is identically zero.
 */
private val SOBEL_GOLDEN =
    floatArrayOf(
        -0.704316f,
        0.878031f,
        -0.424311f,
        -0.704316f,
        0.970721f,
        0.159860f,
        0.293860f,
        0.289789f,
        -0.265449f,
        -0.332323f,
        0.370905f,
        -0.511601f,
        -0.704316f,
        0.002983f,
        0.178190f,
        -0.704316f,
    )

private val GRAY_SOBEL_GOLDEN =
    floatArrayOf(
        -1.694343f,
        -0.739979f,
        1.689311f,
        -1.491845f,
        2.145671f,
        -1.813205f,
        0.603071f,
        -0.735554f,
        -1.128579f,
        0.643155f,
        -0.529412f,
        -0.429759f,
        0.640049f,
        -0.818202f,
        0.863821f,
        -0.772080f,
    ) + SOBEL_GOLDEN

private val RGB_SOBEL_GOLDEN =
    floatArrayOf(
        -1.689785f,
        -0.747924f,
        1.649542f,
        -1.604161f,
        1.820789f,
        -1.946656f,
        1.135799f,
        -0.422553f,
        -1.861033f,
        -1.604161f,
        1.992037f,
        -2.117904f,
        2.248908f,
        0.074065f,
        -2.117904f,
        -0.919171f,
        -1.773109f,
        -0.810224f,
        1.640756f,
        -1.860644f,
        2.165966f,
        -1.860644f,
        0.415266f,
        -0.880252f,
        -1.510504f,
        2.165966f,
        -1.773109f,
        0.205182f,
        0.205182f,
        -2.035714f,
        2.428571f,
        -0.810224f,
        -1.717299f,
        -0.758693f,
        1.681394f,
        0.287059f,
        2.552854f,
        -1.630152f,
        -0.235817f,
        -1.229281f,
        2.378562f,
        -1.543007f,
        -1.281569f,
        0.426493f,
        -1.804444f,
        2.640000f,
        0.426493f,
        -0.584401f,
    ) + SOBEL_GOLDEN
