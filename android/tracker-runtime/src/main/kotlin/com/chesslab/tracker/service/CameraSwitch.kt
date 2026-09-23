package com.chesslab.tracker.service

import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.camera.CameraLookPort
import com.chesslab.tracker.camera.FocusTuner
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/** Off means the CameraX use case is unbound and the device released, so the green indicator goes out; a paused
 *  analyzer still holds the camera. The service, engine and game stay alive. */
interface CameraSwitch {
    val cameraOn: StateFlow<Boolean>

    fun setCameraOn(on: Boolean)
}

/** Only the single camera owner may act. No re-measure: a stated focus, exposure or illuminant needs no convergence. */
interface OpticsControl {
    /** A handle a screen holds across its own sequence, so it never holds the service to do so. */
    val cameraLook: CameraLookPort

    /** Ausgeloest, nie von selbst. Hier, nicht in [cameraLook]: er misst mit dem Analysestrom des Kamerabesitzers. */
    val focusTuner: FocusTuner
}

/** The frame-diff reference was taken under the old light, so the act is a SEQUENCE — torch, then a fresh baseline. */
interface TorchControl {
    val torchOn: StateFlow<Boolean>

    /** False without a flash unit; the UI hides the control rather than lying about it. */
    val hasTorch: Boolean

    /** Returns immediately; the baseline runs async. */
    fun setTorchOn(on: Boolean)
}

/** The ORDER is the whole content: after a lamp change every square reads changed, and the next frame is
 *  `too_many_changed`. Both directions. Auto-exposure answers the new light — unless the user pinned EV. */
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

interface TorchLampPort {
    val torchOn: StateFlow<Boolean>
    val hasTorch: Boolean

    fun setTorch(on: Boolean): Boolean
}

/** What the UI may ask the SERVICE, as opposed to the engine (reached only through an `EngineAction`). */
interface CalibrationApply {
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
