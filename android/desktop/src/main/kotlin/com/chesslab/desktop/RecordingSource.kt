package com.chesslab.desktop

import com.chesslab.tracker.camera.DeliveredSize
import org.opencv.core.Mat
import java.io.File

/**
 * A phone recording, whether it is one file or several.
 *
 * Since 2026-08-13 the recorder closes its muxer once a minute (`CameraVideo.SEGMENT_SECONDS`), so
 * a process killed mid-capture — an `adb install` over a running recording is what did it — costs
 * one segment instead of the whole video. The files are `video.mp4`, `video-001.mp4`, …, and they
 * are one continuous stream: the encoder never stopped, only the container was swapped at a sync
 * frame.
 *
 * Reading them as one source is not a convenience. Every consumer here tracks a GAME across the
 * recording — the position gate walks the move list forward — so a tool that opened only
 * `video.mp4` would silently label the first minute and call the recording done.
 */
fun openRecording(
    video: File,
    select: (Long) -> Boolean = { true },
): FrameSource {
    val segments = recordingSegments(video)
    return if (segments.size == 1) VideoFileSource(video, select) else ConcatFrameSource(segments, select)
}

/** `video.mp4` and every `video-NNN.mp4` beside it, in order. Always at least the file itself. */
fun recordingSegments(video: File): List<File> {
    val stem = video.nameWithoutExtension
    val extension = video.extension
    val rest =
        generateSequence(1) { it + 1 }
            .map { File(video.parentFile, "%s-%03d.%s".format(stem, it, extension)) }
            .takeWhile { it.isFile }
            .toList()
    return listOf(video) + rest
}

/**
 * Several files, played as one stream.
 *
 * `fps` and the delivered size come from the FIRST segment and are not re-read: they are the
 * encoder's settings, which did not change at the swap, and a source whose frame rate moved
 * mid-stream would move the replay's virtual clock with it.
 */
private const val EXCERPT = 120

private class ConcatFrameSource(
    private val segments: List<File>,
    private val select: (Long) -> Boolean,
) : FrameSource {
    private var index = 0
    private var decoded = 0L

    /** What the segments before this one were worth, so the clock runs on across the swap. */
    private var elapsedMs = 0.0
    private var current: VideoFileSource = VideoFileSource(segments[0]) { select(decoded) }

    override val fps: Double = current.fps
    override val delivered: DeliveredSize = current.delivered
    override val timestampMs: Double get() = elapsedMs + current.timestampMs

    override fun next(): Mat? {
        while (true) {
            val frame = current.next()
            if (frame != null) {
                decoded++
                return frame
            }
            if (index + 1 >= segments.size) return null
            elapsedMs += current.timestampMs
            current.close()
            index++
            // The LAST segment of a killed recording has no index — that is the normal shape of
            // the failure this mechanism exists for, not a corrupt corpus. Everything before it
            // decoded; the run says where it stopped and keeps that, rather than throwing away
            // fifty good minutes because the fifty-first was cut off mid-write.
            current =
                runCatching { VideoFileSource(segments[index]) { select(decoded) } }
                    .getOrElse {
                        println("recording ends at ${segments[index].name}: ${it.message.orEmpty().take(EXCERPT)}")
                        return null
                    }
        }
    }

    override fun close() = current.close()
}
