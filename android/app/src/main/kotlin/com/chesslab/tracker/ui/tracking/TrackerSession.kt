package com.chesslab.tracker.ui.tracking

import android.graphics.Bitmap
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.camera.FocusTuner
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.emptyFlow

/** The UI never touches `TrackerEngine`, which one thread drives: every action is a *request* the service
 *  marshals onto the analyzer thread. The status is already sampled at ~10 Hz — do not throttle again. */
interface TrackerSession {
    val status: StateFlow<TrackerStatus?>
    val events: Flow<TrackerEvent>
    val rawPreview: StateFlow<Bitmap?>

    val previewRotation: StateFlow<Int>

    /** Upright whatever the sensor's orientation: the warp puts a8 top-left by construction. */
    val boardPreview: StateFlow<Bitmap?>

    /** Not derived from the status: a released camera stops the status, and a frozen "waiting · 14.8 fps" lies. */
    val cameraOn: StateFlow<Boolean>

    fun setCameraOn(on: Boolean)

    val torchOn: StateFlow<Boolean>

    val hasTorch: Boolean

    /** NOT just a lamp: the service takes a fresh baseline, or every square reads as changed under the new light. */
    fun setTorchOn(on: Boolean)

    /** Ueber die Sitzung, nicht `CameraLookHost`: der Sweep braucht den Analysestrom, den nur der Kamerabesitzer hat. */
    val focus: FocusTuner

    fun undo()

    fun captureBaseline()

    fun choosePromotion(piece: Char)

    fun acceptCnnPosition()
}

/** Published by the service; `null` means "not bound yet" and the screen shows the idle status. */
object TrackerSessionHost {
    private val current = MutableStateFlow<TrackerSession?>(null)

    val session: StateFlow<TrackerSession?> = current

    fun publish(session: TrackerSession?) {
        current.value = session
    }
}

fun idleTrackerStatus(fen: String = STARTPOS): TrackerStatus =
    TrackerStatus(
        state = STATE_WAITING,
        fen = fen,
        z = emptyMap(),
        diffs = emptyMap(),
        census = emptyMap(),
        changed = emptySet(),
        shadowVetoed = emptySet(),
        occlusionVetoed = emptySet(),
        bestLl = 0.0,
        secondLl = 0.0,
        bestUci = null,
        stuckReason = null,
        alarm = null,
        confirmerKey = null,
        confirmerCount = 0,
        verifyState = null,
        pendingUci = null,
        pendingFrames = 0,
        stageTimingsMs = emptyMap(),
        fps = 0.0,
        note = null,
    )

object NoTrackerSession : TrackerSession {
    override val status: StateFlow<TrackerStatus?> = MutableStateFlow(null)
    override val events: Flow<TrackerEvent> = emptyFlow()
    override val rawPreview: StateFlow<Bitmap?> = MutableStateFlow(null)
    override val previewRotation: StateFlow<Int> = MutableStateFlow(0)
    override val boardPreview: StateFlow<Bitmap?> = MutableStateFlow(null)

    /** Unbound: the screen must not offer to stop a camera. */
    override val cameraOn: StateFlow<Boolean> = MutableStateFlow(true)

    override fun setCameraOn(on: Boolean) = Unit

    override val torchOn: StateFlow<Boolean> = MutableStateFlow(false)

    override val hasTorch: Boolean = false

    override fun setTorchOn(on: Boolean) = Unit

    override val focus: FocusTuner = FocusTuner.NONE

    override fun undo() = Unit

    override fun captureBaseline() = Unit

    override fun choosePromotion(piece: Char) = Unit

    override fun acceptCnnPosition() = Unit
}
