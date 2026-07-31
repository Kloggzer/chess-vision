package com.chesslab.tracker.cnn

import android.content.Context
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

private const val ASSET_ROOT = "cnn_model"

/**
 * The model directories bundled under `assets/cnn_model/`. **The string IS the directory name**,
 * in the APK and in `filesDir`, so there is no table mapping a label to a path that could rot.
 *
 * Three, because the two candidates disagree in ways only a live board settles and the incumbent is
 * the baseline they are judged against. Each carries its own `config.json`, so each declares its own
 * `infer_size` (specs/22) and the crops follow it — 80, 128 and 96 px respectively. Measured on
 * `occ-real3`'s two test sessions: `v6-80` 11 misses / 0 phantoms, `v4-128` 17 / 2 with a wider
 * margin on the anchor session, `shipped` the model the user has been running.
 *
 * `bn-80` is the first BatchNorm model this app has carried. It exports to 89 nodes where the
 * GroupNorm graphs export to 503 — a BatchNorm layer is a fixed per-channel affine at inference and
 * folds into the preceding convolution, while GroupNorm's `InstanceNormalization` blocks are not
 * implemented by XNNPACK and fall back to the CPU EP between every pair of convolutions. Trained
 * 2026-07-31 on `occ-real6a` at lr 3e-03: 0 phantoms, 0 misses at the phantom-free point, margin
 * 0.035. See `NormLatencyBenchmark` for what it costs on the die.
 */
val BUNDLED_MODELS = listOf("shipped", "v6-80", "v4-128", "bn-80")

/** What an install runs until someone picks otherwise: the model that was already shipping. */
val DEFAULT_MODEL: String = BUNDLED_MODELS.first()

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
 * [Context] so the staging rule is testable on the desktop JVM; [fromAssets] is the Android
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

    companion object {
        /**
         * One staged directory PER model, mirroring the asset layout.
         *
         * They cannot share a directory: [stageFile] recognises an already-staged file by its
         * LENGTH, and two models of the same architecture produce graphs within bytes of each
         * other — a shared directory would occasionally decide the wrong graph was already there.
         * Separate directories also keep each model's compiled QNN context ([MODEL_QNN_CTX_FILE])
         * with the graph it was compiled from, and make switching back a no-copy operation.
         */
        fun fromAssets(
            context: Context,
            model: String = DEFAULT_MODEL,
            graph: String = MODEL_FP32_FILE,
        ): CnnModelAssets =
            bundledModelOrDefault(model).let { dir ->
                CnnModelAssets(
                    open = { name -> runCatching { context.assets.open("$ASSET_ROOT/$dir/$name") }.getOrNull() },
                    dir = File(File(context.filesDir, ASSET_ROOT), dir),
                    graph = graph,
                )
            }
    }
}
