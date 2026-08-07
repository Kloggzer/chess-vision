package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board

/**
 * Port of `cnn_recovery.py:415 guess_illegal_move`. Exactly ONE source (observed empty, expected
 * non-empty) and exactly ONE destination (observed non-empty, expected empty) yield a uci-LIKE
 * string — **no legality is implied**. Any other pattern -> null.
 *
 * **The shape test is occupancy, and always was.** It compares "empty vs not" on both sides and
 * never compares one piece name with another, so a square believed to hold a pawn and observed to
 * hold a knight is neither a source nor a destination and is ignored — identically before and
 * after this change. Only the CONFIDENCE was read off the identity axis, and the `label == null`
 * guard then discarded every observation from a 2-class run.
 *
 * So the axis is chosen per observation rather than demanded: identity when the run provides it
 * (13- and 14-class runs behave bit-identically, including that ignored wrong-piece case),
 * occupancy otherwise. Every run has an occupancy axis; swapping the model needs no edit here or
 * anywhere else.
 */
fun guessIllegalMove(
    board: Board,
    obs: OccupancyObservation,
    confThr: Double,
): String? {
    val expected = expectedLabels(board)
    val identity = obs.label != null && obs.conf != null

    fun sure(sq: String) = if (identity) obs.labelConfident(sq, confThr) else obs.confident(sq, confThr)

    fun seenEmpty(sq: String) = if (identity) obs.label(sq) == "empty" else !obs.occupied(sq)
    val conflicts =
        expected.keys.filter { sq ->
            obs.pOcc.containsKey(sq) && sure(sq) && seenEmpty(sq) != (expected.getValue(sq) == "empty")
        }
    val sources = conflicts.filter { seenEmpty(it) }
    val destinations = conflicts.filterNot { seenEmpty(it) }
    return if (sources.size == 1 && destinations.size == 1) "${sources.first()}${destinations.first()}" else null
}
