package com.chesslab.tracker.pipeline

import android.util.Log
import androidx.camera.core.ImageProxy
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc
import java.nio.ByteBuffer

// Allocation-free after the first frame of a size: per-frame Mats were ~8 MB/s of churn at 1080p.
// Semi-planar devices (all, in practice) go through `cvtColorTwoPlane` where the planes lie — 41-59 ms of
// repacking became ~7 ms on a Snapdragon 8 Gen 3; truly planar chroma still takes the NV21 packing.

private const val TAG = "chesslabYuv"

private const val NV21_NUM = 3

private const val NV21_DEN = 2

private const val U_INDEX = 1

private const val V_INDEX = 2

internal class YuvPlane(
    val buffer: ByteBuffer,
    val rowStride: Int,
    val pixelStride: Int,
)

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

internal enum class ChromaOrder { NV21, NV12 }

/** Bytes compared before believing that two plane views are windows onto ONE buffer. */
private const val INTERLEAVE_PROBES = 32

/** Decided from the BYTES: Android sizes every chroma plane alike (U and V both 1382399 at 1920x1440) and
 *  Java cannot see addresses — a plane one byte further reads the other shifted by one. A wrong order
 *  tints the board, so anything ambiguous (flat chroma included) repacks instead of guessing. */
internal fun chromaOrder(planes: YuvPlanes): ChromaOrder? {
    // A heap buffer has no address OpenCV could wrap, and a plane it would have to stride through
    // per pixel is not the interleaved plane `cvtColorTwoPlane` reads.
    if (!(planes.y.buffer.isDirect && planes.u.buffer.isDirect && planes.v.buffer.isDirect)) return null
    if (planes.y.pixelStride != 1 || planes.u.pixelStride != 2 || planes.v.pixelStride != 2) return null
    val vFirst = startsOneByteBefore(planes.v, planes.u)
    val uFirst = startsOneByteBefore(planes.u, planes.v)
    return when {
        vFirst && !uFirst -> ChromaOrder.NV21
        uFirst && !vFirst -> ChromaOrder.NV12
        else -> null
    }
}

private fun startsOneByteBefore(
    first: YuvPlane,
    second: YuvPlane,
): Boolean {
    val span = minOf(first.buffer.capacity() - 1, second.buffer.capacity())
    if (span < INTERLEAVE_PROBES) return false
    val step = span / INTERLEAVE_PROBES
    for (i in 0 until INTERLEAVE_PROBES) {
        val at = i * step
        if (second.buffer.get(at) != first.buffer.get(at + 1)) return false
    }
    return true
}

/** NOT thread-safe: one instance per analyzer thread, and the returned `ByteArray` and `Mat` are OWNED
 *  here — overwritten by the next call. Copy before crossing a thread. */
internal class YuvToBgr {
    private var nv21 = ByteArray(0)
    private var yuv: Mat? = null
    private var bgr: Mat? = null
    private var lumaHeader: Mat? = null
    private var chromaHeader: Mat? = null
    private var layoutLogged = false

    var allocations: Int = 0
        private set

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

    fun convert(image: ImageProxy): Mat {
        val planes = planesOf(image)
        val dst = bgr ?: Mat().also { bgr = it }
        val order = chromaOrder(planes)
        logLayoutOnce(planes, order, image.width, image.height)
        if (order != null) {
            convertInPlace(planes, image.width, image.height, order, dst)
        } else {
            convertPacked(planes, image.width, image.height, dst)
        }
        return dst
    }

    fun close() {
        yuv?.release()
        bgr?.release()
        lumaHeader?.release()
        chromaHeader?.release()
        yuv = null
        bgr = null
        lumaHeader = null
        chromaHeader = null
    }

    private fun convertInPlace(
        planes: YuvPlanes,
        width: Int,
        height: Int,
        order: ChromaOrder,
        dst: Mat,
    ) {
        val nv21Order = order == ChromaOrder.NV21
        val luma = header(lumaHeader, height, width, CvType.CV_8UC1, planes.y).also { lumaHeader = it }
        val chroma =
            header(
                chromaHeader,
                height / NV21_DEN,
                width / NV21_DEN,
                CvType.CV_8UC2,
                if (nv21Order) planes.v else planes.u,
            ).also { chromaHeader = it }
        val code = if (nv21Order) Imgproc.COLOR_YUV2BGR_NV21 else Imgproc.COLOR_YUV2BGR_NV12
        Imgproc.cvtColorTwoPlane(luma, chroma, dst, code)
    }

    private fun convertPacked(
        planes: YuvPlanes,
        width: Int,
        height: Int,
        dst: Mat,
    ) {
        val data = pack(planes, width, height)
        val rows = height + height / NV21_DEN
        var src = yuv
        if (src == null || src.rows() != rows || src.cols() != width) {
            src?.release()
            src = Mat(rows, width, CvType.CV_8UC1)
            yuv = src
        }
        src.put(0, 0, data)
        Imgproc.cvtColor(src, dst, Imgproc.COLOR_YUV2BGR_NV21)
    }

    /** Once, out loud: falling back to packing costs 40 ms a frame and is invisible from outside. */
    private fun logLayoutOnce(
        planes: YuvPlanes,
        order: ChromaOrder?,
        width: Int,
        height: Int,
    ) {
        if (layoutLogged) return
        layoutLogged = true

        fun describe(plane: YuvPlane) = "${plane.rowStride}/${plane.pixelStride}/${plane.buffer.capacity()}"
        Log.i(
            TAG,
            "${width}x$height y(${describe(planes.y)}) u(${describe(planes.u)}) v(${describe(planes.v)})" +
                " -> ${order?.name ?: "repacked NV21 (slow path)"}",
        )
    }

    /** A new header per frame because the `ImageProxy` is new per frame; it owns no pixels. */
    private fun header(
        previous: Mat?,
        rows: Int,
        cols: Int,
        type: Int,
        plane: YuvPlane,
    ): Mat {
        previous?.release()
        return Mat(rows, cols, type, plane.buffer, plane.rowStride.toLong())
    }

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
