package com.chesslab.tracker.service

import com.chesslab.tracker.camera.OpticsSettling
import kotlinx.coroutines.flow.StateFlow

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
}

/**
 * What the UI may ask the SERVICE — as opposed to the engine, which is only ever reached through an
 * `EngineAction`. Every member is the same shape of request: the caller asks, the single owner acts.
 */
interface TrackerControls :
    TrackerRestart,
    CameraSwitch,
    OpticsControl
