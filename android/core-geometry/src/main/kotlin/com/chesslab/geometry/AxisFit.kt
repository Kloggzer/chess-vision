package com.chesslab.geometry

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

// One axis' nine grid lines, from all its band samples at once. Port of `alignment.py::_fit_axis`.
//
// **The slope is POOLED over the axis, the intercept is per line.** A per-line regression over eight
// bands carries more noise than the tilt it is measuring — the board's own warp is 0.75 px peak to
// peak on the reference board — and a line whose bands are half hidden by a row of pieces comes back
// tilted by tens of milliradians. Measured on frame 900 of VID_20260802_222741: 36 mrad of invented
// tilt on the line between ranks 7 and 8, worth 16.3 px at the board edge, on a quad that was in
// fact correct. Pooling divides that noise by sqrt(9) and loses nothing real.
//
// The pooled slope is `a + b * k`, LINEAR in the line index, not one constant. A residual homography
// maps a family of parallel lines to a pencil, so their directions fan out across the board; a
// single constant cannot represent that and would leave the projective component of the error
// unmeasurable — which is the component a three-marker quad's error consists of.

/** Band samples a line needs before it counts as located, after robust reweighting. */
internal const val MIN_BAND_SAMPLES: Int = 3

/** Huber weight at or above which a sample counts as kept rather than outvoted. */
private const val WEIGHT_KEPT: Double = 0.5

/** Huber IRLS: reweight this many times. */
private const val HUBER_ITERS: Int = 5

/** Huber cut-off in robust standard deviations. */
private const val HUBER_K: Double = 1.5

/** MAD -> sigma for a normal distribution. */
private const val MAD_TO_SIGMA: Double = 1.4826

/** Floor on the robust scale, so a perfect fit does not divide by zero. */
private const val MIN_SCALE: Double = 0.4

private const val MIN_WEIGHT: Double = 1e-6

private const val PIVOT_EPS: Double = 1e-12

/** Columns of the design matrix before the per-line indicators: the slope and its ramp in `k`. */
private const val SLOPE_COLUMNS: Int = 2

/**
 * `{k: line}` for the lines this axis' samples support.
 *
 * [samples] are `(k, lever, position)` triples; [centre] is where the lever arm is measured from.
 */
internal fun fitAxis(
    samples: List<DoubleArray>,
    centre: Double,
): Map<Int, GridLine> {
    val counts = IntArray(LINES_PER_AXIS)
    for (s in samples) counts[s[0].toInt()]++
    val present = (0 until LINES_PER_AXIS).filter { counts[it] >= MIN_BAND_SAMPLES }
    if (present.isEmpty()) return emptyMap()
    val used = samples.filter { counts[it[0].toInt()] >= MIN_BAND_SAMPLES }
    val col = present.withIndex().associate { (i, k) -> k to SLOPE_COLUMNS + i }
    val cols = SLOPE_COLUMNS + present.size
    val design =
        Array(used.size) { i ->
            val lever = used[i][1] - centre
            DoubleArray(cols).also { row ->
                row[0] = lever
                row[1] = used[i][0] * lever
                row[col.getValue(used[i][0].toInt())] = 1.0
            }
        }
    val target = DoubleArray(used.size) { used[it][2] }
    val fit = huberSolve(design, target) ?: return emptyMap()
    // A line whose samples were all downweighted has not been measured, it has been outvoted.
    val kept = IntArray(LINES_PER_AXIS)
    for (i in used.indices) if (fit.weights[i] >= WEIGHT_KEPT) kept[used[i][0].toInt()]++
    return present
        .filter { kept[it] >= MIN_BAND_SAMPLES }
        .associateWith { k -> GridLine(fit.x[0] + fit.x[1] * k, fit.x[col.getValue(k)]) }
}

private class Solution(
    val x: DoubleArray,
    val weights: DoubleArray,
)

/**
 * Huber-IRLS least squares, or null when the system is degenerate.
 *
 * Robust and not plain least squares because a piece standing on a groove hides part of it and drags
 * that band's centroid by several pixels, while the bands either side of it are untouched.
 */
private fun huberSolve(
    design: Array<DoubleArray>,
    target: DoubleArray,
): Solution? {
    val n = design.size
    // `cols` aus `design[0]` zu lesen setzt eine Zeile voraus, und der leere Fall fiel mit 0 < 0
    // genau durch den Riegel, der ihn abfangen sollte — weiter unten indiziert `design[0]` hart.
    if (n == 0 || n < design[0].size) return null
    val w = DoubleArray(n) { 1.0 }
    var x: DoubleArray? = null
    repeat(HUBER_ITERS) {
        val next = weightedLeastSquares(design, target, w)
        if (next != null) {
            x = next
            val r = DoubleArray(n) { i -> abs(dot(design[i], next) - target[i]) }
            val s = max(MIN_SCALE, MAD_TO_SIGMA * medianOf(r))
            for (i in 0 until n) w[i] = min(1.0, HUBER_K * s / max(r[i], MIN_WEIGHT))
        }
    }
    return x?.let { Solution(it, w) }
}

/**
 * Weighted normal equations.
 *
 * Acceptable here and not in `ProjectiveFit.kt` because the design matrix is one lever column, one
 * lever-times-index column and a set of 0/1 indicators — all of the same order — rather than
 * coordinates running to `boardSize`.
 */
private fun weightedLeastSquares(
    design: Array<DoubleArray>,
    target: DoubleArray,
    w: DoubleArray,
): DoubleArray? {
    val cols = design[0].size
    val ata = Array(cols) { DoubleArray(cols) }
    val atb = DoubleArray(cols)
    for (i in design.indices) {
        val wi = max(w[i], MIN_WEIGHT)
        for (a in 0 until cols) {
            atb[a] += wi * design[i][a] * target[i]
            for (b in a until cols) ata[a][b] += wi * design[i][a] * design[i][b]
        }
    }
    for (a in 0 until cols) for (b in 0 until a) ata[a][b] = ata[b][a]
    return solveSymmetric(ata, atb)
}

/** Gauss-Jordan with partial pivoting on a small system, or null when singular. */
private fun solveSymmetric(
    a: Array<DoubleArray>,
    b: DoubleArray,
): DoubleArray? {
    val n = b.size
    val m = Array(n) { i -> a[i].copyOf() + doubleArrayOf(b[i]) }
    for (c in 0 until n) {
        val pivot = pivotRow(m, c, n)
        if (abs(m[pivot][c]) < PIVOT_EPS) return null
        val tmp = m[c]
        m[c] = m[pivot]
        m[pivot] = tmp
        val d = m[c][c]
        for (k in c..n) m[c][k] /= d
        eliminate(m, c, n)
    }
    return DoubleArray(n) { m[it][n] }
}

private fun pivotRow(
    m: Array<DoubleArray>,
    c: Int,
    n: Int,
): Int {
    var pivot = c
    for (r in c until n) if (abs(m[r][c]) > abs(m[pivot][c])) pivot = r
    return pivot
}

private fun eliminate(
    m: Array<DoubleArray>,
    c: Int,
    n: Int,
) {
    for (r in 0 until n) {
        val f = if (r == c) 0.0 else m[r][c]
        if (f != 0.0) {
            for (k in c..n) m[r][k] -= f * m[c][k]
        }
    }
}

private fun dot(
    a: DoubleArray,
    b: DoubleArray,
): Double {
    var s = 0.0
    for (i in b.indices) s += a[i] * b[i]
    return s
}
