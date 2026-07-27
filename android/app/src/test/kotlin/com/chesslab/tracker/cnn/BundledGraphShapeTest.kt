package com.chesslab.tracker.cnn

import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.TensorInfo
import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.EXPECTED_CLASSES
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

    @Test
    fun theQuantizedGraphDeclaresItToo() {
        // Bundled but not selectable while no QNN EP is compiled in. It is still staged, and a
        // QNN-capable build would run it unchanged, so it may not rot into a different contract.
        val file = asset(MODEL_QNN_FILE)
        if (file.isFile) assertShape(file)
    }

    /**
     * How many logits a row carries, taken from the bundled `config.json`.
     *
     * NOT [EXPECTED_CLASSES]: that is the 14-class piece list, while the shipped graph is the
     * 2-class occupancy model. The config beside the graph is the runtime source of truth
     * ([ModelSpec] reads it), so the two must agree with each other, not with a constant.
     */
    private fun bundledClassCount(): Int {
        val text = asset(MODEL_CONFIG_FILE).readText()
        val classes = Regex("\"classes\"\\s*:\\s*\\[(.*?)]", RegexOption.DOT_MATCHES_ALL).find(text)
        assertTrue(classes != null, "bundled config.json declares no classes")
        return classes!!.groupValues[1].split(",").count { it.isNotBlank() }
    }

    private fun assertShape(file: File) {
        assertTrue(file.isFile, "missing bundled asset: ${file.absolutePath}")
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
                longArrayOf(ALL_SQUARES.size.toLong(), 3, 128, 128),
                input,
                "${file.name}: input must be a fixed 64-crop batch, got ${input.toList()}",
            )
            assertArrayEquals(
                longArrayOf(ALL_SQUARES.size.toLong(), bundledClassCount().toLong()),
                output,
                "${file.name}: output must be 64 rows of the bundled config's classes, " +
                    "got ${output.toList()}",
            )
        }
    }
}
