package com.chesslab.tracker.cnn

import java.io.File
import java.io.InputStream

const val MODEL_FP32_FILE = "model.onnx"

/** INT8/QDQ graph: the HTP backend rejects float32. */
const val MODEL_QNN_FILE = "model.qnn.onnx"
const val MODEL_CONFIG_FILE = "config.json"

/** The QDQ graph AFTER the HTP compiled it, specific to this SoC and QNN version. Compiling on device took
 *  **4 min 25 s** on an SM8650, so without this cache every launch would pay it. */
const val MODEL_QNN_CTX_FILE = "model.qnn_ctx.onnx"

const val ASSET_ROOT_DIR = "cnn_model"

/** **The string IS the directory name**, in the APK and in `filesDir`. Each carries its own `config.json`. */
const val DEFAULT_MODEL = "p4a-80-clahe"

/** Default first, so Settings shows what a fresh install runs at the top. */
val BUNDLED_MODELS =
    listOf(
        DEFAULT_MODEL,
        "p4full-128",
        "p4afull-128",
        "p4a-128",
        "p4-128",
        "p4a-80",
        "p4-80",
    )

/** A persisted setting outlives the APK: a device pinned to a dropped model would fail its attach every launch. */
fun bundledModelOrDefault(name: String?): String = if (name in BUNDLED_MODELS) name!! else DEFAULT_MODEL

/** Real files on disk: ORT needs a path for the QNN backend library. */
class StagedModel(
    val dir: File,
    val configJson: String,
    val fp32: File,
    val qnn: File?,
)

/** Copies the bundled assets once. Takes an opener so the staging rule is testable on the desktop JVM. */
class CnnModelAssets(
    private val open: (String) -> InputStream?,
    private val dir: File,
    /** NNAPI and CPU get this graph; QNN always gets [MODEL_QNN_FILE]. */
    private val graph: String = MODEL_FP32_FILE,
) {
    fun stage(): StagedModel {
        dir.mkdirs()
        val config = stageFile(MODEL_CONFIG_FILE) ?: error("missing asset ${dir.name}/$MODEL_CONFIG_FILE")
        val fp32 = stageFile(graph) ?: error("missing asset ${dir.name}/$graph")
        val qnn = stageFile(MODEL_QNN_FILE)
        // The cached context is a binary of the OLD nodes, and QNN would happily keep running it.
        if (recopied) File(dir, MODEL_QNN_CTX_FILE).delete()
        return StagedModel(dir = dir, configJson = config.readText(), fp32 = fp32, qnn = qnn)
    }

    private var recopied = false

    /** By CONTENT: `coverage_gate` 0.25 and 0.35 are the same number of bytes. */
    private fun stageFile(name: String): File? {
        val target = File(dir, name)
        val stale = (open(name) ?: return null).use { !target.isFile || !it.sameBytesAs(target) }
        if (stale) {
            open(name)?.use { input -> target.outputStream().use { input.copyTo(it) } }
            recopied = true
        }
        return target
    }
}

/** A buffer at a time: neither copy may become resident. */
private fun InputStream.sameBytesAs(file: File): Boolean {
    val mine = ByteArray(COMPARE_CHUNK)
    val theirs = ByteArray(COMPARE_CHUNK)
    file.inputStream().buffered().use { other ->
        while (true) {
            val read = fill(mine)
            if (read != other.fill(theirs)) return false
            for (i in 0 until read) if (mine[i] != theirs[i]) return false
            if (read == 0) return true
        }
    }
}

/** `read` may return short without being at the end. */
private fun InputStream.fill(buffer: ByteArray): Int {
    var filled = 0
    while (filled < buffer.size) {
        val read = read(buffer, filled, buffer.size - filled)
        if (read < 0) break
        filled += read
    }
    return filled
}

private const val COMPARE_CHUNK = 64 * 1024
