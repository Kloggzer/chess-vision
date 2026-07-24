package com.chesslab.tracker.camera

import androidx.camera.core.ImageProxy
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc

/**
 * Converts a CameraX `YUV_420_888` [ImageProxy] into a packed BGR [Mat] on the
 * analysis thread. The intermediate NV21 buffer is reused across frames to avoid
 * per-frame allocation churn under the grab-latest pipeline.
 */
internal class YuvToBgrConverter {
    private var nv21: ByteArray = ByteArray(0)
    private var lumaRow: ByteArray = ByteArray(0)

    fun convert(image: ImageProxy): Mat {
        val width = image.width
        val height = image.height
        val nv21Buffer = ensureBuffer(width, height)
        fillNv21(image, width, height, nv21Buffer)

        val yuvMat = Mat(height + height / 2, width, CvType.CV_8UC1)
        yuvMat.put(0, 0, nv21Buffer)
        val bgr = Mat()
        Imgproc.cvtColor(yuvMat, bgr, Imgproc.COLOR_YUV2BGR_NV21)
        yuvMat.release()
        return bgr
    }

    private fun ensureBuffer(
        width: Int,
        height: Int,
    ): ByteArray {
        val size = width * height * NV21_NUMERATOR / NV21_DENOMINATOR
        if (nv21.size != size) {
            nv21 = ByteArray(size)
        }
        return nv21
    }

    private fun fillNv21(
        image: ImageProxy,
        width: Int,
        height: Int,
        out: ByteArray,
    ) {
        copyLumaPlane(image.planes[0], width, height, out)
        // Interleave V,U into the second half to form NV21 (VU order).
        interleaveChroma(image.planes[VP_INDEX], image.planes[UP_INDEX], width, height, out)
    }

    private fun copyLumaPlane(
        plane: ImageProxy.PlaneProxy,
        width: Int,
        height: Int,
        out: ByteArray,
    ) {
        val buffer = plane.buffer
        val rowStride = plane.rowStride
        val pixelStride = plane.pixelStride
        var pos = 0
        if (lumaRow.size < rowStride) lumaRow = ByteArray(rowStride)
        val row = lumaRow
        for (y in 0 until height) {
            buffer.position(y * rowStride)
            val remaining = minOf(rowStride, buffer.remaining())
            buffer.get(row, 0, remaining)
            var x = 0
            var col = 0
            while (col < width) {
                out[pos++] = row[x]
                x += pixelStride
                col++
            }
        }
    }

    private fun interleaveChroma(
        vPlane: ImageProxy.PlaneProxy,
        uPlane: ImageProxy.PlaneProxy,
        width: Int,
        height: Int,
        out: ByteArray,
    ) {
        val chromaWidth = width / 2
        val chromaHeight = height / 2
        val vBuffer = vPlane.buffer
        val uBuffer = uPlane.buffer
        val vRowStride = vPlane.rowStride
        val uRowStride = uPlane.rowStride
        val vPixelStride = vPlane.pixelStride
        val uPixelStride = uPlane.pixelStride
        var pos = width * height
        for (y in 0 until chromaHeight) {
            for (x in 0 until chromaWidth) {
                out[pos++] = vBuffer.get(y * vRowStride + x * vPixelStride)
                out[pos++] = uBuffer.get(y * uRowStride + x * uPixelStride)
            }
        }
    }

    companion object {
        private const val NV21_NUMERATOR = 3
        private const val NV21_DENOMINATOR = 2
        private const val UP_INDEX = 1
        private const val VP_INDEX = 2
    }
}
