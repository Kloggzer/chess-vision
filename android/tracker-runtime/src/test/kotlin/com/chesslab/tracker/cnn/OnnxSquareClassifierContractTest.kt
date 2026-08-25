package com.chesslab.tracker.cnn

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.EXPECTED_CLASSES
import com.chesslab.cnn.PIECES13_CLASSES
import com.chesslab.engine.api.BgrImage
import com.chesslab.tracker.log.RecordingLog
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.FloatBuffer
import kotlin.math.abs
import kotlin.math.exp

private const val CROP = 128

/** The ORT session is unavailable on the desktop JVM, so the wrapper is driven against this seam. */
private class FakeRunner(
    private val ran: String? = "CPUExecutionProvider",
    private val classCount: Int = EXPECTED_CLASSES.size,
    private val coverageLogit: Float? = null,
) : SessionRunner {
    override val requested = Ep.CPU
    override val model = MODEL_FP32_FILE

    override fun profiledProvider(): String? = ran

    var calls = 0
    val shapes = mutableListOf<LongArray>()
    val buffers = mutableListOf<FloatBuffer>()
    var firstInput = 0.0f

    override fun run(
        input: FloatBuffer,
        shape: LongArray,
    ): FloatArray {
        calls++
        shapes += shape
        buffers += input
        firstInput = input.get(0)
        val width = classCount + if (coverageLogit == null) 0 else 1
        // Row r peaks on class r % classCount, so the argmax is row-dependent and checkable; the
        // coverage column, when there is one, carries a constant so its sigmoid is checkable too.
        return FloatArray(ALL_SQUARES.size * width) { i ->
            val col = i % width
            when {
                col == classCount -> coverageLogit!!
                col == (i / width) % classCount -> 2.0f
                else -> 0.0f
            }
        }
    }

    override fun close() = Unit
}

class OnnxSquareClassifierContractTest {
    private val spec =
        ModelSpec(
            classes = EXPECTED_CLASSES,
            outWidth = CROP,
            outHeight = CROP,
            mean = listOf(0.485f, 0.456f, 0.406f),
            std = listOf(0.229f, 0.224f, 0.225f),
        )

    /**
     * [side] defaults to this class's own fake [spec]. The one test that drives the REAL asset has
     * to pass the REAL model's size instead: since specs/23 phase 02 the shipped graph takes 96 px
     * and `preprocessInto` does not resize, it refuses a crop of any other size.
     */
    private fun crops(side: Int = CROP): List<BgrImage> = List(ALL_SQUARES.size) { BgrImage(side, side, ByteArray(side * side * 3) { 8 }) }

    @Test
    fun runsAll64CropsInASingleSessionCall() {
        val runner = FakeRunner()
        val probs = OnnxSquareClassifier(spec, runner).classify(crops())
        assertEquals(1, runner.calls)
        assertEquals(ALL_SQUARES.size, probs.size)
    }

    @Test
    fun inputTensorIsNchwBatch3By128() {
        val runner = FakeRunner()
        OnnxSquareClassifier(spec, runner).classify(crops())
        assertEquals(listOf(64L, 3L, 128L, 128L), runner.shapes.single().toList())
        assertEquals(64 * 3 * CROP * CROP, runner.buffers.single().remaining())
        // Preprocessing came from :core-cnn: (8/255 - mean_r) / std_r on the R plane.
        assertEquals((8f / 255f - 0.485f) / 0.229f, runner.firstInput, 1e-6f)
    }

    @Test
    fun softmaxRowsSumToOneAndMapToSpecClasses() {
        val probs = OnnxSquareClassifier(spec, FakeRunner()).classify(crops())
        probs.forEachIndexed { row, values ->
            assertEquals(EXPECTED_CLASSES.size, values.size)
            assertTrue(abs(values.sum() - 1.0f) < 1e-5f, "row $row sums to ${values.sum()}")
            val top = values.indices.maxBy { values[it] }
            assertEquals(row % EXPECTED_CLASSES.size, top)
        }
    }

    /**
     * 13 classes plus the coverage unit is the SAME 14 columns the old model emits, and only the
     * declaration tells them apart. The classes must still sum to 1 and the coverage must arrive as
     * a sigmoid: softmaxing all 14 would turn it into a class probability and bend every other one.
     */
    @Test
    fun coverageRidesBesideTheClassProbabilitiesAsItsOwnSigmoid() {
        val covering = spec.copy(classes = PIECES13_CLASSES, coverageOutput = true)
        val runner = FakeRunner(classCount = PIECES13_CLASSES.size, coverageLogit = 1.0f)
        val probs = OnnxSquareClassifier(covering, runner).classify(crops())
        probs.forEachIndexed { row, values ->
            assertEquals(PIECES13_CLASSES.size + 1, values.size)
            val classMass = values.dropLast(1).sum()
            assertTrue(abs(classMass - 1.0f) < 1e-5f, "row $row classes sum to $classMass")
            assertEquals(1f / (1f + exp(-1.0f)), values.last(), 1e-6f)
        }
    }

