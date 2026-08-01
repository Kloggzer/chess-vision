package com.chesslab.tracker.ui.tracking

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chesslab.engine.api.TrackerEvent
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
    private var session: TrackerSession = NoTrackerSession
    private val jobs = mutableListOf<Job>()

    private val statusState = MutableStateFlow(idleTrackerStatus())

    private val uiState = MutableStateFlow(trackingUiState(idleTrackerStatus()))
    val ui: StateFlow<TrackingUiState> = uiState.asStateFlow()

    private val movesState = MutableStateFlow<List<MoveEntry>>(emptyList())
    val moves: StateFlow<List<MoveEntry>> = movesState.asStateFlow()

    private val promotionState = MutableStateFlow<PromotionPrompt?>(null)
    val promotion: StateFlow<PromotionPrompt?> = promotionState.asStateFlow()

    private val acceptCnnState = MutableStateFlow<AcceptCnnPreview?>(null)
    val acceptCnn: StateFlow<AcceptCnnPreview?> = acceptCnnState.asStateFlow()

    private val previewState = MutableStateFlow<Bitmap?>(null)
    val preview: StateFlow<Bitmap?> = previewState.asStateFlow()

    private val cameraOnState = MutableStateFlow(true)

    /** The service's answer, never a local guess: the UI asks for a change and waits for the flow. */
    val cameraOn: StateFlow<Boolean> = cameraOnState.asStateFlow()

    private val recalibrate = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    /** Recalibration is NAVIGATION, not a tracker action — it must never share a handler with Reset game. */
    val recalibrateRequests: SharedFlow<Unit> = recalibrate.asSharedFlow()

    /** The last committed ply's UCI — a two-square highlight hint, never a board source. */
    val lastMoveUci: String? get() = movesState.value.lastOrNull()?.uci

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
                    // Before the service's first sample there is no truth to render — the start
                    // position stands in, and it is still the ONE source the board draws from.
                    statusState.value = published ?: idleTrackerStatus()
                    render()
                }
            }
        jobs += session.events.onEach(::onEvent).launchIn(viewModelScope)
        jobs += session.boardPreview.onEach { previewState.value = it }.launchIn(viewModelScope)
        jobs +=
            session.cameraOn
                .onEach {
                    cameraOnState.value = it
                    render()
                }.launchIn(viewModelScope)
    }

    /** Two inputs, one header: the engine's status and whether a camera is feeding it at all. */
    private fun render() {
        uiState.value = trackingUiState(statusState.value, cameraOnState.value)
    }

    private fun onEvent(event: TrackerEvent) {
        val committed = movesOf(event)
        if (committed.isNotEmpty()) movesState.value = movesState.value + committed
        promotionState.value = promotionAfter(promotionState.value, event)
    }

    fun onUndo() = session.undo()

    fun onResetGame() {
        movesState.value = emptyList()
        session.resetGame()
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
