package com.chesslab.tracker.cnn

import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.TensorInfo
import com.chesslab.cnn.ALL_SQUARES
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/** A DYNAMIC batch makes ORT's ALL_OPT answer `[64,3,128,128]` with `[1,2]` on the phone only —
 *  shipped three times (`b24f1f3`); the desktop provider tolerates it, so the REAL assets are read. */
class BundledGraphShapeTest {
    @Test
    fun everyFp32GraphDeclaresTheBatchTheTrackerRuns() {
        bundledAssetDirs().forEach { assertShape(File(it, MODEL_FP32_FILE), it) }
    }

    /** Unused while no QNN EP is compiled in, but a QNN build would run them unchanged. */
    @Test
    fun everyQuantizedGraphDeclaresItToo() {
        bundledAssetDirs().forEach { dir ->
            val file = File(dir, MODEL_QNN_FILE)
            if (file.isFile) assertShape(file, dir)
        }
    }

    /** Against the `config.json` beside the graph, via [ModelSpec]; only the batch is a literal. */
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
            // NOT `classes.size`: a coverage run emits one sigmoid unit beside its classes.
            assertArrayEquals(
                longArrayOf(ALL_SQUARES.size.toLong(), spec.outputWidth.toLong()),
                output,
                "${dir.name}/${file.name}: output must be 64 rows of the bundled config's " +
                    "${spec.classes.size} classes plus ${spec.outputWidth - spec.classes.size} " +
                    "coverage column(s), got ${output.toList()}",
            )
        }
    }
}
