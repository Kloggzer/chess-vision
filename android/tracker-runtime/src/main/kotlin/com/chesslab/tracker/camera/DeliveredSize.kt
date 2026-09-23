package com.chesslab.tracker.camera

/** Never from the request: the app asked for 1280x720, got 4:3 1280x960, and passing the request on drifted
 *  the warp ~2.3 ranks (`a7dab73`). Here, not with CameraX: a video file delivers a size too. */
data class DeliveredSize(
    val width: Int,
    val height: Int,
    val rotationDegrees: Int,
)
