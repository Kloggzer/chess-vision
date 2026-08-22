package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.motionPercent
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

// Port of `tracker.py::_roi_motion` (+ `_expand_corners` / `_roi_polygon`).
//
// Motion in a board-aligned region extended by `motionMargin`: the hand is seen BEFORE it
// covers a square. The region is a perspective warp of the CENTRE-EXPANDED board quad, not an
// inflated AABB — a tilted board would otherwise drag half the desk into the measurement.

/** The ROI is scored at this resolution. It is why the stage is cheap — do not change it. */
internal const val ROI_SIDE = 160.0

private const val BLUR_KSIZE = 5.0

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
    private var margin: Double,
    private var pxThr: Double,
) {
    private var roi: Mat? = null
    private var small: Mat? = null
    private var scratch = ByteArray(0)
    private var prev: ByteArray? = null

    /**
     * ROI motion of [frameBgr] (the FULL frame) against the previous frame's ROI.
     *
     * The warp goes STRAIGHT to [ROI_SIDE]. Python renders the quad at `boardSize * (1 + 2m)` —
     * ~1920 px at the Android defaults — and then throws 99.3 % of it away in a `resize` to 160,
     * which cost 11-17 ms per frame for nothing: the same homography with a 160 px destination
     * samples the same source region. Measured over the 20 committed clips (2948 frame pairs) the
     * score moves by 0.007 pp on average, 0.16 pp worst case, and crosses the 0.25 pp motion gate
     * on 1 frame in 2948 — see STATUS "Frame pipeline performance".
     *
     * Gray comes AFTER the warp for the same reason: `BGR2GRAY` and bilinear interpolation are
     * both linear per channel, so the order is arithmetically free, and doing it second converts
     * 160x160 pixels instead of the whole frame.
     */
    fun score(
        frameBgr: Mat,
        corners: FloatArray,
    ): Double =
        WorkProfiler.span(WorkOperation.ROI_MOTION) {
            val r = roi ?: Mat().also { roi = it }
            val transform = perspective(corners, ROI_SIDE)
            Imgproc.warpPerspective(
                frameBgr,
                r,
                transform,
                Size(ROI_SIDE, ROI_SIDE),
                Imgproc.INTER_LINEAR,
                Core.BORDER_REPLICATE,
            )
            transform.release()
            val s = small ?: Mat().also { small = it }
            Imgproc.cvtColor(r, s, Imgproc.COLOR_BGR2GRAY)
            Imgproc.GaussianBlur(s, s, Size(BLUR_KSIZE, BLUR_KSIZE), 0.0)
            val n = (s.total() * s.channels()).toInt()
            if (scratch.size != n) scratch = ByteArray(n)
            s.get(0, 0, scratch)
            scoreRoi(scratch)
        }

    /** A changed margin invalidates the stored ROI: the two would not be the same region. */
    fun onConfigChanged(config: TrackerConfig) {
        pxThr = config.motionPxThr
        if (config.motionMargin != margin) {
            margin = config.motionMargin
            prev = null
        }
    }

    /** New geometry is a new region — never diff the ROI of one calibration against another's. */
    fun onGeometryChanged() {
        prev = null
    }

    fun close() {
        roi?.release()
        small?.release()
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
