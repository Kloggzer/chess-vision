package com.chesslab.tracker.camera

import com.chesslab.engine.api.BgrImage

/**
 * Die Schaerfe des BRETTS: Laplace-Varianz je Feld, Median ueber die 64.
 *
 * Ueber das ganze Bild gerechnet misst sie Tisch, Zimmer und Hand mit — Haut ist texturarm und
 * zieht die Varianz wie Unschaerfe (`framescan.cell_sharpness`: ein scharfes Brett mit nacktem
 * Arm landete bei 17 statt 500). Der Median haelt auch, wenn eine Hand ein paar Felder verdeckt.
 */
fun meterSharpness(board: BgrImage): Float {
    val cell = board.width / SIDE
    require(cell >= MIN_CELL_PX) { "Brett zu klein fuer die Schaerfe: ${board.width}x${board.height}" }
    val luma = lumaOf(board)
    val values = FloatArray(CELLS)
    for (row in 0 until SIDE) {
        for (col in 0 until SIDE) {
            values[row * SIDE + col] = cellVariance(luma, board.width, board.height, col * cell, row * cell, cell)
        }
    }
    values.sort()
    return (values[CELLS / 2 - 1] + values[CELLS / 2]) / 2f
}

private fun lumaOf(board: BgrImage): IntArray {
    val out = IntArray(board.width * board.height)
    for (p in out.indices) {
        val i = p * 3
        val b = board.data[i].toInt() and BYTE
        val g = board.data[i + 1].toInt() and BYTE
        val r = board.data[i + 2].toInt() and BYTE
        out[p] = (B_WEIGHT * b + G_WEIGHT * g + R_WEIGHT * r).toInt()
    }
    return out
}

/** Streamend, ohne Zwischenebene: die Laplace-Ebene eines 512er-Bretts waere 1 MB je Messung. */
private fun cellVariance(
    luma: IntArray,
    width: Int,
    height: Int,
    x0: Int,
    y0: Int,
    cell: Int,
): Float {
    var sum = 0.0
    var squares = 0.0
    for (y in y0 until y0 + cell) {
        for (x in x0 until x0 + cell) {
            val v = laplacianAt(luma, width, height, x, y).toDouble()
            sum += v
            squares += v * v
        }
    }
    val n = (cell * cell).toDouble()
    return ((squares - sum * sum / n) / n).toFloat()
}

/** Der Kern von `cv2.Laplacian(ksize=1)`; am Bildrand geklemmt statt gespiegelt. */
private fun laplacianAt(
    luma: IntArray,
    width: Int,
    height: Int,
    x: Int,
    y: Int,
): Int {
    val row = y * width
    val left = luma[row + (x - 1).coerceAtLeast(0)]
    val right = luma[row + (x + 1).coerceAtMost(width - 1)]
    val up = luma[(y - 1).coerceAtLeast(0) * width + x]
    val down = luma[(y + 1).coerceAtMost(height - 1) * width + x]
    return left + right + up + down - 4 * luma[row + x]
}

private const val SIDE = 8
private const val CELLS = SIDE * SIDE
private const val BYTE = 0xFF

/** Unter dieser Feldgroesse misst der Kern mehr Nachbarfeld als Feld. */
private const val MIN_CELL_PX = 8
