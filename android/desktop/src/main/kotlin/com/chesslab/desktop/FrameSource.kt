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
}

/** A recorded clip, decoded with FFmpeg. Streamed: a 1080p video does not fit in memory twice. */
class VideoFileSource(
    video: File,
) : FrameSource {
    private val grabber =
        FFmpegFrameGrabber(video).apply {
            // Asked for explicitly: the default depends on the stream, and every consumer below
            // (warp, ROI motion, crops) assumes interleaved 8-bit BGR.
            pixelFormat = avutil.AV_PIX_FMT_BGR24
            start()
        }
    private var mat: Mat? = null

    override val fps: Double = grabber.frameRate

    override val delivered: DeliveredSize = DeliveredSize(grabber.imageWidth, grabber.imageHeight, 0)

    override fun next(): Mat? {
        val frame = generateSequence { grabber.grabImage() }.firstOrNull() ?: return null
        val out = mat ?: Mat(frame.imageHeight, frame.imageWidth, CvType.CV_8UC3).also { mat = it }
        copyInto(frame.image[0] as ByteBuffer, frame.imageStride, out)
        return out
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
        val row = ByteArray(out.cols() * BGR_CHANNELS)
        for (y in 0 until out.rows()) {
            buffer.position(y * stride)
            buffer.get(row, 0, row.size)
            out.put(y, 0, row)
        }
    }

    override fun close() {
        mat?.release()
        grabber.stop()
        grabber.release()
    }
}

private const val BGR_CHANNELS = 3

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
