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

/** No status has been assembled yet — the first frame always builds one. */
private const val NEVER_BUILT = Long.MIN_VALUE

/**
 * How long the feed may go quiet before the status says so.
 *
 * The camera runs at 15-20 fps, so three seconds is two orders of magnitude past normal and cannot
 * be a scheduling hiccup. It is deliberately NOT tied to the camera's own retry backoff: this fires
 * for a feed that stopped delivering WITHOUT reporting an error, which is the case
 * [CameraHealth.Down] never sees.
 */
private const val FRAME_STALL_MS = 3_000L

/** How often the stall watchdog looks. Cheap — it only compares two longs unless it fires. */
private const val HEARTBEAT_MS = 1_000L

private const val MS_PER_S = 1_000L

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
        // This note is also the notification text, i.e. the only alarm signal that reaches the user
        // with the app in the background. It said "ILLEGAL MOVE? illegal_move" — the accusation
        // twice, the latch name once, and nothing about what to do.
        alarm != null ->
            "Position lost — tracking paused" +
                (alarm.guessSan?.let { ", the board looks like $it" } ?: "") +
                ". Open the app to fix it."
        // `EngineHost.tick` runs the engine only on a delivered frame, so `stuckReason` is stale BY
        // CONSTRUCTION exactly when a pipeline note exists — it describes the last frame that got
        // through, not this one. Ranked ahead of it, "frame too dark — detection paused" hid behind
        // a `too_many_changed` left over from the last hand that crossed the board: the stale one
        // is unactionable and the live one names what to do.
        status.stuckReason != null && pipelineNote == null -> "stuck: ${status.stuckReason}"
        // Above `Down` because it is not a fault and must not promise a retry: nothing brings the
        // camera back but the user.
        camera is CameraHealth.Off -> "tracking stopped — the camera is released"
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
    private val cameraRate: CameraRate = CameraRate(),
    sampleMs: Long = STATUS_SAMPLE_MS,
    private val nowMs: () -> Long = System::currentTimeMillis,
) {
    /** The build gate's period — the same one [status] samples at, so the two cannot drift. */
    private val sampleInterval = sampleMs

    /** [NEVER_BUILT] and not `0L`: a zero would read as "built at time zero" and swallow the first frame. */
    private var lastBuildMs = NEVER_BUILT

    /** Wall clock of the last [publish], i.e. of the last frame that reached the analyzer. */
    @Volatile
    private var lastPublishMs = NEVER_BUILT

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

    /**
     * One delivered `ImageProxy`, counted BEFORE anything may drop it — including the window in
     * which a restart has detached the stack and [publish] is not being called at all.
     */
    fun onCameraFrame() = cameraRate.onFrame()

    /** The camera was released; the next binding starts a fresh measurement (see [CameraRate]). */
    fun onCameraStopped() = cameraRate.reset()

    /**
     * Once per frame. [snapshot] is a PROVIDER, not a value.
     *
     * `TrackerStatus` is not cheap — a chesslib FEN, four 64-entry maps and four sorted
     * square-name sets — and it was built on every frame, including skipped ones, for a flow that
     * is sampled down to 10 Hz two lines below. Now it is built only when the sampler would
     * actually take it.
     *
     * [fen] is passed separately and stays per-frame: the CNN observer uses [lastFen] as its
     * discard-on-change guard, and a sampled FEN would let an observation of the position BEFORE
     * a move be accepted as one of the position after it. Events are likewise never gated — they
     * are the alarm and move channel, and dropping one is not a rendering delay.
     */
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

    /**
     * Re-emit the last status with a stall note when no frame has arrived for [FRAME_STALL_MS].
     *
     * Everything else here runs from [publish], which runs only on a delivered frame — so the one
     * condition the screen most needs to show, "frames stopped", was the one condition that stopped
     * the code that would show it. `StatusUiModel`'s own "no frames" branches were unreachable for
     * the same reason. A conflated `StateFlow` then holds the last sample forever and the screen
     * keeps reading `WAITING · 14.8 fps` over a dead feed.
     *
     * Deliberately does NOT call the engine snapshot provider: this runs off the analyzer thread,
     * and `TrackerStatus` is assembled from engine state that is only safe to read there. Rewriting
     * the note and zeroing the rates on the value already published needs nothing but the flow.
     */
    internal fun checkFrameStall() {
        val last = raw.value ?: return
        val since = nowMs() - lastPublishMs
        if (lastPublishMs == NEVER_BUILT || since < FRAME_STALL_MS) return
        val note = "no frames from the camera for ${since / MS_PER_S}s — the feed stopped"
        if (last.note == note && last.fps == 0.0 && last.cameraFps == 0.0) return
        raw.value = last.copy(note = note, fps = 0.0, cameraFps = 0.0)
    }

    private fun build(
        snapshot: TrackerStatus,
        pipelineNote: String?,
    ) {
        // A skipped frame ticked nothing, so the engine's EMA is FROZEN rather than current: a
        // stale "14.8 fps" standing over a paused detection is the same lie as a bare "0.0 fps"
        // over a healthy camera, one rung subtler. `pipelineNote` is non-null exactly when this
        // frame produced no `FrameInput`.
        val detectionFps = if (pipelineNote == null) snapshot.fps else 0.0
        raw.value =
            snapshot.copy(
                note = resolveNote(snapshot, cameraHealth, cnnState, sizeMismatch, pipelineNote),
                fps = detectionFps,
                // The engine cannot time the frame pipeline (it is under a wall-clock ban), so the
                // app's stage timings are merged in here; engine keys win on a name collision.
                stageTimingsMs = timings.snapshot() + snapshot.stageTimingsMs,
                // Same reason as the timings: the engine counts the frames it TICKED on, which is
                // zero while the pipeline is discarding every frame — and a camera at 30 fps then
                // reads as a dead one.
                cameraFps = cameraRate.fps,
                corners = corners,
            )
    }
}
