package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Side
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator

/**
 * One ply, as every surface that shows a game reads it.
 *
 * [fenAfter] is carried rather than derived. It is what puts the board on this ply when the row is
 * tapped, and deriving it per row replays the whole game once per tap.
 */
data class ReviewPly(
    val ply: Int,
    val san: String,
    val uci: String,
    val fenAfter: String,
    /** Which tracker path committed it. Null on a game stored before provenance existed. */
    val decider: String?,
    /** What was told to the player before this ply. Null also means "never recorded" — the GAME
     *  answers which of the two through [GameView.hintsRecorded]. */
    val hint: MoveHint? = null,
)

/** One legal line inside a game — see [StoredGame.segments] for why a game is a list of them. */
data class ReviewSegment(
    val startFen: String,
    val plies: List<ReviewPly>,
    val enteredBy: SeamOrigin?,
)

/**
 * A game as the ONE review surface reads it.
 *
 * A running game and a finished one differ in [live] and in nothing else. That is the whole point
 * of this type: the spectator view and the after-game review were two screens that drifted apart,
 * and there is no second projection to drift.
 */
data class GameView(
    val id: String,
    val live: Boolean,
    val startFen: String,
    val result: String,
    val segments: List<ReviewSegment>,
    val white: String = UNKNOWN,
    val black: String = UNKNOWN,
    val event: String = "chesslab",
    val startedAtEpochMs: Long = 0L,
    /** Whether tips were watched for in this game at all — see [HintRecord]. */
    val hintsRecorded: Boolean = false,
) {
    /** Every ply in order, across segments — the flat list every reader wants. */
    val plies: List<ReviewPly> = segments.flatMap { it.plies }

    /** The position the board shows at [ply]; 0 is the start. */
    fun fenAt(ply: Int): String = plies.lastOrNull { it.ply <= ply }?.fenAfter ?: startFen

    /** What may be said about this ply's tip, tri-state — never "no tip" for an old game. */
    fun hintStatusOf(ply: ReviewPly): HintStatus = hintStatus(hintsRecorded, ply.hint)

    companion object {
        /** No game: what the spectator serves before the first move, and what an unbound service has. */
        val NONE = GameView(id = "", live = true, startFen = STARTPOS, result = "*", segments = emptyList())
    }
}

/** The ARCHIVE source: a stored game replayed so every ply carries the position it produced. */
fun StoredGame.reviewView(): GameView =
    GameView(
        id = id,
        live = false,
        startFen = startFen,
        result = result,
        segments = segmentsOrOne().map { it.replay() },
        white = white,
        black = black,
        event = event,
        startedAtEpochMs = startedAtEpochMs,
        hintsRecorded = hints != null,
    )

/**
 * An illegal ply cannot stop the review: a stored game may hold a line the engine's board once
 * accepted and chesslib now rejects, and a screen that refuses to open is worse than one that shows
 * the last position it could reach.
 *
 * The legality check is not optional and `doMove(move, fullValidation = true)` is not enough:
 * measured 2026-08-03, chesslib applies `e2e5` under both, silently teleporting the pawn, and every
 * position after it is a fabrication the screen would render as fact. Generating the legal moves is
 * what `LiveGame.continues` already does for the same reason. An unplayable ply is a no-op, so the
 * board stays on the last position the record can actually justify.
 */
private fun GameSegment.replay(): ReviewSegment {
    // Ein unlesbarer Start laesst `Board` LEER zurueck, nicht auf der Grundstellung: das Erzeugen
    // darunter warf dann aus dem Review-Screen heraus. Ohne lesbaren Start ist keine einzige
    // Folgestellung zu rechtfertigen, also bleibt jede auf dem, was der Record behauptet.
    val board = Board().takeIf { runCatching { it.loadFromFen(startFen) }.isSuccess }
    return ReviewSegment(
        startFen = startFen,
        plies =
            moves.map { move ->
                if (board != null && MoveGenerator.generateLegalMoves(board).any { it.toString() == move.uci }) {
                    runCatching { board.doMove(Move(move.uci, board.sideToMove)) }
                }
                ReviewPly(move.ply, move.san, move.uci, board?.fen ?: startFen, move.provenance?.decider, move.hint)
            },
        enteredBy = enteredBy,
    )
}

/**
 * True when the first ply from [fen] belongs to Black — a game or a segment adopted mid-position.
 * An unreadable FEN reads as White, which only mis-pairs a score sheet nothing else could render.
 */
fun startsWithBlack(fen: String): Boolean = runCatching { Board().apply { loadFromFen(fen) }.sideToMove == Side.BLACK }.getOrDefault(false)

/** A numbered row of the score sheet. [black] is null on the half-open last row. */
data class MoveRow(
    val number: Int,
    val white: ReviewPly?,
    val black: ReviewPly?,
)

/**
 * Pair the plies into numbered rows. [startsWithBlack] covers a game adopted mid-position
 * (`setFen`), where the first tracked ply belongs to Black.
 *
 * [startNumber] is that position's own full-move number ([startNumber]): rows that always began at
 * 1 put the same half-move on the sheet as `1...` and in the exported PGN as `12...`.
 */
fun moveRows(
    plies: List<ReviewPly>,
    startsWithBlack: Boolean = false,
    startNumber: Int = 1,
): List<MoveRow> {
    val slots = if (startsWithBlack) listOf<ReviewPly?>(null) + plies else plies
    return slots.chunked(2).mapIndexed { index, pair ->
        MoveRow(number = startNumber + index, white = pair.getOrNull(0), black = pair.getOrNull(1))
    }
}

/** The full-move number a position starts on — FEN field 5, the same one `PgnBuilder` reads. */
fun startNumber(fen: String): Int = fenFullmove(fen) ?: 1
