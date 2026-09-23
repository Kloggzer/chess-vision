package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.Square

private const val FILES = "abcdefgh"
private const val RANKS = 8

/** The CNN crop order, rank-major from a1 (`entry.md` invariant 11) — NOT the corner order. */
val ALL_SQUARES: List<String> = (1..RANKS).flatMap { rank -> FILES.map { file -> "$file$rank" } }

internal fun squareOf(square: String): Square = Square.fromValue(square.uppercase())

private fun labelFromPiece(symbol: String?): String =
    if (symbol.isNullOrEmpty()) {
        "empty"
    } else {
        val prefix = if (symbol[0].isUpperCase()) "w" else "b"
        "$prefix${symbol.uppercase()}"
    }

fun labelAt(
    board: Board,
    square: String,
): String {
    val piece = board.getPiece(squareOf(square))
    return labelFromPiece(if (piece == Piece.NONE) null else piece.fenSymbol)
}

fun expectedOccupancy(board: Board): Map<String, Boolean> = ALL_SQUARES.associateWith { board.getPiece(squareOf(it)) != Piece.NONE }

fun expectedLabels(board: Board): Map<String, String> = ALL_SQUARES.associateWith { labelAt(board, it) }

/** The CURRENT placement is included: most frames sit between moves, and a prior without it masks away
 *  the truth on every resting frame. A square whose set holds one label cannot be misread. */
fun possibleLabels(
    board: Board,
    plies: Int = 1,
): Map<String, Set<String>> {
    val out = ALL_SQUARES.associateWithTo(LinkedHashMap<String, MutableSet<String>>()) { mutableSetOf() }
    val seen = HashSet<String>()
    var level = listOf(board)
    for (depth in 0..plies) {
        val kept = ArrayList<Board>(level.size)
        for (b in level) {
            if (!seen.add(b.boardFen())) continue
            for (sq in ALL_SQUARES) out.getValue(sq).add(labelAt(b, sq))
            kept.add(b)
        }
        if (depth == plies || kept.isEmpty()) break
        level = kept.flatMap { b -> b.legalMoves().map { mv -> b.clone().also { it.doMove(mv) } } }
    }
    return out
}

fun possibleLabels(
    fen: String,
    plies: Int = 1,
): Map<String, Set<String>> = possibleLabels(boardOf(fen), plies)
