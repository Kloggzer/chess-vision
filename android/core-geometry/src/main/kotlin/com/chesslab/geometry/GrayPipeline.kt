package com.chesslab.geometry

import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.CLAHE
import org.opencv.imgproc.Imgproc

// CLAHE runs BEFORE the blur and on EVERY frame: reference and current must be enhanced identically, or the
// per-square noise model is invalid.

private const val CLAHE_TILE: Double = 8.0

private const val BLUR_KSIZE: Double = 5.0

/** A class, so the CLAHE handle is created ONCE: `createCLAHE` per frame is a measurable cost at 15 fps. */
class GrayPipeline(
    private val claheClip: Double,
) : AutoCloseable {
    private var clahe: CLAHE? = null

    private val scratch = Mat()

    /** CLAHE cannot run in place: converting into the reused [scratch] and letting CLAHE write into [dst] drops a
     *  fresh `Mat` and a full-plane copy per frame. */
    fun toGray(
        warpedBgr: Mat,
        dst: Mat? = null,
    ): Mat =
        WorkProfiler.span(WorkOperation.DETECTION_GRAY) {
            val out = dst ?: Mat()
            if (claheClip > 0) {
                Imgproc.cvtColor(warpedBgr, scratch, Imgproc.COLOR_BGR2GRAY)
                val handle = clahe ?: Imgproc.createCLAHE(claheClip, Size(CLAHE_TILE, CLAHE_TILE)).also { clahe = it }
                handle.apply(scratch, out)
            } else {
                Imgproc.cvtColor(warpedBgr, out, Imgproc.COLOR_BGR2GRAY)
            }
            Imgproc.GaussianBlur(out, out, Size(BLUR_KSIZE, BLUR_KSIZE), 0.0)
            out
        }

    override fun close() {
        scratch.release()
    }
}
