package com.chesslab.tracker.cnn

import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.TensorInfo
import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.engine.api.BgrImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.math.abs

/**
 * The Python→Kotlin seam: two integers in a JSON file against the shape an ONNX graph declares.
 *
 * The size crosses the boundary as `infer_size` in the run's `config.json` (specs/22) and the
 * graph is the schema — the config only describes it. So this test runs the REAL bundled asset
 * through the REAL ORT session and compares what [ModelSpec] parsed with what the session says it
 * takes. A fake on either side would prove nothing about the seam: the old guard was exactly such
 * a check (`out_size == 128`, the app against itself) and it never once looked at the graph.
 *
 * Needs no device — the `:app` unit tests link ORT's host natives.
 */
class ModelSpecGraphSeamTest {
    @Test
    fun theBundledGraphTakesExactlyWhatItsConfigDeclares(
        @TempDir tmp: File,
    ) {
        assertSeam(assetDir(), tmp)
    }

    /**
     * The same seam on a model exported at a DIFFERENT size, which is the whole point of the key:
     * the bundled asset stays at 128 (phase 00 measured 96 px making it worse — 74 misses / 243
     * phantoms against 95 / 152), so on its own it cannot show the size being read rather than
     * assumed.
     *
     * Point the test at one by exporting into a scratch directory and dropping `config.json` +
     * `model.onnx` under [EXTRA_MODELS_DIR] (gitignored, wiped by `clean`):
     *
     * ```
     * cp -r data/models/occ-v4-f3e20 <tmp>/infer96   # config.json + best.pt are enough
     * uv run chesslab export --run <tmp>/infer96 --format onnx --infer-size 96x96
     * mkdir -p android/app/build/extra-cnn-models/infer96
     * cp <tmp>/infer96/config.json <tmp>/infer96/model.onnx android/app/build/extra-cnn-models/infer96/
     * ```
     *
     * Skipped when there is none: shipping a second multi-megabyte graph to keep a unit test
     * honest is not a trade worth making, and every assertion here also runs against the asset.
     */
    @Test
    fun anExportedGraphAtAnotherSizeIsReadNotAssumed(
        @TempDir tmp: File,
    ) {
        val dirs = extraModelDirs()
        assumeTrue(dirs.isNotEmpty(), "no extra model directory under $EXTRA_MODELS_DIR")
        dirs.forEachIndexed { index, dir ->
            val size = assertSeam(dir, File(tmp, "extra$index").also { it.mkdirs() })
            assertTrue(
                size != BUNDLED_INPUT_SIZE,
                "${dir.name} declares ${size}px, the same as the bundled asset — that proves nothing",
            )
        }
    }

    /**
     * @return the square input size the graph and the config agree on.
     *
     * Asserts the declared shape, then RUNS the thing: crops are cut at the spec's size, so a
     * disagreement the shape check somehow missed would still surface as ORT refusing the tensor
     * or `preprocessInto` refusing the crop.
     */
    private fun assertSeam(
        dir: File,
        staging: File,
    ): Int {
        val spec = ModelSpec.parse(File(dir, MODEL_CONFIG_FILE).readText())
        val graph = File(dir, MODEL_FP32_FILE)
        assertTrue(graph.isFile, "missing graph: ${graph.absolutePath}")
        val env = OrtEnvironment.getEnvironment()
        env.createSession(graph.absolutePath).use { session ->
            val declared =
                (
                    session.inputInfo.values
                        .single()
                        .info as TensorInfo
                ).shape
            assertEquals(
                listOf(spec.outHeight.toLong(), spec.outWidth.toLong()),
                declared.takeLast(2),
                "${dir.name}: the graph takes ${declared.toList()} but its config declares " +
                    "${spec.outWidth}x${spec.outHeight}",
            )
        }

        val staged = CnnModelAssets({ name -> File(dir, name).takeIf { it.isFile }?.inputStream() }, staging).stage()
        OnnxSquareClassifier.open(staged, RecordingLog()).use { cnn ->
            assertEquals("${ALL_SQUARES.size}x${spec.channels}x${spec.outHeight}x${spec.outWidth}", cnn.inputShape)
            val crops =
                List(ALL_SQUARES.size) {
                    BgrImage(spec.outWidth, spec.outHeight, ByteArray(spec.outWidth * spec.outHeight * 3) { 8 })
                }
            val probs = cnn.classify(crops)
            assertEquals(ALL_SQUARES.size, probs.size)
            probs.forEach { assertTrue(abs(it.sum() - 1.0f) < 1e-4f, "row sums to ${it.sum()}") }
        }
        assertEquals(spec.outWidth, spec.outHeight, "${dir.name}: this test only covers square inputs")
        return spec.outWidth
    }

    companion object {
        /** What the shipped asset declares — a constant here only so the extra model can differ from it. */
        private const val BUNDLED_INPUT_SIZE = 128
        private const val EXTRA_MODELS_DIR = "app/build/extra-cnn-models"

        /** Optional model directories, each holding a `config.json` and a `model.onnx`. */
        private fun extraModelDirs(): List<File> =
            File(androidRoot(), EXTRA_MODELS_DIR)
                .listFiles()
                .orEmpty()
                .filter { File(it, MODEL_CONFIG_FILE).isFile && File(it, MODEL_FP32_FILE).isFile }
                .sortedBy { it.name }
    }
}
