package com.chesslab.tracker.ui.tracking

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.log.TrackerLog
import com.chesslab.tracker.log.androidTrackerLogs
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

/**
 * Collects the tracker's sampled status and its event stream, and dispatches user actions back
 * through the session seam. It holds no engine reference and no second copy of the position.
 *
 * The status flow is collected **once**, in [attach]. It is already sampled at ~10 Hz by the
 * service; a second `sample()` here would only add latency to a screen whose whole job is to be
 * current.
 */
class TrackingViewModel : ViewModel() {
    private val drawLatency = DrawLatency(androidTrackerLogs("chesslabUi"))

    private var session: TrackerSession = NoTrackerSession
    private val jobs = mutableListOf<Job>()

    private val statusState = MutableStateFlow(idleTrackerStatus())

    private val uiState = MutableStateFlow(trackingUiState(idleTrackerStatus()))
    val ui: StateFlow<TrackingUiState> = uiState.asStateFlow()

    private val lastCommitState = MutableStateFlow<List<String>>(emptyList())

    /**
     * The SANs of the last COMMIT — what one press of Undo takes back, which is not always one ply:
     * a CNN recovery bridges several at once and the engine unwinds the bridge whole.
     *
     * Cleared on undo and on reset, mirroring the engine's own record: it is of the last commit
     * only, so a second press is an ordinary single-move undo.
     */
    val lastCommit: StateFlow<List<String>> = lastCommitState.asStateFlow()

    private val promotionState = MutableStateFlow<PromotionPrompt?>(null)
    val promotion: StateFlow<PromotionPrompt?> = promotionState.asStateFlow()

    private val acceptCnnState = MutableStateFlow<AcceptCnnPreview?>(null)
    val acceptCnn: StateFlow<AcceptCnnPreview?> = acceptCnnState.asStateFlow()

    private val previewState = MutableStateFlow<Bitmap?>(null)
    val preview: StateFlow<Bitmap?> = previewState.asStateFlow()

    private val rawPreviewState = MutableStateFlow<Bitmap?>(null)

    /**
     * The RAW camera frame, for the not-ready layout (specs/49).
     *
     * [preview] is the rectified board, which by construction does not exist before there is a
     * calibration — so the one state where the user most needs to see what the phone sees is exactly
     * the state that flow is empty in. Collected through a job like the others rather than delegated
     * to `session.rawPreview`, or a re-attach would leave the screen reading the old session's flow.
     */
    val rawPreview: StateFlow<Bitmap?> = rawPreviewState.asStateFlow()

    private val rotationState = MutableStateFlow(0)

    /** Display-only turn for [rawPreview]; the warp and every stored quad live in sensor space. */
    val previewRotation: StateFlow<Int> = rotationState.asStateFlow()

    private val cameraOnState = MutableStateFlow(true)

    /** The service's answer, never a local guess: the UI asks for a change and waits for the flow. */
    val cameraOn: StateFlow<Boolean> = cameraOnState.asStateFlow()

    /**
     * The run switch (`TrackerRun`), which is NOT the same as holding a session: between the tap and
     * the service's first callback tracking is on and nothing is bound, and a header that read "not
     * tracking" through that window would be describing the wrong thing.
     */
    var tracking: Boolean = true
        set(value) {
            field = value
            render()
        }

    private val recalibrate = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    /** Recalibration is NAVIGATION, not a tracker action — it must never share a handler with Reset game. */
    val recalibrateRequests: SharedFlow<Unit> = recalibrate.asSharedFlow()

    /**
     * Bind to the service's session. Re-attaching to the SAME session is a no-op, so a
     * recomposition or a second bind callback cannot start a second status collector.
     */
    fun attach(session: TrackerSession) {
        if (this.session === session) return
        jobs.forEach { it.cancel() }
        jobs.clear()
        this.session = session
        jobs +=
            viewModelScope.launch {
                session.status.collect { published ->
                    // Before the service's first sample there is no truth to render, and after a
                    // stop there is none left: the position the board LAST had stands in, so a
                    // stopped tracker shows the game that was there rather than snapping to the
                    // start position. It is still the ONE source the board draws from.
                    statusState.value = published ?: idleTrackerStatus(statusState.value.fen)
                    render()
                    published?.fen?.let(drawLatency::drew)
                }
            }
        jobs += session.events.onEach(::onEvent).launchIn(viewModelScope)
        jobs += session.boardPreview.onEach { previewState.value = it }.launchIn(viewModelScope)
        jobs += session.rawPreview.onEach { rawPreviewState.value = it }.launchIn(viewModelScope)
        jobs += session.previewRotation.onEach { rotationState.value = it }.launchIn(viewModelScope)
        jobs +=
            session.cameraOn
                .onEach {
                    cameraOnState.value = it
                    render()
                }.launchIn(viewModelScope)
    }

