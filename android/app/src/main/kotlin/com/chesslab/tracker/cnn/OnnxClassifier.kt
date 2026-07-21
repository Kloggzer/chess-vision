package com.chesslab.tracker.cnn

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import ai.onnxruntime.providers.NNAPIFlags
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import java.nio.FloatBuffer
import java.util.EnumSet
import kotlin.math.exp

/**
 * One per-square crop as a plain RGB float image (HWC, values 0..255). A plain
 * value type instead of `android.graphics.Bitmap` so the classifier is JVM
 * unit-testable (same rationale as geometry's `Point`, STATUS.md discrepancy #4);
 * the OpenCV `Mat` -> [SquareCrop] conversion lives in [BoardCropper].
 */
class SquareCrop(
    val width: Int,
    val height: Int,
    val rgb: FloatArray,
)

/**
 * The subset of a run's `config.json` the tracker needs (`serving.py:73`):
 * class list (13/14 safe — indices always derived from this list, never guessed),
 * the crop `out_size` (W, H) the model was trained on, and the `normalize`
 * mean/std the training pipeline applied (`train.py` writes the actual values;
 * older configs without the key fall back to the ImageNet stats, matching
 * `quantize.py:172-174`).
 */
data class ModelSpec(
    val classes: List<String>,
    val outWidth: Int,
    val outHeight: Int,
    val mean: List<Float> = IMAGENET_MEAN,
    val std: List<Float> = IMAGENET_STD,
) {
    companion object {
        /** ImageNet normalization (`config.py NORMALIZE_MEAN/STD`) — the pre-`normalize`-key default. */
        val IMAGENET_MEAN = listOf(0.485f, 0.456f, 0.406f)
        val IMAGENET_STD = listOf(0.229f, 0.224f, 0.225f)

        /** Parse a run `config.json` (unknown keys ignored). */
        fun parse(json: String): ModelSpec {
            val root = Json.parseToJsonElement(json).jsonObject
            val classes =
                root.getValue("classes").jsonArray.map { it.jsonPrimitive.content }
            val outSize = root.getValue("out_size").jsonArray
            val normalize = root["normalize"]?.jsonObject
            return ModelSpec(
                classes = classes,
                outWidth = outSize[0].jsonPrimitive.content.toInt(),
                outHeight = outSize[1].jsonPrimitive.content.toInt(),
                mean = normalize.floats("mean") ?: IMAGENET_MEAN,
                std = normalize.floats("std") ?: IMAGENET_STD,
            )
        }

        private fun JsonObject?.floats(key: String): List<Float>? = this?.get(key)?.jsonArray?.map { it.jsonPrimitive.content.toFloat() }
    }
}

/** Batch classifier seam so [CnnSafeguard] tests can fake inference. */
interface SquareClassifier {
    val spec: ModelSpec

    /** Batch of square crops -> per-crop softmax over [ModelSpec.classes]. */
    fun predict(crops: List<SquareCrop>): List<FloatArray>
}

/**
 * ONNX Runtime wrapper around the desktop-exported `model.onnx` (opset 17,
 * `evaluate.py:130-143`). The export uses a batch-2 example so the graph is
 * genuinely dynamic in the batch dimension — [predict] runs any batch size
 * (64 crops per board observation) in ONE session call.
 *
 * Preprocessing mirrors `serving.predict_arrays` exactly: RGB, /255, then
 * mean/std normalization with the run's [ModelSpec.mean]/[ModelSpec.std], NCHW.
 *
 * ## Execution provider (Hexagon NPU) selection
 *
 * The dev phone (Poco F7 Pro, Snapdragon 8 Gen 3) has a Hexagon NPU. We pick the
 * fastest available backend with a graceful fallback chain and record which one
 * actually loaded in [backend] (on-device confirmation via logcat):
 *
 *  1. **QNN EP → Hexagon HTP (NPU)** — requires the INT8/QDQ [MODEL_QNN_FILE]
 *     produced by `chesslab export --format qnn`. Float32 graphs can't run on HTP.
 *  2. **NNAPI EP** — Android's NPU/GPU/DSP abstraction on the FP32 graph (fp16 allowed).
 *  3. **CPU** — always works (also where desktop JVM unit tests land). No behaviour
 *     change vs. the original pure-CPU path.
 *
 * Each step is guarded: a missing provider (or missing QNN model) just falls through.
 */
