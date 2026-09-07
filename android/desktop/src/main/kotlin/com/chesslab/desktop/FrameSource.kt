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

/**
 * Where a desktop run gets its pictures.
 *
 * The phone has exactly one source and it is CameraX. Here there are three worth having — a video
 * file for replay and debugging, a webcam, and the phone itself over MJPEG, which is what the
 * corpus was actually recorded with. They differ only in where the bytes come from; every one of
 * them hands the tracker the same BGR `Mat`.
 */
interface FrameSource : AutoCloseable {
    /**
     * The next frame, or null at end of stream. The `Mat` is OWNED BY THE SOURCE and reused —
     * the same contract CameraX's ImageProxy has, and for the same reason: a per-frame allocation
     * at 30 fps is a per-frame collection.
     */
    fun next(): Mat?

    /** Read from the frame that ARRIVED, never from what was requested (a7dab73). */
    val delivered: DeliveredSize

    /** Frames per second as the source reports them; the virtual clock is derived from it. */
    val fps: Double

    /**
     * Position in the recording, in milliseconds — CONTINUOUS across a segmented one.
     *
     * `GeometryScan` reads it to check that the source is constant-rate, so a value that restarted
     * at every segment boundary would report the recorder as broken once a minute.
     */
    val timestampMs: Double get() = 0.0

    /**
     * Zero-based index of the frame [next] just returned, over the WHOLE recording; -1 before the
     * first one and for live sources, which have nothing to count. A prepass keys its rows by the
     * processed number it derives from this. Read off a bare `VideoFileSource` it stopped at the
     * first segment, and the replay died with "marker prepass has no frame 1596" (2026-08-14).
     */
    val currentDecodedIndex: Long get() = -1
}

/** A recorded clip, decoded with FFmpeg. Streamed: a 1080p video does not fit in memory twice. */
class VideoFileSource(
    video: File,
    /**
     * Zero-based decoded frame index and that frame's PTS in ms; false skips the costly
     * FFmpeg-plane -> OpenCV copy. The PTS is passed because the replay's clock IS the PTS, so a
     * selector reproducing a time-based gate cannot derive it from the nominal frame rate.
     */
    private val select: (Long, Double) -> Boolean = { _, _ -> true },
) : FrameSource {
    private val grabber =
        FFmpegFrameGrabber(video).apply {
            // Asked for explicitly: the default depends on the stream, and every consumer below
            // (warp, ROI motion, crops) assumes interleaved 8-bit BGR.
            pixelFormat = avutil.AV_PIX_FMT_BGR24
            start()
        }
    override val fps: Double = grabber.frameRate

    override val delivered: DeliveredSize = DeliveredSize(grabber.imageWidth, grabber.imageHeight, 0)

    /**
     * One decoder-owned transfer plane, reused for the whole stream.
     *
     * The old row loop allocated an 11 MB byte array per QHD frame and crossed JNI once per row.
     * Across this benchmark that was roughly 57 GB of short-lived heap and 7.4 million `Mat.put`
     * calls. Packing the padded FFmpeg plane here and publishing it with one `put` preserves the
     * exact BGR bytes while removing both sources of churn.
     */
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

    /**
     * Presentation timestamp of the frame the last [next] returned, in ms of VIDEO time.
     * The geometry scan's clock check reads this per frame — a variable-rate source makes every
     * wall-clock knob mean a different number of seconds in every second of the video.
     */
    @Volatile
    private var currentTimestampMs = 0.0

    var framesRead: Long = 0
        private set

    override var currentDecodedIndex: Long = -1
        private set

    /**
     * What the decoder WALKED in this file, the frames [select] skipped included — count and last
     * PTS. Final once [next] has returned null; a concatenated recording sums both to keep its
     * indices and its clock continuous whether or not a selector was filtering.
     */
    var decodedFrames: Long = 0
        private set

    var decodedTimestampMs: Double = 0.0
        private set

    /** The last decoded frame's interval — what the frame AFTER it would have been stamped, had one followed. */
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
                // Never lose a decoder error behind a full prefetch queue. The consumer first
                // drains the already decoded frames, then receives the failure in sequence.
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

    /**
     * FFmpeg's row-padded plane into a tightly packed `Mat`.
     *
     * `imageStride` is in BYTES for BGR24 and is NOT `width * 3` in general — copying the buffer
     * wholesale skews the picture by the padding, which looks like a sheared board rather than a
     * bug.
     */
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

/** Decoder plus three frames ahead; bounded to keep QHD memory predictable. */
private const val VIDEO_PREFETCH_DEPTH = 3

/**
 * A camera attached to this PC, through OpenCV's `videoio`.
 *
 * `VideoCapture` ships in the bytedeco jar this module already depends on, so a webcam costs no new
 * dependency. Two things this project learned the hard way and that are encoded here:
 *
 *  - **The delivered size is read back, never assumed.** `set(FRAME_WIDTH)` is a request; a camera
 *    is free to hand back something else, and passing the request on as truth is what desynced the
 *    warp on Android (a7dab73).
 *  - **Resolution BEFORE codec.** Setting `FOURCC` first is what stops MJPG from ever engaging on
 *    this stack — the usual advice has it backwards for OpenCV 4.x (opencv#7013).
 *  - **It does not undistort.** It used to, which put a transform in front of every consumer that
 *    none of them could see or switch off, and gave the PC a correction the phone had no way to
 *    get. The lens is `Stage.LENS` in the shared pipeline now; a measurement tool that wants one
 *    opens it explicitly at its own call site.
 */
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

/** What is attached, as the driver reports it. Opening is the only honest way to ask. */
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
