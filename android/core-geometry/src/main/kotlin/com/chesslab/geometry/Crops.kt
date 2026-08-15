package com.chesslab.geometry

import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import kotlin.math.max
import kotlin.math.min

// The 64 CNN crops. Ports of `labeling.py:102 all_squares`, `:112 crop_square` and
// `imgops.py:14 resize_keep_aspect`.
//
// `crops_for_frame` itself is NOT ported any more: the phone cuts its crops in
// `OpenCvStages.updateCropFrame`, which calls `warpBoardForCrops` once and `cropSquare` per square
// so the bordered warp is reused rather than re-cut. The port sat here with no caller on either
// host. (The comment this replaces said this file was the only caller of `warpBoardForCrops`,
// which stopped being true the moment the pipeline called it.)

/**
 * Crop order — `a1,b1,..,h1,a2,..,h8`, rank-major from rank 1 (`labeling.py:102`).
 * NOT the corner order `[a8, h8, h1, a1]` — entry.md invariant 11.
 */
fun allSquares(): List<String> = (1..BOARD_SIDE).flatMap { r -> FILES.map { f -> "$f$r" } }

/**
 * Scale to `outW x outH` WITHOUT distortion: uniform scale, remainder centred and filled with
 * black (letterbox). Port of `imgops.py:14 resize_keep_aspect`.
 *
 * With the square defaults this is a borderless resize; the letterbox path exists because
 * `padUp > 0` makes the crop box taller than wide.
 */
fun resizeKeepAspect(
    img: Mat,
    outW: Int,
    outH: Int,
): Mat {
    val canvas = Mat.zeros(outH, outW, CvType.CV_8UC3)
    val w = img.cols()
    val h = img.rows()
    if (w > 0 && h > 0) {
        val s = min(outW.toDouble() / w, outH.toDouble() / h)
        val nw = max(1, pyRound(w * s))
        val nh = max(1, pyRound(h * s))
        val interp = if (s < 1.0) Imgproc.INTER_AREA else Imgproc.INTER_LINEAR
        val resized = Mat()
        Imgproc.resize(img, resized, Size(nw.toDouble(), nh.toDouble()), 0.0, 0.0, interp)
        val x = (outW - nw) / 2
        val y = (outH - nh) / 2
        resized.copyTo(canvas.submat(y, y + nh, x, x + nw))
    }
    return canvas
}

/**
 * One square crop out of the BORDERED board (`warpBoardForCrops`).
 * Port of `labeling.py:112 crop_square`.
 *
 * The box comes from `squareToCropBox(clamp = false)` — or from [meshCropBox] when a measured
 * [mesh] is given — and is shifted by `+B` into the bordered canvas. Overhang is filled with
 * BLACK (never replicate, never reflect) so the crop geometry is constant across all 64
 * squares, then letterbox-resized to `outW x outH`. A mesh that carries TILTS is cut
 * perspectively per cell instead ([cropSquareTilted]); without tilts this path is untouched.
 */
fun cropSquare(
    boardWarped: Mat,
    square: String,
    geom: BoardGeometry,
    mesh: GridMesh? = null,
): Mat {
    if (mesh?.tx != null) {
        val tilted = cropSquareTilted(boardWarped, square, geom, mesh)
        if (tilted != null) return tilted
    }
    val box =
        if (mesh == null) {
            squareToCropBox(square, geom, clamp = false)
        } else {
            meshCropBox(square, geom, mesh)
        }
    val b = cropBorderPx(geom)
    val x0 = box[0] + b
    val y0 = box[1] + b
    val x1 = max(box[2] + b, x0 + 1)
    val y1 = max(box[3] + b, y0 + 1)
    val imgW = boardWarped.cols()
    val imgH = boardWarped.rows()
    val xa = max(0, x0)
    val ya = max(0, y0)
    val xb = min(imgW, x1)
    val yb = min(imgH, y1)
    var region = boardWarped.submat(ya, yb, xa, xb)
    val padT = ya - y0
    val padB = y1 - yb
    val padL = xa - x0
    val padR = x1 - xb
    if (maxOf(maxOf(padT, padB), maxOf(padL, padR)) > 0) {
        val bordered = Mat()
        Core.copyMakeBorder(region, bordered, padT, padB, padL, padR, Core.BORDER_CONSTANT, Scalar(0.0, 0.0, 0.0))
        region = bordered
    }
    return resizeKeepAspect(region, geom.outW, geom.outH)
}

/**
 * The per-cell PERSPECTIVE cut — the square's padded quad ([meshCellQuadExact]) warped straight
 * onto the letterboxed content rectangle, so a line the mesh knows as tilted comes out vertical.
 * Same composition as the rectangle path: aspect from the scalar box, bars and overhang black.
 */
private fun cropSquareTilted(
    boardWarped: Mat,
    square: String,
    geom: BoardGeometry,
    mesh: GridMesh,
): Mat? {
    val box = meshCropBoxExact(square, geom, mesh)
    val w = box[2] - box[0]
    val h = box[3] - box[1]
    if (w <= 0.0 || h <= 0.0) return null
    val s = min(geom.outW / w, geom.outH / h)
    val nw = max(1, pyRound(w * s))
    val nh = max(1, pyRound(h * s))
    val quad = meshCellQuadExact(square, geom, mesh)
    val b = cropBorderPx(geom).toDouble()
    val src =
        MatOfPoint2f(
            Point(quad[0] + b, quad[1] + b),
            Point(quad[2] + b, quad[3] + b),
            Point(quad[4] + b, quad[5] + b),
            Point(quad[6] + b, quad[7] + b),
        )
    val dst =
        MatOfPoint2f(
            Point(0.0, 0.0),
            Point(nw.toDouble(), 0.0),
            Point(nw.toDouble(), nh.toDouble()),
            Point(0.0, nh.toDouble()),
        )
    val m = Imgproc.getPerspectiveTransform(src, dst)
    val content = Mat()
    Imgproc.warpPerspective(boardWarped, content, m, Size(nw.toDouble(), nh.toDouble()))
    val canvas = Mat.zeros(geom.outH, geom.outW, CvType.CV_8UC3)
    val x = (geom.outW - nw) / 2
    val y = (geom.outH - nh) / 2
    content.copyTo(canvas.submat(y, y + nh, x, x + nw))
    content.release()
    m.release()
    src.release()
    dst.release()
    return canvas
}
