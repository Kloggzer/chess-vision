package com.chesslab.engine

import kotlin.math.cbrt
import kotlin.math.pow
import kotlin.math.roundToInt

/**
 * BGR -> HSV / Lab pixel conversions matching OpenCV's 8-bit conventions
 * (H 0..180, S/V 0..255; Lab L*255/100, a+128, b+128 with sRGB gamma).
 * Small (<=1-2 LSB) rounding differences vs OpenCV's fixed-point tables are
 * tolerated by the aggregate decisions (fraction / Mahalanobis thresholds).
 */
internal object ColorSpace {
    private const val HALF_HUE = 30.0
    private const val FULL_HUE = 180.0
    private const val MAX8 = 255.0
    private const val SRGB_CUT = 0.04045
    private const val SRGB_SLOPE = 12.92
    private const val SRGB_A = 0.055
    private const val SRGB_GAMMA = 2.4
    private const val LAB_EPS = 0.008856
    private const val LAB_KAPPA = 7.787
    private const val LAB_OFF = 16.0 / 116.0
    private const val LAB_L_SCALE = 116.0
    private const val LAB_A_SCALE = 500.0
    private const val LAB_B_SCALE = 200.0
    private const val LAB_SHIFT = 128.0
    private const val L_TO_8BIT = 255.0 / 100.0
    private const val XR = 0.412453
    private const val XG = 0.357580
    private const val XB = 0.180423
    private const val YR = 0.212671
    private const val YG = 0.715160
    private const val YB = 0.072169
    private const val ZR = 0.019334
    private const val ZG = 0.119193
    private const val ZB = 0.950227
    private const val WHITE_X = 0.950456
    private const val WHITE_Z = 1.088754

    /** (H 0..180, S 0..255, V 0..255) as doubles quantized like OpenCV uint8 HSV. */
    fun bgrToHsv(b: Int, g: Int, r: Int): DoubleArray {
        val v = maxOf(b, g, r)
        val mn = minOf(b, g, r)
        val diff = (v - mn).toDouble()
        val s = if (v == 0) 0.0 else (diff * MAX8 / v).roundToInt().toDouble()
        var h = when {
            diff == 0.0 -> 0.0
            v == r -> HALF_HUE * (g - b) / diff
            v == g -> HALF_HUE * 2 + HALF_HUE * (b - r) / diff
            else -> HALF_HUE * 4 + HALF_HUE * (r - g) / diff
        }
        if (h < 0) h += FULL_HUE
        return doubleArrayOf(h.roundToInt().toDouble() % FULL_HUE, s, v.toDouble())
    }

    /** OpenCV-style 8-bit Lab (D65, sRGB gamma); returns (L, a, b) quantized to integers. */
    fun bgrToLab(b: Int, g: Int, r: Int): DoubleArray {
        val rl = srgbToLinear(r / MAX8)
        val gl = srgbToLinear(g / MAX8)
        val bl = srgbToLinear(b / MAX8)
        // sRGB D65 -> XYZ, normalized by the D65 white point.
        val x = (XR * rl + XG * gl + XB * bl) / WHITE_X
        val y = YR * rl + YG * gl + YB * bl
        val z = (ZR * rl + ZG * gl + ZB * bl) / WHITE_Z
        val fx = fLab(x)
        val fy = fLab(y)
        val fz = fLab(z)
        val labL = LAB_L_SCALE * fy - 16.0
        val labA = LAB_A_SCALE * (fx - fy) + LAB_SHIFT
        val labB = LAB_B_SCALE * (fy - fz) + LAB_SHIFT
        return doubleArrayOf(
            (labL * L_TO_8BIT).roundToInt().coerceIn(0, 255).toDouble(),
            labA.roundToInt().coerceIn(0, 255).toDouble(),
            labB.roundToInt().coerceIn(0, 255).toDouble(),
        )
    }

    private fun srgbToLinear(c: Double): Double =
        if (c <= SRGB_CUT) c / SRGB_SLOPE else ((c + SRGB_A) / (1.0 + SRGB_A)).pow(SRGB_GAMMA)

    private fun fLab(t: Double): Double = if (t > LAB_EPS) cbrt(t) else LAB_KAPPA * t + LAB_OFF
}
