package com.chesslab.tracker.record

import org.opencv.core.Mat
import org.opencv.core.MatOfByte
import org.opencv.core.MatOfInt
import org.opencv.imgcodecs.Imgcodecs

/** `slice` cuts crops from these frames; a downscale would throw away the resolution it needs. */
private const val JPEG_QUALITY = 90

/**
 * The live frame source: the service's raw camera frame plus the corners the tracker warped with.
 *
 * The frame is encoded to JPEG **at grab time** and the `Mat` released immediately. Holding a
 * cloned full-resolution `Mat` until some later write would tie native memory to a decision the
 * controller has not made yet — and a dropped capture would leak it.
 */
class LiveCaptureSource(
    // `TrackerBinder.latestCalibrationFrame` — a CLONE, released here.
    private val frame: () -> Mat?,
    // `TrackerStatus.corners`, `[a8, h8, h1, a1]` in source px.
    private val corners: () -> FloatArray?,
    // The calibration profile's own source size.
    private val profileSize: () -> Pair<Int, Int>?,
) : CaptureSource {
    override fun sessionFrame(): CaptureFrame? {
        val mat = frame() ?: return null
        val (width, height) = mat.cols() to mat.rows()
        mat.release()
        return CaptureFrame(width, height, floatArrayOf(), FrameWriter { 0L })
    }

    override fun grab(): CaptureFrame? {
        val quad = corners() ?: return null
        val mat = frame() ?: return null
        val (width, height) = mat.cols() to mat.rows()
        val bytes = encode(mat)
        mat.release()
        return bytes?.let { data ->
            CaptureFrame(width, height, quad.copyOf(), FrameWriter { dest -> write(dest, data) })
        }
    }

    override fun geometryNote(): String? {
        val (profileWidth, profileHeight) = profileSize() ?: return null
        val mat = frame() ?: return null
        val note = geometryNote(profileWidth, profileHeight, mat.cols(), mat.rows())
        mat.release()
        return note
    }

    private fun encode(mat: Mat): ByteArray? {
        val buffer = MatOfByte()
        val params = MatOfInt(Imgcodecs.IMWRITE_JPEG_QUALITY, JPEG_QUALITY)
        val ok = Imgcodecs.imencode(".jpg", mat, buffer, params)
        val bytes = if (ok) buffer.toArray() else null
        buffer.release()
        params.release()
        return bytes
    }

    private fun write(
        dest: java.io.File,
        data: ByteArray,
    ): Long {
        dest.parentFile?.mkdirs()
        dest.writeBytes(data)
        return data.size.toLong()
    }
}
