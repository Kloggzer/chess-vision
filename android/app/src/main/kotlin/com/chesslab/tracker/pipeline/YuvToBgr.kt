package com.chesslab.tracker.pipeline

import androidx.camera.core.ImageProxy
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc
import java.nio.ByteBuffer

// YUV_420_888 -> NV21 -> BGR, allocation-free after the first frame of a given size.
//
// The legacy converter allocated a fresh YUV Mat AND a fresh BGR Mat per frame and returned
// the latter; at 1920x1080 that is ~8 MB of churn per second (commit 9358c6c's lesson).
// Every buffer here is a field, re-sized only when the delivered frame size changes.

/** NV21 is 12 bit per pixel: `w * h` luma + `w * h / 2` interleaved chroma. */
private const val NV21_NUM = 3

private const val NV21_DEN = 2

/** `ImageProxy.getPlanes()` order is Y, U, V. */
private const val U_INDEX = 1

private const val V_INDEX = 2

/** One YUV_420_888 plane, decoupled from `ImageProxy` so the packing is JVM-testable. */
internal class YuvPlane(
    val buffer: ByteBuffer,
    val rowStride: Int,
    val pixelStride: Int,
)

/** The three planes of one frame. */
internal class YuvPlanes(
    val y: YuvPlane,
    val u: YuvPlane,
    val v: YuvPlane,
)

internal fun planesOf(image: ImageProxy): YuvPlanes {
    val p = image.planes

    fun of(i: Int) = YuvPlane(p[i].buffer, p[i].rowStride, p[i].pixelStride)
    return YuvPlanes(of(0), of(U_INDEX), of(V_INDEX))
}

/**
 * Converts CameraX `YUV_420_888` frames into a packed BGR [Mat].
 *
 * NOT thread-safe and not meant to be: one instance belongs to one analyzer thread, and both
 * the returned `ByteArray` and the returned `Mat` are **owned by this converter** — they are
 * overwritten by the next call. Copy before handing either across a thread boundary.
 */
internal class YuvToBgr {
    private var nv21 = ByteArray(0)
    private var yuv: Mat? = null
    private var bgr: Mat? = null

    /** Frames converted since construction — the allocation counter the reuse test asserts on. */
    var allocations: Int = 0
        private set

    /** Packs [planes] into the reused NV21 buffer (VU order, as `COLOR_YUV2BGR_NV21` expects). */
    fun pack(
        planes: YuvPlanes,
        width: Int,
        height: Int,
    ): ByteArray {
        val size = width * height * NV21_NUM / NV21_DEN
        if (nv21.size != size) {
            nv21 = ByteArray(size)
            allocations += 1
        }
        packLuma(planes.y, width, height)
        packChroma(planes.u, planes.v, width, height)
        return nv21
    }

    /** [pack] over a camera frame. */
    fun pack(image: ImageProxy): ByteArray = pack(planesOf(image), image.width, image.height)

    /** The BGR frame. Valid until the next call — see the class KDoc on ownership. */
    fun convert(image: ImageProxy): Mat {
        val w = image.width
        val h = image.height
        val data = pack(image)
        val rows = h + h / NV21_DEN
        var src = yuv
        if (src == null || src.rows() != rows || src.cols() != w) {
            src?.release()
            src = Mat(rows, w, CvType.CV_8UC1)
            yuv = src
        }
        src.put(0, 0, data)
        val dst = bgr ?: Mat().also { bgr = it }
        Imgproc.cvtColor(src, dst, Imgproc.COLOR_YUV2BGR_NV21)
        return dst
    }

    fun close() {
        yuv?.release()
        bgr?.release()
        yuv = null
        bgr = null
    }

    /** Row-wise bulk copy when the luma plane is dense — the common case and the hot one. */
    private fun packLuma(
        plane: YuvPlane,
        width: Int,
        height: Int,
    ) {
        val buf = plane.buffer
        val stride = plane.rowStride
        val step = plane.pixelStride
        var pos = 0
        for (y in 0 until height) {
            val base = y * stride
            if (step == 1) {
                buf.position(base)
                buf.get(nv21, pos, width)
                pos += width
            } else {
                for (x in 0 until width) nv21[pos++] = buf.get(base + x * step)
            }
        }
        buf.position(0)
    }

    /** V before U: that is what NV21 means, and swapping it tints the whole board. */
    private fun packChroma(
        u: YuvPlane,
        v: YuvPlane,
        width: Int,
        height: Int,
    ) {
        var pos = width * height
        for (y in 0 until height / 2) {
            val vBase = y * v.rowStride
            val uBase = y * u.rowStride
            for (x in 0 until width / 2) {
                nv21[pos++] = v.buffer.get(vBase + x * v.pixelStride)
                nv21[pos++] = u.buffer.get(uBase + x * u.pixelStride)
            }
        }
    }
}
