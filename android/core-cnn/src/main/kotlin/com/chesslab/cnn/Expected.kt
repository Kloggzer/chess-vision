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

fun allSquares(): List<String> = ALL_SQUARES

internal fun squareOf(square: String): Square = Square.fromValue(square.uppercase())

/** `config.py:379 label_from_piece` — 'P' -> "wP", 'n' -> "bN", null/empty -> "empty". */
fun labelFromPiece(symbol: String?): String =
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
