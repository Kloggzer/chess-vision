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
    /**
     * Set when this record BEGINS at a seam — the engine committed something that did not fit the
     * previous record's line, so that record was closed and this one opened at the position after
     * the jump.
     *
     * Without it the loss is invisible: on 2026-07-28 one played game was stored as three files
     * whose `startFen`s were each several plies ahead of the previous file's last move, and nothing
     * in any of them said so. `Qxd4`, `Qe5+` and `Be7` are in no file at all. Reading the three as
     * one game silently skips them; reading them separately looks like three games that each began
     * mid-position for no reason.
     */
    val openedBySeam: SeamOrigin? = null,
)

/** What was committed at a seam, and by which path — see [StoredGame.openedBySeam]. */
@Serializable
data class SeamOrigin(
    /** The record this one continues from, so the fragments can be chained back together. */
    val previousId: String?,
    /** The position the previous record ended on. */
    val fenBefore: String,
    /** SANs of the plies that caused the jump. They appear in NO record's move list. */
    val sans: List<String>,
    val ucis: List<String>,
    /** Almost always `cnn_recovery`: recovery is what jumps off the line. */
    val decider: String,
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

/**
 * 07b's `DebugDecision` minus the pixels — why the tracker believed this move happened.
 *
 * Everything below [priorUsed] defaults to empty because the evidence rides on the debug payload,
 * which is off by default, while the DECIDER is stated on the commit event itself and is therefore
 * always known. Recording the decider alone is what separates "the pair path committed this" from
 * "recovery caught up here" when reading a stored game — the question the evidence fields cannot
 * answer anyway.
 */
@Serializable
data class MoveProvenance(
    val decider: String,
    val reason: String,
    val priorUsed: Boolean,
    val best: Double = 0.0,
    val second: Double = 0.0,
    val margin: Double = 0.0,
    val changed: List<String> = emptyList(),
    val shadowVetoed: List<String> = emptyList(),
    val occludedVetoed: List<String> = emptyList(),
    val cnnAgreement: Double = 0.0,
    val verifyOutcomes: List<String> = emptyList(),
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
