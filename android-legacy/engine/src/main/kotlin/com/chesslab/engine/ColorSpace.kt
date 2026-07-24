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
    private const val FEATURES = 3
    private const val HALF_HUE = 30.0
    private const val FULL_HUE = 180.0
    private const val MAX8 = 255.0
    private const val MAX8_I = 255
    private const val GREEN_SECTOR = 2.0 * HALF_HUE
    private const val BLUE_SECTOR = 4.0 * HALF_HUE
    private const val SRGB_CUT = 0.04045
    private const val SRGB_SLOPE = 12.92
    private const val SRGB_A = 0.055
    private const val SRGB_GAMMA = 2.4
    private const val LAB_EPS = 0.008856
    private const val LAB_KAPPA = 7.787
    private const val LAB_OFF = 16.0 / 116.0
    private const val LAB_L_SCALE = 116.0
    private const val LAB_L_OFF = 16.0
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

    /**
     * srgbToLinear over the only 256 possible 8-bit inputs, precomputed — the per-pixel
     * pow() in the Lab conversion dominated the occlusion-gamut path on-device (2026-07-22).
     * Values are bit-identical to calling [srgbToLinear] directly.
     */
    private val SRGB_LINEAR_LUT = DoubleArray(MAX8_I + 1) { srgbToLinear(it / MAX8) }

    /** (H 0..180, S 0..255, V 0..255) as doubles quantized like OpenCV uint8 HSV. */
    fun bgrToHsv(
        b: Int,
        g: Int,
        r: Int,
    ): DoubleArray = DoubleArray(FEATURES).also { bgrToHsvInto(b, g, r, it) }

    /** Allocation-free [bgrToHsv] for per-pixel hot loops; writes (H, S, V) into [out]. */
    fun bgrToHsvInto(
        b: Int,
        g: Int,
        r: Int,
        out: DoubleArray,
    ) {
        val v = maxOf(b, g, r)
        val mn = minOf(b, g, r)
        val diff = (v - mn).toDouble()
        val s = if (v == 0) 0.0 else (diff * MAX8 / v).roundToInt().toDouble()
        var h =
            when {
                diff == 0.0 -> 0.0
                v == r -> HALF_HUE * (g - b) / diff
                v == g -> GREEN_SECTOR + HALF_HUE * (b - r) / diff
                else -> BLUE_SECTOR + HALF_HUE * (r - g) / diff
            }
        if (h < 0) h += FULL_HUE
        out[0] = h.roundToInt().toDouble() % FULL_HUE
        out[1] = s
        out[2] = v.toDouble()
    }

    /** OpenCV-style 8-bit Lab (D65, sRGB gamma); returns (L, a, b) quantized to integers. */
    fun bgrToLab(
        b: Int,
        g: Int,
        r: Int,
    ): DoubleArray = DoubleArray(FEATURES).also { bgrToLabInto(b, g, r, it) }

    /** Allocation-free [bgrToLab] for per-pixel hot loops; writes (L, a, b) into [out]. */
    fun bgrToLabInto(
        b: Int,
        g: Int,
        r: Int,
        out: DoubleArray,
    ) {
        val rl = SRGB_LINEAR_LUT[r]
        val gl = SRGB_LINEAR_LUT[g]
        val bl = SRGB_LINEAR_LUT[b]
        // sRGB D65 -> XYZ, normalized by the D65 white point.
        val x = (XR * rl + XG * gl + XB * bl) / WHITE_X
        val y = YR * rl + YG * gl + YB * bl
        val z = (ZR * rl + ZG * gl + ZB * bl) / WHITE_Z
        val fx = fLab(x)
        val fy = fLab(y)
        val fz = fLab(z)
        val labL = LAB_L_SCALE * fy - LAB_L_OFF
        val labA = LAB_A_SCALE * (fx - fy) + LAB_SHIFT
        val labB = LAB_B_SCALE * (fy - fz) + LAB_SHIFT
        out[0] = (labL * L_TO_8BIT).roundToInt().coerceIn(0, MAX8_I).toDouble()
        out[1] = labA.roundToInt().coerceIn(0, MAX8_I).toDouble()
        out[2] = labB.roundToInt().coerceIn(0, MAX8_I).toDouble()
    }

    /**
     * Fused occlusion-gamut feature (Lab a*, Lab b*, HSV S) of one BGR pixel, packed as
     * `(a shl 16) or (b shl 8) or s` (each channel is an 0..255 int after the same rounding
     * as [bgrToLabInto]/[bgrToHsvInto]). Memoized in a direct-mapped 2^16-entry cache keyed
     * by the full 24-bit BGR triple: board pixels repeat heavily, and the Lab conversion's
     * Math.cbrt is a native (non-intrinsic) call on ART — the gamut rebuild of every quiet
     * re-anchor burned ~95 ms/frame on-device (2026-07-22). A miss computes the exact same
     * math, so values are bit-identical with or without the cache. Key+value live in ONE
     * Long (atomic on 64-bit), so a racy stale read can only yield a correct old entry or
     * a spurious miss, never a torn key/value pair.
     */
    fun packedGamutFeature(
        b: Int,
        g: Int,
        r: Int,
    ): Int {
        val key = (b shl PACK_HI) or (g shl PACK_MID) or r
        val idx = (key * HASH_MIX) ushr (Int.SIZE_BITS - CACHE_BITS)
        val entry = featureCache[idx]
        if ((entry ushr Int.SIZE_BITS).toInt() == key) return entry.toInt()
        val rl = SRGB_LINEAR_LUT[r]
        val gl = SRGB_LINEAR_LUT[g]
        val bl = SRGB_LINEAR_LUT[b]
        val x = (XR * rl + XG * gl + XB * bl) / WHITE_X
        val y = YR * rl + YG * gl + YB * bl
        val z = (ZR * rl + ZG * gl + ZB * bl) / WHITE_Z
        val fx = fLab(x)
        val fy = fLab(y)
        val fz = fLab(z)
        val labA = (LAB_A_SCALE * (fx - fy) + LAB_SHIFT).roundToInt().coerceIn(0, MAX8_I)
        val labB = (LAB_B_SCALE * (fy - fz) + LAB_SHIFT).roundToInt().coerceIn(0, MAX8_I)
        val v = maxOf(b, g, r)
        val mn = minOf(b, g, r)
        val s = if (v == 0) 0 else ((v - mn).toDouble() * MAX8 / v).roundToInt()
        val packed = (labA shl PACK_HI) or (labB shl PACK_MID) or s
        featureCache[idx] = (key.toLong() shl Int.SIZE_BITS) or (packed.toLong() and KEY_MASK)
        return packed
    }

    /**
     * HSV of one BGR pixel packed as `(h shl 16) or (s shl 8) or v` (H 0..180 and S/V 0..255
     * all fit 8 bits), memoized like [packedGamutFeature] — the shadow veto converts two full
     * squares per candidate and the per-pixel rounding showed on-device (2026-07-22). A miss
     * computes exactly [bgrToHsvInto]'s math, so values are identical with or without cache.
     */
    fun packedHsv(
        b: Int,
        g: Int,
        r: Int,
    ): Int {
        val key = (b shl PACK_HI) or (g shl PACK_MID) or r
        val idx = (key * HASH_MIX) ushr (Int.SIZE_BITS - CACHE_BITS)
        val entry = hsvCache[idx]
        if ((entry ushr Int.SIZE_BITS).toInt() == key) return entry.toInt()
        val v = maxOf(b, g, r)
        val mn = minOf(b, g, r)
        val diff = (v - mn).toDouble()
        val s = if (v == 0) 0 else (diff * MAX8 / v).roundToInt()
        var h =
            when {
                diff == 0.0 -> 0.0
                v == r -> HALF_HUE * (g - b) / diff
                v == g -> GREEN_SECTOR + HALF_HUE * (b - r) / diff
                else -> BLUE_SECTOR + HALF_HUE * (r - g) / diff
            }
        if (h < 0) h += FULL_HUE
        val hq = h.roundToInt() % FULL_HUE.toInt()
        val packed = (hq shl PACK_HI) or (s shl PACK_MID) or v
        hsvCache[idx] = (key.toLong() shl Int.SIZE_BITS) or (packed.toLong() and KEY_MASK)
        return packed
    }

    /** Bit offset of the top / middle channel in a packed 3x8-bit pixel feature. */
    const val PACK_HI = 16
    const val PACK_MID = 8

    private const val KEY_MASK = 0xFFFFFFFFL
    private const val CACHE_BITS = 16
    private const val HASH_MIX = -1640531527 // 0x9E3779B9, Fibonacci hashing
    private const val EMPTY_ENTRY = -1L
    private val featureCache = LongArray(1 shl CACHE_BITS) { EMPTY_ENTRY }
    private val hsvCache = LongArray(1 shl CACHE_BITS) { EMPTY_ENTRY }

    private fun srgbToLinear(c: Double): Double = if (c <= SRGB_CUT) c / SRGB_SLOPE else gammaExpand(c)

    private fun gammaExpand(c: Double): Double = ((c + SRGB_A) / (1.0 + SRGB_A)).pow(SRGB_GAMMA)

    private fun fLab(t: Double): Double = if (t > LAB_EPS) cbrt(t) else LAB_KAPPA * t + LAB_OFF
}
