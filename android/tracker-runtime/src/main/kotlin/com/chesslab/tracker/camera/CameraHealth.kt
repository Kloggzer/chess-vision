package com.chesslab.tracker.camera

/** Down is a STATUS, not a freeze. */
sealed interface CameraHealth {
    data object Up : CameraHealth

    /** Distinct from [Down]: [Down] promises a retry, this must never advertise one. */
    data object Off : CameraHealth

    data class Down(
        val reason: String,
        val retryInS: Int,
    ) : CameraHealth
}
