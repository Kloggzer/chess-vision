package com.chesslab.tracker.cnn

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.EXPECTED_CLASSES
import com.chesslab.engine.api.BgrImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.FloatBuffer
import kotlin.math.abs

private const val CROP = 128

/** The ORT session is unavailable on the desktop JVM, so the wrapper is driven against this seam. */
private class FakeRunner : SessionRunner {
    override val backend = "CPU"
    override val model = MODEL_FP32_FILE
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
        val width = EXPECTED_CLASSES.size
        // Row r peaks on class r % width, so the argmax is row-dependent and checkable.
        return FloatArray(ALL_SQUARES.size * width) { i -> if (i % width == (i / width) % width) 2.0f else 0.0f }
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

    private fun crops(): List<BgrImage> = List(ALL_SQUARES.size) { BgrImage(CROP, CROP, ByteArray(CROP * CROP * 3) { 8 }) }

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
            assertEquals("CPU", classifier.backend)
            assertEquals(EXPECTED_CLASSES, classifier.classes)
            val probs = classifier.classify(crops())
            assertEquals(ALL_SQUARES.size, probs.size)
            probs.forEach { assertTrue(abs(it.sum() - 1.0f) < 1e-4f, "row sums to ${it.sum()}") }
            assertTrue(classifier.lastRunMs > 0.0)
        }
        assertEquals(2, log.warnings.size, "QNN and NNAPI must warn and fall through, not fail silently")
    }

    @Test
    fun prefersQuantizedModelForQnnAndFp32Otherwise() {
        val staged = stagedModel(File("."))
        val withQnn = epChain(hasQnnModel = true)
        assertEquals(listOf("QNN-HTP(NPU)", "NNAPI", "CPU"), withQnn.map { it.backend })
        assertEquals(MODEL_QNN_FILE, modelFor(staged, withQnn.first()).name)
        assertTrue(
            withQnn.drop(1).all { modelFor(staged, it).name == MODEL_FP32_FILE },
            "only QNN may see the quantized graph",
        )

        val withoutQnn = epChain(hasQnnModel = false)
        assertEquals(listOf("NNAPI", "CPU"), withoutQnn.map { it.backend })
        assertTrue(withoutQnn.none { modelFor(staged, it).name == MODEL_QNN_FILE })
    }
}
