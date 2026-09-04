package com.chesslab.engine

import com.chesslab.engine.api.CnnObservation

internal const val NOTE_NO_CNN_IDENTITY = "no CNN observation with piece identity — use Undo or a FEN resync"

internal const val NOTE_CNN_KINGS = "CNN position has missing/extra kings — use Undo or a FEN resync"

/** The empty slot of the rebuilt placement — `' '` is not a FEN piece symbol. */
private const val EMPTY_SQUARE = ' '

private const val PIECE_TYPES = "PNBRQK"

/** FEN field indices of the two clocks (`placement side castling ep halfmove fullmove`). */
private const val FEN_HALFMOVE = 4

private const val FEN_FULLMOVE = 5

/** The position the last glance would adopt, or `null` with the refusal in `note`. */
internal fun EngineState.adoptableCnnFen(thr: Double): String? {
    val obs = cnnSnap?.obs?.takeIf { o -> Squares.ALL.any { o.label(it) != null } }
    val fen = obs?.let { cnnAdoptedFen(it, thr) }
    if (fen == null) note = if (obs == null) NOTE_NO_CNN_IDENTITY else NOTE_CNN_KINGS
    return fen
}

/**
 * The position the observation describes, as a minimal edit of the believed one: only
 * label-confident squares take the read piece, everything else keeps the game-state piece.
 * `null` without a clean pair of kings or when the result is unreachable. Nothing is mutated.
 */
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
    // Side to move and the clocks carry over; the en-passant target is dropped, because the
    // adopted position has no move that could have created it.
    val fields = board.fen().split(' ')
    val clocks = "${fields[FEN_HALFMOVE]} ${fields[FEN_FULLMOVE]}"
    val fen = "${placementOf(pieces)} ${fields[1]} ${castlingOf(pieces, fields[2])} - $clocks"
    // A mate is a legitimate thing to resync onto — the game ends there, the app should show it.
    return fen.takeIf { reachable(it) }
}

/**
 * Two kings are not enough: the side that just moved must not be in check, or the deep search captures
 * the exposed king and the next `legalMoves()` dies at `Index 64` (replay crash, 2026-08-09). Asked by
 * flipping the side to move; doubles as the parse check. A mate passes — the game ends there.
 */
internal fun reachable(fen: String): Boolean =
    runCatching {
        val fields = fen.split(' ')
        val flipped = fields.toMutableList().also { it[1] = if (it[1] == "w") "b" else "w" }
        !Game(flipped.joinToString(" ")).result().inCheck
    }.getOrDefault(false)

/** `"empty"` and `"occluded"` are not pieces. */
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

/** The placement field, rank 8 down to rank 1 — [Squares.ALL] runs the other way. */
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

/** A right survives only if its king AND its rook are still at home. */
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
