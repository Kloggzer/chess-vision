package com.chesslab.geometry

import org.opencv.calib3d.Calib3d
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

/** The lens is modelled FIRST: a homography cannot represent a curved groove, and fitting the board through
 *  it absorbs lens error into geometry. [cameraMatrix] is row-major, [distCoeffs] `k1 k2 p1 p2 k3`. */
class LensModel(
    val cameraMatrix: DoubleArray,
    val distCoeffs: DoubleArray,
) {
    init {
        require(cameraMatrix.size == K_CELLS) { "a camera matrix is 3x3, got ${cameraMatrix.size} values" }
        require(distCoeffs.size == DIST_COEFFS) { "expected $DIST_COEFFS distortion coefficients, got ${distCoeffs.size}" }
    }
}

/** [LensFit.focal] is a fixed scale, not an estimate, and must be the one the coefficients were measured with. */
fun LensFit.toModel(): LensModel =
    LensModel(
        cameraMatrix = doubleArrayOf(focal, 0.0, cx, 0.0, focal, cy, 0.0, 0.0, 1.0),
        distCoeffs = doubleArrayOf(k1, k2, 0.0, 0.0, 0.0),
    )

/** On POINTS: `fitLens` scores hundreds of models, and remapping a frame per candidate would take minutes.
 *  `P = K`: corrected points come back in the same pixel space. */
fun undistortPoints(
    model: LensModel,
    points: List<DoubleArray>,
): List<DoubleArray> {
    if (points.isEmpty() || model.distCoeffs.all { it == 0.0 }) return points
    val k = matOf(K_ROWS, K_ROWS, model.cameraMatrix)
    val d = matOf(1, model.distCoeffs.size, model.distCoeffs)
    val src = MatOfPoint2f()
    src.fromList(points.map { Point(it[0], it[1]) })
    val dst = MatOfPoint2f()
    val rectify = Mat()
    Calib3d.undistortPoints(src, dst, k, d, rectify, k)
    val out = dst.toArray().map { doubleArrayOf(it.x, it.y) }
    listOf(k, d, src, dst, rectify).forEach { it.release() }
    return out
}

/** Maps once, `remap` per frame (`undistort` rebuilds them per call — the whole budget at 30 fps). Fixed-point
 *  maps: 22 MB read per frame against 29.5. No size check: a `require` on the frame path kills the tracker. */
class Undistorter(
    model: LensModel,
    val width: Int,
    val height: Int,
) : AutoCloseable {
    private val mapX = Mat()
    private val mapY = Mat()
    private val out = Mat()

    init {
        val k = matOf(K_ROWS, K_ROWS, model.cameraMatrix)
        val d = matOf(1, model.distCoeffs.size, model.distCoeffs)
        // The same K for the destination: a changed field of view would invalidate every stored quad.
        val rectify = Mat()
        Calib3d.initUndistortRectifyMap(
            k,
            d,
            rectify,
            k,
            Size(width.toDouble(), height.toDouble()),
            CvType.CV_16SC2,
            mapX,
            mapY,
        )
        k.release()
        d.release()
        rectify.release()
    }

    /** Owned and reused here, like every other Mat on the frame path. */
    fun apply(frame: Mat): Mat {
        Imgproc.remap(frame, out, mapX, mapY, Imgproc.INTER_LINEAR)
        return out
    }

    override fun close() {
        listOf(mapX, mapY, out).forEach { it.release() }
    }
}

private fun matOf(
    rows: Int,
    cols: Int,
    values: DoubleArray,
): Mat =
    Mat(rows, cols, CvType.CV_64F).apply {
        // Element by element: `put(row, col, double...)` is varargs, and a spread copies.
        values.forEachIndexed { i, value -> put(i / cols, i % cols, value) }
    }

private const val K_ROWS = 3
private const val K_CELLS = 9
private const val DIST_COEFFS = 5
