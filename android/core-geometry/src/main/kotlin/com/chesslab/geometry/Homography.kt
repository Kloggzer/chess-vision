package com.chesslab.geometry

import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import org.opencv.core.Core
import org.opencv.core.CvType
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
 * outer corners), so the playing field `[0, boardSize]` is indented accordingly. One value PER
 * CORNER in `[a8, h8, h1, a1]` order — each is pushed outward along its own diagonal, so
 * `margins4(x)` reproduces the old square exactly.
 *
 * Returns a `CV_64F` 3x3 `Mat` (what `Imgproc.getPerspectiveTransform` produces).
 */
fun computeHomography(
    corners: List<DoubleArray>,
    boardSize: Int,
    margin: List<Double> = margins4(0.0),
    cache: HomographyCache? = null,
): Mat =
    WorkProfiler.span(
        WorkOperation.HOMOGRAPHY_BUILD,
        input = { homographyFingerprint(corners, boardSize, margin) },
    ) {
        require(corners.size >= CORNER_COUNT) { "need 4 corners, got ${corners.size}" }
        require(margin.size == CORNER_COUNT) { "need 4 margins (a8,h8,h1,a1), got ${margin.size}" }
        cache?.get(corners, boardSize, margin)?.let {
            WorkProfiler.cache(WorkOperation.HOMOGRAPHY_BUILD, hit = true)
            return@span it
        }
        WorkProfiler.cache(WorkOperation.HOMOGRAPHY_BUILD, hit = false)
        val bs = boardSize.toDouble()
        val m = margin.map { it * bs }
        val src = pointsMat(corners.take(CORNER_COUNT))
        val dst =
            pointsMat(
                listOf(
                    doubleArrayOf(-m[0], -m[0]),
                    doubleArrayOf(bs + m[1], -m[1]),
                    doubleArrayOf(bs + m[2], bs + m[2]),
                    doubleArrayOf(-m[3], bs + m[3]),
                ),
            )
        val h = Imgproc.getPerspectiveTransform(src, dst)
        // Both operands are native allocations; the caller only ever wanted the result. Leaving them
        // to a finalizer leaked two `Mat`s per frame on the live path.
        src.release()
        dst.release()
        cache?.put(corners, boardSize, margin, h)
        h
    }

/**
 * Single-entry exact cache for a warp owner's current geometry.
 *
 * Only the nine matrix values live here, not a native [Mat]: every caller receives an independent
 * matrix that it may scale, translate and release. The cache is intentionally owner-confined and
 * unsynchronised; the live pipeline calls it from one analyzer thread.
 */
class HomographyCache {
    private var boardSize = 0
    private var cornerBits = LongArray(0)
    private var marginBits = LongArray(0)
    private var matrix = DoubleArray(0)

    internal fun get(
        corners: List<DoubleArray>,
        boardSize: Int,
        margin: List<Double>,
    ): Mat? {
        if (this.boardSize != boardSize || matrix.size != HOMOGRAPHY_ELEMENTS) return null
        if (!sameCorners(corners) || !sameMargins(margin)) return null
        return matrixMat(matrix)
    }

    internal fun put(
        corners: List<DoubleArray>,
        boardSize: Int,
        margin: List<Double>,
        homography: Mat,
    ) {
        this.boardSize = boardSize
        cornerBits =
            LongArray(CORNER_COUNT * POINT_DIMENSIONS) { index ->
                corners[index / POINT_DIMENSIONS][index % POINT_DIMENSIONS].toBits()
            }
        marginBits = LongArray(CORNER_COUNT) { margin[it].toBits() }
        matrix = DoubleArray(HOMOGRAPHY_ELEMENTS)
        homography.get(0, 0, matrix)
    }

    private fun sameCorners(corners: List<DoubleArray>): Boolean {
        if (corners.size < CORNER_COUNT || cornerBits.size != CORNER_COUNT * POINT_DIMENSIONS) return false
        return cornerBits.indices.all { index ->
            cornerBits[index] == corners[index / POINT_DIMENSIONS][index % POINT_DIMENSIONS].toBits()
        }
    }

    private fun sameMargins(margin: List<Double>): Boolean =
        margin.size == CORNER_COUNT && marginBits.indices.all { marginBits[it] == margin[it].toBits() }

    private companion object {
        const val POINT_DIMENSIONS = 2
        const val HOMOGRAPHY_ELEMENTS = 9

        @Suppress("SpreadOperator")
        fun matrixMat(values: DoubleArray): Mat = Mat(H_DIMENSIONS, H_DIMENSIONS, CvType.CV_64F).also { it.put(0, 0, *values) }

        const val H_DIMENSIONS = 3
    }
}

/** Stable within and across runs, unlike collection identity hashes. Only evaluated while profiling. */
private fun homographyFingerprint(
    corners: List<DoubleArray>,
    boardSize: Int,
    margin: List<Double>,
): Long {
    var out = boardSize.toLong()
    corners.take(CORNER_COUNT).forEach { point ->
        point.forEach { value -> out = FINGERPRINT_MULTIPLIER * out + value.toBits() }
    }
    margin.forEach { value -> out = FINGERPRINT_MULTIPLIER * out + value.toBits() }
    return out
}

private const val FINGERPRINT_MULTIPLIER = 31L

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
