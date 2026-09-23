package com.chesslab.geometry

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

// Knows nothing about boards, only a dark notch in a 1-D signal — the part argued from measurements.

internal const val MIN_DEPTH: Double = 6.0

private const val MIN_WINDOW: Int = 7

private const val MIN_RUN: Int = 3

private const val EPS: Double = 1e-9

/** The groove's CENTRE, not its gradient peak: `|Sobel|` has two and `argmax` flips between them (2.56 px
 *  median against 1.32 for a centroid). A local shoulder baseline serves an illumination gradient (luma 25 to
 *  168) — it bought nothing else measurable. NARROW only: a wide dark run is a leaning piece (it cost 16.3 px). */
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

/** The connected run keeps the shoulders out, so a long shallow shadow cannot drag the centre; [csp] caps it at
 *  about one and a half groove widths. */
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
    // Still dark at BOTH ends: an object, not a groove.
    if (resid[max(0, lo - 1)] > half && resid[min(resid.size - 1, hi + 1)] > half) return null
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

/** `NaN` where none was found, never a guess: pieces hide grooves. [pad] lets lines 0 and 8 be MEASURED (pinned,
 *  a scale error read 25 % short). [outerSpan] is tighter: the printed border sits a third of a cell outside. */
internal fun profileLines(
    prof: DoubleArray,
    cell: Double,
    span: Int,
    csp: Int,
    pad: Double = 0.0,
    outerSpan: Int = 0,
): DoubleArray {
    val pos = DoubleArray(BOARD_SIDE + 1) { Double.NaN }
    val first = if (outerSpan > 0) 0 else 1
    val last = if (outerSpan > 0) BOARD_SIDE else BOARD_SIDE - 1
    for (k in first..last) {
        val w = if (k == 0 || k == BOARD_SIDE) outerSpan else span
        val centre = pad + k * cell
        val window = profileWindow(prof.size, centre, w)
        val lo = window.first
        val hi = window.last + 1
        val found = if (hi - lo >= MIN_WINDOW) notchCentre(prof.copyOfRange(lo, hi), csp) else null
        // Beyond the window the estimate locked onto the NEIGHBOURING groove: a whole square off reads as a small offset.
        if (found != null && abs(lo + found[0] - centre) <= w) pos[k] = lo + found[0]
    }
    return pos
}

internal fun profileSamples(
    size: Int,
    cell: Double,
    span: Int,
    pad: Double,
    outerSpan: Int,
): BooleanArray {
    val needed = BooleanArray(size)
    val first = if (outerSpan > 0) 0 else 1
    val last = if (outerSpan > 0) BOARD_SIDE else BOARD_SIDE - 1
    for (k in first..last) {
        val radius = if (k == 0 || k == BOARD_SIDE) outerSpan else span
        for (i in profileWindow(size, pad + k * cell, radius)) needed[i] = true
    }
    return needed
}

private fun profileWindow(
    size: Int,
    centre: Double,
    radius: Int,
): IntRange {
    val c = pyRound(centre)
    return max(0, c - radius) until min(size, c + radius + 1)
}
