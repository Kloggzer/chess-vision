package com.chesslab.tracker.camera

/** Camera-device status. Down is a STATUS, not a freeze — 06c maps it into `TrackerStatus.note`. */
sealed interface CameraHealth {
    data object Up : CameraHealth

    /**
     * Released because the user said so. Distinct from [Down] on purpose: [Down] promises a retry
     * and this one must never advertise one — nothing but an explicit resume brings the camera back.
     */
    data object Off : CameraHealth

    data class Down(
        val reason: String,
        val retryInS: Int,
    ) : CameraHealth
}
