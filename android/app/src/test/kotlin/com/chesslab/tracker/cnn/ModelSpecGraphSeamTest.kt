package com.chesslab.tracker.cnn

import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.TensorInfo
import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.engine.api.BgrImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.math.abs

/**
 * The Python→Kotlin seam: two integers in a JSON file against the shape an ONNX graph declares.
 *
 * The size crosses the boundary as `infer_size` in the run's `config.json` (specs/22) and the
 * graph is the schema — the config only describes it. So this test runs the REAL bundled assets —
 * all three of them — through REAL ORT sessions and compares what [ModelSpec] parsed with what each
 * session says it takes. A fake on either side would prove nothing about the seam: the old guard was
 * exactly such a check (`out_size == 128`, the app against itself) and it never once looked at the
 * graph.
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
     * **Every** bundled model, not just the default one: the whole point of shipping three is that
     * the user can switch between them on a real board, and a model that only fails when selected
     * fails mid-game.
     *
     * This is also what proves the size is READ rather than assumed. The three declare 96, 80 and
     * 128 px, so no single constant can satisfy all of them — the assertion could not pass if
     * anything in the chain (`ModelSpec` → tensor shape → `preprocessInto` → the graph) were pinned
     * to whatever the default asset happens to declare. Until this commit that proof needed a
     * gitignored scratch export and skipped whenever nobody had built one.
     */
    @Test
    fun everyBundledModelAgreesWithItsOwnGraph(
        @TempDir tmp: File,
    ) {
        val sizes =
            bundledAssetDirs().mapIndexed { index, dir ->
                dir.name to assertSeam(dir, File(tmp, "model$index").also { it.mkdirs() })
            }
        assertEquals(BUNDLED_MODELS, sizes.map { it.first }, "every bundled model must be covered")
        assertTrue(
            sizes.map { it.second }.distinct().size > 1,
            "all bundled models declare the same input size, so this cannot show the size being read: $sizes",
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
