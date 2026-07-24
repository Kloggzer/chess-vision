package com.chesslab.geometry

import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.CLAHE
import org.opencv.imgproc.Imgproc

// Port of `tracker.py:1008 _gray`.
//
// CLAHE runs BEFORE the blur and on EVERY frame: reference and current must be enhanced
// identically or the per-square noise model is invalid.
//
// The dark-frame gate reads mean luma BEFORE CLAHE (`FrameInput.lumaPreClahe`) - that is
// phase 05b's job, not this class's.

/** `config.PHOTOMETRY.clahe_tile` (config.py:166) — `tileGridSize = tile x tile`. */
private const val CLAHE_TILE: Double = 8.0

/** Denoise kernel of `cv2.GaussianBlur(g, (5, 5), 0)`. */
private const val BLUR_KSIZE: Double = 5.0

/**
 * BGR warp -> the detection gray plane: `cvtColor` + optional CLAHE + Gaussian blur.
 *
 * A class, not a top-level function, so the CLAHE handle is created ONCE
 * (`Imgproc.createCLAHE` per frame is a measurable cost at 15 fps).
 */
class GrayPipeline(
    private val claheClip: Double,
) {
    private var clahe: CLAHE? = null

    /** `dst` lets the caller reuse an output `Mat` across frames. */
    fun toGray(
        warpedBgr: Mat,
        dst: Mat? = null,
    ): Mat {
        val out = dst ?: Mat()
        Imgproc.cvtColor(warpedBgr, out, Imgproc.COLOR_BGR2GRAY)
        if (claheClip > 0) {
            val handle = clahe ?: Imgproc.createCLAHE(claheClip, Size(CLAHE_TILE, CLAHE_TILE)).also { clahe = it }
            // Not in place: CLAHE reads its source while writing the destination.
            val enhanced = Mat()
            handle.apply(out, enhanced)
            enhanced.copyTo(out)
        }
        Imgproc.GaussianBlur(out, out, Size(BLUR_KSIZE, BLUR_KSIZE), 0.0)
        return out
    }
}
