package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board
import kotlin.math.max

/** Whole-board, unlike `verifyMove`. `move` is set only when exactly one legal move explains the observation. */
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

/** **The alarm gate**: only an OCCUPANCY disagreement on the reliable empty axis. Identity-only conflicts
 *  (the known N/B/R gap) are almost always CNN error and must NEVER alarm. */
fun hasOccupancyConflict(
    board: Board,
    obs: OccupancyObservation,
    confThr: Double,
    conflicts: Collection<String>,
): Boolean {
    val expected = expectedLabels(board)
    return conflicts.any { sq ->
        obs.pOcc.containsKey(sq) && obs.confident(sq, confThr) && (expected.getValue(sq) == "empty") != !obs.occupied(sq)
    }
}
