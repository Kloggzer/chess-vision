package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.TrackerConfig
import org.opencv.core.Mat
import com.chesslab.geometry.GrayPipeline as BoardGray

/**
 * The detection gray plane: `cvtColor` + CLAHE(`diffClaheClip`, 8x8) + `GaussianBlur(5,5)`.
 *
 * The arithmetic itself is `:core-geometry`'s `GrayPipeline` (the `_gray` port). This class adds
 * the two things only the app needs: a reused destination `Mat`, and the CLAHE-handle rebuild on
 * a live `diffClaheClip` change (`app.py::_apply_live_tuning` sets `tracker._clahe = None`).
 */
class GrayPipeline(
    private var claheClip: Double,
) {
    private var delegate = BoardGray(claheClip)
    private var dst: Mat? = null

    fun toGray(warpedBgr: Mat): Mat {
        val out = dst ?: Mat().also { dst = it }
        return delegate.toGray(warpedBgr, out)
    }

    /** A changed clip limit invalidates the cached CLAHE handle — rebuild, never reuse. */
    fun onConfigChanged(config: TrackerConfig) {
        if (config.diffClaheClip != claheClip) {
            claheClip = config.diffClaheClip
            // The replaced delegate owns a native scratch plane; dropping the reference would
            // leave it to a finalizer.
            delegate.close()
            delegate = BoardGray(claheClip)
        }
    }

    fun close() {
        delegate.close()
        dst?.release()
        dst = null
    }
}
