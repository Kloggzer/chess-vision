package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.motionPercent
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import kotlin.math.max

// Port of `tracker.py::_roi_motion` (+ `_expand_corners` / `_roi_polygon`).
//
// Motion in a board-aligned region extended by `motionMargin`: the hand is seen BEFORE it
// covers a square. The region is a perspective warp of the CENTRE-EXPANDED board quad, not an
// inflated AABB — a tilted board would otherwise drag half the desk into the measurement.

/** The ROI is scored at this resolution. It is why the stage is cheap — do not change it. */
internal const val ROI_SIDE = 160.0

private const val BLUR_KSIZE = 5.0

private const val MIN_DST = 8

/**
 * `[a8, h8, h1, a1]` expanded outward from their centroid by `1 + 2 * margin`
 * (1.20 at the default 0.10). Returns 8 flat coordinates in the input's order.
 */
internal fun expandCorners(
    corners: FloatArray,
    margin: Double,
): DoubleArray {
    val n = corners.size / 2
    var cx = 0.0
    var cy = 0.0
    for (i in 0 until n) {
        cx += corners[i * 2]
        cy += corners[i * 2 + 1]
    }
    cx /= n
    cy /= n
    val scale = 1.0 + 2.0 * margin
    val out = DoubleArray(corners.size)
    for (i in 0 until n) {
        out[i * 2] = cx + (corners[i * 2] - cx) * scale
        out[i * 2 + 1] = cy + (corners[i * 2 + 1] - cy) * scale
    }
    return out
}

/**
 * Percent of pixels whose brightness changed by more than [pxThr].
 *
 * Delegates to the engine's own `motionScore` (exposed as `api.motionPercent`) so the ROI score
 * and the engine's whole-frame score can never drift apart. Result is PERCENT — a fraction here
 * would be compared against `motionThr = 0.25` and never fire.
 */
internal fun changedPixelPercent(
    prev: ByteArray,
    cur: ByteArray,
    pxThr: Double,
): Double = if (prev.size != cur.size || prev.isEmpty()) 0.0 else motionPercent(prev, cur, pxThr)

/** Board-aligned ROI motion. One instance per analyzer thread; every `Mat` is reused. */
class RoiMotion(
    private var boardSize: Int,
    private var margin: Double,
    private var pxThr: Double,
) {
    private var gray: Mat? = null
    private var roi: Mat? = null
    private var small: Mat? = null
    private var scratch = ByteArray(0)
    private var prev: ByteArray? = null

    /** ROI motion of [frameBgr] (the FULL frame) against the previous frame's ROI. */
    fun score(
        frameBgr: Mat,
        corners: FloatArray,
    ): Double {
        val g = gray ?: Mat().also { gray = it }
        Imgproc.cvtColor(frameBgr, g, Imgproc.COLOR_BGR2GRAY)
        val scale = 1.0 + 2.0 * margin
        val dstSz = max(MIN_DST, (boardSize * scale).toInt()).toDouble()
        val r = roi ?: Mat().also { roi = it }
        val transform = perspective(corners, dstSz)
        Imgproc.warpPerspective(g, r, transform, Size(dstSz, dstSz), Imgproc.INTER_LINEAR, Core.BORDER_REPLICATE)
        transform.release()
        val s = small ?: Mat().also { small = it }
        Imgproc.resize(r, s, Size(ROI_SIDE, ROI_SIDE))
        Imgproc.GaussianBlur(s, s, Size(BLUR_KSIZE, BLUR_KSIZE), 0.0)
        val n = (s.total() * s.channels()).toInt()
        if (scratch.size != n) scratch = ByteArray(n)
        s.get(0, 0, scratch)
        return scoreRoi(scratch)
    }

    /** A changed margin invalidates the stored ROI: the two would not be the same region. */
    fun onConfigChanged(config: TrackerConfig) {
        pxThr = config.motionPxThr
        if (config.motionMargin != margin) {
            margin = config.motionMargin
            prev = null
        }
    }

    fun onGeometryChanged(newBoardSize: Int) {
        if (newBoardSize != boardSize) {
            boardSize = newBoardSize
            prev = null
        }
    }

    fun close() {
        gray?.release()
        roi?.release()
        small?.release()
        gray = null
        roi = null
        small = null
        prev = null
    }

    /**
     * The ROI plane against the previous one. No previous ROI, or a different shape (the board
     * size or the margin changed), scores 0.0 — never compare two different regions.
     */
    internal fun scoreRoi(data: ByteArray): Double {
        val previous = prev?.takeIf { it.size == data.size }
        val score = if (previous == null) 0.0 else changedPixelPercent(previous, data, pxThr)
        // Scored first, then overwritten: the previous plane IS the buffer we reuse.
        val target = previous ?: ByteArray(data.size)
        data.copyInto(target)
        prev = target
        return score
    }

    private fun perspective(
        corners: FloatArray,
        dstSz: Double,
    ): Mat {
        // Python rounds the expanded quad to integer pixels (`_roi_polygon`) so the measured
        // region is exactly the one drawn on the overlay.
        val e = expandCorners(corners, margin)
        val src = MatOfPoint2f()
        src.fromList((0 until e.size / 2).map { Point(Math.rint(e[it * 2]), Math.rint(e[it * 2 + 1])) })
        val dst = MatOfPoint2f()
        dst.fromList(listOf(Point(0.0, 0.0), Point(dstSz - 1, 0.0), Point(dstSz - 1, dstSz - 1), Point(0.0, dstSz - 1)))
        val m = Imgproc.getPerspectiveTransform(src, dst)
        src.release()
        dst.release()
        return m
    }
}
