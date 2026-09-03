package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import kotlin.math.abs

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
 * Direct box sums avoid a 5.1 MB integral-plane write at 800x800; default boxes cover ~63%.
 * Overhang above 0.32 may overlap but remains correct. Zero-area boxes yield 0.0, never NaN.
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
