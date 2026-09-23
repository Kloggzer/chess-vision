package com.chesslab.tracker.cnn

import java.io.File
import java.io.InputStream

const val MODEL_FP32_FILE = "model.onnx"

/** INT8/QDQ graph for the Hexagon NPU; the HTP backend rejects float32, so QNN gets only this. */
const val MODEL_QNN_FILE = "model.qnn.onnx"
const val MODEL_CONFIG_FILE = "config.json"

/**
 * The QDQ graph AFTER the HTP has compiled it — an `EPContext` ONNX holding the device binary.
 *
 * Not shipped: it is produced on first attach and is specific to this SoC and this QNN version.
 * Compiling `model.qnn.onnx` on device took **4 min 25 s** on an SM8650 (measured), so without
 * this cache every launch would pay it.
 */
const val MODEL_QNN_CTX_FILE = "model.qnn_ctx.onnx"

/** The directory name under the APK's assets AND under `filesDir`; the app binding reads it. */
const val ASSET_ROOT_DIR = "cnn_model"

/**
 * The model directories bundled under `assets/cnn_model/`. **The string IS the directory name**,
 * in the APK and in `filesDir`, so there is no table mapping a label to a path that could rot.
 *
 * Each carries its own `config.json` and so declares its own `infer_size` (specs/22), its
 * `coverage_gate` (`docs/occlusion-gate.md`) and — seit `p4a-80-clahe` — seine Vorverarbeitung.
 * Die `real13`/`real14`/`id35`-Familien sind mit dem `p4`-Wechsel (2026-08-30) ausgezogen.
 */
const val DEFAULT_MODEL = "p4a-80-clahe"

/**
 * Default first, so Settings presents the model a fresh install actually runs at the top.
 *
 * `p4a` = Aufmerksamkeitskopf ueber die 64 Zellen, Zahl = Crop-Groesse, `full` = langes Rezept.
 * Der Vorgabe-Zweig ist seit 2026-08-30 `p4a-80-clahe` — das Modell, das erforscht wird, und das
 * einzige mit eigener Vorverarbeitung (`docs/camera.md`). Ein Replay ohne `model=` misst es.
 */
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

/**
 * [name] when the APK really bundles it, else [DEFAULT_MODEL].
 *
 * A persisted setting outlives the build that wrote it. A device pinned to a directory a later APK
 * no longer carries would otherwise fail its attach on every launch — the `modelAsset` version of
 * exactly that was found on a phone three model releases behind (see `AppSettings`).
 */
fun bundledModelOrDefault(name: String?): String = if (name in BUNDLED_MODELS) name!! else DEFAULT_MODEL

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
 * a supplier so the staging rule is testable on the desktop JVM; `fromAssets` is the Android
 * binding.
 */
class CnnModelAssets(
    private val open: (String) -> InputStream?,
    private val dir: File,
    /** 07a's `AppSettings.modelAsset` — the graph NNAPI and CPU are given. QNN always gets [MODEL_QNN_FILE]. */
    private val graph: String = MODEL_FP32_FILE,
) {
    fun stage(): StagedModel {
        dir.mkdirs()
        val config = stageFile(MODEL_CONFIG_FILE) ?: error("missing asset ${dir.name}/$MODEL_CONFIG_FILE")
        val fp32 = stageFile(graph) ?: error("missing asset ${dir.name}/$graph")
        val qnn = stageFile(MODEL_QNN_FILE)
        // A recopied graph invalidates its compiled form — the cached context is a binary of the
        // OLD nodes and QNN would happily keep running it.
        if (recopied) File(dir, MODEL_QNN_CTX_FILE).delete()
        return StagedModel(dir = dir, configJson = config.readText(), fp32 = fp32, qnn = qnn)
    }

    private var recopied = false

    /**
     * Everything is compared by CONTENT — `docs/occlusion-gate.md`.
     *
     * The graph was guarded by `available()` ("readable without blocking", not a length), the config
     * by size, and `coverage_gate` 0.25 and 0.35 are the same number of bytes.
     */
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

/** A buffer at a time: a graph is megabytes and neither copy may become resident to compare them. */
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

/** `read` may return short of the buffer without being at the end; a compare must not read that as a difference. */
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
