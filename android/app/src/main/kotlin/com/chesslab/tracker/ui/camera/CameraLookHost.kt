package com.chesslab.tracker.ui.camera

import com.chesslab.tracker.camera.CameraLookPort
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Where the camera screen picks the optics up, the same shape as `SettingsHost` and
 * `TrackerSessionHost`.
 *
 * Its own host rather than a field on `CalibrationHost`, because the two screens are now two
 * concerns: `CalibrationHost` is the board GEOMETRY seam, and a camera setting has no business
 * travelling through it. Null while no service is bound — the screen says so rather than rendering
 * dead controls.
 */
object CameraLookHost {
    private val current = MutableStateFlow<CameraLookPort?>(null)

    val port: StateFlow<CameraLookPort?> = current

    fun publish(port: CameraLookPort?) {
        current.value = port
    }
}
