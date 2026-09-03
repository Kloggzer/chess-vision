package com.chesslab.engine.board

import com.chesslab.engine.api.BgrImage

const val BOARD_PX = 160
const val GRID = 8
private const val CELL = BOARD_PX / GRID
private const val MASK = 0xFF
private const val CHANNELS = 3

// BT.601 luma weights match OpenCV `BGR2GRAY`, whose output set the thresholds below.
private const val B_WEIGHT = 0.114
private const val G_WEIGHT = 0.587
private const val R_WEIGHT = 0.299

/**
 * Uses the raw warp because CLAHE/blur changes the gray-level meaning of tuned thresholds.
 * Area-weighted downsampling to 160x160 keeps the noise floor independent of source board size.
 */
fun grayBoard(bgr: BgrImage): ByteArray? {
    if (bgr.width <= 0 || bgr.height <= 0) return null
    val out = ByteArray(BOARD_PX * BOARD_PX)
    val sx = bgr.width.toDouble() / BOARD_PX
    val sy = bgr.height.toDouble() / BOARD_PX
    for (ty in 0 until BOARD_PX) {
        val y0 = (ty * sy).toInt()
        val y1 = maxOf(y0 + 1, ((ty + 1) * sy).toInt())
        for (tx in 0 until BOARD_PX) {
            val x0 = (tx * sx).toInt()
            val x1 = maxOf(x0 + 1, ((tx + 1) * sx).toInt())
            out[ty * BOARD_PX + tx] = boxLuma(bgr, x0, x1, y0, y1)
        }
    }
    return out
}

private fun boxLuma(
    bgr: BgrImage,
    x0: Int,
    x1: Int,
    y0: Int,
    y1: Int,
): Byte {
    var sum = 0.0
    var n = 0
    for (y in y0 until minOf(y1, bgr.height)) {
        var i = (y * bgr.width + x0) * CHANNELS
        for (x in x0 until minOf(x1, bgr.width)) {
            val b = bgr.data[i].toInt() and MASK
            val g = bgr.data[i + 1].toInt() and MASK
            val r = bgr.data[i + 2].toInt() and MASK
            sum += B_WEIGHT * b + G_WEIGHT * g + R_WEIGHT * r
            n += 1
            i += CHANNELS
        }
    }
    return if (n == 0) 0 else (sum / n).toInt().coerceIn(0, MASK).toByte()
}

/** Median subtraction removes global exposure/daylight shifts while retaining local scene motion. */
fun cellDeltas(
    a: ByteArray,
    b: ByteArray,
): DoubleArray {
    val cells = DoubleArray(GRID * GRID)
    for (y in 0 until BOARD_PX) {
        val row = (y / CELL) * GRID
        for (x in 0 until BOARD_PX) {
            val d = (a[y * BOARD_PX + x].toInt() and MASK) - (b[y * BOARD_PX + x].toInt() and MASK)
            cells[row + x / CELL] += if (d < 0) (-d).toDouble() else d.toDouble()
        }
    }
    for (i in cells.indices) cells[i] /= (CELL * CELL).toDouble()
    val median = cells.sorted()[cells.size / 2]
    for (i in cells.indices) cells[i] = maxOf(0.0, cells[i] - median)
    return cells
}

fun peak(deltas: DoubleArray): Double = deltas.max()

/** The upper quartile estimates noise because a move touches only two to four of 64 cells. */
fun busyLevel(deltas: DoubleArray): Double = deltas.sorted()[deltas.size * UPPER_QUARTILE_NUM / UPPER_QUARTILE_DEN]

private const val UPPER_QUARTILE_NUM = 3
private const val UPPER_QUARTILE_DEN = 4
