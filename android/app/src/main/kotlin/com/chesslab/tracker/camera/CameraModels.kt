package com.chesslab.tracker.camera

import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageProxy

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

private const val DEFAULT_TARGET_FPS = 30
private const val DOWNSHIFT_WIDTH = 1280
private const val DOWNSHIFT_HEIGHT = 720
