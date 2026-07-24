package com.chesslab.engine

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.CastleRight
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.Side
import com.github.bhlangonijr.chesslib.Square
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator
import com.github.bhlangonijr.chesslib.move.MoveList

/** Standard chess start position (python-chess `chess.STARTING_FEN`). */
internal const val STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

/**
 * The only place in `:core-engine` that knows `com.github.bhlangonijr.chesslib` beyond the
 * [Move] type. Everything else speaks lowercase `"a1".."h8"` square names.
 *
 * Python reference: the `chess.Board` usage in `src/chesslab/move_tracker/tracker.py`.
 * The wrapper is deliberately thin — no scoring, no classification, no state machine.
 */
internal class Game(
    fen: String = STARTPOS,
) {
    private val board = Board()

    init {
        board.loadFromFen(fen)
    }

    /**
     * Full FEN of the current position.
     *
     * `getFen(includeCounters = true, onlyOutputEnPassantIfCapturable = true)` mirrors
     * python-chess's `Board.fen()`, whose default is `en_passant="legal"`: the en-passant
     * target is printed only when a legal en-passant capture actually exists. chesslib's own
     * `getFen()` always prints it, which would make every double-pawn-push FEN differ from
     * Python's (see `STATUS.md` D02a-1).
     */
    fun fen(): String = board.getFen(true, true)

    val whiteToMove: Boolean get() = board.sideToMove == Side.WHITE

    fun legalMoves(): List<Move> = MoveGenerator.generateLegalMoves(board)

    fun push(move: Move) {
        board.doMove(move)
    }

    fun pop() {
        board.undoMove()
    }

    /** Piece FEN char at the square (`'P'..'k'`), or `null` when the square is empty. */
    fun pieceCharAt(square: String): Char? {
        val piece = board.getPiece(squareOf(square))
        return if (piece == null || piece == Piece.NONE) null else piece.fenSymbol.first()
    }

    /** True when the side still holds at least one castling right. */
    fun hasCastlingRights(white: Boolean): Boolean = board.getCastleRight(if (white) Side.WHITE else Side.BLACK) != CastleRight.NONE

    /**
     * SANs of a not-yet-pushed move sequence; the position is left untouched.
     * Python reference: `MoveTracker._san_sequence`.
     */
    fun sanSequence(moves: List<Move>): List<String> {
        val list = MoveList(fen())
        for (move in moves) list.add(move)
        return list.toSanArray().toList()
    }

    /** Check / checkmate / game-over flags of the current position. */
    fun result(): GameResult =
        GameResult(
            inCheck = board.isKingAttacked,
            checkmate = board.isMated,
            over = board.isMated || board.isDraw,
        )
}

/** Terminal-state flags of a position. */
internal data class GameResult(
    val inCheck: Boolean,
    val checkmate: Boolean,
    val over: Boolean,
)

/** Placement field of the FEN (the first token). 02c-style consumers key on it. */
internal fun Game.boardFen(): String = fen().substringBefore(' ')

/** `config.label_from_piece`: `'P' -> "wP"`, `'n' -> "bN"`, empty -> `"empty"`. */
internal fun Game.labelAt(square: String): String {
    val symbol = pieceCharAt(square) ?: return "empty"
    val prefix = if (symbol.isUpperCase()) "w" else "b"
    return "$prefix${symbol.uppercaseChar()}"
}

/** SAN of a legal move in the CURRENT position; the position is left untouched. */
internal fun Game.san(move: Move): String = sanSequence(listOf(move)).first()

/** A detached copy via FEN — the move stack is NOT copied (python `board.copy(stack=False)`). */
internal fun Game.copy(): Game = Game(fen())

/** `"e2e4"`, `"e7e8q"` — python-chess `Move.uci()`. Promotion char is lowercase. */
internal fun uciOf(move: Move): String {
    val promotion = move.promotion
    val suffix =
        if (promotion == null || promotion == Piece.NONE) "" else promotion.fenSymbol.lowercase()
    return Squares.ALL[move.from.ordinal] + Squares.ALL[move.to.ordinal] + suffix
}

/**
 * `"e4"` -> the chesslib [Square]. `Square.ordinal` is rank-major from `a1`, i.e. exactly
 * [Squares.ALL]'s order (engine invariant 11).
 */
private fun squareOf(name: String): Square {
    val index = Squares.index(name.trim().lowercase())
    require(index >= 0) { "invalid square: '$name'" }
    return Square.squareAt(index)
}
