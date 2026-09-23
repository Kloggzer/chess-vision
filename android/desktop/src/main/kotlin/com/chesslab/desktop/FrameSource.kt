package com.chesslab.desktop

import com.chesslab.tracker.camera.DeliveredSize
import org.bytedeco.ffmpeg.global.avutil
import org.bytedeco.javacv.FFmpegFrameGrabber
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.videoio.VideoCapture
import org.opencv.videoio.Videoio
import java.io.File
import java.nio.ByteBuffer
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.atomic.AtomicBoolean

interface FrameSource : AutoCloseable {
    /** Null at end of stream. The `Mat` is OWNED BY THE SOURCE and reused, like CameraX's ImageProxy. */
    fun next(): Mat?

    /** Read from the frame that ARRIVED, never from what was requested. */
    val delivered: DeliveredSize

    val fps: Double

    /** In ms, CONTINUOUS across a segmented recording: `GeometryScan` checks constant rate on it. */
    val timestampMs: Double get() = 0.0

    /** Over the WHOLE recording; -1 before the first frame and for live sources. */
    val currentDecodedIndex: Long get() = -1
}

class VideoFileSource(
    video: File,
    /** Decoded index and PTS in ms; false skips the FFmpeg-plane -> OpenCV copy. The PTS is passed because the
     *  replay's clock IS the PTS, not the nominal frame rate. */
    private val select: (Long, Double) -> Boolean = { _, _ -> true },
) : FrameSource {
    private val grabber =
        FFmpegFrameGrabber(video).apply {
            // Asked for explicitly: the default depends on the stream.
            pixelFormat = avutil.AV_PIX_FMT_BGR24
            start()
        }
    override val fps: Double = grabber.frameRate

    override val delivered: DeliveredSize = DeliveredSize(grabber.imageWidth, grabber.imageHeight, 0)

    /** One reused plane: the old row loop cost ~57 GB of short-lived heap and 7.4 million `Mat.put` calls. */
    private val packed = ByteArray(delivered.width * delivered.height * BGR_CHANNELS)

    private val free = ArrayBlockingQueue<Mat>(VIDEO_PREFETCH_DEPTH + 2)
    private val ready = ArrayBlockingQueue<DecodedVideoFrame>(VIDEO_PREFETCH_DEPTH)
    private val closed = AtomicBoolean(false)
    private var current: Mat? = null

    @Volatile
    private var decoderHeld: Mat? = null
    private val decoder =
        Thread(::decode, "chesslab-video-decode").apply {
            isDaemon = true
            repeat(VIDEO_PREFETCH_DEPTH + 2) {
                free.add(Mat(delivered.height, delivered.width, CvType.CV_8UC3))
            }
            start()
        }

    /** PTS of the frame the last [next] returned, in ms of VIDEO time. */
    @Volatile
    private var currentTimestampMs = 0.0

    var framesRead: Long = 0
        private set

    override var currentDecodedIndex: Long = -1
        private set

    /** What the decoder WALKED, skipped frames included; a concatenated recording sums these to stay continuous. */
    var decodedFrames: Long = 0
        private set

    var decodedTimestampMs: Double = 0.0
        private set

    var decodedIntervalMs: Double = 0.0
        private set

    override val timestampMs: Double get() = currentTimestampMs

    override fun next(): Mat? {
        current?.let { free.put(it) }
        current = null
        return when (val decoded = ready.take()) {
            is DecodedVideoFrame.Image -> {
                currentTimestampMs = decoded.timestampMs
                currentDecodedIndex = decoded.decodedIndex
                framesRead += 1
                current = decoded.mat
                decoded.mat
            }
            is DecodedVideoFrame.End -> {
                decodedFrames = decoded.decodedFrames
                decodedTimestampMs = decoded.timestampMs
                decodedIntervalMs = decoded.intervalMs
                null
            }
            is DecodedVideoFrame.Failed -> throw IllegalStateException("video decode failed", decoded.cause)
        }
    }

    private fun decode() {
        try {
            val failure = runCatching { decodeFrames() }.exceptionOrNull()
            if (failure is InterruptedException) {
                Thread.currentThread().interrupt()
            } else if (failure != null) {
                // Never lose a decoder error behind a full prefetch queue.
                ready.put(DecodedVideoFrame.Failed(failure))
            }
        } finally {
            grabber.stop()
            grabber.release()
        }
    }

    private fun decodeFrames() {
        var decodedIndex = 0L
        var timestampMs = 0.0
        var intervalMs = MS_PER_SECOND / fps
        while (!closed.get()) {
            val frame = generateSequence { grabber.grabImage() }.firstOrNull()
            if (frame == null) {
                ready.put(DecodedVideoFrame.End(decodedIndex, timestampMs, intervalMs))
                return
            }
            val index = decodedIndex
            decodedIndex += 1
            val previousMs = timestampMs
            timestampMs = grabber.timestamp / MICROS_PER_MS
            if (index > 0 && timestampMs > previousMs) intervalMs = timestampMs - previousMs
            if (!select(index, timestampMs)) continue
            val out = free.take().also { decoderHeld = it }
            copyInto(frame.image[0] as ByteBuffer, frame.imageStride, out)
            ready.put(DecodedVideoFrame.Image(out, timestampMs, index))
            decoderHeld = null
        }
    }

    /** `imageStride` is in BYTES and NOT `width * 3` in general — a wholesale copy shears the board. */
    private fun copyInto(
        buffer: ByteBuffer,
        stride: Int,
        out: Mat,
    ) {
        val rowBytes = out.cols() * BGR_CHANNELS
        for (y in 0 until out.rows()) {
            buffer.position(y * stride)
            buffer.get(packed, y * rowBytes, rowBytes)
        }
        out.put(0, 0, packed)
    }

    override fun close() {
        if (!closed.compareAndSet(false, true)) return
        decoder.interrupt()
        decoder.join()
        decoderHeld?.release()
        decoderHeld = null
        current?.release()
        current = null
        ready.forEach { if (it is DecodedVideoFrame.Image) it.mat.release() }
        ready.clear()
        free.forEach(Mat::release)
        free.clear()
    }
}

