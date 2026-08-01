package com.chesslab.geometry

import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

// Port of `alignment.py:265 _fit_affine`. The map that puts a measured lattice onto the nominal one.

/** Fewest samples an affine fit may run on — six unknowns, so eight is already thin. */
private const val MIN_FIT_SAMPLES: Int = 8

/** Unknowns: the 2x3 affine. */
private const val UNKNOWNS: Int = 6

/** Column of the y-equation's first unknown, i.e. where the second row of the affine starts. */
private const val Y_BLOCK: Int = 3

/** Huber IRLS: reweight this many times. */
private const val HUBER_ITERS: Int = 5

/** Huber cut-off in robust standard deviations. */
private const val HUBER_K: Double = 1.5

/** MAD -> sigma for a normal distribution. */
private const val MAD_TO_SIGMA: Double = 1.4826

/** Floor on the robust scale, so a perfect fit does not divide by zero. */
private const val MIN_SCALE: Double = 0.4

private const val MIN_WEIGHT: Double = 1e-6

/**
 * Huber-robust weighted affine fit `src -> dst`, as a row-major 3x3, or null.
 *
 * **Affine, not a homography.** The quad being corrected is already nearly right, so the leftover
 * error has no meaningful perspective component — but a homography fit will happily spend its two
 * perspective parameters on measurement noise, and it did: 1.2 px worse on a perturbed quad
 * (5.3 against 4.0) for nothing.
 *
 * **Huber, not least squares.** Pieces sit ON the grooves and hide parts of them, so a handful of
 * samples are simply wrong. Plain least squares lets each of them pull the whole board.
 *
 * `DECOMP_SVD` and not the normal equations: the coordinates run to `boardSize`, and squaring that
 * conditioning to save a 112x6 decomposition is a trade nobody needs. It also matches what numpy's
 * `lstsq` does on the Python side, so the two cannot drift on a near-degenerate lattice.
 */
internal fun fitAffine(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
): DoubleArray? {
    val n = src.size
    if (n < MIN_FIT_SAMPLES || dst.size != n) return null
    val a = Mat(2 * n, UNKNOWNS, CvType.CV_64F)
    val b = Mat(2 * n, 1, CvType.CV_64F)
    val x = Mat()
    try {
        return solveIteratively(src, dst, a, b, x)
    } finally {
        a.release()
        b.release()
        x.release()
    }
}

private fun solveIteratively(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
    a: Mat,
    b: Mat,
    x: Mat,
): DoubleArray? {
    val n = src.size
    val w = DoubleArray(n) { 1.0 }
    val residuals = DoubleArray(n)
    val sol = DoubleArray(UNKNOWNS)
    var failed = false
    repeat(HUBER_ITERS) {
        if (!failed) {
            fillSystem(a, b, src, dst, w)
            if (Core.solve(a, b, x, Core.DECOMP_SVD)) {
                x.get(0, 0, sol)
                reweight(src, dst, sol, residuals, w)
            } else {
                failed = true
            }
        }
    }
    return if (failed) {
        null
    } else {
        doubleArrayOf(
            sol[0],
            sol[1],
            sol[2],
            sol[Y_BLOCK],
            sol[Y_BLOCK + 1],
            sol[Y_BLOCK + 2],
            0.0,
            0.0,
            1.0,
        )
    }
}

/** Residual per sample, then the Huber weight it earns for the next pass. */
private fun reweight(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
    sol: DoubleArray,
    residuals: DoubleArray,
    w: DoubleArray,
) {
    for (i in src.indices) {
        val px = sol[0] * src[i][0] + sol[1] * src[i][1] + sol[2] - dst[i][0]
        val py = sol[Y_BLOCK] * src[i][0] + sol[Y_BLOCK + 1] * src[i][1] + sol[Y_BLOCK + 2] - dst[i][1]
        residuals[i] = sqrt(px * px + py * py)
    }
    val s = max(MIN_SCALE, MAD_TO_SIGMA * median(residuals))
    for (i in w.indices) w[i] = min(1.0, HUBER_K * s / max(residuals[i], MIN_WEIGHT))
}

/**
 * The weighted design matrix, rebuilt per IRLS pass. Rows interleave the x and the y equation.
 *
 * The spread is OpenCV's Java API, which offers no non-vararg `put` for doubles — and it is two
 * array copies per pass against `2 * n * 6` JNI round trips.
 */
@Suppress("SpreadOperator")
private fun fillSystem(
    a: Mat,
    b: Mat,
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
    w: DoubleArray,
) {
    val n = src.size
    val rows = DoubleArray(2 * n * UNKNOWNS)
    val rhs = DoubleArray(2 * n)
    for (i in 0 until n) {
        val sw = sqrt(max(w[i], MIN_WEIGHT))
        val x = src[i][0] * sw
        val y = src[i][1] * sw
        val xRow = 2 * i * UNKNOWNS
        val yRow = xRow + UNKNOWNS
        rows[xRow] = x
        rows[xRow + 1] = y
        rows[xRow + 2] = sw
        rows[yRow + Y_BLOCK] = x
        rows[yRow + Y_BLOCK + 1] = y
        rows[yRow + Y_BLOCK + 2] = sw
        rhs[2 * i] = dst[i][0] * sw
        rhs[2 * i + 1] = dst[i][1] * sw
    }
    a.put(0, 0, *rows)
    b.put(0, 0, *rhs)
}

private fun median(values: DoubleArray): Double {
    if (values.isEmpty()) return 0.0
    val sorted = values.sortedArray()
    val mid = sorted.size / 2
    return if (sorted.size % 2 == 1) sorted[mid] else (sorted[mid - 1] + sorted[mid]) / 2.0
}
