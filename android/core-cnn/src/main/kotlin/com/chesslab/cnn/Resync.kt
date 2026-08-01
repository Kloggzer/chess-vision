package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board
import kotlin.math.max

/**
 * Port of `cnn_recovery.py:386 resync_check` — whole-board (unlike `verifyMove`, which is
 * local). Conflicts are iterated in [ALL_SQUARES] order. `move` is set only when exactly one
 * legal move sufficiently explains the observation.
 */
fun CnnRecovery.resyncCheckFull(
    board: Board,
    obs: OccupancyObservation,
): ResyncCheck {
    val confident = obs.confidentSquares(config.confThr).toSet()
    val believed = expectedOccupancy(board)
    val conflicts = ALL_SQUARES.filter { it in confident && obs.occupied(it) != believed.getValue(it) }
    if (conflicts.isEmpty()) {
        return ResyncCheck(match = true, conflicts = emptyList(), move = null, agreement = FULL_AGREEMENT)
    }
    val scored = scoreMoves(board, obs)
    return ResyncCheck(
        match = false,
        conflicts = conflicts,
        move = scored.move?.let { uciOf(it) },
        agreement = max(scored.best, NO_AGREEMENT),
    )
}

/**
 * Port of `cnn_recovery.py:401 has_occupancy_conflict` — **the alarm gate**.
 *
 * True only when at least one conflict square disagrees on OCCUPANCY on the model's reliable
 * empty axis. Identity-only conflicts (right occupancy, wrong piece type — the known N/B/R
 * gap) are almost always CNN error, never evidence of an illegal move, and must NEVER alarm.
 */
fun hasOccupancyConflict(
    board: Board,
    obs: OccupancyObservation,
    confThr: Double,
    conflicts: Collection<String>,
): Boolean {
    val expected = expectedLabels(board)
    val identity = obs.label != null
    return conflicts.any { sq ->
        obs.pOcc.containsKey(sq) &&
            (if (identity) obs.labelConfident(sq, confThr) else obs.confident(sq, confThr)) &&
            (expected.getValue(sq) == "empty") != (if (identity) obs.label(sq) == "empty" else !obs.occupied(sq))
    }
}
