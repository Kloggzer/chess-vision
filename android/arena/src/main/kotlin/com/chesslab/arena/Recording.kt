package com.chesslab.arena

import org.bytedeco.ffmpeg.global.avutil
import org.bytedeco.javacv.FFmpegFrameGrabber
import org.opencv.core.CvType
import org.opencv.core.Mat
import java.io.File
import java.nio.ByteBuffer

/**
 * A recorded game, one BGR frame at a time.
 *
 * Synchronous on purpose: the arena's cost is the classifier, not the decoder, and a single
 * thread keeps every run byte-for-byte repeatable.
 */
class Recording(
    video: File,
) : AutoCloseable {
    private val grabber =
        FFmpegFrameGrabber(video).apply {
            pixelFormat = avutil.AV_PIX_FMT_BGR24
            start()
        }

    val fps: Double = grabber.frameRate
    val width: Int = grabber.imageWidth
    val height: Int = grabber.imageHeight

    /** Reused for the whole stream — a per-frame 6 MB allocation at 30 fps is a per-frame collection. */
    private val mat = Mat(height, width, CvType.CV_8UC3)
    private val packed = ByteArray(width * height * BGR_CHANNELS)

    var index: Long = -1
        private set

    var timestampMs: Double = 0.0
        private set

    /** The next frame, or null at the end. The `Mat` is OWNED HERE and overwritten by the next call. */
    fun next(): Mat? {
        val frame = generateSequence { grabber.grabImage() }.firstOrNull() ?: return null
        index += 1
        timestampMs = grabber.timestamp / MICROS_PER_MS
        copyInto(frame.image[0] as ByteBuffer, frame.imageStride)
        return mat
    }

    /**
     * FFmpeg's row-padded plane into a tightly packed `Mat`. `imageStride` is in BYTES and is not
     * `width * 3` in general; copying wholesale shears the picture instead of failing.
     */
    private fun copyInto(
        buffer: ByteBuffer,
        stride: Int,
    ) {
        val rowBytes = width * BGR_CHANNELS
        for (y in 0 until height) {
            buffer.position(y * stride)
            buffer.get(packed, y * rowBytes, rowBytes)
        }
        mat.put(0, 0, packed)
    }

    override fun close() {
        mat.release()
        grabber.stop()
        grabber.release()
    }
}

private const val BGR_CHANNELS = 3
private const val MICROS_PER_MS = 1000.0
