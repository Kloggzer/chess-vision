package com.chesslab.engine

import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/**
 * OpenCV's fixed-point 8-bit BGR->HSV/Lab conversions; tuned thresholds require its numbers.
 * HSV: H 0..179, S/V 0..255. Lab: L=L*255/100, a/b offset by 128, saturated to 0..255.
 */

private const val BYTE_MASK = 0xFF
private const val CHANNELS = 3
private const val LEVELS = 256
private const val U8_MAX = 255
private const val U16_MAX = 65535
private const val DIM = 3
private const val DIM_SQ = 9

private const val R_X0 = 0
private const val R_Y0 = 1
private const val R_X1 = 2
private const val R_Y1 = 3

/** [extendUp] is evidence-box overhang; gamut and base occlusion always use 0.0. */
internal class PlaneGeometry(
    val width: Int,
    val height: Int,
    val boardSize: Int,
    val whitePov: Boolean,
    val extendUp: Double = 0.0,
) {
    /** NumPy slicing clips to the plane; an empty region is skipped rather than flagged. */
    fun region(
        square: Int,
        extendUp: Double,
    ): IntArray? {
        val r = squareRegion(square, boardSize, whitePov, extendUp = extendUp)
        val x0 = r[R_X0].coerceIn(0, width)
        val y0 = r[R_Y0].coerceIn(0, height)
        val x1 = r[R_X1].coerceIn(x0, width)
        val y1 = r[R_Y1].coerceIn(y0, height)
        return if (x1 > x0 && y1 > y0) intArrayOf(x0, y0, x1, y1) else null
    }
}

internal class ColorPlanes(
    val lab: ByteArray,
    val hsv: ByteArray,
)

private const val HSV_SHIFT = 12
private const val HSV_ROUND = 1 shl (HSV_SHIFT - 1)
private const val HUE_RANGE = 180
private const val HUE_SECTORS = 6.0
private const val HUE_SECTOR_BLUE = 4

/** `sdiv_table[i] = round((255 << 12) / i)`, index 0 unused (diff is 0 there). */
private val hsvSDiv: IntArray =
    IntArray(LEVELS).also { table ->
        for (i in 1 until LEVELS) {
            table[i] = Math.rint((U8_MAX.toLong() shl HSV_SHIFT).toDouble() / i).toInt()
        }
    }

/** `hdiv_table180[i] = round((180 << 12) / (6 * i))`, index 0 = 0 so a grey pixel yields H = 0. */
private val hsvHDiv: IntArray =
    IntArray(LEVELS).also { table ->
        for (i in 1 until LEVELS) {
            table[i] = Math.rint((HUE_RANGE.toLong() shl HSV_SHIFT).toDouble() / (HUE_SECTORS * i)).toInt()
        }
    }

/** OpenCV `COLOR_BGR2HSV`, 8-bit: H 0..179, S/V 0..255. */
internal fun bgrToHsv(
    bgr: ByteArray,
    width: Int,
    height: Int,
    out: ByteArray,
): ByteArray {
    requirePlanes(bgr.size, out.size, width, height)
    hsvRange(bgr, out, 0, width * height * CHANNELS)
    return out
}

/** Converts one box at plane offsets; per-pixel conversion is bit-identical to a full pass. */
internal fun bgrToHsvBox(
    bgr: ByteArray,
    width: Int,
    box: IntArray,
    out: ByteArray,
) = forEachBoxRow(width, box) { from, to -> hsvRange(bgr, out, from, to) }

/** [bgrToLab] over one box; see [bgrToHsvBox]. */
internal fun bgrToLabBox(
    bgr: ByteArray,
    width: Int,
    box: IntArray,
    out: ByteArray,
) = forEachBoxRow(width, box) { from, to -> labRange(bgr, out, from, to) }

private inline fun forEachBoxRow(
    width: Int,
    box: IntArray,
    row: (Int, Int) -> Unit,
) {
    val stride = width * CHANNELS
    for (y in box[R_Y0] until box[R_Y1]) {
        row(y * stride + box[R_X0] * CHANNELS, y * stride + box[R_X1] * CHANNELS)
    }
}

private fun hsvRange(
    bgr: ByteArray,
    out: ByteArray,
    from: Int,
    end: Int,
) {
    for (p in from until end step CHANNELS) {
        val b = bgr[p].toInt() and BYTE_MASK
        val g = bgr[p + 1].toInt() and BYTE_MASK
        val r = bgr[p + 2].toInt() and BYTE_MASK
        val v = max(max(b, g), r)
        val diff = v - min(min(b, g), r)
        val s = (diff * hsvSDiv[v] + HSV_ROUND) shr HSV_SHIFT
        var h =
            when {
                v == r -> g - b
                v == g -> b - r + 2 * diff
                else -> r - g + HUE_SECTOR_BLUE * diff
            }
        h = (h * hsvHDiv[diff] + HSV_ROUND) shr HSV_SHIFT
        if (h < 0) h += HUE_RANGE
        out[p] = h.toByte()
        out[p + 1] = s.toByte()
        out[p + 2] = v.toByte()
    }
}

private const val LAB_SHIFT = 12
private const val GAMMA_SHIFT = 3
private const val LAB_SHIFT2 = 15

/** `LAB_CBRT_TAB_SIZE_B = 256 * 3 / 2 * (1 << gamma_shift)`. */
private const val LAB_CBRT_SIZE = 3072

private const val GAMMA_SPLIT = 0.04045
private const val GAMMA_LINEAR_DIV = 12.92
private const val GAMMA_OFFSET = 0.055
private const val GAMMA_SCALE = 1.055
private const val GAMMA_EXP = 2.4

