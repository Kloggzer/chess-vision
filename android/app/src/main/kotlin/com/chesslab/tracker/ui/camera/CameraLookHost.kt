package com.chesslab.tracker.ui.camera

import com.chesslab.tracker.camera.CameraLookPort
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Its own host, not a field on `CalibrationHost` (the GEOMETRY seam). Null while no service is bound. */
object CameraLookHost {
    private val current = MutableStateFlow<CameraLookPort?>(null)

    val port: StateFlow<CameraLookPort?> = current

    fun publish(port: CameraLookPort?) {
        current.value = port
    }
}
