package com.chesslab.tracker.cnn

import android.content.Context
import java.io.File
import java.io.InputStream

const val MODEL_FP32_FILE = "model.onnx"

/** INT8/QDQ graph for the Hexagon NPU; the HTP backend rejects float32, so QNN gets only this. */
const val MODEL_QNN_FILE = "model.qnn.onnx"
const val MODEL_CONFIG_FILE = "config.json"

private const val ASSET_DIR = "cnn_model"

/** A staged model directory: real files on disk, because ORT needs a path for the QNN backend library. */
class StagedModel(
    val dir: File,
    val configJson: String,
    val fp32: File,
    /** null when the run shipped no quantized graph — then the QNN EP is not even attempted. */
    val qnn: File?,
)

/**
 * Copies the bundled model assets to a real directory once. Takes an opener instead of a
 * [Context] so the staging rule is testable on the desktop JVM; [fromAssets] is the Android
 * binding.
 */
class CnnModelAssets(
    private val open: (String) -> InputStream?,
    private val dir: File,
) {
    fun stage(): StagedModel {
        dir.mkdirs()
        val config = stageFile(MODEL_CONFIG_FILE) ?: error("missing asset $ASSET_DIR/$MODEL_CONFIG_FILE")
        val fp32 = stageFile(MODEL_FP32_FILE) ?: error("missing asset $ASSET_DIR/$MODEL_FP32_FILE")
        return StagedModel(dir = dir, configJson = config.readText(), fp32 = fp32, qnn = stageFile(MODEL_QNN_FILE))
    }

    /** Size-guarded: an already-staged file of the same length is left alone. */
    private fun stageFile(name: String): File? {
        val source = open(name) ?: return null
        return source.use { input ->
            val target = File(dir, name)
            val expected = input.available().toLong()
            if (!target.isFile || target.length() != expected) {
                target.outputStream().use { input.copyTo(it) }
            }
            target
        }
    }

    companion object {
        fun fromAssets(context: Context): CnnModelAssets =
            CnnModelAssets(
                open = { name -> runCatching { context.assets.open("$ASSET_DIR/$name") }.getOrNull() },
                dir = File(context.filesDir, ASSET_DIR),
            )
    }
}
