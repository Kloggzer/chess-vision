package com.chesslab.geometry

import org.opencv.calib3d.Calib3d
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

/**
 * The camera's OPTICS, separate from the board's geometry — and shared, because both hosts have a
 * camera.
 *
 * `CLAUDE.md` fixes the order and the reason: the lens is modelled first and the board second,
 * because on a barrel-distorted lens a straight groove is a curve in the image and a homography is
 * projective — it cannot represent that. Fitting the board without undistorting first therefore
 * absorbs lens error into board geometry, which looks measured and is a confusion of causes.
 *
 * This lived in `:desktop` until the phone and the PC were put on one pipeline, which made it the
 * last thing the PC could do that the phone structurally could not. Nothing here is host-specific:
 * what IS host-specific is which camera, where its calibration is stored, and whether it is even
 * wanted — and none of that is in this file.
 *
 * [cameraMatrix] is nine doubles row-major, [distCoeffs] the five Brown coefficients `k1 k2 p1 p2 k3`.
 */
class LensModel(
    val cameraMatrix: DoubleArray,
    val distCoeffs: DoubleArray,
) {
    init {
        require(cameraMatrix.size == K_CELLS) { "a camera matrix is 3x3, got ${cameraMatrix.size} values" }
        require(distCoeffs.size == DIST_COEFFS) { "expected $DIST_COEFFS distortion coefficients, got ${distCoeffs.size}" }
    }
}

/**
 * The fitted model as an optical one.
 *
 * [LensFit.focal] is a scale the straightness fit held fixed rather than an estimate of the optics
 * (see its KDoc), and it is carried through unchanged: undistortion needs SOME focal length to
 * normalise against, and it must be the one the coefficients were measured with.
 */
fun LensFit.toModel(): LensModel =
    LensModel(
        cameraMatrix = doubleArrayOf(focal, 0.0, cx, 0.0, focal, cy, 0.0, 0.0, 1.0),
        distCoeffs = doubleArrayOf(k1, k2, 0.0, 0.0, 0.0),
    )

/**
 * The model applied to POINTS rather than to an image.
 *
 * This is what makes a search over candidate models cheap: `fitLens` scores hundreds of them, and
 * remapping a 2560x1440 frame per candidate would make that minutes instead of milliseconds. It is
 * also the seam a future map-composing undistortion would need, which is why it is public — a quad
 * has four points, and correcting four points costs nothing measurable.
 *
 * `P = K` on purpose: the corrected points come back in the SAME pixel space they went in, not in
 * normalised coordinates.
 */
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

/**
 * Undistorts whole frames, using precomputed maps.
 *
 * `initUndistortRectifyMap` once and `remap` per frame, rather than `undistort` per frame: the
 * latter rebuilds the maps every call, which at 30 fps is the whole budget.
 *
 * The maps are `CV_16SC2` + `CV_16UC1`, OpenCV's fixed-point form, not the `CV_32FC1` pair this
 * started as. Two float maps at 2560x1440 are 29.5 MB read per frame on top of the source; the
 * fixed-point pair is 22 MB and a cheaper inner loop. **Neither has been measured on a phone** —
 * that is what `Stage.LENS` exists to report.
 *
 * There is deliberately NO size check here. The size is decided once, by the caller that already
 * has to decide whether this lens belongs to this camera at all, and a `require` on the frame path
 * would turn a configuration mistake into a dead tracker on the analyzer thread. A caller that
 * builds one of these for a size the camera does not deliver has skipped the only gate that matters.
 */
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
        // The same K for the destination: no rescaling, no cropping. Undistortion moves pixels, it
        // does not reframe the board — a changed field of view would invalidate every stored quad.
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

    /** The corrected frame. Owned and reused here, like every other Mat on the frame path. */
    fun apply(frame: Mat): Mat {
        Imgproc.remap(frame, out, mapX, mapY, Imgproc.INTER_LINEAR)
        return out
    }

    override fun close() {
        listOf(mapX, mapY, out).forEach { it.release() }
    }
}

/** OpenCV wants a `Mat`; a model is doubles. One conversion, named once. */
private fun matOf(
    rows: Int,
    cols: Int,
    values: DoubleArray,
): Mat =
    Mat(rows, cols, CvType.CV_64F).apply {
        // Element by element: OpenCV's `put(row, col, double...)` is varargs, so handing it an array
        // needs a spread, and a spread copies. Nine doubles once at startup either way — but this
        // version says what it does without a lint exception.
        values.forEachIndexed { i, value -> put(i / cols, i % cols, value) }
    }

private const val K_ROWS = 3
private const val K_CELLS = 9
private const val DIST_COEFFS = 5
