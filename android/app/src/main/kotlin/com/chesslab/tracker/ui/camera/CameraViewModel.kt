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

/**
 * The camera screen's state, in the shape `CalibrationViewModel` already has: a plain class, given
 * its collaborators, holding no Compose type and no camera type of its own.
 *
 * **It owns nothing that is already owned elsewhere.** There are exactly two truths and each has one
 * keeper: [live] is what the CAMERA is set to (the port), [saved] is what is on DISK (the settings
 * repository). Everything the screen renders is derived from those two. The version this replaces
 * kept `iso`/`kelvin` in a composable's `remember`, which is a third copy that outlives neither
 * navigation nor a rebind and can disagree with both of the real ones without any way to notice.
 *
 * The two are deliberately not the same act. A picture setting has to be applied to be judged — you
 * do not choose an illuminant from a list, you choose it by watching the viewfinder — so [set] is
 * immediate and unsaved. [save] is what survives a restart, and [revert] is the way back out of an
 * experiment that did not work.
 */
class CameraViewModel(
    private val optics: CameraLookPort,
    private val settings: SettingsRepository,
) {
    /** What the camera is set to right now. */
    val live: StateFlow<CameraLook> get() = optics.look

    /** What this device offers — the screen shows a control only for what is in here. */
    val abilities: StateFlow<CameraAbilities?> get() = optics.abilities

    /**
     * What is on disk — what the app comes back to after a restart.
     *
     * A plain `map` and not `stateIn(scope)`: an eagerly started flow would be a live coroutine in
     * whatever scope this is built with, and a test that owns that scope then never completes
     * (the note on `SettingsRepository.debugEnabled` records where that was learned).
     */
    val saved: Flow<CameraLook> = settings.appSettings.map { it.cameraLook() }

    private val savedNow: CameraLook get() = settings.appSettings.value.cameraLook()

    /** Apply now, save nothing. The viewfinder is the only way to judge any of these. */
    fun set(look: CameraLook) = optics.setLook(look)

    /** Keep it. The only thing that outlives the process. */
    fun save() = settings.updateApp(settings.appSettings.value.withCameraLook(optics.look.value))

    /** Back to what was saved — the way out of an experiment that did not work. */
    fun revert() = optics.setLook(savedNow)

    /**
     * Everything back to the device's automatic, applied AND saved.
     *
     * Saved too, deliberately: a "back to auto" that a restart undoes would be the same class of
     * lie as a control that renders its own tap.
     */
    fun backToAuto() {
        optics.setLook(CameraLook())
        save()
    }
}
