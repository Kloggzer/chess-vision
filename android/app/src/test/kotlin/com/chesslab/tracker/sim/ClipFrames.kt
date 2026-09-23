package com.chesslab.tracker.sim

import org.bytedeco.ffmpeg.global.avutil
import org.bytedeco.javacv.FFmpegFrameGrabber
import org.bytedeco.javacv.Frame
import org.opencv.core.CvType
import org.opencv.core.Mat
import java.io.File
import java.nio.ByteBuffer

// mp4 -> BGR `Mat` via JavaCV's FFmpeg, STREAMED: a 126-frame clip is 155 MB of BGR. The Mat
// handed to the callback is reused and invalid after it returns.

private const val BGR_CHANNELS = 3

/**
 * Calls [body] once per decoded frame with its 0-based index and a BGR [Mat].
 *
 * @return the number of frames decoded.
 */
internal fun forEachFrame(
    video: File,
    body: (Int, Mat) -> Unit,
): Int = forEachFrameTimed(video) { index, mat, _ -> body(index, mat) }

/** [forEachFrame] plus each frame's presentation timestamp in ms of VIDEO time. */
internal fun forEachFrameTimed(
    video: File,
    body: (Int, Mat, Double) -> Unit,
): Int {
    val grabber = FFmpegFrameGrabber(video)
    // The default depends on the stream; every consumer assumes interleaved 8-bit BGR.
    grabber.pixelFormat = avutil.AV_PIX_FMT_BGR24
    grabber.start()
    val mat = Mat()
    var buffer = ByteArray(0)
    var index = 0
    try {
        while (true) {
            val frame = grabber.grabImage() ?: break
            val timestampMs = grabber.timestamp / MICROS_PER_MS
            buffer = copyInto(frame, mat, buffer)
            body(index, mat, timestampMs)
            index += 1
        }
    } finally {
        grabber.stop()
        grabber.release()
        mat.release()
    }
    return index
}

/** The container's frame rate — the virtual clock every replay timestamp is derived from. */
internal fun videoFps(video: File): Double {
    val grabber = FFmpegFrameGrabber(video)
    grabber.start()
    val fps = grabber.frameRate
    grabber.stop()
    grabber.release()
    return fps
}

private const val MICROS_PER_MS = 1000.0

/**
 * FFmpeg's row-padded plane -> a tightly packed [Mat]. `imageStride` is in bytes for BGR24 and is
 * NOT `width * 3` in general — copying the buffer wholesale skews the image by the padding.
 */
private fun copyInto(
    frame: Frame,
    mat: Mat,
    scratch: ByteArray,
): ByteArray {
    val width = frame.imageWidth
    val height = frame.imageHeight
    val rowBytes = width * BGR_CHANNELS
    val plane = frame.image[0] as ByteBuffer
    val buffer = if (scratch.size == rowBytes * height) scratch else ByteArray(rowBytes * height)
    for (y in 0 until height) {
        plane.position(y * frame.imageStride)
        plane.get(buffer, y * rowBytes, rowBytes)
    }
    if (mat.rows() != height || mat.cols() != width || mat.type() != CvType.CV_8UC3) {
        mat.create(height, width, CvType.CV_8UC3)
    }
    mat.put(0, 0, buffer)
    return buffer
}
