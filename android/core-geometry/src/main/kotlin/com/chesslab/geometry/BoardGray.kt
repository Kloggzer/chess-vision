package com.chesslab.geometry

import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc
import kotlin.math.max
import kotlin.math.min

// The rectified board as one grey plane, with the two band collapses `Alignment.kt` measures in.
//
// Pulled across JNI once and reduced in Kotlin. `Core.reduce` over a submat would be the obvious
// transcription of numpy's `median(axis=…)`, but this runs 16 band collapses per measurement and 4
// measurements per `correctQuad` — 64 native round trips against one.

private const val BYTE_MASK: Int = 0xFF

internal class BoardGray(
    warped: Mat,
) {
    val width: Int
    val height: Int
    private val data: ByteArray

    init {
        val gray = Mat()
        try {
            if (warped.channels() == 1) warped.copyTo(gray) else Imgproc.cvtColor(warped, gray, Imgproc.COLOR_BGR2GRAY)
            width = gray.cols()
            height = gray.rows()
            data = ByteArray(width * height)
            gray.get(0, 0, data)
        } finally {
            gray.release()
        }
    }

    /**
     * Median down the rows of `[y0, y1)` — one value per column, the profile vertical lines sit in.
     *
     * MEDIAN and not mean: a piece occupying part of the band contributes an outlier to every
     * column it covers, and a mean carries it into the profile the notch is looked for in. Measured
     * within 0.1 px of the mean on clean frames and worth a line or two on cluttered ones.
     */
    fun columnMedians(
        y0: Int,
        y1: Int,
    ): DoubleArray {
        val lo = max(0, y0)
        val hi = min(height, y1)
        val out = DoubleArray(width)
        if (hi <= lo) return out
        val buf = DoubleArray(hi - lo)
        for (x in 0 until width) {
            for (y in lo until hi) buf[y - lo] = (data[y * width + x].toInt() and BYTE_MASK).toDouble()
            out[x] = medianOf(buf)
        }
        return out
    }

    /** Median across the columns of `[x0, x1)` — one value per row. See [columnMedians]. */
    fun rowMedians(
        x0: Int,
        x1: Int,
    ): DoubleArray {
        val lo = max(0, x0)
        val hi = min(width, x1)
        val out = DoubleArray(height)
        if (hi <= lo) return out
        val buf = DoubleArray(hi - lo)
        for (y in 0 until height) {
            val row = y * width
            for (x in lo until hi) buf[x - lo] = (data[row + x].toInt() and BYTE_MASK).toDouble()
            out[y] = medianOf(buf)
        }
        return out
    }
}

internal fun medianOf(values: DoubleArray): Double {
    if (values.isEmpty()) return 0.0
    val sorted = values.sortedArray()
    val mid = sorted.size / 2
    return if (sorted.size % 2 == 1) sorted[mid] else (sorted[mid - 1] + sorted[mid]) / 2.0
}
