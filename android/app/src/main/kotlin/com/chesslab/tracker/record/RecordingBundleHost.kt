package com.chesslab.tracker.record

import android.os.SystemClock
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.camera.PRE_ROLL_SECONDS
import com.chesslab.tracker.camera.VideoRecorderPort
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import java.io.File
import kotlin.coroutines.CoroutineContext

/**
 * Android orchestration around the platform-free still/session recorder.
 *
 * The video runs in two phases since the pre-roll (2026-08-14): [armVideo] starts the ENCODER as
 * soon as recording is wanted and the camera can deliver — its samples buffer in memory
 * (`PreRollRing`) — and the first committed move ([event], or [opened], whichever sees the
 * session first) is what names a file and lets the muxer write. A tracker run that never commits
 * a move therefore leaves no video at all, which is the point: nine of eleven transferred
 * recordings on 2026-08-13/14 carried no game.
 *
 * Since 2026-08-14, the session opens (timeline is created) BY the first committed move, so
 * everything the armed phase produces is emitted before a timeline exists. Two things are held
 * back for it: the opening move's decision row (only the most recent — the incident is exactly one
 * row) and the frame rows, which get the video ring's own window (see [preRollFrames]). Both are
 * written to the fresh timeline as soon as [opened] is called.
 *
 * This class is also the ONE owner of the arming decision. [armVideo], [opened],
 * [videoAvailability] and [finished] only *request* an arm; [startVideo] alone decides, against
 * `videoStarted`, the preference and the size cap. Nothing else may arm — see [finished].
 */
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
    private var closed = false

    /**
     * The most recent decision row, buffered if it arrived before the timeline was created.
     * Volatile because it may be written from the engine thread and read from the session opener.
     */
    @Volatile
    private var bufferedDecision: Pair<com.chesslab.engine.api.DebugDecision, Long>? = null

    /**
     * The armed phase's frame rows, held for the same window the video ring holds its samples.
     *
     * The video reaches back past the first move; the timeline did not, because these rows fell on
     * a null timeline — 6,27 s of footage on `rg-2026-08-30-14-33-02` against a first frame row
     * already reading `e4 e5`, which is what made the replay start on a position that never stood.
     */
    private val preRollFrames = ArrayDeque<TimelineFrame>()

    /**
     * Arm the encoder ahead of any session: the ring must already hold the pre-roll when the
     * first move commits. Idempotent, and a no-op while recording is off or the camera cannot
     * deliver QHD yet.
     */
    fun armVideo() = startVideo()

    // TODO: not @Synchronized, unlike [frame] and [adopt] — a frame arriving between the close
    // below and [adopt] is trySent into a closed channel and lost without touching `evicted`.
    fun opened(recorder: SessionRecorder) {
        val next = SessionTimeline(recorder.dir, scope, timelineContext)
        timeline?.close()
        adopt(next)
        session = recorder
        startVideo()
        // The session exists BECAUSE a ply committed (`SessionCaptureController`'s commit gate),
        // so the pre-roll is due now — idempotent when the event collector got there first.
        camera.keepVideo(File(recorder.dir, VIDEO_FILE))
        // Replay the buffered decision row (if any) into the fresh timeline. The decision was
        // emitted before the timeline existed and was buffered to not be lost. This happens
        // right after the writer is created but before any further decisions are written.
        // See: 2026-08-14 incident where ply 1 decision rows were missing from session timelines.
        bufferedDecision?.let { (decision, elapsedNs) ->
            next.decision(decision, elapsedNs)
            bufferedDecision = null
        }
    }

    /**
     * A session ended: finish the file, then arm ONCE for the next game.
     *
     * The re-arm used to hang off the encoder's final callback, which fires for EVERY stop — and a
     * teardown stops the encoder from two sides. Measured twice on 2026-08-14 (20:36:33, 20:50:22):
     * the second arm came ~180 ms later and threw away the ring the first had already filled.
     */
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
        while (frame.elapsedNs - preRollFrames.first().elapsedNs > PRE_ROLL_WINDOW_NS) preRollFrames.removeFirst()
    }

    /**
     * The held rows go in FIRST, under the same lock [frame] takes: a live row written ahead of
     * them would leave the file out of chronological order, and the replay reads the position it
     * starts on off the first row (`RecordedFrames.startFen`).
     */
    @Synchronized
    private fun adopt(next: SessionTimeline) {
        preRollFrames.forEach(next::frame)
        preRollFrames.clear()
        timeline = next
    }

    fun event(event: TrackerEvent) {
        // A committed ply is the proof the footage carries a game — the buffered window becomes a
        // file here. Which collector wins the race against `opened` does not matter: `keepVideo`
        // latches once, and with no session yet `opened` is the one that will carry the file.
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
            // Timeline has not been created yet (session has not opened). Buffer this decision
            // so it can be written when the session opens. Only the MOST RECENT decision is kept;
            // earlier ones are overwritten. This is safe because in normal play only ONE decision
            // races ahead of the session opening.
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
        // Snapshotted per arm, never on the sample path: it is a directory walk. A cap already
        // spent must refuse the arm outright — [finished] arms again after every session, and an
        // encoder that stops on its first sample would keep taking that arm.
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
        timeline?.close()
        timeline = null
        session = null
        videoStarted = false
        // Deliberately no re-arm: this runs for EVERY stop — the cap, the disabled toggle, the
        // camera being released — and re-arming from here made the encoder its own second owner.
        // [finished] is what re-arms for the next game.
    }

    private fun closeCurrent() {
        timeline?.close()
        timeline = null
        session = null
    }
}

/** The bundle's video name — segment 0; later segments derive from it (`CameraVideo.segmentFile`). */
private const val VIDEO_FILE = "video.mp4"

/** One window for both rings: a frame row the video has no footage for describes nothing. */
private const val PRE_ROLL_WINDOW_NS = PRE_ROLL_SECONDS * 1_000_000_000L
