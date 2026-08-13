package com.chesslab.tracker.record

import android.os.SystemClock
import android.util.Size
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.camera.TrackerCamera
import kotlinx.coroutines.CoroutineScope
import java.io.File

/** Android orchestration around the platform-free still/session recorder. */
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

    fun opened(recorder: SessionRecorder) {
        val next = SessionTimeline(recorder.dir, scope)
        timeline?.close()
        timeline = next
        session = recorder
        startVideo()
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
        val recorder = session ?: return
        if (error != null) recorder.updateVideo(SessionVideoMeta(0, 0, 0L, 0L, error))
        if (size != null) startVideo()
    }

    fun frame(frame: TimelineFrame) = timeline?.frame(frame)

    fun event(event: TrackerEvent) = timeline?.event(event, SystemClock.elapsedRealtimeNanos(), System.currentTimeMillis())

    fun decision(decision: DebugDecision) = timeline?.decision(decision, SystemClock.elapsedRealtimeNanos())

    fun state(
        from: String,
        to: String,
        tsS: Double,
    ) = timeline?.state(from, to, tsS, SystemClock.elapsedRealtimeNanos())

    override fun close() {
        camera.stopVideo()
        closeCurrent()
    }

    @Suppress("ReturnCount")
    private fun startVideo() {
        val recorder = session ?: return
        if (videoStarted) return
        val size = camera.videoResolution
        if (size == null) {
            camera.videoFailure?.let { recorder.updateVideo(SessionVideoMeta(0, 0, 0L, 0L, it)) }
            return
        }
        val activeTimeline = timeline ?: return
        val prefs = settings.prefs.value
        val used = SessionStore(sessionsRoot).totalBytes()
        val remaining = if (prefs.capBytes > 0L) (prefs.capBytes - used).coerceAtLeast(1L) else 0L
        videoStarted =
            camera.startVideo(File(recorder.dir, "video.mp4"), remaining) { progress ->
                activeTimeline.video(
                    SystemClock.elapsedRealtimeNanos(),
                    progress.durationNs,
                    progress.bytes,
                    progress.final,
                    progress.error,
                )
                if (progress.final) finalizeVideo(recorder, activeTimeline, size, progress)
            }
        if (!videoStarted) {
            val error = camera.videoFailure ?: "QHD video recorder is not ready"
            recorder.updateVideo(SessionVideoMeta(size.width, size.height, 0L, 0L, error))
            activeTimeline.video(SystemClock.elapsedRealtimeNanos(), 0L, 0L, final = true, error = error)
        }
    }

    private fun finalizeVideo(
        recorder: SessionRecorder,
        activeTimeline: SessionTimeline,
        size: Size,
        progress: com.chesslab.tracker.camera.VideoProgress,
    ) {
        recorder.updateVideo(SessionVideoMeta(size.width, size.height, progress.durationNs, progress.bytes, progress.error))
        activeTimeline.close()
        if (timeline === activeTimeline) timeline = null
        if (session === recorder) session = null
        videoStarted = false
        if (session != null) startVideo()
    }

    private fun closeCurrent() {
        timeline?.close()
        timeline = null
        session = null
    }
}
