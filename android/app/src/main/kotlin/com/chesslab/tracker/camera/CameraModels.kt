package com.chesslab.tracker.camera

import androidx.camera.core.AspectRatio
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageProxy
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import com.chesslab.tracker.settings.FrameRateMode
import com.chesslab.tracker.settings.ResolutionMode

/** The CameraX fact behind [DeliveredSize]: read off the ImageProxy, never off the request. */
fun deliveredSizeOf(image: ImageProxy): DeliveredSize = DeliveredSize(image.width, image.height, image.imageInfo.rotationDegrees)

/**
 * Analyzer seam.
 *
 * Invoked on the `chesslab-analyzer` thread; [image] is a pooled resource that [TrackerCamera]
 * closes as soon as this call returns, so the sink must neither retain it nor pass it to another
 * thread. A callback and not a Flow on purpose: queueing an `ImageProxy` starves the pool and
 * re-delivers stale frames, and a repeated frame diffs to zero — it reads as "board stable" while
 * a hand is moving (entry.md invariant 14).
 */
fun interface FrameSink {
    fun onFrame(
        image: ImageProxy,
        delivered: DeliveredSize,
    )
}

/** What we ask the device for. A wish — see [DeliveredSize]. */
data class CameraRequest(
    val width: Int,
    val height: Int,
    val lensFacing: Int = CameraSelector.LENS_FACING_BACK,
    /** Pinned onto `CONTROL_AE_TARGET_FPS_RANGE` — see `TrackerCamera.pinFrameRate`. */
    val targetFps: Int,
) {
    /** The one lower mode a repeatedly failing high-bandwidth binding retries at. */
    fun downshifted(): CameraRequest = copy(width = DOWNSHIFT_WIDTH, height = DOWNSHIFT_HEIGHT)
}

/**
 * The aspect ratio the requested size actually is.
 *
 * Stating it is what stops CameraX handing back a 4:3 frame for a 16:9 request; every mode here
 * is 16:9, and [AspectRatioStrategy.RATIO_16_9] is derived rather than hardcoded so a future 4:3
 * mode does not silently inherit the wrong one.
 */
internal fun aspectRatioFor(request: CameraRequest): Int =
    if (request.width * HEIGHT_4_3 == request.height * WIDTH_4_3) AspectRatio.RATIO_4_3 else AspectRatio.RATIO_16_9

/**
 * 07a's [ResolutionMode] as a request.
 *
 * This changes what is ASKED for and nothing else: the delivered [DeliveredSize] read off the
 * `ImageProxy` remains the single source of truth for calibration, live-align and the size guard
 * (commit `a7dab73`). AUTO is 1080p rather than "whatever CameraX picks", because 1080p is the
 * mode the 15 fps analyzer budget was measured at — an unnamed default is not a measured one.
 */
fun cameraRequestFor(
    mode: ResolutionMode,
    rate: FrameRateMode,
): CameraRequest =
    when (mode) {
        ResolutionMode.AUTO, ResolutionMode.R1080 -> CameraRequest(WIDTH_1080, HEIGHT_1080, targetFps = rate.fps)
        ResolutionMode.R1440 -> CameraRequest(WIDTH_1440, HEIGHT_1440, targetFps = rate.fps)
        ResolutionMode.R2160 -> CameraRequest(WIDTH_2160, HEIGHT_2160, targetFps = rate.fps)
    }

private const val WIDTH_4_3 = 4
private const val HEIGHT_4_3 = 3
private const val DOWNSHIFT_WIDTH = 1280
private const val DOWNSHIFT_HEIGHT = 720
private const val WIDTH_1080 = 1920
private const val HEIGHT_1080 = 1080
private const val WIDTH_1440 = 2560
private const val HEIGHT_1440 = 1440
private const val WIDTH_2160 = 3840
private const val HEIGHT_2160 = 2160
