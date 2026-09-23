package com.chesslab.tracker.games

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Side
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonObject

/** `ignoreUnknownKeys` lets a field be retired without making every older file unreadable. */
val GAMES_JSON: Json =
    Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        prettyPrint = false
    }

/** Migrates the pre-segment format: a file with `openedBySeam` reads as one segment carrying its seam, which
 *  `ignoreUnknownKeys` would drop on the first read. Closing seams is [GameStore.open]'s job. */
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

@Serializable
data class StoredGame(
    val id: String,
    // NOT assumed to be the start position: the tracker can be seeded with any FEN.
    val startFen: String,
    val startedAtEpochMs: Long,
    val finishedAtEpochMs: Long,
    // A game whose frames may later be sliced is worthless without it.
    val profileName: String,
    // "1-0" | "0-1" | "1/2-1/2" | "*"
    val result: String,
    /** Flattened across [segments]; NOT one legal line when the game contains a seam. */
    val moves: List<StoredMove>,
    val white: String = UNKNOWN,
    val black: String = UNKNOWN,
    val event: String = "chesslab",
    val sessionId: String? = null,
    /** One played game is ONE record even when the board jumped mid-game (a *seam*): a jump opens a new SEGMENT.
     *  Empty only on older records — read through [segmentsOrOne]. */
    val segments: List<GameSegment> = emptyList(),
    /** Null on every game written before tips existed. */
    val hints: HintRecord? = null,
)

@Serializable
data class GameSegment(
    val startFen: String,
    val moves: List<StoredMove>,
    /** Null on the first segment. */
    val enteredBy: SeamOrigin? = null,
)

@Serializable
data class SeamOrigin(
    /** Legacy only: a migrated pre-segment file keeps its chain. */
    val previousId: String? = null,
    val fenBefore: String,
    /** They appear in NO segment's move list. */
    val sans: List<String>,
    val ucis: List<String>,
    val decider: String,
    /** Depth [seamBridge] searched **without finding anything**: a failed search never changes, so it is skipped
     *  on the next open. The DEPTH, not a flag, so raising the limit re-opens the question. */
    val searchedPlies: Int = 0,
)

/** SAN **and** UCI: deriving one from the other needs the position, which a log consumer does not have. */
@Serializable
data class StoredMove(
    val ply: Int,
    val san: String,
    val uci: String,
    val tsEpochMs: Long,
    val provenance: MoveProvenance? = null,
    val hint: MoveHint? = null,
)

/** Bound to the POSITION, never the clock. */
@Serializable
data class MoveHint(
    /** The move the tip NAMED, not necessarily the one played. */
    val san: String,
    val uci: String,
    val followed: Boolean,
)

/** Its presence is the point: a ply with no [StoredMove.hint] in a game without this is unrecorded, not
 *  unaided — an unmeasured cell read as zero. */
@Serializable
data class HintRecord(
    val side: String? = null,
    val quota: Int = 0,
    val delivered: Int = 0,
)

enum class HintStatus { NOT_RECORDED, NONE, GIVEN, FOLLOWED }

fun hintStatus(
    recorded: Boolean,
    hint: MoveHint?,
): HintStatus =
    when {
        !recorded -> HintStatus.NOT_RECORDED
        hint == null -> HintStatus.NONE
        hint.followed -> HintStatus.FOLLOWED
        else -> HintStatus.GIVEN
    }

/** Evidence defaults empty because it rides on the debug payload (off by default); the DECIDER is always known. */
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

/** `list()` reads only these, so opening the library never parses a whole game. */
@Serializable
data class GameSummary(
    val id: String,
    val startedAtEpochMs: Long,
    val moveCount: Int,
    val result: String,
    val white: String,
    val black: String,
    val sessionId: String? = null,
    /** A game the app rebuilt twice is not the same evidence as one it tracked cleanly. */
    val seams: Int = 0,
    /** So editing details never silently resets a custom PGN event. */
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

fun StoredGame.segmentsOrOne(): List<GameSegment> = segments.ifEmpty { listOf(GameSegment(startFen, moves, null)) }

/** The tag is the PGN spelling kept on disk. A string made "Game in progress" the only word for a stopped game. */
enum class GameResult(
    val tag: String,
) {
    WHITE("1-0"),
    BLACK("0-1"),
    DRAW("1/2-1/2"),
    UNFINISHED("*"),
    ;

    companion object {
        /** An old or hand-edited file may hold anything. */
        fun of(tag: String): GameResult = entries.firstOrNull { it.tag == tag } ?: UNFINISHED
    }
}

/** `*` is the honest default: a tracked game normally ends because the players stopped. */
fun resultFromFen(fen: String): GameResult {
    val board = Board().apply { loadFromFen(fen) }
    return when {
        board.isMated -> if (board.sideToMove == Side.WHITE) GameResult.BLACK else GameResult.WHITE
        board.isDraw || board.isStaleMate -> GameResult.DRAW
        else -> GameResult.UNFINISHED
    }
}
