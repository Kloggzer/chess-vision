package com.chesslab.tracker.pipeline

import android.util.Log
import androidx.camera.core.ImageProxy
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc
import java.nio.ByteBuffer

// YUV_420_888 -> BGR, allocation-free after the first frame of a given size.
//
// The legacy converter allocated a fresh YUV Mat AND a fresh BGR Mat per frame and returned
// the latter; at 1920x1080 that is ~8 MB of churn per second (commit 9358c6c's lesson).
// Every buffer here is a field, re-sized only when the delivered frame size changes.
//
// TWO PATHS, same OpenCV kernel and therefore the same pixels:
//
//  - [ChromaOrder] devices (all of them, in practice) hand out ONE semi-planar buffer as three
//    plane views, so `cvtColorTwoPlane` can read the planes where they lie. Measured on a
//    Snapdragon 8 Gen 3 at 1920x1440: 41-59 ms of repacking became ~7 ms of conversion.
//  - Truly planar chroma still goes through the NV21 packing below.

private const val TAG = "chesslabYuv"

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

/** The two semi-planar layouts: which chroma byte comes first in the shared buffer. */
internal enum class ChromaOrder { NV21, NV12 }

/** Bytes compared before believing that two plane views are windows onto ONE buffer. */
private const val INTERLEAVE_PROBES = 32

/**
 * The layout whose interleaved chroma plane `cvtColorTwoPlane` can read as it lies, or null when
 * the device's planes cannot be read that way.
 *
 * It has to be decided from the BYTES. Capacity says nothing — measured on a Snapdragon 8 Gen 3 at
 * 1920x1440, U and V both report 1382399, because Android sizes every chroma plane as
 * `rowStride * (h/2 - 1) + pixelStride * (w/2 - 1) + 1` whichever one starts first — and Java
 * cannot see the two addresses. What it can see is that a plane one byte further into the same
 * buffer reads back the other one shifted by one.
 *
 * Getting the order backwards swaps U and V and tints the whole board, so anything that does not
 * answer cleanly one way — including the flat-chroma frame where both answers fit — repacks
 * instead of guessing.
 */
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

/** True when [second] reads as [first] advanced by one byte at every probe. */
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
    private var lumaHeader: Mat? = null
    private var chromaHeader: Mat? = null
    private var layoutLogged = false

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

    /** The BGR frame. Valid until the next call — see the class KDoc on ownership. */
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

    /** Both planes are read where the camera put them; only [dst] is written. */
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

    /** The portable path: repack into NV21 and convert that. */
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

    /**
     * Says once, out loud, which path this device landed on.
     *
     * Falling back to packing is a 40 ms-per-frame difference that is invisible from the outside —
     * and silent degradation is the failure mode this project keeps paying for
     * (MEMORY `android-live-bringup-2607`: the CNN attach failed without a word for a session).
     */
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

    /**
     * A fresh `Mat` header over the plane's direct buffer — a new one per frame because the
     * `ImageProxy` is a new one per frame. It owns no pixels, so releasing it frees a struct.
     */
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
