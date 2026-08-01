package com.chesslab.tracker.service

import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.camera.ManualOpticsPort
import com.chesslab.tracker.camera.OpticsSettling
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
 * Re-measuring the optics, behind an interface for the same reason [CameraSwitch] is one: the
 * screen can see that the focus settled wrong, but only the single camera owner may act on it.
 *
 * Deliberately a request the user makes, never a rule the app applies. The automatic convergence is
 * exactly what sometimes settles on the wrong moment, and a second automatic run would only settle
 * wrong twice.
 */
interface OpticsControl {
    /**
     * Release focus, exposure and white balance, wait for a fresh convergence, freeze again — see
     * `OpticsLock.remeasure` for the deadline and for what a timeout leaves behind.
     *
     * The ACTION as a value, in the shape `CalibrationHost` takes it: the calibration screen holds
     * it across a sequence of its own and must not hold the service to do so.
     */
    val remeasureOptics: suspend () -> OpticsSettling

    /**
     * Manual ISO / white balance, for a room the automatic keeps getting wrong.
     *
     * The same shape as [remeasureOptics] — a handle the calibration screen holds across a sequence
     * of its own, so it never holds the service to do so.
     */
    val manualOptics: ManualOpticsPort
}

/**
 * The camera's own lamp, for a board that is simply too dark.
 *
 * Switching it is not just a lamp: the optics are LOCKED (`OpticsLock`), so a torch coming on under
 * a frozen exposure blows the image out, and the reference the frame-diff compares against was taken
 * under the old light and is worthless the moment the lamp changes. So the act is a SEQUENCE —
 * torch, re-measure the optics, take a fresh baseline — and it lives behind this interface for the
 * same reason [CameraSwitch] does: only the single camera owner may run it.
 */
interface TorchControl {
    val torchOn: StateFlow<Boolean>

    /** False on a device with no flash unit; the UI hides the control rather than lying about it. */
    val hasTorch: Boolean

    /** Torch, then re-measure the optics, then a new baseline. Returns immediately; runs async. */
    fun setTorchOn(on: Boolean)
}

/**
 * The lamp as ONE act: torch, re-measure the optics, take a fresh baseline.
 *
 * A class rather than three lines in the service, because the ORDER is the whole content. The
 * optics are frozen (`OpticsLock`), so a lamp coming on under a locked exposure blows the image out
 * — the same re-converge-and-refreeze the calibration screen runs is what makes the new light
 * usable. And the reference the frame-diff compares against was taken under the OLD light, so every
 * square would read as changed and the very next frame is `too_many_changed`. The baseline is not a
 * courtesy here; it is what keeps the tracker alive across the switch.
 *
 * Both directions. Turning the lamp OFF invalidates the reference just as completely.
 */
class TorchSwitch(
    private val lamp: TorchLampPort,
    private val scope: CoroutineScope,
    private val remeasure: suspend () -> OpticsSettling,
    private val baseline: () -> Unit,
) : TorchControl {
    override val torchOn: StateFlow<Boolean> get() = lamp.torchOn

    override val hasTorch: Boolean get() = lamp.hasTorch

    override fun setTorchOn(on: Boolean) {
        if (!lamp.setTorch(on)) return
        scope.launch {
            remeasure()
            baseline()
        }
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
     * 06a's accepted corners, handed to the single camera owner.
     *
     * `relockOptics` is stated at every call site rather than defaulted: "did this quad get measured
     * before or after the optics settled" is the one thing the two callers disagree on.
     */
    fun applyCalibration(
        geometry: BoardGeometry,
        corners: FloatArray,
        profileName: String,
        relockOptics: Boolean,
    )
}

interface TrackerControls :
    TrackerRestart,
    CameraSwitch,
    OpticsControl,
    CalibrationApply
