package com.chesslab.cnn

import com.chesslab.engine.api.BgrImage
import kotlin.math.abs
import kotlin.math.exp

private const val CHANNELS = 3
private const val BYTE_MASK = 0xFF
private const val MAX_U8 = 255.0f

/**
 * What the first convolution is fed — the port of `torch_data.INPUT_REPRS`.
 *
 * A run records its choice in `config.json` (`input_repr`) and the exported graph's stem is built
 * for [channels]; reading the name from the asset is what stops serving from drifting away from
 * training, and a wrong channel count would surface only as a shape error inside ORT.
 */
enum class InputRepr(
    val id: String,
    val hasRgb: Boolean,
    val hasGray: Boolean,
    val hasSobel: Boolean,
) {
    RGB("rgb", hasRgb = true, hasGray = false, hasSobel = false),
    GRAY_SOBEL("gray+sobel", hasRgb = false, hasGray = true, hasSobel = true),
    RGB_SOBEL("rgb+sobel", hasRgb = true, hasGray = false, hasSobel = true),
    SOBEL("sobel", hasRgb = false, hasGray = false, hasSobel = true),
    ;

    /** Derived, not declared — the stack IS the channel count, in `torch.cat` order. */
    val channels: Int get() = (if (hasRgb) CHANNELS else 0) + (if (hasGray) 1 else 0) + (if (hasSobel) 1 else 0)

    companion object {
        fun of(id: String): InputRepr =
            entries.firstOrNull { it.id == id }
                ?: throw IllegalArgumentException("unknown input_repr '$id' (one of ${entries.map { it.id }})")
    }
}

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

/**
 * `dataset_build.py class_list_for("pieces13")` — the 14-class list minus `occluded`.
 *
 * `occluded` never comes from a FEN, only from a hand label, and the real corpus holds zero of
 * them, so an identity run trained on camera data has no column for it. Dropping the column rather
 * than carrying a permanently-empty one is what `pieces13` is; the prefix is identical to
 * [EXPECTED_CLASSES], so every index a caller reads by name lands in the same place.
 */
val PIECES13_CLASSES: List<String> = EXPECTED_CLASSES.filterNot { it == "occluded" }

/** The class lists this app knows how to consume, in the order they must appear. */
private val ACCEPTED_CLASS_LISTS: List<List<String>> =
    listOf(EXPECTED_CLASSES, PIECES13_CLASSES, OCCUPANCY_CLASSES)

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
    perCrop: Boolean = false,
    repr: InputRepr = InputRepr.RGB,
): FloatArray =
    FloatArray(crops.size * repr.channels * outW * outH)
        .also { preprocessInto(crops, outW, outH, it, mean, std, perCrop, repr) }

/**
 * [preprocess] into a **caller-owned** buffer — same arithmetic, same layout, no allocation.
 *
 * The live path observes a few times per second with `64 * 3 * 128 * 128` floats = 12.6 MB per
 * call, which is sustained GC pressure next to a 15 fps camera loop. [out] must hold exactly
 * `crops.size * repr.channels * outW * outH` floats; every element is written, so a reused buffer
 * carries nothing over from the previous observation.
 *
 * `LongParameterList` is suppressed on purpose. All eight are primitive and all eight vary per
 * call; the holder object detekt is asking for would exist only to satisfy detekt, hiding which
 * knobs there are behind a type nothing else in the module needs.
 */
