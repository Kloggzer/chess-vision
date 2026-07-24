package com.chesslab.geometry

import kotlin.math.max
import kotlin.math.min

// Per-square boxes in the rectified board image. Ports of `calibration.py:347
// square_to_crop_box`, `:377 square_center`, `:384 crop_border_px` and
// `tracker.py:120 square_region`.
//
// OpenCV-free ON PURPOSE (see Corners.kt).

/** `config.CROP_WARP_BORDER_CELLS` (config.py:70) — minimum crop-warp border in cells. */
const val CROP_WARP_BORDER_CELLS: Double = 0.1

/** Default inset of `square_region` (tracker.py:120) — guards against grid-line/neighbour noise. */
const val SQUARE_REGION_INSET: Double = 0.16

/**
 * Python's `round()` on a float: half-to-EVEN (banker's rounding), which on the JVM is
 * `Math.rint`. NOT `Math.round` (half-up) and not `Double.roundToInt` (half-away-from-zero).
 */
internal fun pyRound(v: Double): Int = Math.rint(v).toInt()

/**
 * `'e4' -> (x0, y0, x1, y1)` in the rectified `boardSize` image.
 * Port of `calibration.py:347 square_to_crop_box`.
 *
 * The base cell is expanded symmetrically by `padSide * cell` and additionally upward by
 * `padUp * cell`. `clamp = true` clips to the image (box may shrink); `clamp = false` returns
 * the raw box — `cropSquare` then pads the overhang with black so the box geometry is
 * constant across all 64 squares.
 */
fun squareToCropBox(
    square: String,
    geom: BoardGeometry,
    clamp: Boolean = true,
): IntArray {
    val (col, row) = squareToColRow(square, geom.whitePov)
    val cell = geom.cell
    val bs = geom.boardSize.toDouble()
    val x0 = col * cell - geom.padSide * cell
    val x1 = (col + 1) * cell + geom.padSide * cell
    val y0 = row * cell - geom.padSide * cell - geom.padUp * cell
    val y1 = (row + 1) * cell + geom.padSide * cell

    fun fix(v: Double): Int = pyRound(if (clamp) max(0.0, min(bs, v)) else v)

    return intArrayOf(fix(x0), fix(y0), fix(x1), fix(y1))
}

/**
 * Border in pixels the board is warped with for the DATA crop, so edge squares have real
 * content for their `padSide`/`padUp` extension. Port of `calibration.py:384 crop_border_px`.
 *
 * Defaults (`boardSize = 1600`, `padSide = 0.10`, `cell = 200`): `0.10 * 200.0 = 20`.
 */
fun cropBorderPx(geom: BoardGeometry): Int = pyRound(max(CROP_WARP_BORDER_CELLS, max(geom.padSide, geom.padUp)) * geom.cell)

/** Pixel centre of the base cell. Port of `calibration.py:377 square_center`. */
fun squareCenter(
    square: String,
    geom: BoardGeometry,
): IntArray {
    val (col, row) = squareToColRow(square, geom.whitePov)
    val cell = geom.cell
    return intArrayOf(((col + HALF) * cell).toInt(), ((row + HALF) * cell).toInt())
}

/**
 * Pixel box `(x0, y0, x1, y1)` of the cell in a `boardSize` rectified image, slightly INSET
 * against grid-line/neighbour noise. Port of `tracker.py:120 square_region` — this is the
 * region the detection evidence is measured over, NOT the crop box.
 *
 * `extendUp` (fraction of a cell) extends the box toward the top of the image; extended cells
 * may overlap, which the soft LL scoring tolerates. Truncation (`int()`), not rounding.
 */
fun squareRegion(
    square: String,
    boardSize: Int,
    whitePov: Boolean,
    inset: Double = SQUARE_REGION_INSET,
    extendUp: Double = 0.0,
): IntArray {
    val (col, row) = squareToColRow(square, whitePov)
    val cell = boardSize / BOARD_SIDE_D
    val m = cell * inset
    val y0 = row * cell + m - extendUp * cell
    return intArrayOf(
        (col * cell + m).toInt(),
        max(0, y0.toInt()),
        ((col + 1) * cell - m).toInt(),
        ((row + 1) * cell - m).toInt(),
    )
}
