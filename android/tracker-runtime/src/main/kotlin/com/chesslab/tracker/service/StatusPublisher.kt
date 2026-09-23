package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.pipeline.CameraRate
import com.chesslab.tracker.pipeline.SizeMismatch
import com.chesslab.tracker.pipeline.StageTimings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.sample
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/** The UI's refresh rate. It must not add a second throttle on top. */
const val STATUS_SAMPLE_MS = 100L

private const val EVENT_BUFFER = 64

private const val NEVER_BUILT = Long.MIN_VALUE

/** Two orders of magnitude past normal. Not tied to the camera's retry backoff: it fires for a feed that
 *  stopped WITHOUT an error, which [CameraHealth.Down] never sees. */
private const val FRAME_STALL_MS = 3_000L

private const val HEARTBEAT_MS = 1_000L

private const val MS_PER_S = 1_000L

/** The order says which problem the user must act on first: illegal position, stalled detection, dead camera,
 *  silently degraded CNN. */
internal fun resolveNote(
    status: TrackerStatus,
    camera: CameraHealth,
    cnn: CnnState,
    mismatch: SizeMismatch?,
    pipelineNote: String?,
): String? {
    val alarm = status.alarm
    return when {
        // Also the notification text, the only alarm signal with the app in the background.
        alarm != null ->
            "Position lost — tracking paused" +
                (alarm.guessSan?.let { ", the board looks like $it" } ?: "") +
                ". Open the app to fix it."
        // `stuckReason` is stale BY CONSTRUCTION when a pipeline note exists: the live note names what to do.
        status.stuckReason != null && pipelineNote == null -> "stuck: ${status.stuckReason}"
        // Above `Down`: not a fault, and must not promise a retry.
        camera is CameraHealth.Off -> "tracking stopped — the camera is released"
        camera is CameraHealth.Down -> "camera down (${camera.reason}) — retrying in ${camera.retryInS}s"
        cnn is CnnState.Failed -> "CNN safeguard OFF: ${cnn.reason} — tracking diff-only"
        mismatch != null -> mismatch.note
        else -> pipelineNote ?: status.note
    }
}

/** [publish] never blocks: a conflated `StateFlow` sampled to 10 Hz, events in a drop-oldest buffer. */
class StatusPublisher(
    scope: CoroutineScope,
    private val timings: StageTimings = StageTimings(),
    private val cameraRate: CameraRate = CameraRate(),
    sampleMs: Long = STATUS_SAMPLE_MS,
    private val nowMs: () -> Long = System::currentTimeMillis,
) {
    /** The same period [status] samples at, so the two cannot drift. */
    private val sampleInterval = sampleMs

    /** Not `0L`: a zero would read as "built at time zero" and swallow the first frame. */
    private var lastBuildMs = NEVER_BUILT

    @Volatile
    private var lastPublishMs = NEVER_BUILT

    private val raw = MutableStateFlow<TrackerStatus?>(null)
    private val bus =
        MutableSharedFlow<TrackerEvent>(
            replay = 0,
            extraBufferCapacity = EVENT_BUFFER,
            onBufferOverflow = BufferOverflow.DROP_OLDEST,
        )

    @OptIn(FlowPreview::class)
    val status: StateFlow<TrackerStatus?> = raw.sample(sampleMs).stateIn(scope, SharingStarted.Eagerly, null)

    val events: SharedFlow<TrackerEvent> = bus.asSharedFlow()

    init {
        // The only clock in the app that does not depend on a frame arriving.
        scope.launch {
            while (isActive) {
                delay(HEARTBEAT_MS)
                checkFrameStall()
            }
        }
    }

    @Volatile
    var cameraHealth: CameraHealth = CameraHealth.Up

    @Volatile
    var cnnState: CnnState = CnnState.Off

    @Volatile
    var sizeMismatch: SizeMismatch? = null

    /** From here, not the engine: the engine owns no notion of the source image. */
    @Volatile
    var corners: FloatArray? = null

    /** The UNSAMPLED game FEN, the observer's discard-on-change guard: a 100 ms-stale FEN would accept an observation
     *  of the position BEFORE a move as one after it. */
    @Volatile
    var lastFen: String? = null
        private set

    /** Counted BEFORE anything may drop it, including while a restart has detached the stack. */
    fun onCameraFrame() = cameraRate.onFrame()

    fun onCameraStopped() = cameraRate.reset()

    /** [snapshot] is a PROVIDER: a `TrackerStatus` per frame for a 10 Hz sampler was waste. [fen] stays per-frame
     *  (see [lastFen]), and events are never gated — they are the alarm and move channel. */
    fun publish(
        snapshot: () -> TrackerStatus,
        fen: String,
        events: List<TrackerEvent>,
        pipelineNote: String?,
    ) {
        lastFen = fen
        events.forEach { bus.tryEmit(it) }
        val now = nowMs()
        lastPublishMs = now
        if (lastBuildMs != NEVER_BUILT && now - lastBuildMs < sampleInterval) return
        lastBuildMs = now
        build(snapshot(), pipelineNote)
    }

    /** "Frames stopped" stopped the code that would show it: [publish] only runs on a delivered frame. Never calls
     *  the engine provider — this runs off the analyzer thread. */
    internal fun checkFrameStall() {
        val last = raw.value ?: return
        val since = nowMs() - lastPublishMs
        if (lastPublishMs == NEVER_BUILT || since < FRAME_STALL_MS) return
        // Sonst ging der Alarmtext verloren. Eine freigegebene Kamera ist die Entscheidung des Nutzers.
        if (last.alarm != null || last.note?.contains("camera is released") == true) return
        val note = "no frames from the camera for ${since / MS_PER_S}s — the feed stopped"
        if (last.note == note && last.fps == 0.0 && last.cameraFps == 0.0) return
        raw.value = last.copy(note = note, fps = 0.0, cameraFps = 0.0)
    }

    private fun build(
        snapshot: TrackerStatus,
        pipelineNote: String?,
    ) {
        // A skipped frame FREEZES the engine's EMA: a stale "14.8 fps" over a paused detection is a lie too.
        val detectionFps = if (pipelineNote == null) snapshot.fps else 0.0
        raw.value =
            snapshot.copy(
                note = resolveNote(snapshot, cameraHealth, cnnState, sizeMismatch, pipelineNote),
                fps = detectionFps,
                // The engine cannot time the pipeline; engine keys win on a name collision.
                stageTimingsMs = timings.snapshot() + snapshot.stageTimingsMs,
                // The engine counts ticked frames, zero while the pipeline discards — a live camera read as dead.
                cameraFps = cameraRate.fps,
                corners = corners,
            )
    }
}
