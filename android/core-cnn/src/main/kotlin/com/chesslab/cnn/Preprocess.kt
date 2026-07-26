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

/** `config.py OCCUPANCY_CLASSES` — the 2-class occupancy run (specs/18-occupancy-model). */
val OCCUPANCY_CLASSES: List<String> = listOf("empty", "occupied")

/** The class lists this app knows how to consume, in the order they must appear. */
private val ACCEPTED_CLASS_LISTS: List<List<String>> = listOf(EXPECTED_CLASSES, OCCUPANCY_CLASSES)

/**
 * Fails loudly when the model asset's class list is neither the canonical 14-class order nor
 * the 2-class occupancy order. Returns the asset list so callers keep using THAT, not
 * [EXPECTED_CLASSES].
 *
 * A reordered list silently relabels every piece, so refusing to load is the only safe answer.
 * The 2-class list is accepted because the tracker consumes OCCUPANCY, not identity:
 * `observationFromProbs` detects it via [classesHaveIdentity] and reports no label at all, so
 * the engine takes its existing occupancy-only path rather than comparing `"occupied"` to `"wP"`.
 */
fun requireExpectedClasses(classes: List<String>): List<String> {
    require(classes in ACCEPTED_CLASS_LISTS) {
        "model classes $classes != expected $EXPECTED_CLASSES or $OCCUPANCY_CLASSES"
    }
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
): FloatArray = FloatArray(crops.size * CHANNELS * outW * outH).also { preprocessInto(crops, outW, outH, it, mean, std) }

/**
 * [preprocess] into a **caller-owned** buffer — same arithmetic, same layout, no allocation.
 *
 * The live path observes a few times per second with `64 * 3 * 128 * 128` floats = 12.6 MB per
 * call, which is sustained GC pressure next to a 15 fps camera loop. [out] must hold exactly
 * `crops.size * 3 * outW * outH` floats; every element is written, so a reused buffer carries
 * nothing over from the previous observation.
 */
fun preprocessInto(
    crops: List<BgrImage>,
    outW: Int,
    outH: Int,
    out: FloatArray,
    mean: List<Float> = IMAGENET_MEAN,
    std: List<Float> = IMAGENET_STD,
) {
    require(mean.size == CHANNELS && std.size == CHANNELS) { "mean/std must have $CHANNELS entries" }
    val plane = outW * outH
    require(out.size == crops.size * CHANNELS * plane) {
        "out holds ${out.size} floats, expected ${crops.size * CHANNELS * plane}"
    }
    // Unboxed ONCE. `mean`/`std` are `List<Float>`, i.e. boxed `java.lang.Float`, and reading them
    // inside the pixel loop cost six interface calls plus six unboxings per pixel — 18.9 M of each
    // per 64-crop batch. Measured on an SM8650 the whole call took 259 ms of a 485 ms observation,
    // which is why the CNN looked expensive long before the graph was ever the problem. The
    // arithmetic below is unchanged and bit-identical; only the operand loads moved out.
    val meanR = mean[0]
    val meanG = mean[1]
    val meanB = mean[2]
    val stdR = std[0]
    val stdG = std[1]
    val stdB = std[2]
    for ((index, crop) in crops.withIndex()) {
        require(crop.width == outW && crop.height == outH) {
            "crop $index is ${crop.width}x${crop.height}, expected ${outW}x$outH"
        }
        val data = crop.data
        val base = index * CHANNELS * plane
        val greenBase = base + plane
        val blueBase = base + 2 * plane
        var src = 0
        for (pixel in 0 until plane) {
            val blue = (data[src].toInt() and BYTE_MASK) / MAX_U8
            val green = (data[src + 1].toInt() and BYTE_MASK) / MAX_U8
            val red = (data[src + 2].toInt() and BYTE_MASK) / MAX_U8
            out[base + pixel] = (red - meanR) / stdR
            out[greenBase + pixel] = (green - meanG) / stdG
            out[blueBase + pixel] = (blue - meanB) / stdB
            src += CHANNELS
        }
    }
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
