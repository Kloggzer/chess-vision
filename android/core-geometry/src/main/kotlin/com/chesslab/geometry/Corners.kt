package com.chesslab.geometry

// OpenCV-free ON PURPOSE: `:core-engine` consumes `squareRegion` without native libraries in its test runtime.

internal const val BOARD_SIDE: Int = 8

internal const val BOARD_SIDE_D: Double = 8.0

internal const val HALF: Double = 0.5

internal const val FILES: String = "abcdefgh"

internal const val CORNER_COUNT: Int = 4

fun margins4(margin: Double): List<Double> = listOf(margin, margin, margin, margin)

/** The app maps its stored profile onto this; this module never reads YAML. */
data class BoardGeometry(
    val boardSize: Int = 1600,
    /** Per corner (`[a8, h8, h1, a1]`): markers are glued by hand and move independently when re-stuck. */
    val margin: List<Double> = margins4(0.0),
    val whitePov: Boolean = true,
    /** 0.05 since specs/45: every training crop was cut at 0.05, and 0.10 served 1.20-cell boxes to a model trained
     *  on 1.10. Only the fallback — the model's declaration wins (`withCropOf`). */
    val padSide: Double = 0.05,
    val outW: Int = 128,
    val outH: Int = 128,
    val markerDict: String = "DICT_4X4_50",
) {
    val cell: Double get() = boardSize / BOARD_SIDE_D
}

/** file a..h -> col 0..7, rank 8..1 -> row 0..7; rotated 180 degrees when `!whitePov`. */
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

/** The API seam's flat `FloatArray(8)` -> corners in `[a8, h8, h1, a1]` order. */
fun cornersFromFlat(flat: FloatArray): List<DoubleArray> {
    require(flat.size == CORNER_COUNT * 2) { "corners must be 8 floats, got ${flat.size}" }
    return (0 until CORNER_COUNT).map { i ->
        doubleArrayOf(flat[i * 2].toDouble(), flat[i * 2 + 1].toDouble())
    }
}

fun cornersToFlat(corners: List<DoubleArray>): FloatArray {
    require(corners.size == CORNER_COUNT) { "corners must be 4 points, got ${corners.size}" }
    val out = FloatArray(CORNER_COUNT * 2)
    for (i in 0 until CORNER_COUNT) {
        out[i * 2] = corners[i][0].toFloat()
        out[i * 2 + 1] = corners[i][1].toFloat()
    }
    return out
}
