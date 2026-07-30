package com.chesslab.tracker.cnn

import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.TensorInfo
import com.chesslab.cnn.ALL_SQUARES
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/**
 * The bundled graph must declare the batch the app actually runs.
 *
 * A DYNAMIC batch dimension is not a harmless generalisation: under ORT's ALL_OPT the Android
 * session answers a `[64,3,128,128]` input with a `[1,2]` output, so every observation dies on
 * "model returned 2 logits, expected 128" and the CNN is silently absent for the whole game.
 *
 * This has now shipped three times. `b24f1f3` diagnosed it on the device and fixed the .onnx
 * BINARY by hand, leaving `training/evaluate.py` still exporting `dynamic_axes`; the next two
 * models were exported by that path and both went out broken. Nothing caught them:
 * [OnnxSquareClassifierContractTest] drives a fake runner, and `CnnClipSimulationTest` runs on the
 * desktop provider, which tolerates the dynamic shape. Only the phone objects.
 *
 * So this test reads the REAL assets — the files that go into the APK — and asserts their declared
 * shape. **All bundled models**, because the user picks one at runtime and a dynamic batch in the
 * one they pick is the same lost game as a dynamic batch in the default. It needs no device: the
 * `:app` unit tests link ORT's host natives.
 */
class BundledGraphShapeTest {
    @Test
    fun everyFp32GraphDeclaresTheBatchTheTrackerRuns() {
        bundledAssetDirs().forEach { assertShape(File(it, MODEL_FP32_FILE), it) }
    }

    /**
     * Bundled but not selectable while no QNN EP is compiled in (`app/build.gradle.kts` carries no
     * QNN AAR), so nothing runs these today. A QNN-capable build would run them unchanged, which is
     * why they may not rot into a different contract — and why the check tolerates a model that
     * ships without one: `StagedModel.qnn` is nullable and `epChain` skips the QNN EP when it is
     * absent.
     */
    @Test
    fun everyQuantizedGraphDeclaresItToo() {
        bundledAssetDirs().forEach { dir ->
            val file = File(dir, MODEL_QNN_FILE)
            if (file.isFile) assertShape(file, dir)
        }
    }

    /**
     * The batch, channel count and input size the app will actually feed, from the bundled
     * `config.json` — read through [ModelSpec], the one runtime reader, so the graph is compared
     * against what the app will really do with it and not against constants that happen to match.
     *
     * NOT [ALL_SQUARES]-plus-literals: `channels` follows the run's `input_repr` and the input size
     * follows its `infer_size` (specs/22) — 96, 80 and 128 px across the three bundled models, none
     * of which is the 128 their training crops were built at. Each graph is compared against the
     * `config.json` **beside it**, never against another model's. The batch IS a literal, because
     * that one is the bug being guarded.
     */
    private fun assertShape(
        file: File,
        dir: File,
    ) {
        assertTrue(file.isFile, "missing bundled asset: ${file.absolutePath}")
        val spec = ModelSpec.parse(File(dir, MODEL_CONFIG_FILE).readText())
        val env = OrtEnvironment.getEnvironment()
        env.createSession(file.absolutePath).use { session ->
            val input =
                (
                    session.inputInfo.values
                        .single()
                        .info as TensorInfo
                ).shape
            val output =
                (
                    session.outputInfo.values
                        .single()
                        .info as TensorInfo
                ).shape
            // ORT reports a dynamic dimension as -1, which is exactly the failure being guarded.
            assertArrayEquals(
                longArrayOf(
                    ALL_SQUARES.size.toLong(),
                    spec.channels.toLong(),
                    spec.outHeight.toLong(),
                    spec.outWidth.toLong(),
                ),
                input,
                "${dir.name}/${file.name}: input must be a fixed 64-crop batch at the config's " +
                    "${spec.outWidth}x${spec.outHeight}, got ${input.toList()}",
            )
            assertArrayEquals(
                longArrayOf(ALL_SQUARES.size.toLong(), spec.classes.size.toLong()),
                output,
                "${dir.name}/${file.name}: output must be 64 rows of the bundled config's classes, " +
                    "got ${output.toList()}",
            )
        }
    }
}