    /** Three inputs, one header: the engine's status, whether a camera feeds it, whether it exists. */
    private fun render() {
        uiState.value = trackingUiState(statusState.value, cameraOnState.value, tracking)
    }

    /**
     * The score sheet is NOT built here. It is the service's live game (`GameSessionState.game`),
     * which is also what the review screen and the LAN spectator read; a private list here missed undos.
     */
    private fun onEvent(event: TrackerEvent) {
        commitSans(event).takeIf { it.isNotEmpty() }?.let { lastCommitState.value = it }
        promotionState.value = promotionAfter(promotionState.value, event)
        drawLatency.committed(fenAfter(event))
    }

    fun onUndo() {
        lastCommitState.value = emptyList()
        session.undo()
    }

    fun onNewBaseline() = session.captureBaseline()

    /**
     * Release the camera, or take it back. Nothing is assumed optimistically — the flag flips when
     * the service says the device is actually gone.
     */
    fun onToggleCamera() = session.setCameraOn(!cameraOnState.value)

    /** The service's answer, like [cameraOn] — the lamp may fail to engage and must not be faked. */
    val torchOn: StateFlow<Boolean> get() = session.torchOn

    val hasTorch: Boolean get() = session.hasTorch

    /** Switches the lamp AND re-baselines; see `TorchControl` for why those are one act. */
    fun onToggleTorch() = session.setTorchOn(!session.torchOn.value)

    fun onRecalibrate() {
        recalibrate.tryEmit(Unit)
    }

    /**
     * Opening the preview mutates nothing — it is derived from the status snapshot alone.
     *
     * D06b-3 is closed as far as the status can close it: 07b's `DebugPayload` carries the CNN's
     * per-square reads, so whenever the debug payload is armed the dialog shows the real
     * `from → to (conf %)` instead of `→ ?`. Without it the payload is null and the preview falls
     * back to naming only the believed side, which is what it always did.
     */
    fun onAcceptCnnRequested() {
        val status = statusState.value
        val reads =
            status.debug
                ?.cnnReads
                ?.filter { it.label != null }
                ?.associate { it.square to CnnRead(it.label!!, it.conf) }
                .orEmpty()
        acceptCnnState.value = acceptCnnPreview(status.fen, status.alarm?.conflicts.orEmpty(), reads)
    }

    /** `specs/16/04-alarm-ux.md`: Cancel dispatches NOTHING. */
    fun onAcceptCnnCancelled() {
        acceptCnnState.value = null
    }

    fun onAcceptCnnConfirmed() {
        acceptCnnState.value = null
        session.acceptCnnPosition()
    }

    /**
     * The engine is blocked on this answer, so the dialog closes only when the commit comes back as
     * an event — not optimistically here.
     */
    fun onPromotionChosen(piece: Char) = session.choosePromotion(piece)

    override fun onCleared() {
        jobs.forEach { it.cancel() }
        jobs.clear()
    }
}

/**
 * How long after a commit the board actually shows it.
 *
 * The screen renders from `status`, which the service SAMPLES (`STATUS_SAMPLE_MS`), while the commit
 * arrives on the event flow — two clocks, and the gap between them is the last leg of "move played
 * -> move seen" that nothing measured. The replay can see the board up to the commit and no
 * further; this is the rest, and it only exists on a device.
 *
 * One line per commit on `chesslabUi`, cleared as soon as the position is drawn.
 */
private class DrawLatency(
    private val log: TrackerLog,
) {
    private var awaited: Pair<String, Long>? = null

    fun committed(fen: String?) {
        awaited = fen?.let { it to System.currentTimeMillis() }
    }

    fun drew(fen: String) {
        val (wanted, since) = awaited ?: return
        if (fen != wanted) return
        awaited = null
        log.info("board drew the commit after ${System.currentTimeMillis() - since} ms")
    }
}
