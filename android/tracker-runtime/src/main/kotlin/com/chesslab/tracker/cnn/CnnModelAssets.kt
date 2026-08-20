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
 * Each carries its own `config.json` and so declares its own `infer_size` (specs/22); the crops
 * follow it. Two ship since 2026-08-20 — the GroupNorm and 2-class occupancy families were retired
 * (see `RETIRED_MODELS` in `AppSettings`), and only BatchNorm graphs are trained now.
 *
 * `real14-80` is the default: 14 classes with an explicit `occluded`, so it can veto a hand the
 * model-free grid detector misses, and the physical phone has been stable on it. `id35-80` stays
 * as the conservative 13-class comparison arm — phantom-free at 0 phantoms / 3 misses with piece
 * identity at 0.882 (specs/29, 2026-08-01).
 */
const val DEFAULT_MODEL = "real14-80"

/** Default first, so Settings presents the model a fresh install actually runs at the top. */
val BUNDLED_MODELS = listOf(DEFAULT_MODEL, "id35-80")

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

    /** Size-guarded: an already-staged file of the same length is left alone. */
    private fun stageFile(name: String): File? {
        val source = open(name) ?: return null
        return source.use { input ->
            val target = File(dir, name)
            val expected = input.available().toLong()
            if (!target.isFile || target.length() != expected) {
                target.outputStream().use { input.copyTo(it) }
                recopied = true
            }
            target
        }
    }
}
