package com.chesslab.cnn

import com.chesslab.engine.api.BgrImage
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.ln

private const val CHANNELS = 3
private const val BYTE_MASK = 0xFF
private const val MAX_U8 = 255.0f

/** Read from the asset's `input_repr`, so serving cannot drift from training; a wrong channel count would
 *  surface only as a shape error inside ORT. */
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

    /** Derived: the stack IS the channel count, in `torch.cat` order. */
    val channels: Int get() = (if (hasRgb) CHANNELS else 0) + (if (hasGray) 1 else 0) + (if (hasSobel) 1 else 0)

    companion object {
        fun of(id: String): InputRepr =
            entries.firstOrNull { it.id == id }
                ?: throw IllegalArgumentException("unknown input_repr '$id' (one of ${entries.map { it.id }})")
    }
}

/** Used ONLY to assert the order of the asset's class list — the asset is the source of truth. */
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

val IMAGENET_MEAN: List<Float> = listOf(0.485f, 0.456f, 0.406f)
val IMAGENET_STD: List<Float> = listOf(0.229f, 0.224f, 0.225f)

/** The 14-class list minus `occluded`: the real corpus holds no hand label. Identical prefix, so every index
 *  read by name lands in the same place. */
val PIECES13_CLASSES: List<String> = EXPECTED_CLASSES.filterNot { it == "occluded" }

private val ACCEPTED_CLASS_LISTS: List<List<String>> =
    listOf(EXPECTED_CLASSES, PIECES13_CLASSES)

/** A reordered list silently relabels every piece, so refuse to load; the message names every accepted order,
 *  because the one it omits is the one the failing model is closest to. */
fun requireExpectedClasses(classes: List<String>): List<String> {
    require(classes in ACCEPTED_CLASS_LISTS) {
        "model classes $classes is none of the accepted orders: " +
            ACCEPTED_CLASS_LISTS.joinToString(" / ")
    }
    return classes
}

/** BGR uint8 HWC -> RGB -> `/255` -> `(x - mean) / std` -> NCHW float32, into a **caller-owned** buffer:
 *  12.6 MB per call a few times a second is GC pressure beside a 15 fps loop. Crops must already be
 *  `outW x outH` — no resize, no CLAHE. Every element is written, so a reused buffer carries nothing over. */
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
    // `per_crop` und ein Nicht-RGB-Stapel schliessen sich aus (Python lehnt das Paar ab), aber `ModelSpec` liest
    // beide unabhaengig: still fallengelassen bekam das Modell eine Normalisierung, unter der es nie trainierte.
    require(!perCrop || repr == InputRepr.RGB) { "normalize.mode=per_crop is not defined for input_repr=${repr.id}" }
    if (perCrop) {
        standardisePerCrop(crops, outW, outH, out)
        return
    }
    if (repr != InputRepr.RGB) {
        // Python normalisiert hier fest mit ImageNet (`InputRepresentation` statt `Normalize`), nicht mit den
        // Werten des Laufs.
        representInto(crops, outW, outH, out, IMAGENET_MEAN, IMAGENET_STD, repr)
        return
    }
    // Unboxed ONCE: `List<Float>` in the pixel loop cost six interface calls and unboxings per pixel — 259 ms
    // of a 485 ms observation on an SM8650. Bit-identical.
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

/** The head emits log-probabilities and Python applies `torch.softmax` anyway; `softmax(log p) == p`, so
 *  softmax here is CORRECT — do not "optimise" it to `exp()`. */
fun softmax(logProbs: FloatArray): FloatArray = softmaxAt(logProbs, 1.0)

/** Der Argmax bleibt, nur die Konfidenz wird ehrlich. `temperature <= 0` ist keine Temperatur: 0 gab lauter
 *  `NaN`, negativ einen GEDREHTEN Argmax. */
fun softmaxAt(
    logProbs: FloatArray,
    temperature: Double,
): FloatArray {
    val scaled =
        if (temperature <= 0.0 || temperature == 1.0) {
            logProbs
        } else {
            FloatArray(logProbs.size) { (logProbs[it] / temperature).toFloat() }
        }
    val top = if (scaled.isEmpty()) 0.0f else scaled.max()
    val exps = FloatArray(scaled.size) { exp((scaled[it] - top).toDouble()).toFloat() }
    val sum = exps.sum()
    return FloatArray(exps.size) { exps[it] / sum }
}

/** An INDEPENDENT sigmoid, never part of [softmax] (`ModelSpec.coverageOutput`). */

fun sigmoid(logit: Float): Float = (1.0 / (1.0 + exp(-logit.toDouble()))).toFloat()

/** The contrast stretch GroupNorm did inside the network: a black piece on a dark square stands 6.0 grey
 *  levels off against 40.2 on light; per crop that gap shrinks 6.6x -> 1.5x and BatchNorm folds (573 -> 89
 *  nodes). `std` is UNBIASED, as `torch.Tensor.std()` — the two must agree to the last bit. */
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

// Port of `torch_data.InputRepresentation`, pinned to golden Python numbers in `PreprocessTest`.

private const val LUMA_R = 0.299f
private const val LUMA_G = 0.587f
private const val LUMA_B = 0.114f

private const val GRAY_MEAN = 0.449f
private const val GRAY_STD = 0.226f

/** `torch_data._SOBEL_MEAN` / `_SOBEL_STD`, measured over 4000 crops at 128x128. */
private const val SOBEL_MEAN = 0.3704f
private const val SOBEL_STD = 0.5259f

/** Channel order follows `InputRepresentation.forward`'s `torch.cat`: RGB, gray, gradient magnitude. */
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

/** Exactly `cv2.Sobel(gray, CV_32F, 1, 0, ksize=3, BORDER_REFLECT_101)` plus `dy`: ksize 3 keeps the
 *  silhouette, reflect-101 matches both cv2 and torch's reflect pad, float32 on [0,1] because OpenCV's
 *  uint8 rounding cannot be reproduced bit-for-bit. Row -1 mirrors to row 1, row h to h-2. */
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

/** 0,85 auf ueberkonfidenten Werten ist eine andere Huerde als auf kalibrierten. Gleichmaessiger Rest
 *  angenommen. `temperature <= 0` ungeprueft machte aus 0,85 ein 0,005 (Phantome). */
fun calibratedConfThr(
    engineThr: Double,
    temperature: Double,
    classes: Int,
): Double {
    if (temperature <= 0.0 || temperature == 1.0 || classes < 2) return engineThr
    val rest = (1.0 - engineThr) / (classes - 1)
    val logs = DoubleArray(classes) { if (it == 0) ln(engineThr) else ln(rest) }
    val scaled = DoubleArray(classes) { logs[it] / temperature }
    val top = scaled.max()
    val exps = DoubleArray(classes) { exp(scaled[it] - top) }
    return exps[0] / exps.sum()
}
