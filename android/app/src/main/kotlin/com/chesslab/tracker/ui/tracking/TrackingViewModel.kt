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

/** No engine reference and no second copy of the position. The status is collected **once**, in [attach];
 *  it is already sampled — a second `sample()` only adds latency. */
class TrackingViewModel : ViewModel() {
    private val drawLatency = DrawLatency(androidTrackerLogs("chesslabUi"))

    private var session: TrackerSession = NoTrackerSession
    private val jobs = mutableListOf<Job>()

    private val statusState = MutableStateFlow(idleTrackerStatus())

    private val uiState = MutableStateFlow(trackingUiState(idleTrackerStatus()))
    val ui: StateFlow<TrackingUiState> = uiState.asStateFlow()

    private val lastCommitState = MutableStateFlow<List<String>>(emptyList())

    /** Not always one ply: a CNN recovery bridges several and the engine unwinds the bridge whole. */
    val lastCommit: StateFlow<List<String>> = lastCommitState.asStateFlow()

    private val promotionState = MutableStateFlow<PromotionPrompt?>(null)
    val promotion: StateFlow<PromotionPrompt?> = promotionState.asStateFlow()

    private val acceptCnnState = MutableStateFlow<AcceptCnnPreview?>(null)
    val acceptCnn: StateFlow<AcceptCnnPreview?> = acceptCnnState.asStateFlow()

    private val previewState = MutableStateFlow<Bitmap?>(null)
    val preview: StateFlow<Bitmap?> = previewState.asStateFlow()

    private val rawPreviewState = MutableStateFlow<Bitmap?>(null)

    /** [preview] is the rectified board, empty before calibration — exactly when the user needs to see.
     *  Collected through a job: delegating to `session.rawPreview` would keep the old session's flow. */
    val rawPreview: StateFlow<Bitmap?> = rawPreviewState.asStateFlow()

    private val rotationState = MutableStateFlow(0)

    val previewRotation: StateFlow<Int> = rotationState.asStateFlow()

    private val cameraOnState = MutableStateFlow(true)

    /** The service's answer, never a local guess. */
    val cameraOn: StateFlow<Boolean> = cameraOnState.asStateFlow()

    /** NOT the same as holding a session: between the tap and the first callback tracking is on, unbound. */
    var tracking: Boolean = true
        set(value) {
            field = value
            render()
        }

    private val recalibrate = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    /** NAVIGATION, not a tracker action — never sharing a handler with Reset game. */
    val recalibrateRequests: SharedFlow<Unit> = recalibrate.asSharedFlow()

    /** Re-attaching to the SAME session is a no-op, so a recomposition cannot start a second collector. */
    fun attach(session: TrackerSession) {
        if (this.session === session) return
        jobs.forEach { it.cancel() }
        jobs.clear()
        this.session = session
        jobs +=
            viewModelScope.launch {
                session.status.collect { published ->
                    // No sample yet or none left: the board's LAST position stands in, not the start position.
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

    private fun render() {
        uiState.value = trackingUiState(statusState.value, cameraOnState.value, tracking)
    }

    /** Not built here: the service's live game is the one the review and spectator read; a private list missed undos. */
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

    /** Nothing optimistic: the flag flips when the service says the device is gone. */
    fun onToggleCamera() = session.setCameraOn(!cameraOnState.value)

    /** The lamp may fail to engage and must not be faked. */
    val torchOn: StateFlow<Boolean> get() = session.torchOn

    val hasTorch: Boolean get() = session.hasTorch

    fun onToggleTorch() = session.setTorchOn(!session.torchOn.value)

    fun onRecalibrate() {
        recalibrate.tryEmit(Unit)
    }

    /** Mutates nothing. With the debug payload armed the dialog shows real reads; without, only the believed side. */
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

    /** Closes only when the commit comes back as an event, not optimistically. */
    fun onPromotionChosen(piece: Char) = session.choosePromotion(piece)

    override fun onCleared() {
        jobs.forEach { it.cancel() }
        jobs.clear()
    }
}

/** The status is SAMPLED while the commit arrives as an event: two clocks, and this gap is the last leg of
 *  "move played -> move seen", measurable only on a device. One `chesslabUi` line per commit. */
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
