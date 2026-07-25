package com.chesslab.tracker.camera

import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageProxy
import com.chesslab.tracker.settings.ResolutionMode

/**
 * The size the camera REALLY delivers, built only from the [ImageProxy].
 *
 * Never from the request: commit `a7dab73` — the app asked for 1280x720, the device delivered
 * 4:3 1280x960, the requested numbers were passed on as truth, and corners were rescaled with
 * sy = 720/960 while x stayed untouched. Live-align then EMA-mixed corners across two coordinate
 * spaces and the warp drifted ~2.3 ranks. The request is a wish; the ImageProxy is the fact.
 */
data class DeliveredSize(
    val width: Int,
    val height: Int,
    val rotationDegrees: Int,
) {
    companion object {
        fun of(image: ImageProxy): DeliveredSize = DeliveredSize(image.width, image.height, image.imageInfo.rotationDegrees)
    }
}

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

/** Camera-device status. Down is a STATUS, not a freeze — 06c maps it into `TrackerStatus.note`. */
sealed interface CameraHealth {
    data object Up : CameraHealth

    data class Down(
        val reason: String,
        val retryInS: Int,
    ) : CameraHealth
}

/** What we ask the device for. A wish — see [DeliveredSize]. */
data class CameraRequest(
    val width: Int,
    val height: Int,
    val lensFacing: Int = CameraSelector.LENS_FACING_BACK,
    val targetFps: Int = DEFAULT_TARGET_FPS,
) {
    /** The one lower mode a repeatedly failing high-bandwidth binding retries at. */
    fun downshifted(): CameraRequest = copy(width = DOWNSHIFT_WIDTH, height = DOWNSHIFT_HEIGHT)
}

/**
 * 07a's [ResolutionMode] as a request.
 *
 * This changes what is ASKED for and nothing else: the delivered [DeliveredSize] read off the
 * `ImageProxy` remains the single source of truth for calibration, live-align and the size guard
 * (commit `a7dab73`). AUTO is 1080p rather than "whatever CameraX picks", because 1080p is the
 * mode the 15 fps analyzer budget was measured at — an unnamed default is not a measured one.
 */
fun cameraRequestFor(mode: ResolutionMode): CameraRequest =
    when (mode) {
        ResolutionMode.AUTO, ResolutionMode.R1080 -> CameraRequest(WIDTH_1080, HEIGHT_1080)
        ResolutionMode.R1440 -> CameraRequest(WIDTH_1440, HEIGHT_1440)
        ResolutionMode.R2160 -> CameraRequest(WIDTH_2160, HEIGHT_2160)
    }

private const val DEFAULT_TARGET_FPS = 30
private const val DOWNSHIFT_WIDTH = 1280
private const val DOWNSHIFT_HEIGHT = 720
private const val WIDTH_1080 = 1920
private const val HEIGHT_1080 = 1080
private const val WIDTH_1440 = 2560
private const val HEIGHT_1440 = 1440
private const val WIDTH_2160 = 3840
private const val HEIGHT_2160 = 2160
