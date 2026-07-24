package com.chesslab.cnn

import com.chesslab.engine.api.BgrImage
import kotlin.math.exp

private const val CHANNELS = 3
private const val BYTE_MASK = 0xFF
private const val MAX_U8 = 255.0f

/**
 * `config.py:18-23 CLASSES`. Used ONLY to assert the order of the class list read from the
 * model asset's `config.json` — the runtime source of truth is that asset, never this list.
 */
val EXPECTED_CLASSES: List<String> =
    listOf(
        "empty",
        "wP",
        "wN",
        "wB",
        "wR",
        "wQ",
        "wK",
        "bP",
        "bN",
        "bB",
        "bR",
        "bQ",
        "bK",
        "occluded",
    )

/** `config.py:286-287 NORMALIZE_MEAN / NORMALIZE_STD` (ImageNet). */
val IMAGENET_MEAN: List<Float> = listOf(0.485f, 0.456f, 0.406f)
val IMAGENET_STD: List<Float> = listOf(0.229f, 0.224f, 0.225f)

/**
 * Fails loudly when the model asset's class list is not the canonical 14-class order.
 * Returns the asset list so callers keep using THAT, not [EXPECTED_CLASSES].
 */
fun requireExpectedClasses(classes: List<String>): List<String> {
    require(classes == EXPECTED_CLASSES) { "model classes $classes != expected $EXPECTED_CLASSES" }
    return classes
}

/**
 * Contract from `serving.py:318-400 predict_arrays` (the `all_at_size` fast path, which is
 * the live path): BGR uint8 HWC -> BGR->RGB flip -> `/255` -> `(x - mean) / std` -> NCHW
 * float32, N first, then the R, G and B planes.
 *
 * Crops arrive already at `outW x outH` from `Crops.cropsForFrame` (02b). A differently
 * sized crop is a programming error — this function does NOT resize, colour-correct or CLAHE.
 */
fun preprocess(
    crops: List<BgrImage>,
    outW: Int,
    outH: Int,
    mean: List<Float> = IMAGENET_MEAN,
    std: List<Float> = IMAGENET_STD,
): FloatArray {
    require(mean.size == CHANNELS && std.size == CHANNELS) { "mean/std must have $CHANNELS entries" }
    val plane = outW * outH
    val out = FloatArray(crops.size * CHANNELS * plane)
    for ((index, crop) in crops.withIndex()) {
        require(crop.width == outW && crop.height == outH) {
            "crop $index is ${crop.width}x${crop.height}, expected ${outW}x$outH"
        }
        val base = index * CHANNELS * plane
        for (pixel in 0 until plane) {
            val src = pixel * CHANNELS
            val blue = (crop.data[src].toInt() and BYTE_MASK) / MAX_U8
            val green = (crop.data[src + 1].toInt() and BYTE_MASK) / MAX_U8
            val red = (crop.data[src + 2].toInt() and BYTE_MASK) / MAX_U8
            out[base + pixel] = (red - mean[0]) / std[0]
            out[base + plane + pixel] = (green - mean[1]) / std[1]
            out[base + 2 * plane + pixel] = (blue - mean[2]) / std[2]
        }
    }
    return out
}

/**
 * The model head emits **log-probabilities** (`training/model.py:172-177 HierarchicalHead`
 * returns `occ_term + piece_term * occ_mask`, both `log_softmax`) and Python applies
 * `torch.softmax` to them anyway (`serving.py`). `softmax(log p) == p` up to normalization,
 * so applying softmax to the ONNX output is CORRECT — do not "optimise" it to `exp()`.
 * Max-subtracting stable form.
 */
fun softmax(logProbs: FloatArray): FloatArray {
    val top = if (logProbs.isEmpty()) 0.0f else logProbs.max()
    val exps = FloatArray(logProbs.size) { exp((logProbs[it] - top).toDouble()).toFloat() }
    val sum = exps.sum()
    return FloatArray(exps.size) { exps[it] / sum }
}
