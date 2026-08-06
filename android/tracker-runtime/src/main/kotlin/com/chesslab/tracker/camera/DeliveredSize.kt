package com.chesslab.tracker.camera

/**
 * The size the camera REALLY delivers.
 *
 * Never from the request: commit `a7dab73` — the app asked for 1280x720, the device delivered
 * 4:3 1280x960, the requested numbers were passed on as truth, and corners were rescaled with
 * sy = 720/960 while x stayed untouched. Live-align then EMA-mixed corners across two coordinate
 * spaces and the warp drifted ~2.3 ranks. The request is a wish; the frame is the fact.
 *
 * A plain value, and it lives here rather than with CameraX because a video file delivers a size
 * too — and the rule it encodes ("read what arrived") is not the phone's rule, it is the tracker's.
 */
data class DeliveredSize(
    val width: Int,
    val height: Int,
    val rotationDegrees: Int,
)
