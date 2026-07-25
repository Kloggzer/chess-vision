package com.chesslab.engine

import kotlin.math.abs
import kotlin.math.min

/**
 * Cucchiara HSV cast-shadow test. Python `hsv_shadow_squares`.
 *
 * A square is "shadow" if its pixels, against the reference, keep their hue, are not markedly more
 * saturated and are darker. A hand's shadow satisfies this; an arriving piece does not.
 *
 * Invariant 2: a shadow square leaves `changed` but **keeps its z** — that is the caller's job
 * (`Vetoes.kt`), as is the extra `censusRaw[sq] < censusThr` requirement. This returns the pure
 * HSV verdict.
 */

private const val BYTE_MASK = 0xFF
private const val CHANNELS = 3

/** Python's `+1e-3` guard against a black reference pixel. */
private const val V_RATIO_EPS = 1e-3

/** Hue is circular over 0..179, so the distance wraps at 180. */
private const val HUE_WRAP = 180.0

// The live-tuned Cucchiara constants. Never change these to make something pass.
private const val V_LO = 0.35
private const val V_HI = 0.97
private const val H_TOL = 15.0
private const val S_TOL = 40.0
private const val SHADOW_FRAC = 0.5

/**
 * Subset of [candidates] that reads as a cast shadow rather than a real change.
 *
 * Both plane arguments are interleaved HSV at [geom]; the boxes use `geom.extendUp` — Python passes
 * the tracker's `overhang` here.
 */
internal fun hsvShadowSquares(
    refHsv: ByteArray,
    curHsv: ByteArray,
    geom: PlaneGeometry,
    candidates: Long,
): Long {
    var out = 0L
    val stride = geom.width * CHANNELS
    candidates.forEachSquare { i ->
        val box = geom.region(i, geom.extendUp)
        if (box != null && isShadowBox(refHsv, curHsv, box, stride)) out = out.with(i)
    }
    return out
}

private fun isShadowBox(
    refHsv: ByteArray,
    curHsv: ByteArray,
    box: IntArray,
    stride: Int,
): Boolean {
    val x0 = box[0]
    val y0 = box[1]
    val x1 = box[2]
    val y1 = box[3]
    var shadowPx = 0
    var pixels = 0
    var sumVc = 0L
    var sumVr = 0L
    for (y in y0 until y1) {
        val rowStart = y * stride + x0 * CHANNELS
        val rowEnd = y * stride + x1 * CHANNELS
        for (idx in rowStart until rowEnd step CHANNELS) {
            val sr = refHsv[idx + 1].toInt() and BYTE_MASK
            val vr = refHsv[idx + 2].toInt() and BYTE_MASK
            val sc = curHsv[idx + 1].toInt() and BYTE_MASK
            val vc = curHsv[idx + 2].toInt() and BYTE_MASK
            val ratio = vc / (vr + V_RATIO_EPS)
            val darkerButNotBlack = ratio >= V_LO && ratio <= V_HI
            val notMoreSaturated = (sc - sr).toDouble() <= S_TOL
            if (darkerButNotBlack && notMoreSaturated && hueClose(refHsv, curHsv, idx)) {
                shadowPx++
            }
            sumVc += vc
            sumVr += vr
            pixels++
        }
    }
    // Both conditions are required: shadow-like pixels in the majority AND actually darker.
    return shadowPx.toDouble() / pixels >= SHADOW_FRAC && sumVc < sumVr
}

private fun hueClose(
    refHsv: ByteArray,
    curHsv: ByteArray,
    idx: Int,
): Boolean {
    val raw = abs((curHsv[idx].toInt() and BYTE_MASK) - (refHsv[idx].toInt() and BYTE_MASK)).toDouble()
    return min(raw, HUE_WRAP - raw) <= H_TOL
}
