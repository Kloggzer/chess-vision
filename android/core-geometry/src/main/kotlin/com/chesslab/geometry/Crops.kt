package com.chesslab.geometry

import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import kotlin.math.max
import kotlin.math.min

// `crops_for_frame` is not ported: the phone cuts in `OpenCvStages.updateCropFrame`, reusing one bordered warp.

/** Crop order, rank-major from a1 — NOT the corner order `[a8, h8, h1, a1]` (entry.md invariant 11). */
fun allSquares(): List<String> = (1..BOARD_SIDE).flatMap { r -> FILES.map { f -> "$f$r" } }

/** Uniform scale, remainder letterboxed black; with a square box it is a borderless resize. */
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
        try {
            Imgproc.resize(img, resized, Size(nw.toDouble(), nh.toDouble()), 0.0, 0.0, interp)
            val x = (outW - nw) / 2
            val y = (outH - nh) / 2
            val target = canvas.submat(y, y + nh, x, x + nw)
            try {
                resized.copyTo(target)
            } finally {
                target.release()
            }
        } finally {
            resized.release()
        }
    }
    return canvas
}

/** A plain rectangle, always: the board was straightened once ([straightenBoard]). Overhang is BLACK (never
 *  replicate or reflect), so the geometry is constant across all 64 squares. */
fun cropSquare(
    boardWarped: Mat,
    square: String,
    geom: BoardGeometry,
): Mat {
    val box = squareToCropBox(square, geom, clamp = false)
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
    val region = boardWarped.submat(ya, yb, xa, xb)
    val padT = ya - y0
    val padB = y1 - yb
    val padL = xa - x0
    val padR = x1 - xb
    var bordered: Mat? = null
    return try {
        val source =
            if (maxOf(maxOf(padT, padB), maxOf(padL, padR)) > 0) {
                Mat().also {
                    bordered = it
                    Core.copyMakeBorder(region, it, padT, padB, padL, padR, Core.BORDER_CONSTANT, BLACK)
                }
            } else {
                region
            }
        resizeKeepAspect(source, geom.outW, geom.outH)
    } finally {
        bordered?.release()
        region.release()
    }
}

/** The returned Mat is owned here and overwritten by the next call. */
class SquareCropper : AutoCloseable {
    private val resized = Mat()
    private val output = Mat()

    fun crop(
        boardWarped: Mat,
        square: String,
        geom: BoardGeometry,
    ): Mat {
        val box = squareToCropBox(square, geom, clamp = false)
        val border = cropBorderPx(geom)
        val x0 = box[0] + border
        val y0 = box[1] + border
        val x1 = max(box[2] + border, x0 + 1)
        val y1 = max(box[3] + border, y0 + 1)
        val xa = max(0, x0)
        val ya = max(0, y0)
        val xb = min(boardWarped.cols(), x1)
        val yb = min(boardWarped.rows(), y1)
        val region = boardWarped.submat(ya, yb, xa, xb)
        var padded: Mat? = null
        try {
            val source =
                if (xa != x0 || ya != y0 || xb != x1 || yb != y1) {
                    Mat().also {
                        padded = it
                        Core.copyMakeBorder(
                            region,
                            it,
                            ya - y0,
                            y1 - yb,
                            xa - x0,
                            x1 - xb,
                            Core.BORDER_CONSTANT,
                            BLACK,
                        )
                    }
                } else {
                    region
                }
            resizeInto(source, geom.outW, geom.outH)
            return output
        } finally {
            padded?.release()
            region.release()
        }
    }

    private fun resizeInto(
        source: Mat,
        outW: Int,
        outH: Int,
    ) {
        output.create(outH, outW, CvType.CV_8UC3)
        output.setTo(BLACK)
        val scale = min(outW.toDouble() / source.cols(), outH.toDouble() / source.rows())
        val width = max(1, pyRound(source.cols() * scale))
        val height = max(1, pyRound(source.rows() * scale))
        val interpolation = if (scale < 1.0) Imgproc.INTER_AREA else Imgproc.INTER_LINEAR
        Imgproc.resize(source, resized, Size(width.toDouble(), height.toDouble()), 0.0, 0.0, interpolation)
        val x = (outW - width) / 2
        val y = (outH - height) / 2
        val target = output.submat(y, y + height, x, x + width)
        try {
            resized.copyTo(target)
        } finally {
            target.release()
        }
    }

    override fun close() {
        output.release()
        resized.release()
    }
}

private val BLACK = Scalar(0.0, 0.0, 0.0)

/** The pipeline's only straightening: cuts after it are plain rectangles, and a second pass corrects twice.
 *  CUBIC: bilinear would low-pass what the crop keeps (-44 % against -22 %). Twin: `calibration.straighten_board`. */
fun straightenBoard(
    boardWarped: Mat,
    mesh: GridMesh,
    boardSize: Int,
    border: Int,
): Mat {
    val rows = boardWarped.rows()
    val cols = boardWarped.cols()
    val mapX = Mat(rows, cols, CvType.CV_32FC1)
    val mapY = Mat(rows, cols, CvType.CV_32FC1)
    val bs = boardSize.toDouble()
    val rowX = FloatArray(cols)
    val rowY = FloatArray(cols)
    for (y in 0 until rows) {
        val v = (y - border) / bs
        for (x in 0 until cols) {
            val p = meshPoint((x - border) / bs, v, mesh)
            rowX[x] = (p[0] * bs + border).toFloat()
            rowY[x] = (p[1] * bs + border).toFloat()
        }
        mapX.put(y, 0, rowX)
        mapY.put(y, 0, rowY)
    }
    val out = Mat()
    Imgproc.remap(boardWarped, out, mapX, mapY, Imgproc.INTER_CUBIC, Core.BORDER_REPLICATE)
    mapX.release()
    mapY.release()
    return out
}
