package com.chesslab.engine.api

// FrameInput.kt — one detection tick's input. Produced by :app, consumed by the engine.
data class FrameInput(
    // monotonic frame counter (Spec 11 signature)
    val seq: Long,
    // CLAHE'd + blurred gray warp at config.detSize
    val grayDet: GrayImage,
    // BGR warp at config.detSize
    val bgrDet: BgrImage,
    // 8 floats: a8x,a8y,h8x,h8y,h1x,h1y,a1x,a1y (source-image px)
    val corners: FloatArray,
    // _roi_motion result (percent), computed in :app
    val motionRoiScore: Double,
    // _grid_line_coverage result, computed in :core-geometry
    val gridLineCoverage: Double,
    // mean luma BEFORE CLAHE — dark-frame gate
    val lumaPreClahe: Double,
    val timestampMs: Long,
    /**
     * The rectified board at a size of the ENGINE's choosing, warped from the frame in one step —
     * or null when the host offers none.
     *
     * Deliberately a function and not a plane: only an engine that measures the board itself wants
     * it, it costs a warp per call, and asking is what makes that cost visible. Not the same
     * picture as [bgrDet] scaled down, which resamples twice and smooths away the contrast such an
     * engine measures.
     */
    val board: ((Int) -> BgrImage?)? = null,
)
