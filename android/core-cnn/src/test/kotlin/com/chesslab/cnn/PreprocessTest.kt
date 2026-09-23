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

/** HotSpot's per-thread allocation counter, reflective: this module compiles its unit tests
 *  against `android.jar`, which has no `java.lang.management`. */
private fun allocatedBytes(body: () -> Unit): Long {
    val bean = Class.forName("java.lang.management.ManagementFactory").getMethod("getThreadMXBean").invoke(null)
    val counter = Class.forName("com.sun.management.ThreadMXBean").getMethod("getCurrentThreadAllocatedBytes")
    val before = counter.invoke(bean) as Long
    body()
    return counter.invoke(bean) as Long - before
}

/** The allocating call these tests want and production does not: the phone always writes into a
 *  reused buffer, so the convenience lives here, not in the shipped module. */
private fun preprocess(
    crops: List<BgrImage>,
    outW: Int,
    outH: Int,
    repr: InputRepr = InputRepr.RGB,
    perCrop: Boolean = false,
): FloatArray =
    FloatArray(crops.size * repr.channels * outW * outH)
        .also { preprocessInto(crops, outW, outH, it, perCrop = perCrop, repr = repr) }

private fun floats(text: String): FloatArray =
    text
        .trim()
        .split(Regex("\\s+"))
        .map { it.toFloat() }
        .toFloatArray()

private fun bytes(text: String): ByteArray =
    text
        .trim()
        .split(Regex("\\s+"))
        .map { it.toInt().toByte() }
        .toByteArray()

class PreprocessTest {
    @Test
    fun `a 2x2 BGR crop becomes the expected NCHW float sequence`() {
        val out = FloatArray(12)
        preprocessInto(listOf(BgrImage(2, 2, bytes("0 0 0  255 255 255  10 20 30  200 100 50"))), 2, 2, out)
        val blue = intArrayOf(0, 255, 10, 200)
        val green = intArrayOf(0, 255, 20, 100)
        val red = intArrayOf(0, 255, 30, 50)
        for (i in 0 until 4) {
            assertNear(norm(red[i], 0), out[i], "R[$i]")
            assertNear(norm(green[i], 1), out[4 + i], "G[$i]")
            assertNear(norm(blue[i], 2), out[8 + i], "B[$i]")
        }
    }

