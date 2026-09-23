package com.chesslab.engine

import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.fenWhiteToMove

internal const val NOTE_NO_CNN_IDENTITY = "no CNN observation with piece identity — use Undo or a FEN resync"

internal const val NOTE_CNN_KINGS = "CNN position has missing/extra kings — use Undo or a FEN resync"

internal const val NOTE_CNN_STALE = "no fresh CNN observation — use Undo or a FEN resync"

private const val EMPTY_SQUARE = ' '

private const val PIECE_TYPES = "PNBRQK"

private const val FEN_HALFMOVE = 4

private const val FEN_FULLMOVE = 5

/** Through [freshSnapshot]: a glance older than `OBS_MAX_AGE_S` describes a board played on since, and
 *  this path overwrites the user's position. */
internal fun EngineState.adoptableCnnFen(thr: Double): String? {
    val snap = freshSnapshot()
    val obs = snap?.obs?.takeIf { o -> Squares.ALL.any { o.label(it) != null } }
    val fen = obs?.let { cnnAdoptedFen(it, thr) }
    if (fen == null) {
        note =
            when {
                snap == null -> NOTE_CNN_STALE
                obs == null -> NOTE_NO_CNN_IDENTITY
                else -> NOTE_CNN_KINGS
            }
    }
    return fen
}

/** A minimal edit: only label-confident squares take the read piece. `null` without a clean pair of kings
 *  or when unreachable. */
internal fun EngineState.cnnAdoptedFen(
    obs: CnnObservation,
    thr: Double,
): String? {
    val pieces = CharArray(Squares.COUNT)
    for (i in 0 until Squares.COUNT) {
        val square = Squares.ALL[i]
        val believed = board.pieceCharAt(i) ?: EMPTY_SQUARE
        val label = if (obs.labelConfident(square, thr)) obs.label(square) else null
        // An unreadable label ("occluded") is not an observation of an empty square.
        pieces[i] = if (label == null) believed else pieceCharOf(label) ?: believed
    }
    if (pieces.count { it == 'K' } != 1 || pieces.count { it == 'k' } != 1) return null
    // The en-passant target is dropped: the adopted position has no move that could have created it.
    val fields = board.fen().split(' ')
    val clocks = "${fields[FEN_HALFMOVE]} ${fields[FEN_FULLMOVE]}"
    val fen = "${placementOf(pieces)} ${fields[1]} ${castlingOf(pieces, fields[2])} - $clocks"
    // A mate is a legitimate resync target — the game ends there.
    return fen.takeIf { reachable(it) }
}

/** The side that just moved must not be in check, or the deep search captures the king and the next
 *  `legalMoves()` dies at `Index 64`. Asked by flipping the side to move; doubles as the parse check. */
internal fun reachable(fen: String): Boolean =
    runCatching {
        val white = fenWhiteToMove(fen) ?: return false
        val flipped = fen.split(' ').toMutableList().also { it[1] = if (white) "b" else "w" }
        !Game(flipped.joinToString(" ")).result().inCheck
    }.getOrDefault(false)

private fun pieceCharOf(label: String): Char? {
    if (label.length != 2) return EMPTY_SQUARE.takeIf { label == "empty" }
    val type = label[1].uppercaseChar()
    return when {
        type !in PIECE_TYPES -> null
        label[0] == 'w' -> type
        label[0] == 'b' -> type.lowercaseChar()
        else -> null
    }
}

/** Rank 8 down to rank 1 — [Squares.ALL] runs the other way. */
private fun placementOf(pieces: CharArray): String =
    (Squares.N - 1 downTo 0).joinToString("/") { rank ->
        val out = StringBuilder()
        var run = 0
        for (file in 0 until Squares.N) {
            val piece = pieces[rank * Squares.N + file]
            if (piece == EMPTY_SQUARE) {
                run += 1
            } else {
                if (run > 0) out.append(run)
                run = 0
                out.append(piece)
            }
        }
        if (run > 0) out.append(run)
        out.toString()
    }

private fun castlingOf(
    pieces: CharArray,
    current: String,
): String {
    val at = { square: String -> pieces[Squares.index(square)] }
    val out = StringBuilder()
    if ('K' in current && at("e1") == 'K' && at("h1") == 'R') out.append('K')
    if ('Q' in current && at("e1") == 'K' && at("a1") == 'R') out.append('Q')
    if ('k' in current && at("e8") == 'k' && at("h8") == 'r') out.append('k')
    if ('q' in current && at("e8") == 'k' && at("a8") == 'r') out.append('q')
    return if (out.isEmpty()) "-" else out.toString()
}
