package com.chesslab.engine

import kotlin.math.abs

/**
 * A caller-owned integral buffer for [width] x [height], reusing [reuse] when it already has the
 * right size.
 *
 * The engine is single-threaded (entry.md hard rule 2), so a caller that runs an integral every
 * frame should hold one `LongArray` field and feed it back in here — that removes the per-frame
 * allocation of a (w+1)*(h+1) `LongArray` (5.1 MB at 800x800). Deliberately NOT a shared
 * singleton: two live integrals (e.g. two colour planes) must never silently alias each other.
 */
internal fun integralBuffer(
    width: Int,
    height: Int,
    reuse: LongArray? = null,
): LongArray {
    val size = (width + 1) * (height + 1)
    return if (reuse != null && reuse.size == size) reuse else LongArray(size)
}

/** (w+1)*(h+1) row-major integral image, zero first row/column — cv2.integral layout. */
internal fun integral(
    data: ByteArray,
    width: Int,
    height: Int,
): LongArray = integral(data, width, height, LongArray((width + 1) * (height + 1)))

/** As [integral], but into a caller-owned buffer (see [integralBuffer]). Returns [out]. */
internal fun integral(
    data: ByteArray,
    width: Int,
    height: Int,
    out: LongArray,
): LongArray {
    val stride = width + 1
    requireIntegral(data.size, width, height, out.size)
    zeroBorder(out, width, height)
    var src = 0
    for (y in 0 until height) {
        var rowSum = 0L
        val prev = y * stride
        val cur = prev + stride
        for (x in 0 until width) {
            rowSum += (data[src].toInt() and BYTE_MASK).toLong()
            out[cur + x + 1] = out[prev + x + 1] + rowSum
            src++
        }
    }
    return out
}

/** Integral image of `|a - b|` (Python's `cv2.absdiff` + `cv2.integral`). */
internal fun integralAbsDiff(
    a: ByteArray,
    b: ByteArray,
    width: Int,
    height: Int,
): LongArray = integralAbsDiff(a, b, width, height, LongArray((width + 1) * (height + 1)))

/** As [integralAbsDiff], but into a caller-owned buffer (see [integralBuffer]). Returns [out]. */
internal fun integralAbsDiff(
    a: ByteArray,
    b: ByteArray,
    width: Int,
    height: Int,
    out: LongArray,
): LongArray {
    val stride = width + 1
    requireIntegral(a.size, width, height, out.size)
    require(b.size >= width * height) { "plane b too small: ${b.size} < ${width * height}" }
    zeroBorder(out, width, height)
    var src = 0
    for (y in 0 until height) {
        var rowSum = 0L
        val prev = y * stride
        val cur = prev + stride
        for (x in 0 until width) {
            rowSum += abs((a[src].toInt() and BYTE_MASK) - (b[src].toInt() and BYTE_MASK)).toLong()
            out[cur + x + 1] = out[prev + x + 1] + rowSum
            src++
        }
    }
    return out
}

/**
 * Per-region means from an integral image. Python `_region_means` (`tracker.py:110`).
 *
 * Zero-area boxes yield `0.0`, never NaN. [out] is caller-owned and reused across frames; it is
 * returned for chaining.
 */
internal fun regionMeans(
    ii: LongArray,
    width: Int,
    boxes: SquareBoxes,
    out: DoubleArray,
): DoubleArray {
    val stride = width + 1
    require(out.size >= boxes.area.size) { "out too small: ${out.size} < ${boxes.area.size}" }
    for (i in boxes.area.indices) {
        val area = boxes.area[i]
        if (area <= 0) {
            out[i] = 0.0
            continue
        }
        val y0 = boxes.y0[i] * stride
        val y1 = boxes.y1[i] * stride
        val x0 = boxes.x0[i]
        val x1 = boxes.x1[i]
        val sum = ii[y1 + x1] - ii[y0 + x1] - ii[y1 + x0] + ii[y0 + x0]
        out[i] = sum.toDouble() / area
    }
    return out
}

private fun requireIntegral(
    dataSize: Int,
    width: Int,
    height: Int,
    outSize: Int,
) {
    require(width > 0 && height > 0) { "empty plane ${width}x$height" }
    require(dataSize >= width * height) { "plane too small: $dataSize < ${width * height}" }
    require(outSize == (width + 1) * (height + 1)) {
        "integral buffer size $outSize != ${(width + 1) * (height + 1)}"
    }
}

private fun zeroBorder(
    out: LongArray,
    width: Int,
    height: Int,
) {
    val stride = width + 1
    for (x in 0 until stride) {
        out[x] = 0L
    }
    for (y in 1..height) {
        out[y * stride] = 0L
    }
}

private const val BYTE_MASK = 0xFF
