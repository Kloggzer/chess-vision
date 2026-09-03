package com.chesslab.engine

import kotlin.math.max

/** Default inset as a fraction of one cell. */
internal const val SQUARE_REGION_INSET: Double = 0.16

private const val X0 = 0
private const val Y0 = 1
private const val X1 = 2
private const val Y1 = 3

internal class SquareBoxes(
    val x0: IntArray,
    val y0: IntArray,
    val x1: IntArray,
    val y1: IntArray,
    val area: IntArray,
)

/** 3D pieces protrude toward the back rank, so extended boxes may overlap; never clamp `y1`. */
internal fun squareBoxes(
    boardSize: Int,
    whitePov: Boolean,
    extendUp: Double = 0.0,
): SquareBoxes {
    val n = Squares.COUNT
    val x0 = IntArray(n)
    val y0 = IntArray(n)
    val x1 = IntArray(n)
    val y1 = IntArray(n)
    val area = IntArray(n)
    for (i in 0 until n) {
        val r = squareRegion(i, boardSize, whitePov, extendUp = extendUp)
        x0[i] = r[X0]
        y0[i] = r[Y0]
        x1[i] = r[X1]
        y1[i] = r[Y1]
        area[i] = if (r[Y1] > r[Y0] && r[X1] > r[X0]) (r[X1] - r[X0]) * (r[Y1] - r[Y0]) else 0
    }
    return SquareBoxes(x0, y0, x1, y1, area)
}

internal fun squareRegion(
    index: Int,
    boardSize: Int,
    whitePov: Boolean,
    inset: Double = SQUARE_REGION_INSET,
    extendUp: Double = 0.0,
): IntArray {
    val packed = Squares.colRow(index, whitePov)
    val col = Squares.colOf(packed)
    val row = Squares.rowOf(packed)
    val cell = boardSize / Squares.N.toDouble()
    val m = cell * inset
    val y0f = row * cell + m - extendUp * cell
    return intArrayOf(
        (col * cell + m).toInt(),
        max(0, y0f.toInt()),
        ((col + 1) * cell - m).toInt(),
        ((row + 1) * cell - m).toInt(),
    )
}

internal fun squareCenter(
    square: String,
    boardSize: Int,
    whitePov: Boolean,
): IntArray {
    val packed = Squares.colRow(square, whitePov)
    val col = Squares.colOf(packed)
    val row = Squares.rowOf(packed)
    val cell = boardSize / Squares.N.toDouble()
    val half = 0.5
    return intArrayOf(((col + half) * cell).toInt(), ((row + half) * cell).toInt())
}