    /** A graph that disagrees with its declaration must still fail loudly, not quietly re-align. */
    @Test
    fun refusesAGraphNarrowerThanTheDeclaredCoverageWidth() {
        val covering = spec.copy(classes = PIECES13_CLASSES, coverageOutput = true)
        val runner = FakeRunner(classCount = PIECES13_CLASSES.size)
        val error = assertThrows<IllegalArgumentException> { OnnxSquareClassifier(covering, runner).classify(crops()) }
        assertTrue(
            error.message!!.contains("expected ${ALL_SQUARES.size * (PIECES13_CLASSES.size + 1)}"),
            error.message,
        )
    }

    @Test
    fun reusesTheInputBufferAcrossCalls() {
        val runner = FakeRunner()
        val classifier = OnnxSquareClassifier(spec, runner)
        repeat(10) { classifier.classify(crops()) }
        assertEquals(10, runner.calls)
        runner.buffers.forEach { assertSame(runner.buffers.first(), it) }
    }

    /**
     * The real bundled graph, staged and run end to end. On the desktop JVM only the CPU
     * provider builds — QNN and NNAPI fall through, which is exactly the chain's contract.
     */
    @Test
    fun stagesAndRunsTheRealAssetModelOnTheFallbackProvider(
        @TempDir tmp: File,
    ) {
        val log = RecordingLog()
        val staged = CnnModelAssets({ name -> File(assetDir(), name).takeIf { it.isFile }?.inputStream() }, tmp).stage()
        OnnxSquareClassifier.open(staged, log).use { classifier ->
            // Not "CPU (unverified)": ORT's own profile named CPUExecutionProvider for the
            // warm-up batch. A bare provider name is only ever printed after it was observed.
            assertEquals("CPU", classifier.backend)
            assertEquals(assetClasses(), classifier.classes)
            val assetSpec = ModelSpec.parse(staged.configJson)
            val probs = classifier.classify(crops(assetSpec.outWidth))
            assertEquals(ALL_SQUARES.size, probs.size)
            // The CLASSES sum to one. A coverage run carries one more column, and that one is a
            // sigmoid beside them — adding it in would assert against a number that means nothing.
            probs.forEach {
                val classMass = if (assetSpec.coverageOutput) it.dropLast(1).sum() else it.sum()
                assertTrue(abs(classMass - 1.0f) < 1e-4f, "row classes sum to $classMass")
            }
            assertTrue(classifier.lastRunMs > 0.0)
        }
        // Derived, not a literal: the desktop natives carry the CPU provider and nothing else, so
        // every EP ABOVE CPU has to warn and fall through rather than fail silently. Counted to CPU
        // rather than to the chain's end — CPU is no longer the last entry, NNAPI is, and NNAPI is
        // never reached here because CPU succeeds first.
        assertEquals(
            epChain(staged.qnn != null).indexOf(Ep.CPU),
            log.warnings.size,
            "every EP above CPU must warn and fall through: ${log.warnings}",
        )
        assertTrue(
            log.infos.any { it.startsWith("CNN EP verified: CPU, warm-up") },
            "the attach must state the provider it MEASURED, with the 64-crop timing: ${log.infos}",
        )
        assertTrue(
            staged.dir
                .list()
                .orEmpty()
                .none { it.startsWith("ep-verify") },
            "the profile must not be left behind",
        )
    }

    @Test
    fun prefersQuantizedModelForQnnAndFp32Otherwise() {
        val staged = stagedModel(File("."))
        val withQnn = epChain(hasQnnModel = true)
        // NNAPI is absent on measurement: on an SM8650 it verified as the runner and took 470 ms
        // per 64 crops against the CPU's 97. Reachable by explicit request, never automatically.
        assertEquals(listOf("QNN-HTP(NPU)", "XNNPACK", "CPU"), withQnn.map { it.backend })
        assertEquals(MODEL_QNN_FILE, modelFor(staged, withQnn.first()).name)
        assertTrue(
            withQnn.drop(1).all { modelFor(staged, it).name == MODEL_FP32_FILE },
            "only QNN may see the quantized graph",
        )

        val withoutQnn = epChain(hasQnnModel = false)
        assertEquals(listOf("XNNPACK", "CPU"), withoutQnn.map { it.backend })
        assertTrue(withoutQnn.none { modelFor(staged, it).name == MODEL_QNN_FILE })
    }
}
