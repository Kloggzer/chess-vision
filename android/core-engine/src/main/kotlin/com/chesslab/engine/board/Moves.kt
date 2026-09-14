package com.chesslab.engine.board

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.PieceType
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveList

fun uci(move: Move): String {
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

/** Falls back to UCI because display formatting must not abort tracking. */
fun sansOf(
    from: Board,
    moves: List<Move>,
): List<String> {
    val list = MoveList(from.fen)
    moves.forEach { list.add(it) }
    return runCatching { list.toSanArray().toList() }.getOrDefault(moves.map(::uci))
}
