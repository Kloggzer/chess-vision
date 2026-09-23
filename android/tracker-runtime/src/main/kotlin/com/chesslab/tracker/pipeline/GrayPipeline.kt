package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.TrackerConfig
import org.opencv.core.Mat
import com.chesslab.geometry.GrayPipeline as BoardGray

/** The arithmetic is `:core-geometry`'s; this adds a reused destination and the CLAHE rebuild on a live
 *  `diffClaheClip` change. */
class GrayPipeline(
    private var claheClip: Double,
) {
    private var delegate = BoardGray(claheClip)
    private var dst: Mat? = null

    fun toGray(warpedBgr: Mat): Mat {
        val out = dst ?: Mat().also { dst = it }
        return delegate.toGray(warpedBgr, out)
    }

    fun onConfigChanged(config: TrackerConfig) {
        if (config.diffClaheClip != claheClip) {
            claheClip = config.diffClaheClip
            // The replaced delegate owns a native scratch plane; dropping it would leave it to a finalizer.
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
