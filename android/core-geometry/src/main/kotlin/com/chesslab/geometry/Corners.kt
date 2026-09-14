package com.chesslab.geometry

// Corner order, board geometry value type and the square -> (col, row) mapping.
// Port of `src/chesslab/calibration.py` (`_square_to_col_row` :329, `CalibrationProfile`
// geometry fields) and `src/chesslab/config.py` (`CROP` :40-65).
//
// OpenCV-free ON PURPOSE: phase 03 consumes `squareRegion` (CropBox.kt) without dragging
// native libraries into `:core-engine`'s test runtime.

/** A chess board has 8x8 squares. */
internal const val BOARD_SIDE: Int = 8

/** Board side as a double, so `cell = boardSize / BOARD_SIDE_D`. */
internal const val BOARD_SIDE_D: Double = 8.0

/** Half, for cell-centre arithmetic. */
internal const val HALF: Double = 0.5

/** File letters, index = column in the rectified image when `whitePov`. */
internal const val FILES: String = "abcdefgh"

/** Number of board corners. */
internal const val CORNER_COUNT: Int = 4

/**
 * A scalar -> the four per-corner margins, `[a8, h8, h1, a1]`.
 *
 * Port of `calibration.py margins4`. The uniform case stays a one-liner at every call site,
 * which is what keeps the four-value form from being a burden.
 */
fun margins4(margin: Double): List<Double> = listOf(margin, margin, margin, margin)

/**
 * What the Python `CalibrationProfile` contributes to geometry. This module never reads YAML;
 * the app maps its stored profile onto this value type.
 *
 * Defaults are `config.DEFAULT_BOARD_SIZE` and `config.CROP` (`config.py:40-65`).
 */
data class BoardGeometry(
    /** `config.DEFAULT_BOARD_SIZE`. */
    val boardSize: Int = 1600,
    /**
     * Markers sit this fraction OUTSIDE the playing field — one value PER CORNER, in
     * `[a8, h8, h1, a1]` order.
     *
     * Four rather than one because the markers are glued on by hand: re-sticking them moves
     * each independently, and a single number then has to average an error it cannot express.
     * Write `margins4(0.045)` for the uniform case.
     */
    val margin: List<Double> = margins4(0.0),
    val whitePov: Boolean = true,
    /**
     * `config.CROP.pad_side` — symmetric expansion in all 4 directions, * cell.
     *
     * 0.05 since specs/45, following Python: every crop the models were trained on was cut at
     * 0.05, and a default of 0.10 meant a freshly calibrated device served 1.20-cell boxes to a
     * model trained on 1.10-cell ones. It is only the fallback — the loaded model's own
     * declaration wins (`withCropOf`), which is what also fixes profiles stored before that.
     */
    val padSide: Double = 0.05,
    /** `config.CROP.out_w` (config.py:59). */
    val outW: Int = 128,
    /** `config.CROP.out_h` (config.py:60). */
    val outH: Int = 128,
    val markerDict: String = "DICT_4X4_50",
) {
    /** Edge length of one board square in the rectified `boardSize` image. */
    val cell: Double get() = boardSize / BOARD_SIDE_D
}

/**
 * `'e4' -> (col, row)` in the rectified image, origin top-left.
 * Port of `calibration.py:329 _square_to_col_row`.
 *
 * file a..h -> col 0..7, rank 8..1 -> row 0..7; rotated 180 degrees when `!whitePov`.
 */
fun squareToColRow(
    square: String,
    whitePov: Boolean,
): Pair<Int, Int> {
    val sq = square.trim().lowercase()
    require(sq.length == 2 && sq[0] in FILES && sq[1].isDigit()) { "invalid square: '$square'" }
    val rank = sq[1] - '0'
    require(rank in 1..BOARD_SIDE) { "invalid rank: '$square'" }
    val col = FILES.indexOf(sq[0])
    val row = BOARD_SIDE - rank
    return if (whitePov) {
        col to row
    } else {
        (BOARD_SIDE - 1 - col) to (BOARD_SIDE - 1 - row)
    }
}

/**
 * The flat `FloatArray(8)` of the API seam (`FrameInput.corners`) -> the corner list this
 * module works with, in `[a8, h8, h1, a1]` order.
 */
fun cornersFromFlat(flat: FloatArray): List<DoubleArray> {
    require(flat.size == CORNER_COUNT * 2) { "corners must be 8 floats, got ${flat.size}" }
    return (0 until CORNER_COUNT).map { i ->
        doubleArrayOf(flat[i * 2].toDouble(), flat[i * 2 + 1].toDouble())
    }
}

/** Inverse of [cornersFromFlat]. */
fun cornersToFlat(corners: List<DoubleArray>): FloatArray {
    require(corners.size == CORNER_COUNT) { "corners must be 4 points, got ${corners.size}" }
    val out = FloatArray(CORNER_COUNT * 2)
    for (i in 0 until CORNER_COUNT) {
        out[i * 2] = corners[i][0].toFloat()
        out[i * 2 + 1] = corners[i][1].toFloat()
    }
    return out
}
