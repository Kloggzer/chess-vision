package com.chesslab.engine.api

/**
 * Row-major single-channel image; the engine's only pixel type.
 * Consumed by phases 01–03.
 */
class GrayImage(
    val width: Int,
    val height: Int,
    val data: ByteArray,
)

/**
 * Warped color board for HSV/Lab vetoes; packed BGR.
 * Consumed by phases 01–03.
 */
class BgrImage(
    val width: Int,
    val height: Int,
    val data: ByteArray,
)

/**
 * Pixel-exact diagnostic images from the most recently processed frame.
 * [detectionDiff] uses the stable average evaluated by move detection,
 * [occlusionDiff] uses the live frame evaluated by the occlusion classifier, and
 * [motionDiff] uses the live current/previous pair evaluated by the motion gate.
 */
data class DebugImages(
    val detectionDiff: GrayImage? = null,
    val occlusionDiff: GrayImage? = null,
    val motionDiff: GrayImage? = null,
)