    /** 64 x 3 x 128 x 128 floats is 12.6 MB, observed several times a second next to a 15 fps
     *  camera loop: "allocates nothing" is the claim the design rests on. */
    @Test
    fun `preprocessInto reuses its buffer and allocates nothing`() {
        val crops = List(BATCH) { BgrImage(SIDE, SIDE, ByteArray(SIDE * SIDE * 3) { (it % 251).toByte() }) }
        val reused = FloatArray(BATCH * 3 * SIDE * SIDE)
        // Warm up: the first call loads classes.
        preprocessInto(crops, SIDE, SIDE, reused)
        val first = reused.copyOf()

        val reusing = allocatedBytes { preprocessInto(crops, SIDE, SIDE, reused) }
        println("preprocessInto allocates $reusing B for ${reused.size * 4L} B of output")

        assertArrayEquals(first, reused, 0.0f, "the same input must write the same buffer twice")
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
            preprocessInto(listOf(BgrImage(2, 2, ByteArray(12))), 4, 4, FloatArray(4 * 4 * 3))
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
    fun `a class list that is neither accepted order is refused`() {
        assertThrows<IllegalArgumentException> { requireExpectedClasses(listOf("empty", "occupied")) }
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

    /** Golden vector from `torch_data._PerCropStandardize`. `std` is the UNBIASED estimate
     *  (`torch.Tensor.std()` defaults to `correction=1`); the biased one shifts every value ~4 %. */
    @Test
    fun perCropStandardisationMatchesTheTorchTransform() {
        val crop = BgrImage(2, 2, bytes("10 20 30 40 50 60 70 80 90 100 110 120"))
        val expected =
            floats(
                """
                -0.970657 -0.138665 0.693326 1.525318
                -1.247987 -0.415996 0.415996 1.247987
                -1.525318 -0.693326 0.138665 0.970657
                """,
            )
        val out = preprocess(listOf(crop), outW = 2, outH = 2, perCrop = true)
        assertEquals(expected.size, out.size)
        for (i in expected.indices) {
            assertEquals(expected[i], out[i], 1e-5f, "element $i")
        }
    }

    @Test
    fun `per-crop normalisation on a non-RGB stack is refused, not silently dropped`() {
        val crops = List(2) { BgrImage(4, 4, DISTINCT_CROP) }
        val out = FloatArray(crops.size * InputRepr.GRAY_SOBEL.channels * 4 * 4)

        assertThrows<IllegalArgumentException> {
            preprocessInto(crops, 4, 4, out, perCrop = true, repr = InputRepr.GRAY_SOBEL)
        }
    }

    /** Golden numbers from `torch_data.build_transform(..., input_repr=…)`: a port that gets the
     *  kernel (`cv2.Sobel` ksize 3), the border (`BORDER_REFLECT_101`) or the normalisation wrong
     *  still yields a plausible edge map, and the model would silently see an unseen input. */
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

    /** At 128x128, because a 4-wide crop is small enough that a wrong row offset still lands inside
     *  it. A sum over all 32768 floats plus nine probes pins layout and arithmetic. */
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

    /** `build_transform` appends `InputRepresentation` INSTEAD of `Normalize(mean, std)` for every
     *  repr but `rgb`, yet `ModelSpec` passes the run's pair anyway — it must not reach the graph. */
    @Test
    fun `a non-rgb repr ignores the run's own mean and std`() {
        val out = FloatArray(InputRepr.RGB_SOBEL.channels * 4 * 4)
        preprocessInto(
            listOf(BgrImage(4, 4, DISTINCT_CROP)),
            4,
            4,
            out,
            mean = listOf(0.1f, 0.2f, 0.3f),
            std = listOf(0.5f, 0.6f, 0.7f),
            repr = InputRepr.RGB_SOBEL,
        )
        for (i in RGB_SOBEL_GOLDEN.indices) {
            assertEquals(RGB_SOBEL_GOLDEN[i], out[i], 1e-5f, "element $i")
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

/** 4x4 BGR, sixteen DISTINCT pixels: with repeated rows `BORDER_REFLECT_101` and `BORDER_REPLICATE`
 *  give the same numbers, and the first quadrant fixture let the border mutation run green. */
private val DISTINCT_CROP =
    bytes(
        """
        5 15 25     60 70 80     200 210 220  120 10 30
        250 240 230 10 10 10     90 140 190   33 66 99
        240 30 15   15 240 30    30 15 240    128 128 0
        0 128 255   255 0 128    128 255 0    70 70 70
        """,
    )

/** The four corners are exactly `(0 - SOBEL_MEAN) / SOBEL_STD`: under reflect-101 both `gx` taps
 *  land on the same mirrored column at x=0, so the derivative there is identically zero. */
private val SOBEL_GOLDEN =
    floats(
        """
        -0.704316 0.878031 -0.424311 -0.704316
        0.970721 0.159860 0.293860 0.289789
        -0.265449 -0.332323 0.370905 -0.511601
        -0.704316 0.002983 0.178190 -0.704316
        """,
    )

private val GRAY_SOBEL_GOLDEN =
    floats(
        """
        -1.694343 -0.739979 1.689311 -1.491845
        2.145671 -1.813205 0.603071 -0.735554
        -1.128579 0.643155 -0.529412 -0.429759
        0.640049 -0.818202 0.863821 -0.772080
        """,
    ) + SOBEL_GOLDEN

private val RGB_SOBEL_GOLDEN =
    floats(
        """
        -1.689785 -0.747924 1.649542 -1.604161
        1.820789 -1.946656 1.135799 -0.422553
        -1.861033 -1.604161 1.992037 -2.117904
        2.248908 0.074065 -2.117904 -0.919171

        -1.773109 -0.810224 1.640756 -1.860644
        2.165966 -1.860644 0.415266 -0.880252
        -1.510504 2.165966 -1.773109 0.205182
        0.205182 -2.035714 2.428571 -0.810224

        -1.717299 -0.758693 1.681394 0.287059
        2.552854 -1.630152 -0.235817 -1.229281
        2.378562 -1.543007 -1.281569 0.426493
        -1.804444 2.640000 0.426493 -0.584401
        """,
    ) + SOBEL_GOLDEN
