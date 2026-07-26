package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import kotlin.math.abs

/**
 * Python per_square_diff. Mean |ref - cur| per square.
 *
 * `boxes` are precomputed by the caller (the tracker holds one [SquareBoxes] for
 * `extendUp = overhang` and one for `extendUp = 0.0`; Python rebuilds them per call, we must not).
 */
internal fun perSquareDiff(
    grayA: GrayImage,
    grayB: GrayImage,
    boxes: SquareBoxes,
    out: DoubleArray,
): DoubleArray {
    require(grayA.width == grayB.width && grayA.height == grayB.height) {
        "gray size mismatch: ${grayA.width}x${grayA.height} vs ${grayB.width}x${grayB.height}"
    }
    return absDiffMeans(grayA.data, grayB.data, grayA.width, boxes, out)
}

/**
 * Python `_region_means` over `cv2.absdiff(a, b)`, summed **per box** instead of through an
 * integral image.
 *
 * Python builds the integral because NumPy/OpenCV make it free; here it cost a full pass over the
 * plane plus a `(w+1)*(h+1)` `LongArray` — 5.1 MB of writes at 800x800 — to answer 64 queries.
 * With the default `overhang = 0.25` the boxes are disjoint and cover ~63 % of the plane, so
 * summing them directly is strictly less work and holds no large buffer at all. (An `overhang`
 * beyond 0.32 makes the boxes overlap; the sums stay correct, they just re-read those rows.)
 *
 * Zero-area boxes yield `0.0`, never NaN. [out] is caller-owned and returned for chaining.
 */
internal fun absDiffMeans(
    a: ByteArray,
    b: ByteArray,
    width: Int,
    boxes: SquareBoxes,
    out: DoubleArray,
): DoubleArray {
    require(out.size >= boxes.area.size) { "out too small: ${out.size} < ${boxes.area.size}" }
    for (i in boxes.area.indices) {
        val area = boxes.area[i]
        if (area <= 0) {
            out[i] = 0.0
            continue
        }
        var sum = 0L
        for (y in boxes.y0[i] until boxes.y1[i]) {
            val row = y * width
            for (x in row + boxes.x0[i] until row + boxes.x1[i]) {
                sum += abs((a[x].toInt() and BYTE_MASK) - (b[x].toInt() and BYTE_MASK)).toLong()
            }
        }
        out[i] = sum.toDouble() / area
    }
    return out
}

/** [absDiffMeans] over a single plane — Python `_region_means` on the plane itself. */
internal fun planeMeans(
    data: ByteArray,
    width: Int,
    boxes: SquareBoxes,
    out: DoubleArray,
): DoubleArray {
    require(out.size >= boxes.area.size) { "out too small: ${out.size} < ${boxes.area.size}" }
    for (i in boxes.area.indices) {
        val area = boxes.area[i]
        if (area <= 0) {
            out[i] = 0.0
            continue
        }
        var sum = 0L
        for (y in boxes.y0[i] until boxes.y1[i]) {
            val row = y * width
            for (x in row + boxes.x0[i] until row + boxes.x1[i]) {
                sum += (data[x].toInt() and BYTE_MASK).toLong()
            }
        }
        out[i] = sum.toDouble() / area
    }
    return out
}

private const val BYTE_MASK = 0xFF
