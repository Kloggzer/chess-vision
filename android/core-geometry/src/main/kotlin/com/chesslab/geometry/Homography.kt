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

private const val MIN_BASELINE: Double = 1e-6

/** `margin > 0`: the points lie that fraction OUTSIDE the field, one value per corner, each pushed along its
 *  own diagonal. Returns a `CV_64F` 3x3. */
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
        // Both operands are native: left to a finalizer they leaked two `Mat`s per frame on the live path.
        src.release()
        dst.release()
        cache?.put(corners, boardSize, margin, h)
        h
    }

/** Only the nine values live here, not a native [Mat]: every caller gets an independent matrix. Owner-confined
 *  and unsynchronised — one analyzer thread. */
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

/** `(corners4, nUsed)`, or `null` below 2 markers. 4 -> exact perspective, 3 -> affine, 2 -> similarity. */
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
    // `have` follows the ID ORDER 0,1,2,3 — not the map's iteration order.
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

// Native Mats released by hand, as in `computeHomography`: per frame on the live path, the finalizer lags.
private fun affineProject(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
    targets: List<DoubleArray>,
): List<DoubleArray> {
    val a = pointsMat(src.take(3))
    val b = pointsMat(dst.take(3))
    val t = pointsMat(targets)
    val m = Imgproc.getAffineTransform(a, b)
    val out = Mat()
    try {
        Core.transform(t, out, m)
        return readPoints(out, targets.size)
    } finally {
        listOf(a, b, t, m, out).forEach { it.release() }
    }
}

private fun perspectiveProject(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
    targets: List<DoubleArray>,
): List<DoubleArray> {
    val a = pointsMat(src.take(CORNER_COUNT))
    val b = pointsMat(dst.take(CORNER_COUNT))
    val t = pointsMat(targets)
    val h = Imgproc.getPerspectiveTransform(a, b)
    val out = Mat()
    try {
        Core.perspectiveTransform(t, out, h)
        return readPoints(out, targets.size)
    } finally {
        listOf(a, b, t, h, out).forEach { it.release() }
    }
}

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