private sealed interface DecodedVideoFrame {
    data class Image(
        val mat: Mat,
        val timestampMs: Double,
        val decodedIndex: Long,
    ) : DecodedVideoFrame

    data class End(
        val decodedFrames: Long,
        val timestampMs: Double,
        val intervalMs: Double,
    ) : DecodedVideoFrame

    data class Failed(
        val cause: Throwable,
    ) : DecodedVideoFrame
}

private const val BGR_CHANNELS = 3

private const val MICROS_PER_MS = 1000.0
private const val MS_PER_SECOND = 1000.0

private const val VIDEO_PREFETCH_DEPTH = 3

/** A camera through OpenCV's `videoio`. The delivered size is read back, never assumed. Resolution BEFORE
 *  codec: `FOURCC` first stops MJPG from engaging on OpenCV 4.x (opencv#7013). It does not undistort. */
class WebcamSource(
    index: Int,
    width: Int = 0,
    height: Int = 0,
) : FrameSource {
    private val capture =
        VideoCapture(index).apply {
            check(isOpened) { "camera $index could not be opened" }
            if (width > 0 && height > 0) {
                set(Videoio.CAP_PROP_FRAME_WIDTH, width.toDouble())
                set(Videoio.CAP_PROP_FRAME_HEIGHT, height.toDouble())
            }
        }
    private val mat = Mat()

    override val fps: Double = capture.get(Videoio.CAP_PROP_FPS).takeIf { it > 1.0 } ?: DEFAULT_FPS

    override val delivered: DeliveredSize =
        run {
            check(capture.read(mat) && !mat.empty()) { "camera $index opened but delivered no frame" }
            DeliveredSize(mat.cols(), mat.rows(), 0)
        }

    override fun next(): Mat? {
        if (!capture.read(mat) || mat.empty()) return null
        return mat
    }

    override fun close() {
        mat.release()
        capture.release()
    }
}

/** Opening is the only honest way to ask. */
fun probeCameras(upTo: Int = 4): List<String> =
    (0 until upTo).mapNotNull { index ->
        val capture = VideoCapture(index)
        try {
            if (!capture.isOpened) return@mapNotNull null
            val frame = Mat()
            val ok = capture.read(frame) && !frame.empty()
            val line =
                if (ok) {
                    "camera $index: ${frame.cols()}x${frame.rows()} @ ${capture.get(Videoio.CAP_PROP_FPS)} fps"
                } else {
                    "camera $index: opens but delivers no frame"
                }
            frame.release()
            line
        } finally {
            capture.release()
        }
    }

private const val DEFAULT_FPS = 30.0
