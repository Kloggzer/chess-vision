package com.chesslab.engine

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.Side
import com.github.bhlangonijr.chesslib.Square
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator
import com.github.bhlangonijr.chesslib.move.MoveList

/** Standard chess start position. */
const val STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

/**
 * chesslib `Board` wrapper: FEN, legal moves, SAN, game-over (ports the python-chess usage
 * in tracker.py:595,1741). All squares are referenced as lowercase "a1".."h8".
 */
class Game(
    fen: String = STARTPOS,
) {
    private val board = Board()

    init {
        board.loadFromFen(fen)
    }

    fun fen(): String = board.fen

    val whiteToMove: Boolean get() = board.sideToMove == Side.WHITE

    fun legalMoves(): List<Move> = MoveGenerator.generateLegalMoves(board)

    fun push(move: Move) {
        board.doMove(move)
    }

    fun pop() {
        board.undoMove()
    }

    /** Piece FEN char at the square ('P'..'k'), or null when empty. */
    fun pieceCharAt(square: String): Char? {
        val p = board.getPiece(Square.valueOf(square.uppercase()))
        return if (p == null || p == Piece.NONE) null else p.fenSymbol.first()
    }

    /** SAN of a legal move in the CURRENT position (board stays untouched). */
    fun san(move: Move): String = sanSequence(listOf(move)).first()

    /** SANs of a not-yet-pushed move sequence (ports tracker.py:2253 `_san_sequence`). */
    fun sanSequence(moves: List<Move>): List<String> {
        val list = MoveList(board.fen)
        for (mv in moves) list.add(mv)
        return list.toSanArray().toList()
    }

    /** Check / checkmate / game-over flags of the current position. */
    fun result(): GameResult =
        GameResult(
            inCheck = board.isKingAttacked,
            checkmate = board.isMated,
            over = board.isMated || board.isDraw,
        )

    fun copy(): Game = Game(board.fen)
}

/** Terminal-state flags of a position. */
data class GameResult(
    val inCheck: Boolean,
    val checkmate: Boolean,
    val over: Boolean,
)
