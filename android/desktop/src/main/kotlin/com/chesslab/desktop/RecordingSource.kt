package com.chesslab.desktop

import com.chesslab.tracker.camera.DeliveredSize
import org.opencv.core.Mat
import java.io.File

/** One file or several: the recorder swaps its container once a minute (`CameraVideo.SEGMENT_SECONDS`), one
 *  continuous stream. A tool that opened only `video.mp4` would label the first minute and call it done. */
fun openRecording(
    video: File,
    select: (Long, Double) -> Boolean = { _, _ -> true },
): FrameSource {
    val segments = recordingSegments(video)
    return if (segments.size == 1) VideoFileSource(video, select) else ConcatFrameSource(segments, select)
}

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

private const val EXCERPT = 120

/** `fps` and size are the FIRST segment's and NOMINAL. [timestampMs] adds each previous segment's last PTS plus
 *  one interval: a segment's first frame is stamped 0 one frame AFTER the last (30 segments lost 2,1 s). */
private class ConcatFrameSource(
    private val segments: List<File>,
    private val select: (Long, Double) -> Boolean,
) : FrameSource {
    private var index = 0

    /** Off what the decoder WALKED, not delivered: a filtering selector would drift by everything it skipped,
     *  and the prepasses key their rows by those numbers. */
    private var elapsedMs = 0.0
    private var decodedBefore = 0L
    private var current: VideoFileSource = open(segments[0])

    override val fps: Double = current.fps
    override val delivered: DeliveredSize = current.delivered
    override val timestampMs: Double get() = elapsedMs + current.timestampMs
    override val currentDecodedIndex: Long get() = decodedBefore + current.currentDecodedIndex

    private fun open(segment: File): VideoFileSource {
        val frames = decodedBefore
        val since = elapsedMs
        return VideoFileSource(segment) { index, timestampMs -> select(frames + index, since + timestampMs) }
    }

    override fun next(): Mat? {
        while (true) {
            val frame = current.next()
            if (frame != null) return frame
            if (index + 1 >= segments.size) return null
            elapsedMs += current.decodedTimestampMs + current.decodedIntervalMs
            decodedBefore += current.decodedFrames
            current.close()
            index++
            // The LAST segment of a killed recording has no index — the normal failure shape: keep what
            // decoded rather than throw away fifty good minutes.
            current =
                runCatching { open(segments[index]) }
                    .getOrElse {
                        println("recording ends at ${segments[index].name}: ${it.message.orEmpty().take(EXCERPT)}")
                        return null
                    }
        }
    }

    override fun close() = current.close()
}
