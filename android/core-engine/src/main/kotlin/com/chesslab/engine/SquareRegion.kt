package com.chesslab.engine

import kotlin.math.max

/** Default inset of a square region, as a fraction of the cell (Python `square_region`, `:119`). */
internal const val SQUARE_REGION_INSET: Double = 0.16

// Indices into the `intArrayOf(x0, y0, x1, y1)` returned by [squareRegion].
private const val X0 = 0
private const val Y0 = 1
private const val X1 = 2
private const val Y1 = 3

/** Parallel arrays for all 64 boxes, in Squares.ALL order. area == 0 for degenerate boxes. */
internal class SquareBoxes(
    val x0: IntArray,
    val y0: IntArray,
    val x1: IntArray,
    val y1: IntArray,
    val area: IntArray,
)

/**
 * Pre-computes all 64 square-region boxes. Python `_square_boxes` (`tracker.py:99`).
 *
 * Extended boxes may overlap their neighbours — that is intended (3D pieces protrude toward the
 * back rank; the soft LL scoring tolerates it). Never de-overlap, never clamp `y1`.
 */
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
        val r = squareRegion(Squares.ALL[i], boardSize, whitePov, extendUp = extendUp)
        val bx0 = r[X0]
        val by0 = r[Y0]
        val bx1 = r[X1]
        val by1 = r[Y1]
        x0[i] = bx0
        y0[i] = by0
        x1[i] = bx1
        y1[i] = by1
        area[i] = if (by1 > by0 && bx1 > bx0) (bx1 - bx0) * (by1 - by0) else 0
    }
    return SquareBoxes(x0, y0, x1, y1, area)
}

/** Returns intArrayOf(x0, y0, x1, y1). Python square_region (tracker.py:119). */
internal fun squareRegion(
    square: String,
    boardSize: Int,
    whitePov: Boolean,
    inset: Double = SQUARE_REGION_INSET,
    extendUp: Double = 0.0,
): IntArray {
    val packed = Squares.colRow(square, whitePov)
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

/** intArrayOf(cx, cy). Python square_center (tracker.py:133). */
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