class OnnxClassifier(
    modelDir: File,
    private val log: (String) -> Unit = {},
) : SquareClassifier,
    AutoCloseable {
    override val spec: ModelSpec = ModelSpec.parse(File(modelDir, CONFIG_FILE).readText())

    private val env: OrtEnvironment = OrtEnvironment.getEnvironment()

    /** Which execution provider actually loaded, e.g. "QNN-HTP(NPU)", "NNAPI", "CPU". */
    val backend: String

    private val session: OrtSession
    private val inputName: String

    init {
        val (sess, be) = createSession(modelDir)
        session = sess
        backend = be
        inputName = sess.inputNames.first()
        log("CNN inference backend: $be")
    }

    /**
     * Build a session on the best available backend (NPU → NNAPI → CPU). Non-local
     * `return`s (runCatching is inline) short-circuit on the first provider that loads.
     */
    private fun createSession(modelDir: File): Pair<OrtSession, String> {
        val fp32 = File(modelDir, MODEL_FILE)
        val qnnModel = File(modelDir, MODEL_QNN_FILE)

        // 1) Hexagon NPU via QNN EP. Only attempted when the quantized model is present,
        //    because the HTP backend rejects float32 graphs.
        if (qnnModel.isFile) {
            runCatching {
                val opts = OrtSession.SessionOptions()
                opts.addQnn(
                    mapOf(
                        "backend_path" to QNN_HTP_LIB,
                        "htp_performance_mode" to "burst",
                    ),
                )
                return env.createSession(qnnModel.absolutePath, opts) to "QNN-HTP(NPU)"
            }.onFailure { log("QNN EP unavailable, falling back: ${it.message}") }
        }

        // 2) NNAPI on the FP32 graph (NPU/GPU/DSP; fp16 for speed). Deprecated in Android 15
        //    but still the broadest NPU reach when QNN isn't usable.
        runCatching {
            val opts = OrtSession.SessionOptions()
            opts.addNnapi(EnumSet.of(NNAPIFlags.USE_FP16))
            return env.createSession(fp32.absolutePath, opts) to "NNAPI"
        }.onFailure { log("NNAPI EP unavailable, falling back: ${it.message}") }

        // 3) CPU (XNNPACK default) — the original path; always succeeds.
        return env.createSession(fp32.absolutePath, OrtSession.SessionOptions()) to "CPU"
    }

    override fun predict(crops: List<SquareCrop>): List<FloatArray> {
        if (crops.isEmpty()) return emptyList()
        val n = crops.size
        val w = spec.outWidth
        val h = spec.outHeight
        val plane = h * w
        val data = FloatArray(n * CHANNELS * plane)
        for ((i, crop) in crops.withIndex()) {
            require(crop.width == w && crop.height == h) {
                "crop ${crop.width}x${crop.height} != model out_size ${w}x$h"
            }
            for (c in 0 until CHANNELS) {
                val base = (i * CHANNELS + c) * plane
                for (p in 0 until plane) {
                    val v = crop.rgb[p * CHANNELS + c] / PIXEL_MAX
                    data[base + p] = (v - spec.mean[c]) / spec.std[c]
                }
            }
        }
        val shape = longArrayOf(n.toLong(), CHANNELS.toLong(), h.toLong(), w.toLong())
        OnnxTensor.createTensor(env, FloatBuffer.wrap(data), shape).use { input ->
            session.run(mapOf(inputName to input)).use { out ->
                @Suppress("UNCHECKED_CAST")
                val logits = out[0].value as Array<FloatArray>
                return logits.map(::softmax)
            }
        }
    }

    override fun close() {
        session.close()
    }

    companion object {
        const val MODEL_FILE = "model.onnx"

        /** INT8/QDQ model for the Hexagon NPU (QNN EP); optional, preferred when present. */
        const val MODEL_QNN_FILE = "model.qnn.onnx"
        const val CONFIG_FILE = "config.json"

        /** Qualcomm HTP (NPU) backend library, bundled inside the onnxruntime-android-qnn AAR. */
        private const val QNN_HTP_LIB = "libQnnHtp.so"
        private const val CHANNELS = 3
        private const val PIXEL_MAX = 255f

        internal fun softmax(logits: FloatArray): FloatArray {
            val max = logits.max()
            val exps = FloatArray(logits.size) { exp((logits[it] - max)) }
            val sum = exps.sum()
            return FloatArray(logits.size) { exps[it] / sum }
        }
    }
}
