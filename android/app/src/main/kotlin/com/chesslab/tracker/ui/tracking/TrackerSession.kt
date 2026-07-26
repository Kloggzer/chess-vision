package com.chesslab.tracker.ui.tracking

import android.graphics.Bitmap
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.emptyFlow

/**
 * Everything the tracking UI is allowed to see of the running tracker: a *sampled* status
 * snapshot, an event stream, the preview bitmap, and five actions.
 *
 * The UI never touches `TrackerEngine` — it is a pure state machine driven by exactly one thread
 * (entry.md hard rule 2), and a composable reading its fields, or a callback mutating them off that
 * thread, reintroduces the whole race class Python's `self.lock` guards. Every action below is a
 * *request*: the service marshals it onto the analyzer thread and the result comes back as a new
 * status or event, never as a return value.
 *
 * The status flow is already sampled at ~10 Hz by the service (06c). Do not throttle it again here.
 */
interface TrackerSession {
    /** `null` until the service has produced its first sample (06c's `StatusPublisher.status`). */
    val status: StateFlow<TrackerStatus?>
    val events: Flow<TrackerEvent>
    val rawPreview: StateFlow<Bitmap?>

    /**
     * Whether the camera is bound. Not derived from the status: when the camera is released the
     * status simply stops arriving, and a frozen last frame's "waiting · 14.8 fps" is precisely the
     * lie the user must not be told.
     */
    val cameraOn: StateFlow<Boolean>

    /** Releases the camera device (or takes it back); the game and the engine survive either way. */
    fun setCameraOn(on: Boolean)

    fun undo()

    fun resetGame()

    fun captureBaseline()

    fun choosePromotion(piece: Char)

    fun acceptCnnPosition()
}

/**
 * Where the UI picks the session up.
 *
 * 06b cannot name 06c's binder type (the two phases run in parallel), and the UI must render
 * something before the service is bound anyway. The service publishes its binder-backed session
 * here; `null` means "not bound yet" and the screen shows the idle status below.
 */
object TrackerSessionHost {
    private val current = MutableStateFlow<TrackerSession?>(null)

    val session: StateFlow<TrackerSession?> = current

    fun publish(session: TrackerSession?) {
        current.value = session
    }
}

/** The status shown before the service is bound: a start position, no evidence, no alarm. */
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

/** The unbound session: renders, dispatches nothing. */
object NoTrackerSession : TrackerSession {
    override val status: StateFlow<TrackerStatus?> = MutableStateFlow(null)
    override val events: Flow<TrackerEvent> = emptyFlow()
    override val rawPreview: StateFlow<Bitmap?> = MutableStateFlow(null)

    /** Unbound: there is no camera to be on, and the screen must not offer to stop one. */
    override val cameraOn: StateFlow<Boolean> = MutableStateFlow(true)

    override fun setCameraOn(on: Boolean) = Unit

    override fun undo() = Unit

    override fun resetGame() = Unit

    override fun captureBaseline() = Unit

    override fun choosePromotion(piece: Char) = Unit

    override fun acceptCnnPosition() = Unit
}
