package com.chesslab.geometry

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

// THE TWO WARPS (invariant 1), not interchangeable: `warpFromCorners` (borderless, detection, INTER_LINEAR as in
// Python) and `warpBoardForCrops` (bordered CNN crops, INTER_CUBIC: bilinear keeps 63.6 % of the Laplacian
// energy against 92.1 %). The grid warp stays bilinear: it MEASURES, cubic moved the quad 2.78 px.

private const val H_DIM: Int = 3

private const val BGR_CHANNELS: Int = 3

/** No non-vararg `put` for doubles in OpenCV's Java `Mat`: the spread's nine-double copy beats 24 JNI round trips. */
private fun Mat.readH(into: DoubleArray) = get(0, 0, into)

@Suppress("SpreadOperator")
private fun Mat.writeH(from: DoubleArray) = put(0, 0, *from)

/** `targetSize != boardSize` scales homography rows 0 and 1 only — cheap detection at `detectScale < 1.0`. `dst`
 *  reuses an output `Mat` across frames. */
fun warpFromCorners(
    frame: Mat,
    geom: BoardGeometry,
    corners: List<DoubleArray>,
    targetSize: Int? = null,
    dst: Mat? = null,
    homographyCache: HomographyCache? = null,
    /** Sonst schriebe jeder Aufrufer seine Zeit auf die Detektion. */
    op: WorkOperation = WorkOperation.DETECTION_WARP,
): Mat {
    val sz = targetSize ?: geom.boardSize
    val h = computeHomography(corners, geom.boardSize, geom.margin, homographyCache)
    if (sz != geom.boardSize) {
        val s = sz.toDouble() / geom.boardSize
        // One bulk read and write: element-wise `get`/`put` is 24 JNI round trips per frame to scale six numbers.
        val m = DoubleArray(H_DIM * H_DIM)
        h.readH(m)
        for (c in 0 until H_DIM) {
            m[c] *= s
            m[H_DIM + c] *= s
        }
        h.writeH(m)
    }
    val out = dst ?: Mat()
    WorkProfiler.span(op) {
        Imgproc.warpPerspective(frame, out, h, Size(sz.toDouble(), sz.toDouble()))
    }
    h.release()
    return out
}

/** Canvas `boardSize + 2B`, homography translated by `B = cropBorderPx(geom)`: edge squares get real board for
 *  their `padSide`. `cropSquare` shifts its box by `+B`. */
fun warpBoardForCrops(
    frame: Mat,
    geom: BoardGeometry,
    corners: List<DoubleArray>,
    dst: Mat? = null,
    homographyCache: HomographyCache? = null,
): Mat {
    val bs = geom.boardSize
    val b = cropBorderPx(geom).toDouble()
    val h = computeHomography(corners, bs, geom.margin, homographyCache)
    // T(b, b) @ H: row0 += b * row2, row1 += b * row2, row2 unchanged.
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
    WorkProfiler.span(WorkOperation.CROP_WARP) {
        Imgproc.warpPerspective(frame, out, h, Size(side, side), Imgproc.INTER_CUBIC)
    }
    h.release()
    return out
}

/** A third warp: the crop border is much wider than a quarter cell and would let the outer search reach the
 *  printed label border, locking onto the wrong line. `GRID_PAD_CELLS` is chosen against that. */
internal fun warpFromCornersPadded(
    frame: Mat,
    geom: BoardGeometry,
    corners: List<DoubleArray>,
    pad: Int,
): Mat {
    val bs = geom.boardSize
    val h = computeHomography(corners, bs, geom.margin)
    val m = DoubleArray(H_DIM * H_DIM)
    h.readH(m)
    for (c in 0 until H_DIM) {
        val h2 = m[2 * H_DIM + c]
        m[c] += pad * h2
        m[H_DIM + c] += pad * h2
    }
    h.writeH(m)
    val side = (bs + 2 * pad).toDouble()
    val out = Mat()
    WorkProfiler.span(WorkOperation.GRID_WARP) {
        Imgproc.warpPerspective(frame, out, h, Size(side, side))
    }
    h.release()
    return out
}

/** [into] recycles the destination through a ring (`pipeline/PlaneRing.kt`) — 2.5 MB thirty times a second.
 *  The ring lives in `:app`: only a caller knowing which planes the engine holds may recycle (invariant 14). */
fun toGrayImage(
    mat: Mat,
    into: ByteArray? = null,
): GrayImage {
    require(mat.type() == CvType.CV_8UC1) { "expected CV_8UC1, got ${CvType.typeToString(mat.type())}" }
    val data = planeBuffer(into, mat.rows() * mat.cols())
    mat.get(0, 0, data)
    return GrayImage(mat.cols(), mat.rows(), data)
}

fun toBgrImage(
    mat: Mat,
    into: ByteArray? = null,
): BgrImage {
    require(mat.type() == CvType.CV_8UC3) { "expected CV_8UC3, got ${CvType.typeToString(mat.type())}" }
    val data = planeBuffer(into, mat.rows() * mat.cols() * BGR_CHANNELS)
    mat.get(0, 0, data)
    return BgrImage(mat.cols(), mat.rows(), data)
}

/** A short buffer would leave the previous frame's pixels in the tail, a long one break the resolution check. */
private fun planeBuffer(
    into: ByteArray?,
    need: Int,
): ByteArray {
    if (into == null) return ByteArray(need)
    require(into.size == need) { "plane buffer is ${into.size} bytes, but the Mat needs $need" }
    return into
}
