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
 * So this test reads the REAL asset — the file that goes into the APK — and asserts its declared
 * shape. It needs no device: the `:app` unit tests link ORT's host natives.
 */
class BundledGraphShapeTest {
    private fun asset(name: String) = File("src/main/assets/cnn_model/$name")

    @Test
    fun theFp32GraphDeclaresTheBatchTheTrackerRuns() {
        assertShape(asset(MODEL_FP32_FILE))
    }

    /**
     * There is currently NO quantized graph to check.
     *
     * `occ-v4-f3e20` (specs/23 phase 02) could not be quantized at its 96 px inference size —
     * `training/quantize.py` builds its calibration batch with `eval_transform_for(cfg)`, which
     * resizes to `cfg["out_size"]` (128) and never consults `infer_size_of`, so the calibrator feeds
     * a 128 px tensor to a 96 px graph and ORT refuses it. Shipping the previous model's quantized
     * graph instead would leave a graph in the asset directory that contradicts the `config.json`
     * beside it, so it was dropped; `StagedModel.qnn` is nullable and `epChain` skips the QNN EP when
     * it is absent. The check stays because a QNN-capable build would run whatever is here unchanged.
     */
    @Test
    fun theQuantizedGraphDeclaresItToo() {
        val file = asset(MODEL_QNN_FILE)
        if (file.isFile) assertShape(file)
    }

    /**
     * The batch, channel count and input size the app will actually feed, from the bundled
     * `config.json` — read through [ModelSpec], the one runtime reader, so the graph is compared
     * against what the app will really do with it and not against constants that happen to match.
     *
     * NOT [ALL_SQUARES]-plus-literals: `channels` follows the run's `input_repr` and the input size
     * follows its `infer_size` (specs/22), which is 96 on the shipped model and 128 on the crops its
     * training set was built at. The batch IS a literal, because that one is the bug being guarded.
     */
    private fun assertShape(file: File) {
        assertTrue(file.isFile, "missing bundled asset: ${file.absolutePath}")
        val spec = ModelSpec.parse(asset(MODEL_CONFIG_FILE).readText())
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
                "${file.name}: input must be a fixed 64-crop batch at the config's ${spec.outWidth}x${spec.outHeight}, " +
                    "got ${input.toList()}",
            )
            assertArrayEquals(
                longArrayOf(ALL_SQUARES.size.toLong(), spec.classes.size.toLong()),
                output,
                "${file.name}: output must be 64 rows of the bundled config's classes, " +
                    "got ${output.toList()}",
            )
        }
    }
}
