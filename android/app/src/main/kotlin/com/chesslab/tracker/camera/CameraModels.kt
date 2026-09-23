package com.chesslab.tracker.camera

import androidx.camera.core.AspectRatio
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageProxy
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import com.chesslab.tracker.settings.FrameRateMode
import com.chesslab.tracker.settings.ResolutionMode

/** The CameraX fact behind [DeliveredSize]: read off the ImageProxy, never off the request. */
fun deliveredSizeOf(image: ImageProxy): DeliveredSize = DeliveredSize(image.width, image.height, image.imageInfo.rotationDegrees)

/** [image] is pooled and closed when this returns: never retain it or hand it to another thread. A
 *  callback, not a Flow: a queued `ImageProxy` starves the pool, and a re-delivered frame diffs to zero —
 *  "board stable" while a hand moves (entry.md invariant 14). */
fun interface FrameSink {
    fun onFrame(
        image: ImageProxy,
        delivered: DeliveredSize,
    )
}

data class CameraRequest(
    val width: Int,
    val height: Int,
    val lensFacing: Int = CameraSelector.LENS_FACING_BACK,
    /** Pinned onto `CONTROL_AE_TARGET_FPS_RANGE` — see `TrackerCamera.pinFrameRate`. */
    val targetFps: Int,
) {
    fun downshifted(): CameraRequest = copy(width = DOWNSHIFT_WIDTH, height = DOWNSHIFT_HEIGHT)
}

/** Stated, or CameraX hands a 4:3 frame to a 16:9 request. [AspectRatioStrategy.RATIO_16_9] is derived, so a
 *  future 4:3 mode does not inherit it. */
internal fun aspectRatioFor(request: CameraRequest): Int =
    if (request.width * HEIGHT_4_3 == request.height * WIDTH_4_3) AspectRatio.RATIO_4_3 else AspectRatio.RATIO_16_9

/** Changes what is ASKED for only; the `ImageProxy`'s [DeliveredSize] stays the truth. AUTO is 1080p, the mode
 *  the 15 fps analyzer budget was measured at — an unnamed default is not a measured one. */
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
