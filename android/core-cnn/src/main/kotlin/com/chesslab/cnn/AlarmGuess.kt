package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board

/**
 * Port of `cnn_recovery.py:415 guess_illegal_move`. Exactly ONE source (observed empty, expected
 * non-empty) and exactly ONE destination (observed non-empty, expected empty) yield a uci-LIKE
 * string — **no legality is implied**. Any other pattern -> null.
 * Shape AND confidence are occupancy: read off the identity axis, a destination the classes call
 * 90 % occupied but split between two piece types was invisible and the alarm lost its move shape.
 */
fun guessIllegalMove(
    board: Board,
    obs: OccupancyObservation,
    confThr: Double,
): String? {
    val expected = expectedLabels(board)

    fun sure(sq: String) = obs.confident(sq, confThr)

    fun seenEmpty(sq: String) = !obs.occupied(sq)
    val conflicts =
        expected.keys.filter { sq ->
            obs.pOcc.containsKey(sq) && sure(sq) && seenEmpty(sq) != (expected.getValue(sq) == "empty")
        }
    val sources = conflicts.filter { seenEmpty(it) }
    val destinations = conflicts.filterNot { seenEmpty(it) }
    return if (sources.size == 1 && destinations.size == 1) "${sources.first()}${destinations.first()}" else null
}
