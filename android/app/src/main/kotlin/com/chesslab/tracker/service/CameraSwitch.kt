package com.chesslab.tracker.service

import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.camera.CameraLookPort
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * The camera's off switch, behind an interface for the same reason [TrackerRestart] is one: the UI
 * may ask, but only the service — the single camera owner — may act.
 *
 * "Off" here means the CameraX use case is unbound and the device is released, which is what makes
 * the platform's green camera indicator go out. It is not a paused analyzer: a tracker that has
 * merely stopped looking at frames is still holding the camera, and the user cannot tell the
 * difference from the status bar.
 *
 * Stopping keeps the service, the engine and the game alive. Ending the service outright is a
 * different act with a different trigger — the notification's Stop action, or swiping the app out
 * of recents.
 */
interface CameraSwitch {
    /** True while the analysis use case is bound and frames are arriving. */
    val cameraOn: StateFlow<Boolean>

    fun setCameraOn(on: Boolean)
}

/**
 * Steering the optics, behind an interface for the same reason [CameraSwitch] is one: the screen
 * may ask, but only the single camera owner may act.
 *
 * There is no re-measure here any more. The automatic converge-and-freeze was removed on
 * 2026-08-02 (see `OpticsLock`) and with it the button that existed to redo it — a stated focus,
 * exposure or illuminant needs no convergence, so there is nothing to wait for and nothing to
 * report.
 */
interface OpticsControl {
    /**
     * Focus, brightness and illuminant, for a room the automatic keeps getting wrong.
     *
     * A handle a screen holds across a sequence of its own, so it never holds the service to do so.
     */
    val cameraLook: CameraLookPort
}

/**
 * The camera's own lamp, for a board that is simply too dark.
 *
 * Switching it is not just a lamp: the reference the frame-diff compares against was taken under
 * the old light and is worthless the moment the lamp changes. So the act is a SEQUENCE — torch,
 * then a fresh baseline — and it lives behind this interface for the same reason [CameraSwitch]
 * does: only the single camera owner may run it.
 */
interface TorchControl {
    val torchOn: StateFlow<Boolean>

    /** False on a device with no flash unit; the UI hides the control rather than lying about it. */
    val hasTorch: Boolean

    /** Torch, then a new baseline. Returns immediately; the baseline runs async. */
    fun setTorchOn(on: Boolean)
}

/**
 * The lamp as ONE act: torch, then a fresh baseline.
 *
 * A class rather than two lines in the service, because the ORDER is the whole content. The
 * reference the frame-diff compares against was taken under the OLD light, so the moment the lamp
 * changes every square reads as changed and the very next frame is `too_many_changed`. The baseline
 * is not a courtesy here; it is what keeps the tracker alive across the switch.
 *
 * Both directions. Turning the lamp OFF invalidates the reference just as completely.
 *
 * There used to be an optics re-measure between the two, because the exposure was frozen and a lamp
 * coming on under a frozen exposure blows the image out. Nothing is frozen any more (`OpticsLock`),
 * so the device's own auto-exposure answers the new light — unless the user pinned EV on the camera
 * screen, in which case the pin is the answer and re-measuring would have undone it.
 */
class TorchSwitch(
    private val lamp: TorchLampPort,
    private val scope: CoroutineScope,
    private val baseline: () -> Unit,
) : TorchControl {
    override val torchOn: StateFlow<Boolean> get() = lamp.torchOn

    override val hasTorch: Boolean get() = lamp.hasTorch

    override fun setTorchOn(on: Boolean) {
        if (!lamp.setTorch(on)) return
        scope.launch { baseline() }
    }
}

/** The slice of the camera [TorchSwitch] needs — so it can be driven by a fake in a test. */
interface TorchLampPort {
    val torchOn: StateFlow<Boolean>
    val hasTorch: Boolean

    fun setTorch(on: Boolean): Boolean
}

/**
 * What the UI may ask the SERVICE — as opposed to the engine, which is only ever reached through an
 * `EngineAction`. Every member is the same shape of request: the caller asks, the single owner acts.
 */
interface CalibrationApply {
    /**
     * The accepted corners, handed to the single camera owner.
     *
     * There used to be a `relockOptics` flag here, because the two callers disagreed about whether
     * their quad had been measured before or after the optics converged. With the automatic
     * convergence gone (`OpticsLock`) there is nothing to re-arm and the question does not arise.
     */
    fun applyCalibration(
        geometry: BoardGeometry,
        corners: FloatArray,
        profileName: String,
    )
}

interface TrackerControls :
    TrackerRestart,
    CameraSwitch,
    OpticsControl,
    CalibrationApply
