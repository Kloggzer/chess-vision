package com.chesslab.tracker.camera

import android.content.Context
import android.util.Size
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import java.io.File
import java.util.concurrent.Executor

/** The minimum useful recording size. Smaller video is never silently accepted as training input. */
const val MIN_VIDEO_WIDTH = 2560
const val MIN_VIDEO_HEIGHT = 1440

data class VideoProgress(
    val durationNs: Long,
    val bytes: Long,
    val final: Boolean = false,
    val error: String? = null,
)

/**
 * The Android-only CameraX video half. [TrackerCamera] still owns the one camera binding; this
 * object owns only the encoder/output lifecycle attached to that binding.
 */
class CameraVideo(
    private val context: Context,
    private val executor: Executor,
) : AutoCloseable {
    private var recorder: Recorder? = null
    private var recording: Recording? = null
    private var listener: (VideoProgress) -> Unit = {}

    @Volatile
    var resolution: Size? = null
        private set

    @Volatile
    var failure: String? = null
        private set

    fun useCase(): VideoCapture<Recorder> {
        // QHD is explicit from CameraX 1.7. Falling back to FHD would quietly remove the
        // source pixels this feature exists to retain, so there is deliberately no fallback.
        val output =
            Recorder
                .Builder()
                .setQualitySelector(QualitySelector.from(Quality.QHD))
                .build()
        recorder = output
        failure = null
        resolution = null
        return VideoCapture.withOutput(output)
    }

    fun bound(capture: VideoCapture<Recorder>): Boolean {
        val size = capture.resolutionInfo?.resolution
        resolution = size
        val enough = size != null && maxOf(size.width, size.height) >= MIN_VIDEO_WIDTH && minOf(size.width, size.height) >= MIN_VIDEO_HEIGHT
        if (!enough) failure = "QHD video unavailable (CameraX delivered ${size?.width ?: 0}x${size?.height ?: 0})"
        return enough
    }

    fun bindFailed(cause: Throwable) {
        failure = "QHD video binding failed (${cause.javaClass.simpleName}: ${cause.message.orEmpty()})"
        recorder = null
        resolution = null
    }

    fun start(
        file: File,
        maxBytes: Long,
        onProgress: (VideoProgress) -> Unit,
    ): Boolean {
        if (recording != null) return false
        val output = recorder ?: return false
        file.parentFile?.mkdirs()
        val options =
            FileOutputOptions
                .Builder(file)
                .apply {
                    if (maxBytes > 0L) setFileSizeLimit(maxBytes)
                }.build()
        listener = onProgress
        recording =
            runCatching { output.prepareRecording(context, options).start(executor, ::onEvent) }
                .onFailure { failure = "QHD video start failed (${it.javaClass.simpleName}: ${it.message.orEmpty()})" }
                .getOrNull()
        return recording != null
    }

    fun stop() {
        recording?.stop()
    }

    override fun close() {
        recording?.close()
        recording = null
        recorder = null
    }

    private fun onEvent(event: VideoRecordEvent) {
        val stats = event.recordingStats
        val error =
            (event as? VideoRecordEvent.Finalize)
                ?.takeIf { it.hasError() }
                ?.let { "video finalize error ${it.error}: ${it.cause?.message.orEmpty()}" }
        listener(VideoProgress(stats.recordedDurationNanos, stats.numBytesRecorded, event is VideoRecordEvent.Finalize, error))
        if (event is VideoRecordEvent.Finalize) recording = null
    }
}
