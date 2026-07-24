package com.chesslab.geometry

import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.imgproc.Imgproc
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

// Board homography and marker -> corner reconstruction.
// Ports of `calibration.py:393 compute_homography` and `:518 resolve_board_corners`.

/** Below this baseline length the 2-marker similarity is undefined (`calibration.py:539`). */
private const val MIN_BASELINE: Double = 1e-6

/**
 * Four image points in `[a8, h8, h1, a1]` order -> the 3x3 homography onto a `boardSize`
 * square. Port of `calibration.py:393 compute_homography`.
 *
 * `margin > 0`: the image points lie that fraction OUTSIDE the playing field (markers at the
 * outer corners), so the playing field `[0, boardSize]` is indented accordingly.
 *
 * Returns a `CV_64F` 3x3 `Mat` (what `Imgproc.getPerspectiveTransform` produces).
 */
fun computeHomography(
    corners: List<DoubleArray>,
    boardSize: Int,
    margin: Double = 0.0,
): Mat {
    require(corners.size >= CORNER_COUNT) { "need 4 corners, got ${corners.size}" }
    val bs = boardSize.toDouble()
    val m = margin * bs
    val src = pointsMat(corners.take(CORNER_COUNT))
    val dst =
        pointsMat(
            listOf(
                doubleArrayOf(-m, -m),
                doubleArrayOf(bs + m, -m),
                doubleArrayOf(bs + m, bs + m),
                doubleArrayOf(-m, bs + m),
            ),
        )
    return Imgproc.getPerspectiveTransform(src, dst)
}

/**
 * Reconstruct the 4 corner points `[a8, h8, h1, a1]` from 2/3/4 marker points.
 * Port of `calibration.py:518 resolve_board_corners`.
 *
 * Returns `(corners4, nUsed)`, or `null` when fewer than 2 markers are known (or the 2-marker
 * baseline is degenerate). 4 -> exact perspective, 3 -> affine (parallelogram),
 * 2 -> similarity (square assumption).
 */
fun resolveBoardCorners(
    pointsById: Map<Int, DoubleArray>,
    boardSize: Int = 800,
): Pair<List<DoubleArray>, Int>? {
    val bs = boardSize.toDouble()
    val board =
        listOf(
            doubleArrayOf(0.0, 0.0),
            doubleArrayOf(bs, 0.0),
            doubleArrayOf(bs, bs),
            doubleArrayOf(0.0, bs),
        )
    // `have` follows the ID ORDER 0,1,2,3 - not the map's iteration order.
    val have = (0 until CORNER_COUNT).filter { pointsById.containsKey(it) }
    val src = have.map { board[it] }
    val dst = have.map { pointsById.getValue(it) }
    val proj =
        when {
            have.size < 2 -> null
            have.size == 2 -> similarityProject(src, dst, board)
            have.size == 3 -> affineProject(src, dst, board)
            else -> perspectiveProject(src, dst, board)
        }
    return proj?.let { it to have.size }
}

/** Similarity (rotation + uniform scale) exactly determined by two point correspondences. */
private fun similarityProject(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
    targets: List<DoubleArray>,
): List<DoubleArray>? {
    val vbx = src[1][0] - src[0][0]
    val vby = src[1][1] - src[0][1]
    val vdx = dst[1][0] - dst[0][0]
    val vdy = dst[1][1] - dst[0][1]
    val nb = hypot(vbx, vby)
    return if (nb < MIN_BASELINE) {
        null
    } else {
        val s = hypot(vdx, vdy) / nb
        val ang = atan2(vdy, vdx) - atan2(vby, vbx)
        val c = cos(ang)
        val si = sin(ang)
        targets.map { t ->
            val tx = t[0] - src[0][0]
            val ty = t[1] - src[0][1]
            doubleArrayOf(
                dst[0][0] + s * (c * tx - si * ty),
                dst[0][1] + s * (si * tx + c * ty),
            )
        }
    }
}

private fun affineProject(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
    targets: List<DoubleArray>,
): List<DoubleArray> {
    val m = Imgproc.getAffineTransform(pointsMat(src.take(3)), pointsMat(dst.take(3)))
    val out = Mat()
    Core.transform(pointsMat(targets), out, m)
    return readPoints(out, targets.size)
}

private fun perspectiveProject(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
    targets: List<DoubleArray>,
): List<DoubleArray> {
    val h = Imgproc.getPerspectiveTransform(pointsMat(src.take(CORNER_COUNT)), pointsMat(dst.take(CORNER_COUNT)))
    val out = Mat()
    Core.perspectiveTransform(pointsMat(targets), out, h)
    return readPoints(out, targets.size)
}

/** `n x 1` `CV_32FC2` — what Python's `astype(np.float32).reshape(-1, 1, 2)` produces. */
private fun pointsMat(points: List<DoubleArray>): MatOfPoint2f {
    val mat = MatOfPoint2f()
    mat.fromList(points.map { Point(it[0], it[1]) })
    return mat
}

private fun readPoints(
    mat: Mat,
    n: Int,
): List<DoubleArray> =
    (0 until n).map { i ->
        val v = mat.get(i, 0)
        doubleArrayOf(v[0], v[1])
    }
