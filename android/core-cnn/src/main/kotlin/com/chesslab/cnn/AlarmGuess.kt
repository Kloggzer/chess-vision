package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.CastleRight
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.PieceType
import kotlin.math.abs

private const val UCI_LENGTH = 4
private const val UCI_LENGTH_PROMOTION = 5
private const val CASTLING_FILE_SPAN = 2
private const val FILE_CHARS = "abcdefgh"
private const val RANK_CHARS = "12345678"

/**
 * Port of `cnn_recovery.py:415 guess_illegal_move`. Among label-confident squares whose
 * observed label differs from the expected one: exactly ONE source (observed `"empty"`,
 * expected non-empty) and exactly ONE destination (observed non-empty, expected `"empty"`)
 * yield a uci-LIKE string — **no legality is implied**. Any other pattern -> null.
 */
fun guessIllegalMove(
    board: Board,
    obs: OccupancyObservation,
    confThr: Double,
): String? {
    if (obs.label == null || obs.conf == null) return null
    val expected = expectedLabels(board)
    val conflicts = obs.labelConfidentSquares(confThr).filter { obs.label(it) != expected[it] }
    val sources = conflicts.filter { obs.label(it) == "empty" && expected[it] != "empty" }
    val destinations = conflicts.filter { obs.label(it) != "empty" && expected[it] == "empty" }
    return if (sources.size == 1 && destinations.size == 1) "${sources.first()}${destinations.first()}" else null
}

/**
 * Port of `tracker.py:76 _build_alarm_guess_san` — the human-readable description of the
 * suspected illegal move. The format is pinned by the UI and by tests; do not reword it.
 */
fun buildAlarmGuessSan(
    board: Board,
    guess: String?,
): String? {
    val squares = guess?.lowercase()?.let { parseGuessSquares(it) }
    return squares?.let { describeGuess(board, it.first, it.second) }
}

private fun parseGuessSquares(uci: String): Pair<String, String>? {
    val wellFormed =
        (uci.length == UCI_LENGTH || uci.length == UCI_LENGTH_PROMOTION) &&
            uci[0] in FILE_CHARS &&
            uci[1] in RANK_CHARS &&
            uci[2] in FILE_CHARS &&
            uci[3] in RANK_CHARS
    return if (wellFormed) uci.substring(0, 2) to uci.substring(2, UCI_LENGTH) else null
}

private fun describeGuess(
    board: Board,
    from: String,
    to: String,
): String {
    val piece = board.getPiece(squareOf(from))
    if (piece == Piece.NONE) return "$from->$to"
    val symbol = piece.fenSymbol.uppercase()
    val castlingAttempt =
        piece.pieceType == PieceType.KING &&
            abs(FILE_CHARS.indexOf(from[0]) - FILE_CHARS.indexOf(to[0])) == CASTLING_FILE_SPAN &&
            board.getCastleRight(piece.pieceSide) == CastleRight.NONE
    val reason = if (castlingAttempt) "castling not available" else "illegal move suspected"
    return "$symbol $from->$to ($reason)"
}
