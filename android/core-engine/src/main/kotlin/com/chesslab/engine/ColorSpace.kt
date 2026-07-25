package com.chesslab.engine

import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/**
 * Hand-written BGR -> HSV / Lab, reproducing OpenCV's **8-bit** conversions.
 *
 * OpenCV is off `:core-engine`'s classpath (entry.md hard rule 1, `ClasspathPurityTest`), but every
 * colour threshold in the tracker was tuned against `cv2.cvtColor`'s numbers, so the conversions
 * have to agree with it. OpenCV's 8-bit paths (`RGB2HSV_b`, `RGB2Lab_b` in `color_hsv.cpp` /
 * `color_lab.cpp`) are fixed-point pipelines over integer lookup tables, not the textbook float
 * formulas — so this file reproduces *those*, which makes HSV bit-exact and keeps Lab within
 * 1 LSB (the float formula from `01c-shadow-gamut.md` reaches 2 LSB on a*; see STATUS D01c-1).
 *
 * Conventions: H in 0..179, S and V in 0..255; L = L* * 255/100, a = a* + 128, b = b* + 128, all
 * saturated to 0..255. Input and output are interleaved 3-channel, stride `width * 3`.
 */

private const val BYTE_MASK = 0xFF
private const val CHANNELS = 3
private const val LEVELS = 256
private const val U8_MAX = 255
private const val U16_MAX = 65535
private const val DIM = 3
private const val DIM_SQ = 9

// Indices into the `intArrayOf(x0, y0, x1, y1)` of [squareRegion].
private const val R_X0 = 0
private const val R_Y0 = 1
private const val R_X1 = 2
private const val R_Y1 = 3

/**
 * Geometry of one interleaved colour plane: its pixel size plus the `square_region` parameters
 * the per-square means are taken over. [extendUp] is the *overhang* of the pack's evidence boxes;
 * the gamut and the base occlusion box always use `extendUp = 0.0`, exactly like Python.
 */
internal class PlaneGeometry(
    val width: Int,
    val height: Int,
    val boardSize: Int,
    val whitePov: Boolean,
    val extendUp: Double = 0.0,
) {
    /**
     * [squareRegion] clipped to the plane, the way NumPy's `img[y0:y1, x0:x1]` clips.
     * `null` means an empty region — Python's `reg.size == 0`, which is *skipped*, never flagged.
     */
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

/** The two converted planes of one frame, both interleaved and of the same [PlaneGeometry]. */
internal class ColorPlanes(
    val lab: ByteArray,
    val hsv: ByteArray,
)

// ---------------------------------------------------------------------------------------
// HSV — OpenCV `RGB2HSV_b`
// ---------------------------------------------------------------------------------------

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

/**
 * Interleaved BGR -> interleaved HSV (`cv2.COLOR_BGR2HSV`, 8-bit): H 0..179, S/V 0..255.
 * Writes into the caller-owned [out] and returns it.
 */
internal fun bgrToHsv(
    bgr: ByteArray,
    width: Int,
    height: Int,
    out: ByteArray,
): ByteArray {
    requirePlanes(bgr.size, out.size, width, height)
    val end = width * height * CHANNELS
    for (p in 0 until end step CHANNELS) {
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
    return out
}

// ---------------------------------------------------------------------------------------
// Lab — OpenCV `RGB2Lab_b`
// ---------------------------------------------------------------------------------------

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

/**
 * `coeffs[row * 3 + c] = round(M[row][c] * (1 << 12) / whitepoint[row])`, with `c` in **BGR**
 * source-channel order (OpenCV permutes by `blueIdx`, which is 0 for a BGR input).
 */
private val labCoeffs: IntArray =
    IntArray(DIM_SQ).also { c ->
        for (row in 0 until DIM) {
            val scale = (1 shl LAB_SHIFT).toDouble() / whiteD65[row]
            c[row * DIM] = Math.rint(sRgb2Xyz[row * DIM + 2] * scale).toInt()
            c[row * DIM + 1] = Math.rint(sRgb2Xyz[row * DIM + 1] * scale).toInt()
            c[row * DIM + 2] = Math.rint(sRgb2Xyz[row * DIM] * scale).toInt()
        }
    }

/**
 * Interleaved BGR -> interleaved Lab (`cv2.COLOR_BGR2LAB`, 8-bit, sRGB input, D65).
 * Writes into the caller-owned [out] and returns it.
 */
internal fun bgrToLab(
    bgr: ByteArray,
    width: Int,
    height: Int,
    out: ByteArray,
): ByteArray {
    requirePlanes(bgr.size, out.size, width, height)
    val end = width * height * CHANNELS
    for (p in 0 until end step CHANNELS) {
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
    return out
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
