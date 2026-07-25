package com.chesslab.tracker.games

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Side
import kotlinx.serialization.Serializable

/** What a finished game keeps beside its moves. Written by [GameStore], rendered by `buildPgn`. */
@Serializable
data class StoredGame(
    // "2026-07-24_1822" — human-sortable and also the file stem.
    val id: String,
    // NOT assumed to be the start position: the tracker can be seeded with any FEN.
    val startFen: String,
    val startedAtEpochMs: Long,
    val finishedAtEpochMs: Long,
    // The calibration profile that produced the geometry. A game whose frames you may later want
    // to slice is worthless without it.
    val profileName: String,
    // "1-0" | "0-1" | "1/2-1/2" | "*"
    val result: String,
    val moves: List<StoredMove>,
    val white: String = UNKNOWN,
    val black: String = UNKNOWN,
    val event: String = "chesslab",
    // The session recording taken alongside, when there was one.
    val sessionId: String? = null,
)

/**
 * SAN **and** UCI: SAN is what a human reads, UCI is what replays without a board — deriving one
 * from the other needs the position, which a PGN reader has and a log consumer does not.
 */
@Serializable
data class StoredMove(
    val ply: Int,
    val san: String,
    val uci: String,
    val tsEpochMs: Long,
    val provenance: MoveProvenance? = null,
)

/** 07b's `DebugDecision` minus the pixels — why the tracker believed this move happened. */
@Serializable
data class MoveProvenance(
    val decider: String,
    val reason: String,
    val priorUsed: Boolean,
    val best: Double,
    val second: Double,
    val margin: Double,
    val changed: List<String>,
    val shadowVetoed: List<String>,
    val occludedVetoed: List<String>,
    val cnnAgreement: Double,
    val verifyOutcomes: List<String>,
)

/** The index row. `list()` reads only these, so opening the library never parses a whole game. */
@Serializable
data class GameSummary(
    val id: String,
    val startedAtEpochMs: Long,
    val moveCount: Int,
    val result: String,
    val white: String,
    val black: String,
    val sessionId: String? = null,
)

const val UNKNOWN: String = "?"

fun StoredGame.summary(): GameSummary = GameSummary(id, startedAtEpochMs, moves.size, result, white, black, sessionId)

/**
 * The PGN result tag for a position. `*` (unfinished) is the honest default: a tracked game
 * normally ends because the players stopped, not because the board reached a terminal position.
 */
fun resultFromFen(fen: String): String {
    val board = Board().apply { loadFromFen(fen) }
    return when {
        board.isMated -> if (board.sideToMove == Side.WHITE) "0-1" else "1-0"
        board.isDraw || board.isStaleMate -> "1/2-1/2"
        else -> "*"
    }
}
