package com.chesslab.geometry

import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

// Port of `alignment.py::_fit_projective`. The map that puts a measured lattice onto the nominal one.
//
// This file replaced `AffineFit.kt` on 2026-08-03, and the reason is worth keeping: the affine fit
// was justified by "the quad being corrected is already nearly right, so the leftover error has no
// meaningful perspective component". That is true of a four-marker quad and FALSE of a three-marker
// one — `resolveBoardCorners` degrades to an affine reconstruction there, a parallelogram standing
// in for a perspective view of a plane, so the residual is projective by construction and no affine
// correction can remove it. Measured on `VID_20260802_222741.mp4` (three of four markers decode),
// worst square offset after correction over six frames: affine 6.8-17.8 px, projective 1.6-3.1 px.
// On already-aligned real sessions the two land within 0.3 px of each other, so nothing was traded.

/** Fewest correspondences a homography may be fitted on — eight unknowns, so eight points is thin. */
private const val MIN_FIT_SAMPLES: Int = 8

/** Unknowns: the row-major 3x3, up to scale. */
private const val UNKNOWNS: Int = 9

/** Huber IRLS: reweight this many times. */
private const val HUBER_ITERS: Int = 5

/** Huber cut-off in robust standard deviations. */
private const val HUBER_K: Double = 1.5

/** MAD -> sigma for a normal distribution. */
private const val MAD_TO_SIGMA: Double = 1.4826

/** Floor on the robust scale, so a perfect fit does not divide by zero. */
private const val MIN_SCALE: Double = 1e-6

private const val MIN_WEIGHT: Double = 1e-6

private const val EPS: Double = 1e-12

/**
 * Huber-robust homography fit `src -> dst`, as a row-major 3x3, or null.
 *
 * **Huber, not least squares.** Pieces sit ON the grooves and hide parts of them, so a handful of
 * samples are simply wrong. Plain least squares lets each of them pull the whole board.
 *
 * **IRLS, not RANSAC.** `Calib3d.findHomography(..., RANSAC)` draws from a shared RNG, so two runs
 * over the same frame can return different quads; the replay harness asserts byte-identical
 * fixtures across runs and does not survive that. The outlier rate here is low enough that
 * reweighting reaches the same answer without it.
 *
 * Hartley-normalised before the DLT: the lattice lives at 0..boardSize, so the raw design matrix has
 * columns differing by six orders of magnitude and its smallest singular vector is numerical noise.
 */
internal fun fitProjective(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
): DoubleArray? {
    val n = src.size
    if (n < MIN_FIT_SAMPLES || dst.size != n) return null
    val (ns, ts) = normalise(src) ?: return null
    val (nd, td) = normalise(dst) ?: return null
    val h = solveIteratively(ns, nd) ?: return null
    val tdInv = invert3(td) ?: return null
    val m = mul3(mul3(tdInv, h), ts)
    return if (abs(m[8]) > EPS && m.all { it.isFinite() }) DoubleArray(UNKNOWNS) { m[it] / m[8] } else null
}

/** Centroid at the origin, mean distance sqrt(2) — with the transform that got it there. */
private fun normalise(p: List<DoubleArray>): Pair<List<DoubleArray>, DoubleArray>? {
    if (p.isEmpty()) return null
    val cx = p.sumOf { it[0] } / p.size
    val cy = p.sumOf { it[1] } / p.size
    val d = p.sumOf { hypot(it[0] - cx, it[1] - cy) } / p.size
    val s = if (d > 1e-9) sqrt(2.0) / d else 1.0
    val out = p.map { doubleArrayOf((it[0] - cx) * s, (it[1] - cy) * s) }
    return out to doubleArrayOf(s, 0.0, -s * cx, 0.0, s, -s * cy, 0.0, 0.0, 1.0)
}

/** IRLS over the DLT system, in normalised coordinates. */
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

/**
 * The DLT solution: the right singular vector of the weighted design matrix with the least
 * singular value.
 *
 * `SVDecomp` on `A` rather than an eigen-decomposition of `A^T A`: squaring the conditioning of a
 * 2n x 9 matrix to save one decomposition of a few hundred rows is a trade nobody needs, and it
 * matches numpy's `svd` on the Python side so the two cannot drift on a near-degenerate lattice.
 */
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
        val x = src[i][0]
        val y = src[i][1]
        val u = dst[i][0]
        val v = dst[i][1]
        val xr = 2 * i * UNKNOWNS
        val yr = xr + UNKNOWNS
        rows[xr] = x * sw
        rows[xr + 1] = y * sw
        rows[xr + 2] = sw
        rows[xr + 6] = -u * x * sw
        rows[xr + 7] = -u * y * sw
        rows[xr + 8] = -u * sw
        rows[yr + 3] = x * sw
        rows[yr + 4] = y * sw
        rows[yr + 5] = sw
        rows[yr + 6] = -v * x * sw
        rows[yr + 7] = -v * y * sw
        rows[yr + 8] = -v * sw
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
        vt.row(UNKNOWNS - 1).get(0, 0, out)
        return if (out.all { it.isFinite() } && abs(out[8]) > EPS) out else null
    } finally {
        a.release()
        u.release()
        s.release()
        vt.release()
    }
}

/** Reprojection residual per sample, then the Huber weight it earns for the next pass. */
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
    val s = max(MIN_SCALE, MAD_TO_SIGMA * median(residuals))
    for (i in w.indices) w[i] = min(1.0, HUBER_K * s / max(residuals[i], MIN_WEIGHT))
}

private fun median(values: DoubleArray): Double {
    if (values.isEmpty()) return 0.0
    val sorted = values.sortedArray()
    val mid = sorted.size / 2
    return if (sorted.size % 2 == 1) sorted[mid] else (sorted[mid - 1] + sorted[mid]) / 2.0
}
