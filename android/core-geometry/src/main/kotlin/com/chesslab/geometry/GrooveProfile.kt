package com.chesslab.geometry

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

// Finding ONE groove in ONE collapsed intensity profile. Port of `alignment.py:59 _notch_centre`
// and `:105 _profile_lines`.
//
// Kept apart from `Alignment.kt`, which is about where the board's lines are: this file knows
// nothing about boards, only about a dark notch in a 1-D signal, and it is the part that had to be
// argued from measurements rather than from first principles.

/** A groove must be this many grey levels below its local background to count as found. */
internal const val MIN_DEPTH: Double = 6.0

/** Below this a window cannot hold a groove and its shoulders. */
private const val MIN_WINDOW: Int = 7

/** Fewest samples in a centroid run. */
private const val MIN_RUN: Int = 3

/** Denominators below this are treated as zero. */
private const val EPS: Double = 1e-9

/**
 * Sub-pixel centre of the groove notch in [win], as `(offset, depth)`, or null.
 *
 * **The centre of the groove, not the peak of its gradient.** A groove is a dark band with an edge
 * on EACH side, so `|Sobel|` has two peaks and `argmax` picks whichever the current lighting makes
 * stronger — left on one frame, right on the next. That flip is worth half a groove width and was
 * the measurement's whole noise floor: 2.56 px median on the real corpus against 1.32 px for a
 * centroid, with the p90 falling from 3.70 to 1.74.
 *
 * **The background is removed as a straight line first.** The profile between two grooves is not
 * flat — a light square on one side and a dark one on the other tilts it by tens of grey levels,
 * and a centroid of `constant - profile` then drifts toward the dark side. Fitting a line through
 * the window's shoulders and keeping only what falls below it leaves the notch itself.
 *
 * Be honest about what that second part bought: **nothing measurable**. On the real corpus it reads
 * 4.49 px where the old constant-baseline centroid reads 4.45, and every other estimator tried
 * (plain centroid, 3-point parabola, half-depth parabola) lands inside the same 0.15 px. It is here
 * because it is the one that does not depend on the neighbouring squares' brightness, not because
 * it won anything. The win in this module is the BANDS, not the estimator.
 */
internal fun notchCentre(
    win: DoubleArray,
    csp: Int,
    minDepth: Double = MIN_DEPTH,
): DoubleArray? {
    val resid = shoulderResidual(win) ?: return null
    var peak = 0
    for (i in resid.indices) {
        if (resid[i] > resid[peak]) peak = i
    }
    if (resid[peak] < minDepth) return null
    return halfDepthCentroid(resid, peak, csp)
}

/** How far each sample falls below the line through the window's shoulders, or null. */
private fun shoulderResidual(win: DoubleArray): DoubleArray? {
    val n = win.size
    if (n < MIN_WINDOW) return null
    val k = max(2, n / 4)
    var sumT = 0.0
    var sumY = 0.0
    var sumTt = 0.0
    var sumTy = 0.0
    var count = 0
    for (i in 0 until n) {
        // Shoulders only: the notch itself must not tilt the baseline it is measured against.
        if (i >= k && i < n - k) continue
        val t = i.toDouble()
        sumT += t
        sumY += win[i]
        sumTt += t * t
        sumTy += t * win[i]
        count++
    }
    val denom = count * sumTt - sumT * sumT
    if (abs(denom) < EPS) return null
    val a = (count * sumTy - sumT * sumY) / denom
    val b = (sumY - a * sumT) / count
    return DoubleArray(n) { a * it + b - win[it] }
}

/**
 * Centre of mass of the connected run above half depth around [peak], as `(offset, depth)`.
 *
 * Running over the connected run rather than the whole window is what keeps the shoulders out of
 * the sum entirely, so a long shallow shadow on one side cannot drag the centre of mass out of the
 * notch. [csp] caps the run at about one and a half groove widths for the same reason.
 */
private fun halfDepthCentroid(
    resid: DoubleArray,
    peak: Int,
    csp: Int,
): DoubleArray? {
    val depth = resid[peak]
    val half = 0.5 * depth
    var lo = peak
    var hi = peak
    while (lo > max(0, peak - csp) && resid[lo - 1] > half) lo--
    while (hi < min(resid.size - 1, peak + csp) && resid[hi + 1] > half) hi++
    val len = hi - lo + 1
    var total = 0.0
    var weighted = 0.0
    for (i in 0 until len) {
        val v = resid[lo + i] - half
        total += v
        weighted += v * i
    }
    return if (len < MIN_RUN || total <= 0.0) null else doubleArrayOf(lo + weighted / total, depth)
}

/**
 * The 7 interior groove positions in one collapsed profile, `NaN` where none was found.
 *
 * A groove that cannot be told from its neighbourhood comes back as `NaN` rather than as a guess:
 * pieces sit ON the grooves and legitimately hide some, and a caller needs to see which boundary is
 * unmeasured.
 */
internal fun profileLines(
    prof: DoubleArray,
    cell: Double,
    span: Int,
    csp: Int,
): DoubleArray {
    val pos = DoubleArray(BOARD_SIDE + 1) { Double.NaN }
    for (k in 1 until BOARD_SIDE) {
        val c = pyRound(k * cell)
        val lo = max(0, c - span)
        val hi = min(prof.size, c + span + 1)
        val found = if (hi - lo >= MIN_WINDOW) notchCentre(prof.copyOfRange(lo, hi), csp) else null
        // Beyond the search window the estimate has locked onto the NEIGHBOURING groove, which
        // would report a small offset for a board that is off by a whole square.
        if (found != null && abs(lo + found[0] - k * cell) <= span) pos[k] = lo + found[0]
    }
    return pos
}
