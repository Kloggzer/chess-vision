package com.chesslab.engine

private const val BYTE_MASK = 0xFF

/** Interleaved channels of a [com.chesslab.engine.api.BgrImage]. */
internal const val CHANNELS = 3

/** Unsigned 0..255 value of an image byte. */
internal fun Byte.px(): Int = toInt() and BYTE_MASK

/** Pixel box of one square in the rectified board image. Degenerate boxes have area 0. */
data class Box(
    val x0: Int,
    val y0: Int,
    val x1: Int,
    val y1: Int,
) {
    val area: Int get() = if (x1 > x0 && y1 > y0) (x1 - x0) * (y1 - y0) else 0
}

/** Rectified-board geometry shared by all per-square functions (ports tracker.py:68). */
data class BoardGeometry(
    val boardSize: Int,
    val whitePov: Boolean = true,
    val extendUp: Double = 0.0,
)

/** Square helpers ported from tracker.py / calibration.py (`_ALL`, `_square_to_col_row`, `square_region`). */
object Squares {
    private const val DIM = 8
    private const val FILES = "abcdefgh"
    private const val DEFAULT_INSET = 0.16

    /** All 64 squares in the canonical order of tracker.py `_ALL` (a1, b1, ..., h8). */
    val all: List<String> = (1..DIM).flatMap { r -> FILES.map { f -> "$f$r" } }

    /** Orthogonal neighbours per square (ports tracker.py `_SQ_NEIGHBOURS`). */
    val neighbours: Map<String, List<String>> = all.associateWith { sq ->
        val f = FILES.indexOf(sq[0])
        val r = sq[1].digitToInt()
        buildList {
            if (r < DIM) add("${sq[0]}${r + 1}")
            if (r > 1) add("${sq[0]}${r - 1}")
            if (f > 0) add("${FILES[f - 1]}$r")
            if (f < DIM - 1) add("${FILES[f + 1]}$r")
        }
    }

    /** Square 'e4' -> (col, row) in the rectified image, origin top left (calibration.py:225). */
    fun colRow(square: String, whitePov: Boolean): Pair<Int, Int> {
        val sq = square.trim().lowercase()
        require(sq.length == 2 && sq[0] in FILES && sq[1] in '1'..'8') { "invalid square: $square" }
        val col = FILES.indexOf(sq[0])
        val row = DIM - sq[1].digitToInt()
        return if (whitePov) col to row else (DIM - 1 - col) to (DIM - 1 - row)
    }

    /**
     * Pixel box of the cell, slightly inset; `extendUp` (fraction of cell) extends the box toward
     * the top of the image — 3D pieces protrude there (ports tracker.py:68 `square_region`).
     */
    fun region(square: String, geom: BoardGeometry, inset: Double = DEFAULT_INSET): Box {
        val (col, row) = colRow(square, geom.whitePov)
        val cell = geom.boardSize / DIM.toDouble()
        val m = cell * inset
        val y0 = row * cell + m - geom.extendUp * cell
        return Box(
            (col * cell + m).toInt(),
            maxOf(0, y0.toInt()),
            ((col + 1) * cell - m).toInt(),
            ((row + 1) * cell - m).toInt(),
        )
    }

    /** All 64 boxes in `all` order (ports tracker.py:48 `_square_boxes`). */
    fun boxes(geom: BoardGeometry): List<Box> = all.map { region(it, geom) }
}
