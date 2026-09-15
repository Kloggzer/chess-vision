package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.Square

private const val FILES = "abcdefgh"
private const val RANKS = 8

/**
 * `cnn_recovery.py:26 _ALL` — a1,b1,…,h1,a2,…,h8 (rank-major from rank 1).
 * This is the CNN crop order (`entry.md` invariant 11), NOT the corner order.
 */
val ALL_SQUARES: List<String> = (1..RANKS).flatMap { rank -> FILES.map { file -> "$file$rank" } }

internal fun squareOf(square: String): Square = Square.fromValue(square.uppercase())

/** `config.py label_from_piece` — 'P' -> "wP", 'n' -> "bN", null/empty -> "empty". */
private fun labelFromPiece(symbol: String?): String =
    if (symbol.isNullOrEmpty()) {
        "empty"
    } else {
        val prefix = if (symbol[0].isUpperCase()) "w" else "b"
        "$prefix${symbol.uppercase()}"
    }

/** `cnn_recovery.py:212 CnnRecovery._label_at`. */
fun labelAt(
    board: Board,
    square: String,
): String {
    val piece = board.getPiece(squareOf(square))
    return labelFromPiece(if (piece == Piece.NONE) null else piece.fenSymbol)
}

/** `cnn_recovery.py:103 expected_occupancy`. */
fun expectedOccupancy(board: Board): Map<String, Boolean> = ALL_SQUARES.associateWith { board.getPiece(squareOf(it)) != Piece.NONE }

/** `cnn_recovery.py:108 expected_labels`. */
fun expectedLabels(board: Board): Map<String, String> = ALL_SQUARES.associateWith { labelAt(board, it) }

/**
 * Per square, every label reachable within [plies] half-moves — the CURRENT placement included,
 * because most frames sit between moves and a prior without that option masks away the truth on
 * every resting frame. Feeds [applyPrior]; a square whose set holds one label cannot be misread.
 */
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

/** FEN overload so consumers outside `:core-cnn` need no chesslib of their own. Throws on a bad FEN. */
fun possibleLabels(
    fen: String,
    plies: Int = 1,
): Map<String, Set<String>> = possibleLabels(boardOf(fen), plies)
