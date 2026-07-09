package com.chesslab.tracker.cnn

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import java.nio.FloatBuffer
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
 * class list (13/14 safe — indices always derived from this list, never guessed)
 * and the crop `out_size` (W, H) the model was trained on.
 */
data class ModelSpec(
    val classes: List<String>,
    val outWidth: Int,
    val outHeight: Int,
) {
    companion object {
        /** Parse a run `config.json` (unknown keys ignored). */
        fun parse(json: String): ModelSpec {
            val root = Json.parseToJsonElement(json).jsonObject
            val classes =
                root.getValue("classes").jsonArray.map { it.jsonPrimitive.content }
            val outSize = root.getValue("out_size").jsonArray
            return ModelSpec(
                classes = classes,
                outWidth = outSize[0].jsonPrimitive.content.toInt(),
                outHeight = outSize[1].jsonPrimitive.content.toInt(),
            )
        }
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
 * ImageNet mean/std normalization, NCHW.
 */
class OnnxClassifier(
    modelDir: File,
) : SquareClassifier, AutoCloseable {
    override val spec: ModelSpec = ModelSpec.parse(File(modelDir, CONFIG_FILE).readText())

    private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
    private val session: OrtSession =
        env.createSession(File(modelDir, MODEL_FILE).absolutePath, OrtSession.SessionOptions())
    private val inputName: String = session.inputNames.first()

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
                    data[base + p] = (v - MEAN[c]) / STD[c]
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
        const val CONFIG_FILE = "config.json"
        private const val CHANNELS = 3
        private const val PIXEL_MAX = 255f

        /** ImageNet normalization (`config.py NORMALIZE_MEAN/STD`). */
        private val MEAN = floatArrayOf(0.485f, 0.456f, 0.406f)
        private val STD = floatArrayOf(0.229f, 0.224f, 0.225f)

        internal fun softmax(logits: FloatArray): FloatArray {
            val max = logits.max()
            val exps = FloatArray(logits.size) { exp((logits[it] - max)) }
            val sum = exps.sum()
            return FloatArray(logits.size) { exps[it] / sum }
        }
    }
}
