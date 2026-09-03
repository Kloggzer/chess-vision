package com.chesslab.engine.board

import com.chesslab.engine.api.CnnSnapshot

/** Rank-major a1..h8 must match chesslib `Square.squareAt` and classifier crop order. */
val BOARD_SQUARES: List<String> = (1..8).flatMap { rank -> "abcdefgh".map { "$it$rank" } }

/** Rows use [BOARD_SQUARES] order, which must match chesslib indexing and classifier crops. */
class Reading(
    val classes: List<String>,
    val rows: Array<DoubleArray>,
    val coverage: DoubleArray,
) {
    /** Blind squares stay separate from [coverage]: hands lift, but waiting on a blind spot deadlocks. */
    val blind = BooleanArray(BOARD_SQUARES.size)

    fun hide(squares: Set<String>) {
        if (squares.isEmpty()) return
        BOARD_SQUARES.forEachIndexed { i, name -> if (name in squares) blind[i] = true }
    }

    fun coveredSquares(gate: Double): List<String> = BOARD_SQUARES.filterIndexed { i, _ -> coverage[i] > gate }

    companion object {
        /** Missing distributions yield null rather than a fabricated uniform guess. */
        fun of(snap: CnnSnapshot): Reading? {
            val obs = snap.obs.rawObservation()
            val classes = obs.classNames
            if (classes.isEmpty()) return null
            val rows = Array(BOARD_SQUARES.size) { i -> obs.classProbs(BOARD_SQUARES[i]) }
            if (rows.any { it.size != classes.size }) return null
            val coverage = DoubleArray(BOARD_SQUARES.size) { i -> obs.pOccluded(BOARD_SQUARES[i]) }
            return Reading(classes, rows, coverage)
        }
    }
}
