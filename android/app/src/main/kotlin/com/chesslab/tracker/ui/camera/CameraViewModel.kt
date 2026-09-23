package com.chesslab.tracker.ui.camera

import com.chesslab.tracker.camera.CameraAbilities
import com.chesslab.tracker.camera.CameraLook
import com.chesslab.tracker.camera.CameraLookPort
import com.chesslab.tracker.settings.SettingsRepository
import com.chesslab.tracker.settings.cameraLook
import com.chesslab.tracker.settings.withCameraLook
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map

/** Two truths, one keeper each: [live] is the CAMERA (the port), [saved] the DISK. A setting must be applied
 *  to be judged, so [set] is immediate and unsaved; [save] survives a restart, [revert] backs out. */
class CameraViewModel(
    private val optics: CameraLookPort,
    private val settings: SettingsRepository,
) {
    val live: StateFlow<CameraLook> get() = optics.look

    val abilities: StateFlow<CameraAbilities?> get() = optics.abilities

    /** A plain `map`, not `stateIn(scope)`: an eager flow is a live coroutine, and a test owning the scope never completes. */
    val saved: Flow<CameraLook> = settings.appSettings.map { it.cameraLook() }

    private val savedNow: CameraLook get() = settings.appSettings.value.cameraLook()

    fun set(look: CameraLook) = optics.setLook(look)

    fun save() = settings.updateApp(settings.appSettings.value.withCameraLook(optics.look.value))

    fun revert() = optics.setLook(savedNow)

    /** Saved too: a "back to auto" that a restart undoes would be a lie. */
    fun backToAuto() {
        optics.setLook(CameraLook())
        save()
    }
}
