package com.chesslab.geometry

import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

// Projective, not affine: a three-marker quad is an affine reconstruction, so its residual is projective by
// construction — worst offset after correction 6.8-17.8 px affine against 1.6-3.1 projective, same on aligned sessions.

/** Eight unknowns, so eight points is thin. */
private const val MIN_FIT_SAMPLES: Int = 8

private const val UNKNOWNS: Int = 9

private const val X_BLOCK: Int = 0

private const val Y_BLOCK: Int = 3

private const val W_BLOCK: Int = 6

private const val H_LAST: Int = UNKNOWNS - 1

private const val HUBER_ITERS: Int = 5

private const val HUBER_K: Double = 1.5

private const val MAD_TO_SIGMA: Double = 1.4826

private const val MIN_SCALE: Double = 1e-6

private const val MIN_WEIGHT: Double = 1e-6

private const val EPS: Double = 1e-12

/** **Huber**: pieces hide grooves and least squares lets each bad sample pull the board. **IRLS, not RANSAC**:
 *  RANSAC's shared RNG breaks the byte-identical replay fixtures. Hartley-normalised: raw columns differ by
 *  six orders of magnitude. */
internal fun fitProjective(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
): DoubleArray? {
    val usable = src.size >= MIN_FIT_SAMPLES && dst.size == src.size
    val source = if (usable) normalise(src) else null
    val target = if (source == null) null else normalise(dst)
    val m = if (target == null) null else denormalised(source!!, target)
    val ok = m != null && abs(m[H_LAST]) > EPS && m.all { it.isFinite() }
    return if (ok) DoubleArray(UNKNOWNS) { m!![it] / m[H_LAST] } else null
}

private fun denormalised(
    source: Pair<List<DoubleArray>, DoubleArray>,
    target: Pair<List<DoubleArray>, DoubleArray>,
): DoubleArray? {
    val h = solveIteratively(source.first, target.first) ?: return null
    val tdInv = invert3(target.second) ?: return null
    return mul3(mul3(tdInv, h), source.second)
}

private fun normalise(p: List<DoubleArray>): Pair<List<DoubleArray>, DoubleArray>? {
    if (p.isEmpty()) return null
    val cx = p.sumOf { it[0] } / p.size
    val cy = p.sumOf { it[1] } / p.size
    val d = p.sumOf { hypot(it[0] - cx, it[1] - cy) } / p.size
    val s = if (d > 1e-9) sqrt(2.0) / d else 1.0
    val out = p.map { doubleArrayOf((it[0] - cx) * s, (it[1] - cy) * s) }
    return out to doubleArrayOf(s, 0.0, -s * cx, 0.0, s, -s * cy, 0.0, 0.0, 1.0)
}

private fun solveIteratively(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
): DoubleArray? {
    val n = src.size
    val w = DoubleArray(n) { 1.0 }
    val residuals = DoubleArray(n)
    var h: DoubleArray? = null
    repeat(HUBER_ITERS) {
        if (h != null || it == 0) {
            h = smallestSingularVector(src, dst, w)
            h?.let { m -> reweight(src, dst, m, residuals, w) }
        }
    }
    return h
}

/** `SVDecomp` on `A`, not `A^T A`: no squared conditioning, and it matches numpy's `svd` on a near-degenerate lattice. */
@Suppress("SpreadOperator")
private fun smallestSingularVector(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
    w: DoubleArray,
): DoubleArray? {
    val n = src.size
    val rows = DoubleArray(2 * n * UNKNOWNS)
    for (i in 0 until n) {
        val sw = sqrt(max(w[i], MIN_WEIGHT))
        val xr = 2 * i * UNKNOWNS
        fillEquation(rows, xr, X_BLOCK, src[i], dst[i][0], sw)
        fillEquation(rows, xr + UNKNOWNS, Y_BLOCK, src[i], dst[i][1], sw)
    }
    val a = Mat(2 * n, UNKNOWNS, CvType.CV_64F)
    val u = Mat()
    val s = Mat()
    val vt = Mat()
    try {
        a.put(0, 0, *rows)
        Core.SVDecomp(a, s, u, vt)
        if (vt.rows() < UNKNOWNS) return null
        val out = DoubleArray(UNKNOWNS)
        vt.row(H_LAST).get(0, 0, out)
        return if (out.all { it.isFinite() } && abs(out[H_LAST]) > EPS) out else null
    } finally {
        a.release()
        u.release()
        s.release()
        vt.release()
    }
}

/** `t` is the constrained destination coordinate (`u` or `v`), so the two rows differ only in where the first block lands. */
private fun fillEquation(
    rows: DoubleArray,
    at: Int,
    block: Int,
    p: DoubleArray,
    t: Double,
    sw: Double,
) {
    val x = p[0] * sw
    val y = p[1] * sw
    rows[at + block] = x
    rows[at + block + 1] = y
    rows[at + block + 2] = sw
    rows[at + W_BLOCK] = -t * x
    rows[at + W_BLOCK + 1] = -t * y
    rows[at + W_BLOCK + 2] = -t * sw
}

private fun reweight(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
    h: DoubleArray,
    residuals: DoubleArray,
    w: DoubleArray,
) {
    for (i in src.indices) {
        val p = project3(h, src[i])
        residuals[i] = if (p == null) Double.MAX_VALUE else hypot(p[0] - dst[i][0], p[1] - dst[i][1])
    }
    val s = max(MIN_SCALE, MAD_TO_SIGMA * medianOf(residuals))
    for (i in w.indices) w[i] = min(1.0, HUBER_K * s / max(residuals[i], MIN_WEIGHT))
}
