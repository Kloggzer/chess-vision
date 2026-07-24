package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move
import kotlin.math.abs

// Move classification and the two square sets the detection pipeline scores against.
//
// Python reference: `move_touched_squares` (`tracker.py:456`) and `move_destination_squares`
// (`tracker.py:474`). The two are deliberately DIFFERENT — a move whose *destination* is
// shadow-vetoed must be blocked, while its other touched squares must not block it
// (`specs/09`). Never unify them.
//
// A chesslib `Move` alone does not say "castling" or "en passant", so the classification is
// derived from the position. That derivation is exact for LEGAL moves only.

/** Python `board.is_castling(move)` — king moving two files. */
internal fun isCastling(
    g: Game,
    mv: Move,
): Boolean =
    g.pieceCharAt(Squares.ALL[mv.from.ordinal])?.uppercaseChar() == 'K' &&
        abs(mv.to.file.ordinal - mv.from.file.ordinal) == CASTLING_FILE_SPAN

internal fun isKingsideCastling(
    g: Game,
    mv: Move,
): Boolean = isCastling(g, mv) && mv.to.file.ordinal > mv.from.file.ordinal

internal fun isQueensideCastling(
    g: Game,
    mv: Move,
): Boolean = isCastling(g, mv) && mv.to.file.ordinal < mv.from.file.ordinal

/** Python `board.is_en_passant(move)` — a pawn changing file onto an empty square. */
internal fun isEnPassant(
    g: Game,
    mv: Move,
): Boolean =
    g.pieceCharAt(Squares.ALL[mv.from.ordinal])?.uppercaseChar() == 'P' &&
        mv.to.file.ordinal != mv.from.file.ordinal &&
        g.pieceCharAt(Squares.ALL[mv.to.ordinal]) == null

/** Python `board.is_capture(move)`. */
internal fun isCapture(
    g: Game,
    mv: Move,
): Boolean = g.pieceCharAt(Squares.ALL[mv.to.ordinal]) != null || isEnPassant(g, mv)

/**
 * Python `board.gives_check(move)`. Uses push/pop on [g] rather than a FEN copy — the move
 * stack does not influence `isKingAttacked`, and re-parsing a FEN per legal move is the
 * hot-loop cost this avoids.
 */
internal fun givesCheck(
    g: Game,
    mv: Move,
): Boolean {
    g.push(mv)
    val check = g.result().inCheck
    g.pop()
    return check
}

/**
 * Allocation-free [moveTouchedSquares]: fills [out] with [Squares.ALL] indices and returns how
 * many were written. [out] must have room for [TOUCHED_MAX] entries.
 */
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
        // The rook's from AND to square: h1/f1 resp. a1/d1 (and the 8th-rank mirror).
        val rookFrom = if (kingside) ROOK_FILE_KINGSIDE else ROOK_FILE_QUEENSIDE
        val rookTo = if (kingside) ROOK_TARGET_KINGSIDE else ROOK_TARGET_QUEENSIDE
        n = append(out, n, rank * Squares.N + rookFrom)
        n = append(out, n, rank * Squares.N + rookTo)
    }
    if (isEnPassant(g, mv)) {
        // The captured pawn stands on the mover's own rank, on the destination file.
        n = append(out, n, mv.from.rank.ordinal * Squares.N + mv.to.file.ordinal)
    }
    return n
}

/**
 * Squares a move physically CHANGES: from, to, both rook squares on castling, and the captured
 * pawn's square on en passant. Port of `tracker.py:456`.
 */
internal fun moveTouchedSquares(
    g: Game,
    mv: Move,
): Set<String> {
    val buffer = IntArray(TOUCHED_MAX)
    val n = moveTouchedIndices(g, mv, buffer)
    val out = LinkedHashSet<String>(n)
    for (i in 0 until n) out.add(Squares.ALL[buffer[i]])
    return out
}

/**
 * Squares a move GAINS a piece on: the to-square, plus the rook's TO-square on castling
 * (f1/f8 kingside, d1/d8 queenside). Port of `tracker.py:474`.
 *
 * The rook's from-square and the en-passant captured square are vacated, not gained, so they
 * are absent here — that asymmetry against [moveTouchedSquares] is load-bearing.
 */
internal fun moveDestinationSquares(
    g: Game,
    mv: Move,
): Set<String> {
    val out = LinkedHashSet<String>(TOUCHED_MAX)
    out.add(Squares.ALL[mv.to.ordinal])
    val rank = mv.from.rank.ordinal
    if (isKingsideCastling(g, mv)) {
        out.add(Squares.ALL[rank * Squares.N + ROOK_TARGET_KINGSIDE])
    } else if (isQueensideCastling(g, mv)) {
        out.add(Squares.ALL[rank * Squares.N + ROOK_TARGET_QUEENSIDE])
    }
    return out
}

/** Appends [index] unless it is already present — Python builds a `set`. */
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

/** Upper bound of [moveTouchedIndices]: from, to and the two rook squares. */
internal const val TOUCHED_MAX = 4

private const val CASTLING_FILE_SPAN = 2
private const val ROOK_FILE_KINGSIDE = 7
private const val ROOK_FILE_QUEENSIDE = 0
private const val ROOK_TARGET_KINGSIDE = 5
private const val ROOK_TARGET_QUEENSIDE = 3
