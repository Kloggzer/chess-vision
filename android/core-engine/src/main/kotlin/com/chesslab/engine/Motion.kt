package com.chesslab.engine

import kotlin.math.abs

/** `config.TRACK_DEFAULTS["motion_px_thr"]` — the per-pixel brightness threshold (`config.py:596`). */
internal const val MOTION_PX_THR_DEFAULT: Double = 20.0

private const val PERCENT: Double = 100.0
private const val MOTION_U8_MASK: Int = 0xFF

/**
 * Python `motion_score`. **PERCENT** (0..100) of pixels whose brightness changed
 * by more than [pxThr].
 *
 * A hand entering produces a compact region of STRONG diffs (high score); desk wobble / marker
 * jitter shifts the whole image by ~a pixel and produces many TINY diffs everywhere (all below
 * [pxThr] -> score ~0). The earlier plain mean-abs-diff could not tell those apart and parked the
 * tracker permanently in `moving`.
 *
 * The result is compared against `motionThr = 0.25` **percent** — never return a fraction.
 * Comparison is strict `>`, exactly as NumPy's `d > px_thr` on the unsigned absdiff.
 */
internal fun motionScore(
    prev: ByteArray,
    cur: ByteArray,
    pxThr: Double = MOTION_PX_THR_DEFAULT,
): Double {
    require(prev.size == cur.size) { "motion planes differ in size: ${prev.size} vs ${cur.size}" }
    val n = prev.size
    if (n == 0) return 0.0
    var hits = 0
    for (i in 0 until n) {
        val d = abs((cur[i].toInt() and MOTION_U8_MASK) - (prev[i].toInt() and MOTION_U8_MASK))
        if (d > pxThr) hits++
    }
    return hits.toDouble() / n * PERCENT
}
