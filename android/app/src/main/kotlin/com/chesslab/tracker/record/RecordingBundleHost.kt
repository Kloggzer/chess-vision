package com.chesslab.tracker.record

import android.os.SystemClock
import android.util.Size
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.camera.TrackerCamera
import kotlinx.coroutines.CoroutineScope
import java.io.File

/**
 * Android orchestration around the platform-free still/session recorder.
 *
 * The video runs in two phases since the pre-roll (2026-08-14): [armVideo] starts the ENCODER as
 * soon as recording is wanted and the camera can deliver — its samples buffer in memory
 * (`PreRollRing`) — and the first committed move ([event], or [opened], whichever sees the
 * session first) is what names a file and lets the muxer write. A tracker run that never commits
 * a move therefore leaves no video at all, which is the point: nine of eleven transferred
 * recordings on 2026-08-13/14 carried no game.
 */
class RecordingBundleHost(
    private val camera: TrackerCamera,
    private val settings: RecordingSettings,
    private val sessionsRoot: File,
    private val scope: CoroutineScope,
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
     * Arm the encoder ahead of any session: the ring must already hold the pre-roll when the
     * first move commits. Idempotent, and a no-op while recording is off or the camera cannot
     * deliver QHD yet.
     */
    fun armVideo() = startVideo()

    fun opened(recorder: SessionRecorder) {
        val next = SessionTimeline(recorder.dir, scope)
        timeline?.close()
        timeline = next
        session = recorder
        startVideo()
        // The session exists BECAUSE a ply committed (`SessionCaptureController`'s commit gate),
        // so the pre-roll is due now — idempotent when the event collector got there first.
        camera.keepVideo(File(recorder.dir, VIDEO_FILE))
    }

    fun finished() {
        if (videoStarted) {
            camera.stopVideo()
        } else {
            closeCurrent()
        }
    }

    fun videoAvailability(
        size: Size?,
        error: String?,
    ) {
        if (error != null) session?.updateVideo(SessionVideoMeta(0, 0, 0L, 0L, error))
        if (size != null) startVideo()
    }

    fun frame(frame: TimelineFrame) = timeline?.frame(frame)

    fun event(event: TrackerEvent) {
        // A committed ply is the proof the footage carries a game — the buffered 20 s become a
        // file here. Which collector wins the race against `opened` does not matter: `keepVideo`
        // latches once, and with no session yet `opened` is the one that will carry the file.
        if (event is TrackerEvent.MoveCommitted || event is TrackerEvent.SequenceCommitted) {
            session?.let { camera.keepVideo(File(it.dir, VIDEO_FILE)) }
        }
        timeline?.event(event, SystemClock.elapsedRealtimeNanos(), System.currentTimeMillis())
    }

    fun decision(decision: DebugDecision) = timeline?.decision(decision, SystemClock.elapsedRealtimeNanos())

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
        // spent must refuse the arm outright — an encoder that stops on its first sample would be
        // re-armed by its own final callback, forever.
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
        size: Size,
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
            ),
        )
        timeline?.close()
        timeline = null
        session = null
        videoStarted = false
        // Re-arm at once: the NEXT game's pre-roll has to be rolling before its first commit,
        // not from it. On the way out `closed` keeps this from resurrecting a dying encoder.
        startVideo()
    }

    private fun closeCurrent() {
        timeline?.close()
        timeline = null
        session = null
    }
}

/** The bundle's video name — segment 0; later segments derive from it (`CameraVideo.segmentFile`). */
private const val VIDEO_FILE = "video.mp4"