@Suppress("LongParameterList")
fun preprocessInto(
    crops: List<BgrImage>,
    outW: Int,
    outH: Int,
    out: FloatArray,
    mean: List<Float> = IMAGENET_MEAN,
    std: List<Float> = IMAGENET_STD,
    perCrop: Boolean = false,
    repr: InputRepr = InputRepr.RGB,
) {
    require(mean.size == CHANNELS && std.size == CHANNELS) { "mean/std must have $CHANNELS entries" }
    val plane = outW * outH
    require(out.size == crops.size * repr.channels * plane) {
        "out holds ${out.size} floats, expected ${crops.size * repr.channels * plane}"
    }
    if (repr != InputRepr.RGB) {
        representInto(crops, outW, outH, out, mean, std, repr)
        return
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
    if (perCrop) {
        standardisePerCrop(crops, outW, outH, out)
        return
    }
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

/**
 * `(x - mean) / std` computed over EACH crop, channels together — the port of
 * `torch_data._PerCropStandardize`.
 *
 * This is the contrast stretch GroupNorm used to perform inside the network. A black piece on a
 * DARK square stands 6.0 grey levels off its background against 40.2 on a light square; doing the
 * normalisation per crop closes that 6.6x gap to 1.5x, and doing it HERE lets the network's
 * BatchNorms fold into their convolutions (573 graph nodes -> 89).
 *
 * `std` is the UNBIASED estimate, because `torch.Tensor.std()` defaults to `correction=1` and the
 * two sides have to agree to the last bit or the model sees inputs it was never trained on.
 */
private fun standardisePerCrop(
    crops: List<BgrImage>,
    outW: Int,
    outH: Int,
    out: FloatArray,
) {
    val plane = outW * outH
    val n = CHANNELS * plane
    for ((index, crop) in crops.withIndex()) {
        require(crop.width == outW && crop.height == outH) {
            "crop $index is ${crop.width}x${crop.height}, expected ${outW}x$outH"
        }
        val data = crop.data
        val base = index * CHANNELS * plane
        val greenBase = base + plane
        val blueBase = base + 2 * plane
        var sum = 0.0
        var src = 0
        for (pixel in 0 until plane) {
            val blue = (data[src].toInt() and BYTE_MASK) / MAX_U8
            val green = (data[src + 1].toInt() and BYTE_MASK) / MAX_U8
            val red = (data[src + 2].toInt() and BYTE_MASK) / MAX_U8
            out[base + pixel] = red
            out[greenBase + pixel] = green
            out[blueBase + pixel] = blue
            sum += (red + green + blue).toDouble()
            src += CHANNELS
        }
        val mean = sum / n
        var sq = 0.0
        for (i in base until base + n) {
            val d = out[i] - mean
            sq += d * d
        }
        val std = kotlin.math.sqrt(sq / (n - 1)) + PER_CROP_EPS
        for (i in base until base + n) {
            out[i] = ((out[i] - mean) / std).toFloat()
        }
    }
}

/** `torch_data._PerCropStandardize`'s epsilon — the two must agree. */
private const val PER_CROP_EPS: Double = 1e-5

// --- input representation --------------------------------------------------------------------
//
// The port of `torch_data.InputRepresentation`. Pinned to golden numbers from the Python transform
// in `PreprocessTest`, because "the two normalise the same way" is not a property one can assert.

/** ITU-R BT.601 luma — `torch_data._LUMA`, the coefficients `cv2.COLOR_BGR2GRAY` uses. */
private const val LUMA_R = 0.299f
private const val LUMA_G = 0.587f
private const val LUMA_B = 0.114f

/** `torch_data._GRAY_MEAN` / `_GRAY_STD` — ImageNet projected through the luma weights. */
private const val GRAY_MEAN = 0.449f
private const val GRAY_STD = 0.226f

/** `torch_data._SOBEL_MEAN` / `_SOBEL_STD`, measured over 4000 occ-real crops at 128x128. */
private const val SOBEL_MEAN = 0.3704f
private const val SOBEL_STD = 0.5259f

/**
 * Build [repr]'s channel stack for every crop.
 *
 * Channel order follows the `torch.cat` in `InputRepresentation.forward`: RGB first when present,
 * then gray, then the gradient magnitude.
 */
private fun representInto(
    crops: List<BgrImage>,
    outW: Int,
    outH: Int,
    out: FloatArray,
    mean: List<Float>,
    std: List<Float>,
    repr: InputRepr,
) {
    // Reflect-101 mirrors ACROSS the edge pixel, so it needs a second row/column to mirror onto.
    require(outW >= 2 && outH >= 2) { "$repr needs a crop of at least 2x2, got ${outW}x$outH" }
    val plane = outW * outH
    val gray = FloatArray(plane)
    for ((index, crop) in crops.withIndex()) {
        require(crop.width == outW && crop.height == outH) {
            "crop $index is ${crop.width}x${crop.height}, expected ${outW}x$outH"
        }
        val data = crop.data
        var base = index * repr.channels * plane
        var src = 0
        for (pixel in 0 until plane) {
            val blue = (data[src].toInt() and BYTE_MASK) / MAX_U8
            val green = (data[src + 1].toInt() and BYTE_MASK) / MAX_U8
            val red = (data[src + 2].toInt() and BYTE_MASK) / MAX_U8
            if (repr.hasRgb) {
                out[base + pixel] = (red - mean[0]) / std[0]
                out[base + plane + pixel] = (green - mean[1]) / std[1]
                out[base + 2 * plane + pixel] = (blue - mean[2]) / std[2]
            }
            gray[pixel] = LUMA_R * red + LUMA_G * green + LUMA_B * blue
            src += CHANNELS
        }
        if (repr.hasRgb) base += CHANNELS * plane
        if (repr.hasGray) {
            for (pixel in 0 until plane) out[base + pixel] = (gray[pixel] - GRAY_MEAN) / GRAY_STD
            base += plane
        }
        if (repr.hasSobel) sobelInto(gray, outW, outH, out, base)
    }
}

/**
 * `|Gx| + |Gy|` of [gray] into `out[base until base + w*h]`, normalised by the constants above.
 *
 * This is exactly
 *
 *     cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3, borderType=cv2.BORDER_REFLECT_101)
 *
 * plus the same for `dy`. **ksize=3** because the piece silhouette IS the signal and a wider
 * derivative smooths it away; **BORDER_REFLECT_101** because it is `cv2.Sobel`'s default AND
 * `torch.nn.functional.pad(mode="reflect")`, so this port and the training transform agree on the
 * crop's frame instead of each inventing an edge; **float32 on the [0,1] image** rather than uint8,
 * because OpenCV's uint8 rounding is the one step that could not be reproduced here bit-for-bit.
 *
 * Reflect-101 means the border pixel is not repeated: row -1 mirrors to row 1, row h to row h-2.
 */
private fun sobelInto(
    gray: FloatArray,
    w: Int,
    h: Int,
    out: FloatArray,
    base: Int,
) {
    for (y in 0 until h) {
        val up = (if (y == 0) 1 else y - 1) * w
        val mid = y * w
        val down = (if (y == h - 1) h - 2 else y + 1) * w
        for (x in 0 until w) {
            val left = if (x == 0) 1 else x - 1
            val right = if (x == w - 1) w - 2 else x + 1
            val ul = gray[up + left]
            val um = gray[up + x]
            val ur = gray[up + right]
            val ml = gray[mid + left]
            val mr = gray[mid + right]
            val dl = gray[down + left]
            val dm = gray[down + x]
            val dr = gray[down + right]
            val gx = ur + 2f * mr + dr - ul - 2f * ml - dl
            val gy = dl + 2f * dm + dr - ul - 2f * um - ur
            out[base + mid + x] = (abs(gx) + abs(gy) - SOBEL_MEAN) / SOBEL_STD
        }
    }
}
