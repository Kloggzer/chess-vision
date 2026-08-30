package com.chesslab.engine.board

import com.chesslab.engine.api.CnnSnapshot

/**
 * The position a reading shows, as a placement FEN — the answer to "adopt what you see".
 *
 * Only the placement: side to move, castling rights and the clocks are not on the board, and a
 * camera cannot invent them. The side to move is taken as White, which is what `loadFromFen`
 * needs to accept the string at all; the next commit corrects it if it is wrong.
 */
fun fenOf(snap: CnnSnapshot): String? {
    val reading = Reading.of(snap) ?: return null
    val letters = reading.classes
    val board =
        BOARD_SQUARES.indices.associate { i ->
            val row = reading.rows[i]
            BOARD_SQUARES[i] to letters[row.indices.maxBy { row[it] }]
        }
    val ranks =
        (BOARD_SIDE downTo 1).joinToString("/") { rank ->
            var empty = 0
            val line = StringBuilder()
            for (file in FILES) {
                val label = board.getValue("$file$rank")
                val symbol = symbolOf(label)
                if (symbol == null) {
                    empty += 1
                } else {
                    if (empty > 0) line.append(empty)
                    empty = 0
                    line.append(symbol)
                }
            }
            if (empty > 0) line.append(empty)
            line.toString()
        }
    return "$ranks w - - 0 1"
}

/** `wR` -> `R`, `bN` -> `n`, anything else (empty, occluded) -> no piece. */
private fun symbolOf(label: String): Char? {
    if (label.length != LABEL_LENGTH) return null
    val piece = label[1]
    return if (label[0] == 'w') piece.uppercaseChar() else piece.lowercaseChar()
}

private const val BOARD_SIDE = 8
private const val LABEL_LENGTH = 2
private const val FILES = "abcdefgh"
