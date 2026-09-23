package com.chesslab.geometry

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

// The slope is POOLED over the axis, the intercept per line: a per-line fit over eight bands invented 36 mrad of
// tilt (16.3 px at the edge) on a correct quad. Pooled as `a + b * k`, not a constant: a residual homography
// fans parallel lines into a pencil — the component a three-marker quad's error consists of.

internal const val MIN_BAND_SAMPLES: Int = 3

private const val WEIGHT_KEPT: Double = 0.5

private const val HUBER_ITERS: Int = 5

private const val HUBER_K: Double = 1.5

private const val MAD_TO_SIGMA: Double = 1.4826

private const val MIN_SCALE: Double = 0.4

private const val MIN_WEIGHT: Double = 1e-6

private const val PIVOT_EPS: Double = 1e-12

private const val SLOPE_COLUMNS: Int = 2

/** [samples] are `(k, lever, position)`; [centre] is where the lever arm is measured from. */
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
    // A line whose samples were all downweighted has been outvoted, not measured.
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

/** Robust: a piece on a groove drags that band's centroid by pixels while its neighbours are untouched. */
private fun huberSolve(
    design: Array<DoubleArray>,
    target: DoubleArray,
): Solution? {
    val n = design.size
    // `cols` aus `design[0]` setzt eine Zeile voraus: der leere Fall fiel mit 0 < 0 durch den Riegel.
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

/** Normal equations are fine here (not in `ProjectiveFit.kt`): the columns are all of one order, not
 *  coordinates running to `boardSize`. */
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
