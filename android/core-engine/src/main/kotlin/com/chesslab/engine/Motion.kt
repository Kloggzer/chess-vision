package com.chesslab.engine

import kotlin.math.abs
import kotlin.math.floor

/** Per-pixel brightness threshold in 8-bit gray levels. */
internal const val MOTION_PX_THR_DEFAULT: Double = 20.0

private const val PERCENT: Double = 100.0
private const val MOTION_U8_MASK: Int = 0xFF

/** No absdiff of two bytes can exceed this, so no threshold at or above it can be beaten. */
private const val MOTION_U8_MAX: Int = 255

/**
 * Percent (0..100) of unsigned-byte diffs strictly above [pxThr], matching NumPy `d > px_thr`.
 * Strong compact hand motion survives; widespread tiny warp jitter stays below threshold.
 * The 0.25 motion threshold is percent, not a fraction.
 */
internal fun motionScore(
    prev: ByteArray,
    cur: ByteArray,
    pxThr: Double = MOTION_PX_THR_DEFAULT,
): Double {
    require(prev.size == cur.size) { "motion planes differ in size: ${prev.size} vs ${cur.size}" }
    val n = prev.size
    if (n == 0) return 0.0
    val least = leastCountingDiff(pxThr) ?: return 0.0
    var hits = 0
    for (i in 0 until n) {
        val d = abs((cur[i].toInt() and MOTION_U8_MASK) - (prev[i].toInt() and MOTION_U8_MASK))
        if (d >= least) hits++
    }
    return hits.toDouble() / n * PERCENT
}

/** For integer d in 0..255, strict `d > pxThr` is `d >= floor(pxThr)+1`; NaN counts nothing. */
private fun leastCountingDiff(pxThr: Double): Int? =
    when {
        pxThr.isNaN() || pxThr >= MOTION_U8_MAX -> null
        pxThr < 0 -> 0
        else -> floor(pxThr).toInt() + 1
    }