private const val CBRT_SPLIT = 0.008856
private const val CBRT_SLOPE = 7.787
private const val CBRT_INTERCEPT = 0.13793103448275862

/** `Lscale = (116 * 255 + 50) / 100`. */
private const val L_SCALE = 296

/** `Lshift = -((16 * 255 * (1 << 15) + 50) / 100)`. */
private const val L_SHIFT = -1336934
private const val A_SCALE = 500
private const val B_SCALE = 200
private const val AB_OFFSET = 128 shl LAB_SHIFT2

private val sRgb2Xyz =
    doubleArrayOf(
        0.412453,
        0.357580,
        0.180423,
        0.212671,
        0.715160,
        0.072169,
        0.019334,
        0.119193,
        0.950227,
    )

private val whiteD65 = doubleArrayOf(0.950456, 1.0, 1.088754)

/** `sRGBGammaTab_b[i] = round(255 * 8 * srgbToLinear(i / 255))`. */
private val srgbGammaTab: IntArray =
    IntArray(LEVELS).also { table ->
        for (i in 0 until LEVELS) {
            val x = i.toDouble() / U8_MAX
            val lin =
                if (x <= GAMMA_SPLIT) {
                    x / GAMMA_LINEAR_DIV
                } else {
                    ((x + GAMMA_OFFSET) / GAMMA_SCALE).pow(GAMMA_EXP)
                }
            table[i] = Math.rint(U8_MAX.toDouble() * (1 shl GAMMA_SHIFT) * lin).toInt().coerceIn(0, U16_MAX)
        }
    }

/** `LabCbrtTab_b[i] = round((1 << 15) * f(i / (255 * 8)))` with Lab's split cube root `f`. */
private val labCbrtTab: IntArray =
    IntArray(LAB_CBRT_SIZE).also { table ->
        for (i in 0 until LAB_CBRT_SIZE) {
            val x = i.toDouble() / (U8_MAX.toDouble() * (1 shl GAMMA_SHIFT))
            val f = if (x < CBRT_SPLIT) x * CBRT_SLOPE + CBRT_INTERCEPT else Math.cbrt(x)
            table[i] = Math.rint((1 shl LAB_SHIFT2).toDouble() * f).toInt().coerceIn(0, U16_MAX)
        }
    }

/** OpenCV coefficients use BGR source-channel order (`blueIdx = 0`) and 12-bit fixed point. */
private val labCoeffs: IntArray =
    IntArray(DIM_SQ).also { c ->
        for (row in 0 until DIM) {
            val scale = (1 shl LAB_SHIFT).toDouble() / whiteD65[row]
            c[row * DIM] = Math.rint(sRgb2Xyz[row * DIM + 2] * scale).toInt()
            c[row * DIM + 1] = Math.rint(sRgb2Xyz[row * DIM + 1] * scale).toInt()
            c[row * DIM + 2] = Math.rint(sRgb2Xyz[row * DIM] * scale).toInt()
        }
    }

/** OpenCV `COLOR_BGR2LAB`, 8-bit sRGB with D65 white point. */
internal fun bgrToLab(
    bgr: ByteArray,
    width: Int,
    height: Int,
    out: ByteArray,
): ByteArray {
    requirePlanes(bgr.size, out.size, width, height)
    labRange(bgr, out, 0, width * height * CHANNELS)
    return out
}

private fun labRange(
    bgr: ByteArray,
    out: ByteArray,
    from: Int,
    end: Int,
) {
    for (p in from until end step CHANNELS) {
        val b = srgbGammaTab[bgr[p].toInt() and BYTE_MASK]
        val g = srgbGammaTab[bgr[p + 1].toInt() and BYTE_MASK]
        val r = srgbGammaTab[bgr[p + 2].toInt() and BYTE_MASK]
        val fx = labCbrtTab[cbrtIndex(b, g, r, 0)]
        val fy = labCbrtTab[cbrtIndex(b, g, r, 1)]
        val fz = labCbrtTab[cbrtIndex(b, g, r, 2)]
        out[p] = descale(L_SCALE * fy + L_SHIFT, LAB_SHIFT2).coerceIn(0, U8_MAX).toByte()
        out[p + 1] = descale(A_SCALE * (fx - fy) + AB_OFFSET, LAB_SHIFT2).coerceIn(0, U8_MAX).toByte()
        out[p + 2] = descale(B_SCALE * (fy - fz) + AB_OFFSET, LAB_SHIFT2).coerceIn(0, U8_MAX).toByte()
    }
}

private fun cbrtIndex(
    b: Int,
    g: Int,
    r: Int,
    row: Int,
): Int {
    val base = row * DIM
    val xyz = descale(b * labCoeffs[base] + g * labCoeffs[base + 1] + r * labCoeffs[base + 2], LAB_SHIFT)
    return xyz.coerceIn(0, LAB_CBRT_SIZE - 1)
}

/** OpenCV's `CV_DESCALE`: round-half-up in fixed point, arithmetic shift. */
private fun descale(
    value: Int,
    bits: Int,
): Int = (value + (1 shl (bits - 1))) shr bits

private fun requirePlanes(
    srcSize: Int,
    outSize: Int,
    width: Int,
    height: Int,
) {
    require(width > 0 && height > 0) { "empty plane ${width}x$height" }
    val need = width * height * CHANNELS
    require(srcSize >= need) { "bgr plane too small: $srcSize < $need" }
    require(outSize >= need) { "out plane too small: $outSize < $need" }
}
