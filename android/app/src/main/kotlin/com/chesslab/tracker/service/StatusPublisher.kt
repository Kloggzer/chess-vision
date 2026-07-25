package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.pipeline.SizeMismatch
import com.chesslab.tracker.pipeline.StageTimings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.sample
import kotlinx.coroutines.flow.stateIn

/** The UI's refresh rate. It must not add a second throttle on top. */
const val STATUS_SAMPLE_MS = 100L

private const val EVENT_BUFFER = 64

/**
 * The one status line, resolved by precedence.
 *
 * The order is a claim about which problem the user has to act on first: an illegal position
 * outranks a stalled detection, which outranks a dead camera, which outranks a silently
 * degraded CNN. The CNN rung exists because of MEMORY `android-live-bringup-2607` — the attach
 * failed without a word and the tracker ran diff-only for a whole session.
 */
internal fun resolveNote(
    status: TrackerStatus,
    camera: CameraHealth,
    cnn: CnnState,
    mismatch: SizeMismatch?,
    pipelineNote: String?,
): String? {
    val alarm = status.alarm
    return when {
        alarm != null -> "ILLEGAL MOVE? ${alarm.kind}${alarm.guessSan?.let { " — $it?" } ?: ""}"
        status.stuckReason != null -> "stuck: ${status.stuckReason}"
        camera is CameraHealth.Down -> "camera down (${camera.reason}) — retrying in ${camera.retryInS}s"
        cnn is CnnState.Failed -> "CNN safeguard OFF: ${cnn.reason} — tracking diff-only"
        mismatch != null -> mismatch.note
        else -> pipelineNote ?: status.note
    }
}

/**
 * Everything the UI reads, and the only path out of the analyzer thread.
 *
 * [publish] is called once per frame and never blocks: the status is a conflated `StateFlow`
 * sampled down to 10 Hz, and events go into a drop-oldest buffer. A collector that stalls slows
 * itself down, never the detection loop.
 */
class StatusPublisher(
    scope: CoroutineScope,
    private val timings: StageTimings = StageTimings(),
    sampleMs: Long = STATUS_SAMPLE_MS,
) {
    private val raw = MutableStateFlow<TrackerStatus?>(null)
    private val bus =
        MutableSharedFlow<TrackerEvent>(
            replay = 0,
            extraBufferCapacity = EVENT_BUFFER,
            onBufferOverflow = BufferOverflow.DROP_OLDEST,
        )

    /** Null until the first frame has been through the engine. */
    @OptIn(FlowPreview::class)
    val status: StateFlow<TrackerStatus?> = raw.sample(sampleMs).stateIn(scope, SharingStarted.Eagerly, null)

    val events: SharedFlow<TrackerEvent> = bus.asSharedFlow()

    @Volatile
    var cameraHealth: CameraHealth = CameraHealth.Up

    @Volatile
    var cnnState: CnnState = CnnState.Off

    @Volatile
    var sizeMismatch: SizeMismatch? = null

    /**
     * The corners the frame pipeline warped with, `[a8, h8, h1, a1]` in source px (invariant 11).
     *
     * They come from here rather than from the engine because the engine is under a "no pixels,
     * no geometry" contract: it is handed corners per frame but owns no notion of the source
     * image. The preview overlay draws its board quad from this (D06b-4).
     */
    @Volatile
    var corners: FloatArray? = null

    /**
     * The UNSAMPLED game FEN. The CNN observer captures it when an observation starts, as its
     * discard-on-change guard — a 100 ms-stale FEN from [status] would let an observation of the
     * position BEFORE a move be accepted as an observation of the position after it.
     */
    @Volatile
    var lastFen: String? = null
        private set

    fun publish(
        snapshot: TrackerStatus,
        events: List<TrackerEvent>,
        pipelineNote: String?,
    ) {
        lastFen = snapshot.fen
        raw.value =
            snapshot.copy(
                note = resolveNote(snapshot, cameraHealth, cnnState, sizeMismatch, pipelineNote),
                // The engine cannot time the frame pipeline (it is under a wall-clock ban), so the
                // app's stage timings are merged in here; engine keys win on a name collision.
                stageTimingsMs = timings.snapshot() + snapshot.stageTimingsMs,
                corners = corners,
            )
        events.forEach { bus.tryEmit(it) }
    }
}
