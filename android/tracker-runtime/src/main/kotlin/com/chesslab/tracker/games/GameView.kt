package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.fenFullmove
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Side
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator

/** [fenAfter] is carried: deriving it replays the whole game once per tap. */
data class ReviewPly(
    val ply: Int,
    val san: String,
    val uci: String,
    val fenAfter: String,
    /** Null on a game stored before provenance existed. */
    val decider: String?,
    /** Null also means "never recorded" — [GameView.hintsRecorded] tells which. */
    val hint: MoveHint? = null,
)

data class ReviewSegment(
    val startFen: String,
    val plies: List<ReviewPly>,
    val enteredBy: SeamOrigin?,
)

/** A running game and a finished one differ in [live] and nothing else: two screens drifted apart before. */
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
    val hintsRecorded: Boolean = false,
) {
    val plies: List<ReviewPly> = segments.flatMap { it.plies }

    fun fenAt(ply: Int): String = plies.lastOrNull { it.ply <= ply }?.fenAfter ?: startFen

    companion object {
        val NONE = GameView(id = "", live = true, startFen = STARTPOS, result = "*", segments = emptyList())
    }
}

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

/** An illegal ply cannot stop the review, and `doMove(move, fullValidation = true)` is not enough: chesslib applies
 *  `e2e5`, teleporting the pawn. Legal moves are generated; an unplayable ply is a no-op. */
private fun GameSegment.replay(): ReviewSegment {
    // Ein unlesbarer Start laesst `Board` LEER zurueck, nicht auf der Grundstellung: das Erzeugen darunter warf.
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

/** An unreadable FEN reads as White, which only mis-pairs a score sheet nothing else could render. */
fun startsWithBlack(fen: String): Boolean = runCatching { Board().apply { loadFromFen(fen) }.sideToMove == Side.BLACK }.getOrDefault(false)

data class MoveRow(
    val number: Int,
    val white: ReviewPly?,
    val black: ReviewPly?,
)

/** [startNumber] is the position's own full-move number: rows always starting at 1 put `1...` on the sheet and
 *  `12...` in the PGN. */
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

/** FEN field 5, the same one `PgnBuilder` reads. */
fun startNumber(fen: String): Int = fenFullmove(fen) ?: 1
