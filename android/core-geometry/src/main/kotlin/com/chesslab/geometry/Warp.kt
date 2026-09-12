package com.chesslab.geometry

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import org.opencv.core.Core
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
    homographyCache: HomographyCache? = null,
    /** Wer diesen Warp bezahlt. Sonst schriebe jeder Aufrufer seine Zeit auf die Detektion. */
    op: WorkOperation = WorkOperation.DETECTION_WARP,
): Mat {
    val sz = targetSize ?: geom.boardSize
    val h = computeHomography(corners, geom.boardSize, geom.margin, homographyCache)
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
    WorkProfiler.span(op) {
        Imgproc.warpPerspective(frame, out, h, Size(sz.toDouble(), sz.toDouble()))
    }
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
    homographyCache: HomographyCache? = null,
    remapCache: RemapCache? = null,
): Mat {
    val bs = geom.boardSize
    val b = cropBorderPx(geom).toDouble()
    val h = computeHomography(corners, bs, geom.margin, homographyCache)
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
    WorkProfiler.span(WorkOperation.CROP_WARP) {
        if (remapCache != null) {
            remapCache.remap(frame, out, m, side.toInt())
        } else {
            Imgproc.warpPerspective(frame, out, h, Size(side, side))
        }
    }
    h.release()
    return out
}

private const val INTER_BITS = 5
private const val INTER_TAB_SIZE = 1 shl INTER_BITS

/**
 * `warpPerspective` rebuilds its fixed-point coordinate tables on every call; the corners change
 * only when LiveAlign moves them, so the tables are kept and the warp becomes one `remap`. Built
 * exactly as OpenCV builds them (LU inverse, `INTER_BITS` fixed point), so the output is byte-equal.
 */
class RemapCache {
    private var key = DoubleArray(0)
    private var side = 0
    private var xy: Mat? = null
    private var alpha: Mat? = null

    internal fun remap(
        src: Mat,
        dst: Mat,
        h: DoubleArray,
        side: Int,
    ) {
        if (this.side != side || !key.contentEquals(h)) build(h, side)
        Imgproc.remap(src, dst, xy, alpha, Imgproc.INTER_LINEAR)
    }

    private fun build(
        h: DoubleArray,
        side: Int,
    ) {
        val forward = Mat(H_DIM, H_DIM, CvType.CV_64F).apply { put(0, 0, *h) }
        val inverse = Mat()
        Core.invert(forward, inverse, Core.DECOMP_LU)
        val m = DoubleArray(H_DIM * H_DIM)
        inverse.get(0, 0, m)
        forward.release()
        inverse.release()
        val coords = ShortArray(side * side * 2)
        val frac = ShortArray(side * side)
        var i = 0
        for (y in 0 until side) {
            for (x in 0 until side) {
                var w = m[6] * x + m[7] * y + m[8]
                w = if (w != 0.0) INTER_TAB_SIZE / w else 0.0
                val fx = ((m[0] * x + m[1] * y + m[2]) * w).coerceIn(Int.MIN_VALUE.toDouble(), Int.MAX_VALUE.toDouble())
                val fy = ((m[3] * x + m[4] * y + m[5]) * w).coerceIn(Int.MIN_VALUE.toDouble(), Int.MAX_VALUE.toDouble())
                val ix = Math.round(fx).toInt()
                val iy = Math.round(fy).toInt()
                coords[2 * i] = (ix shr INTER_BITS).coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
                coords[2 * i + 1] = (iy shr INTER_BITS).coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
                frac[i] = ((iy and (INTER_TAB_SIZE - 1)) * INTER_TAB_SIZE + (ix and (INTER_TAB_SIZE - 1))).toShort()
                i += 1
            }
        }
        xy?.release()
        alpha?.release()
        xy = Mat(side, side, CvType.CV_16SC2).apply { put(0, 0, coords) }
        alpha = Mat(side, side, CvType.CV_16UC1).apply { put(0, 0, frac) }
        key = h.copyOf()
        this.side = side
    }

    fun release() {
        xy?.release()
        alpha?.release()
        xy = null
        alpha = null
        side = 0
    }
}

/**
 * Rectification with an arbitrary [pad] on all four sides — the GRID-MEASUREMENT warp.
 *
 * A third warp and not a reuse of [warpBoardForCrops], because the two want opposite pads:
 * `cropBorderPx` is sized for the crop extension and is much wider than a quarter cell, and a wide
 * pad lets `gridLines`' outer search reach the board's printed rank/file border a third of a cell
 * outside the playing field — where it locks onto the wrong line and reports a small offset for a
 * board scaled wrong by half a square. `GRID_PAD_CELLS` is chosen against that number.
 *
 * Geometry is identical to the borderless warp, only shifted by [pad].
 */
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

/**
 * `Mat` -> the OpenCV-free seam type. 8-bit single channel, row-major, stride == width.
 *
 * [into] lets the caller supply the destination, exactly like the `dst: Mat?` of the two warps: the
 * live pipeline hands 640 KB of gray and 1.92 MB of BGR across this seam thirty times a second and
 * recycles both through a ring (`pipeline/PlaneRing.kt`). Omitting it allocates, which is what the
 * offline clip harness wants — it keeps every frame it decodes.
 *
 * The ring lives in `:app`, NOT here: the recycling is only correct for a caller that knows which
 * planes the engine still holds by reference (entry.md invariant 14).
 */
fun toGrayImage(
    mat: Mat,
    into: ByteArray? = null,
): GrayImage {
    require(mat.type() == CvType.CV_8UC1) { "expected CV_8UC1, got ${CvType.typeToString(mat.type())}" }
    val data = planeBuffer(into, mat.rows() * mat.cols())
    mat.get(0, 0, data)
    return GrayImage(mat.cols(), mat.rows(), data)
}

/** `Mat` -> the OpenCV-free seam type. Interleaved BGR, stride == width * 3. See [toGrayImage]. */
fun toBgrImage(
    mat: Mat,
    into: ByteArray? = null,
): BgrImage {
    require(mat.type() == CvType.CV_8UC3) { "expected CV_8UC3, got ${CvType.typeToString(mat.type())}" }
    val data = planeBuffer(into, mat.rows() * mat.cols() * BGR_CHANNELS)
    mat.get(0, 0, data)
    return BgrImage(mat.cols(), mat.rows(), data)
}

/**
 * The supplied buffer, checked — a silently short one would leave the tail of the plane holding the
 * PREVIOUS frame's pixels, and a silently long one would make `data.size` disagree with `w * h`,
 * which the running mean uses to detect a resolution change.
 */
private fun planeBuffer(
    into: ByteArray?,
    need: Int,
): ByteArray {
    if (into == null) return ByteArray(need)
    require(into.size == need) { "plane buffer is ${into.size} bytes, but the Mat needs $need" }
    return into
}
