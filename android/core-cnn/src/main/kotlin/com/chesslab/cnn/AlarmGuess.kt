package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board

/** Exactly ONE source and ONE destination yield a uci-LIKE string — **no legality is implied**. Shape and
 *  confidence are OCCUPANCY: on the identity axis a destination split between two piece types was invisible. */
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
