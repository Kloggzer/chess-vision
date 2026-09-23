package com.chesslab.tracker.spectate

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.games.GameResult
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.resultFromFen
import kotlinx.serialization.Serializable

/** The field list is the security model: no z values, census, reads, crops, decider, config or device
 *  info — a debug payload on an open LAN cannot be un-leaked. */
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

/** [game] is the review screen's `GameView`: a second RENDERER of one projection, never a second projection. */
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

/** An alarm becomes the single word "alarm", never the conflict list (engine internals by another name). */
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

/** `null` while live. A malformed FEN is "live", never a fabricated result. */
private fun outcome(fen: String): String? =
    runCatching { resultFromFen(fen) }
        .getOrNull()
        ?.takeIf { it != GameResult.UNFINISHED }
        ?.tag
