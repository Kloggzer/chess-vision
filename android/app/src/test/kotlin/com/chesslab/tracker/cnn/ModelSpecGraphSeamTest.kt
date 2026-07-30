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
    /**
     * Since specs/23 phase 02 this is no longer a tautology on the shipped asset either.
     * `occ-v4-f3e20` declares `infer_size` **96** next to an `out_size` of 128, so a consumer that
     * assumed the crop size — as the deleted `out_size == 128` guard did — now disagrees with the
     * bundled graph and this test says so.
     */
    @Test
    fun theBundledGraphTakesExactlyWhatItsConfigDeclares(
        @TempDir tmp: File,
    ) {
        assertEquals(SHIPPED_INPUT_SIZE, assertSeam(assetDir(), tmp), "the shipped inference size (specs/23 phase 00)")
    }

    /**
     * The same seam on a model exported at a DIFFERENT size — cheap insurance that nothing in the
     * chain is pinned to whatever the current asset happens to declare.
     *
     * Point the test at one by exporting into a scratch directory and dropping `config.json` +
     * `model.onnx` under [EXTRA_MODELS_DIR] (gitignored, wiped by `clean`):
     *
     * ```
     * cp -r data/models/occ-v4-f3e20 <tmp>/infer128   # config.json + best.pt are enough
     * uv run chesslab export --run <tmp>/infer128 --format onnx --infer-size 128x128
     * mkdir -p android/app/build/extra-cnn-models/infer128
     * cp <tmp>/infer128/config.json <tmp>/infer128/model.onnx android/app/build/extra-cnn-models/infer128/
     * ```
     *
     * Skipped when there is none: shipping a second multi-megabyte graph to keep a unit test
     * honest is not a trade worth making, and every assertion here also runs against the asset.
     *
     * The seam is ASSERTED for every directory found; only "and at least one of them differs from
     * the shipped size" is an assumption. A leftover directory that happens to match the shipped
     * size proves nothing, but it is also not a defect in the tree — the whole location is
     * gitignored build output, and failing on it would make the suite depend on what a previous
     * session left in `app/build`.
     */
    @Test
    fun anExportedGraphAtAnotherSizeIsReadNotAssumed(
        @TempDir tmp: File,
    ) {
        val dirs = extraModelDirs()
        assumeTrue(dirs.isNotEmpty(), "no extra model directory under $EXTRA_MODELS_DIR")
        val sizes =
            dirs.mapIndexed { index, dir ->
                dir.name to assertSeam(dir, File(tmp, "extra$index").also { it.mkdirs() })
            }
        assumeTrue(
            sizes.any { it.second != SHIPPED_INPUT_SIZE },
            "every extra model declares the shipped ${SHIPPED_INPUT_SIZE}px, so none can show the size " +
                "being read rather than assumed: $sizes",
        )
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

/**
 * The inference size the shipped model is served at — **96 px**, chosen by specs/23 phase 00 on the
 * `occ-real3` test split: `occ-v4-f3e20` reads 28 occupied squares as empty and invents none at the
 * app's warp, against 44 / 0 at 128 px and the previous asset's 99 / 146.
 *
 * A literal on purpose, and the only one. `config.json` remains the single source the CODE reads
 * (`ModelSpec.parse`); this is a tripwire on the DECISION, so that re-exporting the asset at another
 * size has to be a deliberate act with this line edited rather than a graph that quietly changes
 * shape. Untrained sizes fail silently — 80 px costs this run 133 misses against 96 px's 19 — so
 * "the config and the graph agree" is not on its own enough to ship.
 */
internal const val SHIPPED_INPUT_SIZE = 96
