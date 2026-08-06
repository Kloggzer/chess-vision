package com.chesslab.tracker.games

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Side
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonObject

/**
 * One configuration for everything on disk. `ignoreUnknownKeys` is what lets a field be retired
 * without making every older file unreadable — see [decodeStoredGame].
 */
val GAMES_JSON: Json =
    Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        prettyPrint = false
    }

/**
 * Reads a stored game, migrating the pre-segment format.
 *
 * Until `12a4422`+this change a seam CLOSED the record and opened a new one, and the new file
 * carried `openedBySeam`. Such a file is one legal line from its own `startFen`, so it reads as
 * exactly one segment — carrying its seam, which is the only record of the plies that caused it.
 * `ignoreUnknownKeys` would otherwise drop that field silently on the first read and the next
 * write would erase it from disk.
 */
fun decodeStoredGame(text: String): StoredGame {
    val obj = GAMES_JSON.parseToJsonElement(text).jsonObject
    val game = GAMES_JSON.decodeFromJsonElement(StoredGame.serializer(), obj)
    if (game.segments.isNotEmpty()) return game
    val seam =
        obj["openedBySeam"]
            ?.takeIf { it !is JsonNull }
            ?.let { GAMES_JSON.decodeFromJsonElement(SeamOrigin.serializer(), it) }
    return game.copy(segments = listOf(GameSegment(game.startFen, game.moves, seam)))
}

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
    /**
     * Every ply of the game in order, flattened across [segments]. This is what a reader wants:
     * the move count, the list, the PGN move numbers within a segment. It is NOT one legal line
     * when the game contains a seam — [segments] is where legality lives.
     */
    val moves: List<StoredMove>,
    val white: String = UNKNOWN,
    val black: String = UNKNOWN,
    val event: String = "chesslab",
    // The session recording taken alongside, when there was one.
    val sessionId: String? = null,
    /**
     * The game as legal lines. One played game is ONE record even when the engine's board jumped
     * mid-game (a *seam*), because "eine Naht in der Game-Historie ist für mich als Nutzer
     * unverständlich" — on 2026-07-28 a single played game was stored as three files whose
     * `startFen`s were each several plies ahead of the previous file's last move.
     *
     * A jump breaks the "moves chain legally from `startFen`" invariant, so it opens a new SEGMENT
     * instead of a new record. Empty only on records written before segments existed; read those
     * through [segmentsOrOne].
     */
    val segments: List<GameSegment> = emptyList(),
)

/**
 * One legal line inside a game. The first starts at the game's own `startFen`; every later one was
 * [enteredBy] a jump the app could not account for.
 */
@Serializable
data class GameSegment(
    val startFen: String,
    val moves: List<StoredMove>,
    /** Null on the first segment. What was committed to get here, and by which decider. */
    val enteredBy: SeamOrigin? = null,
)

/** What was committed at a seam, and by which path — see [GameSegment.enteredBy]. */
@Serializable
data class SeamOrigin(
    /**
     * Legacy only. Until segments existed a seam CLOSED the record and opened another, and this
     * chained the fragments back together. A seam no longer crosses a record boundary, so nothing
     * writes it any more; it survives so a migrated pre-segment file keeps its chain.
     */
    val previousId: String? = null,
    /** The position the line before the seam ended on. */
    val fenBefore: String,
    /** SANs of the plies that caused the jump. They appear in NO segment's move list. */
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
    /**
     * How often the app lost the board and rebuilt it — the segments that were entered by a seam.
     * On the row because a game the app rebuilt twice is not the same evidence as one it tracked
     * cleanly, and the library listing must not have to open the game to say so.
     */
    val seams: Int = 0,
    /** Included in the index so editing details never silently resets a custom PGN event. */
    val event: String = "chesslab",
)

const val UNKNOWN: String = "?"

fun StoredGame.summary(): GameSummary =
    GameSummary(
        id = id,
        startedAtEpochMs = startedAtEpochMs,
        moveCount = moves.size,
        result = result,
        white = white,
        black = black,
        sessionId = sessionId,
        seams = segmentsOrOne().count { it.enteredBy != null },
        event = event,
    )

/**
 * The segments as every reader wants them: never empty. A [StoredGame] built directly (tests, an
 * old file that carried no seam) is one segment over its whole move list.
 */
fun StoredGame.segmentsOrOne(): List<GameSegment> = segments.ifEmpty { listOf(GameSegment(startFen, moves, null)) }

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
