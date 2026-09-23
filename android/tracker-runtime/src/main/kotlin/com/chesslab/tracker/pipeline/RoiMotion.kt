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

// A board-aligned region extended by `motionMargin`: the hand is seen BEFORE it covers a square. A warp of the
// CENTRE-EXPANDED quad, not an inflated AABB — a tilted board would drag half the desk in.

/** It is why the stage is cheap — do not change it. */
internal const val ROI_SIDE = 160.0

private const val BLUR_KSIZE = 5.0

/** 1.20 at the default 0.10. */
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

/** The engine's own `motionPercent`, so the two scores cannot drift. PERCENT — a fraction against
 *  `motionThr = 0.25` would never fire. */
internal fun changedPixelPercent(
    prev: ByteArray,
    cur: ByteArray,
    pxThr: Double,
): Double = if (prev.size != cur.size || prev.isEmpty()) 0.0 else motionPercent(prev, cur, pxThr)

class RoiMotion(
    private var margin: Double,
    private var pxThr: Double,
) {
    private var roi: Mat? = null
    private var small: Mat? = null
    private var scratch = ByteArray(0)
    private var prev: ByteArray? = null

    /** STRAIGHT to [ROI_SIDE]: Python renders ~1920 px and throws 99.3 % away (11-17 ms per frame). Over 2948 frame
     *  pairs the score moves 0.007 pp on average and crosses the gate on 1 frame. Gray after the warp: both linear. */
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

    /** A changed margin makes the stored ROI a different region. */
    fun onConfigChanged(config: TrackerConfig) {
        pxThr = config.motionPxThr
        if (config.motionMargin != margin) {
            margin = config.motionMargin
            prev = null
        }
    }

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

    /** A different shape scores 0.0 — never compare two different regions. */
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
        // Rounded to integer pixels like Python, so the measured region is the one drawn on the overlay.
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
