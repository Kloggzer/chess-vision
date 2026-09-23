package com.chesslab.engine.api

data class FrameInput(
    val seq: Long,
    val grayDet: GrayImage,
    val bgrDet: BgrImage,
    // Source-image pixels in [a8, h8, h1, a1] order (invariant 11).
    val corners: FloatArray,
    val motionRoiScore: Double,
    val gridLineCoverage: Double,
    // Pre-CLAHE luma, for the dark-frame gate.
    val lumaPreClahe: Double,
    val timestampMs: Long,
    /** A function: the optional one-step warp avoids contrast-losing resampling. */
    val board: ((Int) -> BgrImage?)? = null,
)
