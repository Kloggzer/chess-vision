package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move
import kotlin.math.abs

// Touched and destination sets differ: only a shadow-vetoed destination blocks a move. Castling and en
// passant need the position, so inputs must be legal.

internal fun isCastling(
    g: Game,
    mv: Move,
): Boolean =
    g.pieceCharAt(mv.from.ordinal)?.uppercaseChar() == 'K' &&
        abs(mv.to.file.ordinal - mv.from.file.ordinal) == CASTLING_FILE_SPAN

internal fun isKingsideCastling(
    g: Game,
    mv: Move,
): Boolean = isCastling(g, mv) && mv.to.file.ordinal > mv.from.file.ordinal

internal fun isQueensideCastling(
    g: Game,
    mv: Move,
): Boolean = isCastling(g, mv) && mv.to.file.ordinal < mv.from.file.ordinal

internal fun isEnPassant(
    g: Game,
    mv: Move,
): Boolean =
    g.pieceCharAt(mv.from.ordinal)?.uppercaseChar() == 'P' &&
        mv.to.file.ordinal != mv.from.file.ordinal &&
        g.pieceCharAt(mv.to.ordinal) == null

internal fun isCapture(
    g: Game,
    mv: Move,
): Boolean = g.pieceCharAt(mv.to.ordinal) != null || isEnPassant(g, mv)

/** The move stack does not affect `isKingAttacked`, so push/pop avoids reparsing a FEN. */
internal fun givesCheck(
    g: Game,
    mv: Move,
): Boolean {
    g.push(mv)
    val check = g.result().inCheck
    g.pop()
    return check
}

internal fun moveTouchedIndices(
    g: Game,
    mv: Move,
    out: IntArray,
): Int {
    require(out.size >= TOUCHED_MAX) { "out must hold at least $TOUCHED_MAX indices" }
    var n = 0
    n = append(out, n, mv.from.ordinal)
    n = append(out, n, mv.to.ordinal)
    if (isCastling(g, mv)) {
        val rank = mv.from.rank.ordinal
        val kingside = mv.to.file.ordinal > mv.from.file.ordinal
        val rookFrom = if (kingside) ROOK_FILE_KINGSIDE else ROOK_FILE_QUEENSIDE
        val rookTo = if (kingside) ROOK_TARGET_KINGSIDE else ROOK_TARGET_QUEENSIDE
        n = append(out, n, rank * Squares.N + rookFrom)
        n = append(out, n, rank * Squares.N + rookTo)
    }
    if (isEnPassant(g, mv)) {
        n = append(out, n, mv.from.rank.ordinal * Squares.N + mv.to.file.ordinal)
    }
    return n
}

internal fun moveTouchedMask(
    g: Game,
    mv: Move,
): Long {
    val buffer = IntArray(TOUCHED_MAX)
    val n = moveTouchedIndices(g, mv, buffer)
    var mask = 0L
    for (i in 0 until n) mask = mask.with(buffer[i])
    return mask
}

internal fun moveDestinationMask(
    g: Game,
    mv: Move,
): Long {
    var mask = bit(mv.to.ordinal)
    val rank = mv.from.rank.ordinal
    if (isKingsideCastling(g, mv)) {
        mask = mask.with(rank * Squares.N + ROOK_TARGET_KINGSIDE)
    } else if (isQueensideCastling(g, mv)) {
        mask = mask.with(rank * Squares.N + ROOK_TARGET_QUEENSIDE)
    }
    return mask
}

private fun append(
    out: IntArray,
    size: Int,
    index: Int,
): Int {
    for (i in 0 until size) {
        if (out[i] == index) return size
    }
    out[size] = index
    return size + 1
}

internal const val TOUCHED_MAX = 4

private const val CASTLING_FILE_SPAN = 2
private const val ROOK_FILE_KINGSIDE = 7
private const val ROOK_FILE_QUEENSIDE = 0
private const val ROOK_TARGET_KINGSIDE = 5
private const val ROOK_TARGET_QUEENSIDE = 3
