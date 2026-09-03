package com.chesslab.engine

import com.chesslab.engine.api.IllegalMoveException
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.CastleRight
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.Side
import com.github.bhlangonijr.chesslib.Square
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator
import com.github.bhlangonijr.chesslib.move.MoveList
import java.util.ArrayDeque

internal const val STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

/** Chesslib is confined here beyond [Move]; the rest of the engine uses lowercase square names. */
internal class Game(
    fen: String = STARTPOS,
) {
    private val board = Board()
    private var cachedFen: String? = null
    private var cachedLegalMoves: List<Move>? = null
    private val cacheHistory = ArrayDeque<CachedPosition>()

    init {
        board.loadFromFen(fen)
    }

    /** En-passant target is emitted only when legally capturable, matching standard FEN consumers. */
    fun fen(): String =
        WorkProfiler.span(WorkOperation.FEN_SERIALIZE, input = board::getIncrementalHashKey) {
            cachedFen?.let {
                WorkProfiler.cache(WorkOperation.FEN_SERIALIZE, hit = true)
                return@span it
            }
            WorkProfiler.cache(WorkOperation.FEN_SERIALIZE, hit = false)
            board.getFen(true, true).also { cachedFen = it }
        }

    val whiteToMove: Boolean get() = board.sideToMove == Side.WHITE

    fun legalMoves(): List<Move> =
        WorkProfiler.span(WorkOperation.LEGAL_MOVES, input = board::getIncrementalHashKey) {
            cachedLegalMoves?.let {
                WorkProfiler.cache(WorkOperation.LEGAL_MOVES, hit = true)
                return@span it
            }
            WorkProfiler.cache(WorkOperation.LEGAL_MOVES, hit = false)
            MoveGenerator.generateLegalMoves(board).toList().also { cachedLegalMoves = it }
        }

    /** `doMove` does not fully validate geometry, so only generator-approved moves reach the board. */
    fun push(move: Move) {
        if (legalMoves().none { it == move }) throw IllegalMoveException(uciOf(move), fen())
        val previous = CachedPosition(cachedFen, cachedLegalMoves)
        board.doMove(move)
        cacheHistory.addLast(previous)
        cachedFen = null
        cachedLegalMoves = null
    }

    /** Returns the reverted move because SAN is position-relative and cannot key rejected lines. */
    fun pop(): Move? {
        val move = board.undoMove() ?: return null
        val previous = cacheHistory.pollLast()
        cachedFen = previous?.fen
        cachedLegalMoves = previous?.legalMoves
        return move
    }

    fun pieceCharAt(index: Int): Char? {
        val piece = board.getPiece(Square.squareAt(index))
        return if (piece == null || piece == Piece.NONE) null else piece.fenSymbol.first()
    }

    fun pieceCharAt(square: String): Char? = pieceCharAt(indexOf(square))

    fun hasCastlingRights(white: Boolean): Boolean = board.getCastleRight(if (white) Side.WHITE else Side.BLACK) != CastleRight.NONE

    fun sanSequence(moves: List<Move>): List<String> {
        val list = MoveList(fen())
        for (move in moves) list.add(move)
        return list.toSanArray().toList()
    }

    fun result(): GameResult =
        GameResult(
            inCheck = board.isKingAttacked,
            checkmate = board.isMated,
            over = board.isMated || board.isDraw,
        )

    /** Cached values stay in lockstep with chesslib's move stack. */
    private data class CachedPosition(
        val fen: String?,
        val legalMoves: List<Move>?,
    )
}

internal data class GameResult(
    val inCheck: Boolean,
    val checkmate: Boolean,
    val over: Boolean,
)

internal fun Game.boardFen(): String = fen().substringBefore(' ')

internal fun Game.labelAt(square: String): String {
    val symbol = pieceCharAt(square) ?: return "empty"
    val prefix = if (symbol.isUpperCase()) "w" else "b"
    return "$prefix${symbol.uppercaseChar()}"
}

internal fun Game.san(move: Move): String = sanSequence(listOf(move)).first()

/** A detached FEN copy intentionally excludes the move stack. */
internal fun Game.copy(): Game = Game(fen())

internal fun uciOf(move: Move): String {
    val promotion = move.promotion
    val suffix =
        if (promotion == null || promotion == Piece.NONE) "" else promotion.fenSymbol.lowercase()
    return Squares.ALL[move.from.ordinal] + Squares.ALL[move.to.ordinal] + suffix
}

/** [Squares.ALL] index equals chesslib `Square.ordinal` (engine invariant 11). */
private fun indexOf(name: String): Int {
    val index = Squares.index(name.trim().lowercase())
    require(index >= 0) { "invalid square: '$name'" }
    return index
}
