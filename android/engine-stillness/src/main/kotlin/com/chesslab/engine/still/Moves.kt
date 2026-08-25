package com.chesslab.engine.still

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.PieceType
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveList

/** `e2e4`, `e7e8q` — what the seam speaks. */
internal fun uci(move: Move): String {
    val promotion =
        when (move.promotion.pieceType) {
            PieceType.KNIGHT -> "n"
            PieceType.BISHOP -> "b"
            PieceType.ROOK -> "r"
            PieceType.QUEEN -> "q"
            else -> ""
        }
    return move.from.name.lowercase() + move.to.name.lowercase() + promotion
}

/** The same moves as SAN, from the position they start in. Falls back to UCI rather than throwing. */
internal fun sansOf(
    from: Board,
    moves: List<Move>,
): List<String> {
    val list = MoveList(from.fen)
    moves.forEach { list.add(it) }
    return runCatching { list.toSanArray().toList() }.getOrDefault(moves.map(::uci))
}

/**
 * Frames per second, smoothed. Zero would show as "no detection" on the phone over a game that is
 * being tracked perfectly well, so this is not decoration.
 */
internal class FrameRate {
    var fps = 0.0
        private set

    private var lastMs = 0L

    fun saw(nowMs: Long) {
        val delta = nowMs - lastMs
        lastMs = nowMs
        if (delta !in 1..MAX_GAP_MS) return
        val instant = MS_PER_S / delta.toDouble()
        fps = if (fps <= 0.0) instant else fps * (1 - ALPHA) + instant * ALPHA
    }

    private companion object {
        const val ALPHA = 0.1
        const val MS_PER_S = 1000.0
        const val MAX_GAP_MS = 2000L
    }
}
