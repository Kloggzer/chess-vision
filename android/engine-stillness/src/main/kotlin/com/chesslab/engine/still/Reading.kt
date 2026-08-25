package com.chesslab.engine.still

import com.chesslab.engine.api.CnnSnapshot

/**
 * `a1, b1, ..., h8` — rank-major from rank 1.
 *
 * The same order as chesslib's `Square.squareAt`, which is what the search indexes by, and as the
 * classifier's crop order. `ReadingOrderTest` asserts the first of those; a silent offset by one
 * rank would be a tracker that looks plausible and commits the wrong moves.
 */
internal val BOARD_SQUARES: List<String> = (1..8).flatMap { rank -> "abcdefgh".map { "$it$rank" } }

/**
 * One classifier reading in the shape the search wants: the full distribution per square, and
 * coverage beside it rather than inside it.
 *
 * Square order is `a1..h8`, which is both `BOARD_SQUARES` and chesslib's `Square.squareAt` — the
 * search indexes by the latter, so a divergence here would be a tracker that looks plausible and
 * finds the wrong moves. [ORDER_HOLDS] is where that is asserted.
 */
internal class Reading(
    val classes: List<String>,
    val rows: Array<DoubleArray>,
    val coverage: DoubleArray,
) {
    fun coveredSquares(gate: Double): List<String> = BOARD_SQUARES.filterIndexed { i, _ -> coverage[i] > gate }

    companion object {
        /**
         * The reading, or null when this snapshot carries no distribution — a model without one, or
         * a cached observation from a replay's visual cache. Better nothing than a uniform guess.
         */
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
