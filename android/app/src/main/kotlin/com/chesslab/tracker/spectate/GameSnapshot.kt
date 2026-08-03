package com.chesslab.tracker.spectate

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.resultFromFen
import kotlinx.serialization.Serializable

/**
 * Everything a spectator is allowed to know.
 *
 * The field list is the security model, not a convenience: no z values, no census, no CNN reads,
 * no crops, no decider, no config, no device info. A spectator page is not a debug surface, and a
 * debug payload on an open LAN cannot be un-leaked.
 */
@Serializable
data class GameSnapshot(
    val fen: String = STARTPOS,
    val sanHistory: List<String> = emptyList(),
    val lastMoveUci: String? = null,
    val status: String = STATUS_WAITING,
    val result: String? = null,
    val updatedAtEpochMs: Long = 0L,
)

const val STATUS_WAITING = "waiting"
const val STATUS_TRACKING = "tracking"
const val STATUS_STUCK = "stuck"
const val STATUS_ALARM = "alarm"
const val STATUS_OVER = "over"

/**
 * Fold the tracker's public status and the ONE live game into the wire projection.
 *
 * [game] is the same `GameView` the review screen renders — the spectator page is a second
 * RENDERER of one projection, never a second projection.
 */
fun gameSnapshot(
    status: TrackerStatus?,
    game: GameView,
    nowMs: Long,
): GameSnapshot {
    val fen = status?.fen ?: STARTPOS
    val result = outcome(fen)
    val plies = game.plies
    return GameSnapshot(
        fen = fen,
        sanHistory = plies.map { it.san },
        lastMoveUci = plies.lastOrNull()?.uci,
        status = spectatorStatus(status, plies.size, result),
        result = result,
        updatedAtEpochMs = nowMs,
    )
}

/**
 * The engine's four internal states collapse to what a watcher can act on. An alarm becomes the
 * single word "alarm" — never the conflict list, which is engine internals by another name.
 */
private fun spectatorStatus(
    status: TrackerStatus?,
    moveCount: Int,
    result: String?,
): String =
    when {
        result != null -> STATUS_OVER
        status == null -> STATUS_WAITING
        status.alarm != null -> STATUS_ALARM
        status.stuckReason != null -> STATUS_STUCK
        moveCount == 0 -> STATUS_WAITING
        else -> STATUS_TRACKING
    }

/**
 * `null` while the game is live. A malformed FEN is "live", never a fabricated result.
 *
 * [resultFromFen] is the library's own rule and returns `*` for a game still running; this only
 * turns that into the null the wire uses. It used to be a second copy of the same board reading.
 */
private fun outcome(fen: String): String? = runCatching { resultFromFen(fen) }.getOrNull()?.takeIf { it != "*" }
