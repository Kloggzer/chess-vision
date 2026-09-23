package com.chesslab.tracker.record

import android.os.SystemClock
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.camera.VideoRecorderPort
import com.chesslab.tracker.camera.preRollWindowSeconds
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import java.io.File
import kotlin.coroutines.CoroutineContext

/** The encoder arms early and buffers in memory; the first committed move names the file — a run that
 *  never commits leaves no video. Held back for the new timeline: the opening decision row and the armed
 *  frame rows. The ONE owner of arming: the others only *request*, [startVideo] decides. */
class RecordingBundleHost(
    private val camera: VideoRecorderPort,
    private val settings: RecordingSettings,
    private val sessionsRoot: File,
    private val scope: CoroutineScope,
    private val timelineContext: CoroutineContext = Dispatchers.IO,
) : AutoCloseable {
    @Volatile
    private var timeline: SessionTimeline? = null

    @Volatile
    private var session: SessionRecorder? = null

    @Volatile
    private var videoStarted = false

    @Volatile
    private var closedFailure: String? = null

    val timelineFailure: String? get() = timeline?.failure ?: closedFailure

    @Volatile
    private var closed = false

    /** Only the most recent row: in normal play exactly one decision races ahead of the session opening. */
    @Volatile
    private var bufferedDecision: Pair<com.chesslab.engine.api.DebugDecision, Long>? = null

    /** The armed phase's frame rows, for the video ring's window: dropped, the replay started on a position
     *  that never stood (`e4 e5` on the first row of `rg-2026-08-30-14-33-02`). */
    private val preRollFrames = ArrayDeque<TimelineFrame>()

    /** The ring must already hold the pre-roll when the first move commits. Idempotent. */
    fun armVideo() = startVideo()

    /** The timeline is built OUTSIDE the lock: construction writes a file, and `close` blocks on the drain. */
    fun opened(recorder: SessionRecorder) {
        val next = SessionTimeline(recorder.dir, scope, timelineContext)
        adopt(next)
        session = recorder
        startVideo()
        // The session exists BECAUSE a ply committed (`SessionCaptureController`'s commit gate),
        // so the pre-roll is due now — idempotent when the event collector got there first.
        camera.keepVideo(File(recorder.dir, VIDEO_FILE))
    }

    /** Arms ONCE for the next game. Re-arming off the encoder's final callback fired for EVERY stop, and a
     *  teardown stops it from two sides — the second arm threw away the ring the first had filled. */
    fun finished() {
        camera.stopVideo()
        // Idempotent: the stop's callback already closed the timeline when a video was running.
        closeCurrent()
        startVideo()
    }

    fun videoAvailability(
        size: DeliveredSize?,
        error: String?,
    ) {
        if (error != null) session?.updateVideo(SessionVideoMeta(0, 0, 0L, 0L, error))
        if (size != null) startVideo()
    }

    @Synchronized
    fun frame(frame: TimelineFrame) {
        val live = timeline
        if (live != null) {
            live.frame(frame)
            return
        }
        preRollFrames.addLast(frame)
        val window = preRollWindowSeconds(camera.videoBitRateRequested, camera.videoBitRate) * NS_PER_S
        while (frame.elapsedNs - preRollFrames.first().elapsedNs > window) preRollFrames.removeFirst()
    }

    /** Under the lock [frame] takes: adopting outside it lost frames into a closed channel, uncounted. The
     *  held rows go FIRST, or the replay reads the wrong starting position off row one. */
    @Synchronized
    private fun adopt(next: SessionTimeline) {
        timeline?.close()
        closedFailure = null
        preRollFrames.forEach(next::frame)
        preRollFrames.clear()
        timeline = next
        bufferedDecision?.let { (decision, elapsedNs) ->
            next.decision(decision, elapsedNs)
            bufferedDecision = null
        }
    }

    fun event(event: TrackerEvent) {
        // `keepVideo` latches once, so the race against `opened` does not matter.
        if (event is TrackerEvent.MoveCommitted || event is TrackerEvent.SequenceCommitted) {
            session?.let { camera.keepVideo(File(it.dir, VIDEO_FILE)) }
        }
        timeline?.event(event, SystemClock.elapsedRealtimeNanos(), System.currentTimeMillis())
    }

    fun decision(decision: DebugDecision) {
        val elapsedNs = SystemClock.elapsedRealtimeNanos()
        val tl = timeline
        if (tl != null) {
            tl.decision(decision, elapsedNs)
        } else {
            // No timeline yet: keep only the MOST RECENT row — one decision races ahead of the opening.
            bufferedDecision = decision to elapsedNs
        }
    }

    fun state(
        from: String,
        to: String,
        tsS: Double,
    ) = timeline?.state(from, to, tsS, SystemClock.elapsedRealtimeNanos())

    override fun close() {
        closed = true
        camera.stopVideo()
        closeCurrent()
    }

    @Suppress("ReturnCount")
    private fun startVideo() {
        if (closed || videoStarted) return
        val prefs = settings.prefs.value
        if (!prefs.enabled) return
        val size = camera.videoResolution
        if (size == null) {
            camera.videoFailure?.let { session?.updateVideo(SessionVideoMeta(0, 0, 0L, 0L, it)) }
            return
        }
        // Per arm, never per sample: it is a directory walk. A spent cap refuses the arm outright — [finished]
        // re-arms after every session, and an encoder stopping on its first sample would keep taking it.
        val used = SessionStore(sessionsRoot).totalBytes()
        if (prefs.capBytes in 1..used) return
        val remaining = if (prefs.capBytes > 0L) prefs.capBytes - used else 0L
        videoStarted =
            camera.startVideo(remaining) { progress ->
                timeline?.video(
                    SystemClock.elapsedRealtimeNanos(),
                    progress.durationNs,
                    progress.bytes,
                    progress.final,
                    progress.error,
                )
                if (progress.final) finalizeVideo(size, progress)
            }
        if (!videoStarted) {
            val error = camera.videoFailure ?: "QHD video recorder is not ready"
            session?.updateVideo(SessionVideoMeta(size.width, size.height, 0L, 0L, error))
            timeline?.video(SystemClock.elapsedRealtimeNanos(), 0L, 0L, final = true, error = error)
        }
    }

    private fun finalizeVideo(
        size: DeliveredSize,
        progress: com.chesslab.tracker.camera.VideoProgress,
    ) {
        session?.updateVideo(
            SessionVideoMeta(
                size.width,
                size.height,
                progress.durationNs,
                progress.bytes,
                progress.error,
                camera.videoSegments,
                camera.videoPreRollNs,
                camera.videoBitRateRequested,
                camera.videoBitRate,
            ),
        )
        detach()?.let(::closeKeepingFailure)
        session = null
        videoStarted = false
        // No re-arm: this runs for EVERY stop, and re-arming here made the encoder its own second owner.
    }

    /** Abhaengen unter der Sperre, schliessen ausserhalb: `close` schliesst den Kanal SOFORT und wartet erst
     *  dann auf den Drain — ein Frame in diesem Fenster ging ungezaehlt verloren. */
    private fun closeCurrent() {
        detach()?.let(::closeKeepingFailure)
        session = null
    }

    private fun closeKeepingFailure(closing: SessionTimeline) {
        closing.close()
        closing.failure?.let { closedFailure = it }
    }

    @Synchronized
    private fun detach(): SessionTimeline? = timeline.also { timeline = null }
}

private const val VIDEO_FILE = "video.mp4"

/** One window for both rings. The video's own window is the BYTE cap, not the nominal 45 s. */
private const val NS_PER_S = 1_000_000_000L
