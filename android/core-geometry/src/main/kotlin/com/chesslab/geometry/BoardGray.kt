package com.chesslab.geometry

import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc
import kotlin.math.max
import kotlin.math.min

// Pulled across JNI once and reduced in Kotlin: `Core.reduce` per band would be 64 native round trips per `correctQuad`.

private const val BYTE_MASK: Int = 0xFF

internal class BoardGray(
    warped: Mat,
) {
    val width: Int
    val height: Int
    private val data: ByteArray
    private val transposed: ByteArray

    init {
        val gray = Mat()
        try {
            if (warped.channels() == 1) warped.copyTo(gray) else Imgproc.cvtColor(warped, gray, Imgproc.COLOR_BGR2GRAY)
            width = gray.cols()
            height = gray.rows()
            data = ByteArray(width * height)
            gray.get(0, 0, data)
            // Vertical bands walked `data` with a full-row stride and dominated the sensor; one native transpose makes every
            // column scan contiguous. Exact medians unchanged.
            val t = Mat()
            try {
                Core.transpose(gray, t)
                transposed = ByteArray(width * height)
                t.get(0, 0, transposed)
            } finally {
                t.release()
            }
        } finally {
            gray.release()
        }
    }

    /** MEDIAN, not mean: a piece in part of the band is an outlier in every column it covers. [needed] picks the
     *  positions; the rest stay zero and must not be read. */
    @JvmOverloads
    fun columnMedians(
        y0: Int,
        y1: Int,
        needed: BooleanArray? = null,
    ): DoubleArray {
        val lo = max(0, y0)
        val hi = min(height, y1)
        val out = DoubleArray(width)
        if (hi <= lo) return out
        val median = ByteMedian()
        for (x in 0 until width) {
            if (needed != null && !needed[x]) continue
            val column = x * height
            for (y in lo until hi) median.add(transposed[column + y])
            out[x] = median.take(hi - lo)
        }
        return out
    }

    @JvmOverloads
    fun rowMedians(
        x0: Int,
        x1: Int,
        needed: BooleanArray? = null,
    ): DoubleArray {
        val lo = max(0, x0)
        val hi = min(width, x1)
        val out = DoubleArray(height)
        if (hi <= lo) return out
        val median = ByteMedian()
        for (y in 0 until height) {
            if (needed != null && !needed[y]) continue
            val row = y * width
            for (x in lo until hi) median.add(data[row + x])
            out[y] = median.take(hi - lo)
        }
        return out
    }
}

private class ByteMedian {
    private val histogram = IntArray(BYTE_VALUES)
    private val coarse = IntArray(COARSE_BINS)
    private val touched = IntArray(BYTE_VALUES)
    private var touchedCount = 0

    fun add(byte: Byte) {
        val value = byte.toInt() and BYTE_MASK
        if (histogram[value] == 0) {
            touched[touchedCount] = value
            touchedCount += 1
        }
        histogram[value] += 1
        coarse[value ushr COARSE_SHIFT] += 1
    }

    /** Exactly sorting and reading the middle one or two values; resets the bins it used. */
    fun take(count: Int): Double {
        val lowerRank = (count - 1) / 2
        val upperRank = count / 2
        val lower = valueAt(lowerRank)
        val upper = if (lowerRank == upperRank) lower else valueAt(upperRank)
        for (i in 0 until touchedCount) histogram[touched[i]] = 0
        coarse.fill(0)
        touchedCount = 0
        return (lower + upper) / 2.0
    }

    private fun valueAt(rank: Int): Int {
        var before = 0
        var bin = 0
        while (bin < coarse.size && before + coarse[bin] <= rank) {
            before += coarse[bin]
            bin += 1
        }
        var value = bin shl COARSE_SHIFT
        val end = value + COARSE_WIDTH
        while (value < end) {
            before += histogram[value]
            if (before > rank) return value
            value += 1
        }
        error("median rank $rank is outside the accumulated histogram")
    }
}

internal fun medianOf(values: DoubleArray): Double {
    if (values.isEmpty()) return 0.0
    val sorted = values.sortedArray()
    val mid = sorted.size / 2
    return if (sorted.size % 2 == 1) sorted[mid] else (sorted[mid - 1] + sorted[mid]) / 2.0
}

private const val BYTE_VALUES = 256
private const val COARSE_SHIFT = 4
private const val COARSE_WIDTH = 1 shl COARSE_SHIFT
private const val COARSE_BINS = BYTE_VALUES / COARSE_WIDTH
