package com.chesslab.geometry

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

// THE TWO WARPS (entry.md invariant 1). They are NOT interchangeable:
//
//  - `warpFromCorners`  (calibration.py:926) - borderless DISPLAY/DETECTION warp, the playing
//    field fills [0, sz]. Run at `detSize = boardSize * detectScale`. Everything the engine
//    diffs (refGray, refBgr, every CnnSnapshot.warped/gray) comes from here.
//  - `warpBoardForCrops` (calibration.py:944) - CNN CROP warp on a `boardSize + 2B` canvas,
//    homography pre-multiplied by a translation of `B = cropBorderPx`. Only `Crops.kt` calls it.
//
// Interpolation/border stay at OpenCV's defaults (INTER_LINEAR, BORDER_CONSTANT black), which
// is what Python's bare `cv2.warpPerspective` uses.

private const val H_DIM: Int = 3

private const val BGR_CHANNELS: Int = 3

/**
 * Read all nine homography elements, and write them back.
 *
 * OpenCV's Java `Mat` offers no non-vararg `put` for doubles, so the spread is unavoidable — and
 * detekt's objection to it (an array copy per call) is nine doubles against the 24 JNI
 * round-trips this replaces.
 */
private fun Mat.readH(into: DoubleArray) = get(0, 0, into)

@Suppress("SpreadOperator")
private fun Mat.writeH(from: DoubleArray) = put(0, 0, *from)

/**
 * Borderless rectification from the 4 frame corners `[a8, h8, h1, a1]`.
 * Port of `calibration.py:926 warp_from_corners`.
 *
 * With `targetSize != boardSize` the destination is `targetSize x targetSize` — rows 0 and 1
 * of the homography are scaled by `targetSize / boardSize`; row 2 (the projective row) is
 * left alone. That is much cheaper for detection at `detectScale < 1.0`.
 *
 * `dst` lets the caller reuse an output `Mat` across frames (phase 05b runs this at 15 fps).
 */
fun warpFromCorners(
    frame: Mat,
    geom: BoardGeometry,
    corners: List<DoubleArray>,
    targetSize: Int? = null,
    dst: Mat? = null,
): Mat {
    val sz = targetSize ?: geom.boardSize
    val h = computeHomography(corners, geom.boardSize, geom.margin)
    if (sz != geom.boardSize) {
        val s = sz.toDouble() / geom.boardSize
        // One read and one write of all nine elements. Element-wise `get`/`put` is 24 JNI
        // round-trips per frame to scale six numbers.
        val m = DoubleArray(H_DIM * H_DIM)
        h.readH(m)
        for (c in 0 until H_DIM) {
            m[c] *= s
            m[H_DIM + c] *= s
        }
        h.writeH(m)
    }
    val out = dst ?: Mat()
    Imgproc.warpPerspective(frame, out, h, Size(sz.toDouble(), sz.toDouble()))
    h.release()
    return out
}

/**
 * Rectification WITH border — the data/crop warp. Canvas `boardSize + 2B` with
 * `B = cropBorderPx(geom)`, homography translated by `B`, so EDGE squares have real board
 * content for their `padSide`/`padUp` extension instead of a black image border.
 * Port of `calibration.py:944 warp_board_for_crops`.
 *
 * Geometry is identical to the borderless warp, only shifted by `B`; `cropSquare` shifts its
 * box by `+B` accordingly.
 */
fun warpBoardForCrops(
    frame: Mat,
    geom: BoardGeometry,
    corners: List<DoubleArray>,
    dst: Mat? = null,
): Mat {
    val bs = geom.boardSize
    val b = cropBorderPx(geom).toDouble()
    val h = computeHomography(corners, bs, geom.margin)
    // T(b, b) @ H: row0 += b * row2, row1 += b * row2, row2 unchanged. Bulk, for the reason in
    // `warpFromCorners`.
    val m = DoubleArray(H_DIM * H_DIM)
    h.readH(m)
    for (c in 0 until H_DIM) {
        val h2 = m[2 * H_DIM + c]
        m[c] += b * h2
        m[H_DIM + c] += b * h2
    }
    h.writeH(m)
    val side = (bs + 2 * cropBorderPx(geom)).toDouble()
    val out = dst ?: Mat()
    Imgproc.warpPerspective(frame, out, h, Size(side, side))
    h.release()
    return out
}

/** `Mat` -> the OpenCV-free seam type. 8-bit single channel, row-major, stride == width. */
fun toGrayImage(mat: Mat): GrayImage {
    require(mat.type() == CvType.CV_8UC1) { "expected CV_8UC1, got ${CvType.typeToString(mat.type())}" }
    val data = ByteArray(mat.rows() * mat.cols())
    mat.get(0, 0, data)
    return GrayImage(mat.cols(), mat.rows(), data)
}

/** `Mat` -> the OpenCV-free seam type. Interleaved BGR, stride == width * 3. */
fun toBgrImage(mat: Mat): BgrImage {
    require(mat.type() == CvType.CV_8UC3) { "expected CV_8UC3, got ${CvType.typeToString(mat.type())}" }
    val data = ByteArray(mat.rows() * mat.cols() * BGR_CHANNELS)
    mat.get(0, 0, data)
    return BgrImage(mat.cols(), mat.rows(), data)
}
