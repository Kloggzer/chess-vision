package com.chesslab.engine.board

import com.chesslab.engine.api.CnnSnapshot

/**
 * A camera can infer only placement, not turn, castling, or clocks; White is the parseable default.
 * The next commit corrects the turn if needed.
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

private fun symbolOf(label: String): Char? {
    if (label.length != LABEL_LENGTH) return null
    val piece = label[1]
    return if (label[0] == 'w') piece.uppercaseChar() else piece.lowercaseChar()
}

private const val BOARD_SIDE = 8
private const val LABEL_LENGTH = 2
private const val FILES = "abcdefgh"
