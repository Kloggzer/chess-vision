package com.chesslab.tracker.spectate

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerStatus
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Side
import kotlinx.serialization.Serializable

/** One committed ply, as the wire needs it. Deliberately not `ui.tracking.MoveEntry`: that carries decider provenance. */
data class PlayedMove(
    val san: String,
    val uci: String,
)

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

/** Fold the tracker's public status and the committed plies into the wire projection. */
fun gameSnapshot(
    status: TrackerStatus?,
    moves: List<PlayedMove>,
    nowMs: Long,
): GameSnapshot {
    val fen = status?.fen ?: STARTPOS
    val result = outcome(fen)
    return GameSnapshot(
        fen = fen,
        sanHistory = moves.map { it.san },
        lastMoveUci = moves.lastOrNull()?.uci,
        status = spectatorStatus(status, moves.size, result),
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

/** `null` while the game is live. A malformed FEN is "live", never a fabricated result. */
private fun outcome(fen: String): String? =
    runCatching {
        val board = Board().apply { loadFromFen(fen) }
        when {
            board.isMated -> if (board.sideToMove == Side.WHITE) "0-1" else "1-0"
            board.isStaleMate || board.isDraw -> "1/2-1/2"
            else -> null
        }
    }.getOrNull()
