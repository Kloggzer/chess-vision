package com.chesslab.tracker.record

import com.github.bhlangonijr.chesslib.Board
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * Builds a PGN (Portable Game Notation) string from the tracker's SAN history
 * and current FEN.
 *
 * PGN is trivial string assembly — no library needed beyond chesslib for result
 * determination. The output is shareable via `ACTION_SEND` and SAF save-to-file.
 *
 * Consumed by phase 07 (History screen export wiring).
 */
object PgnBuilder {
    private val dateFormat = DateTimeFormatter.ofPattern("yyyy.MM.dd")

    /**
     * Build a complete PGN string.
     *
     * @param sans SAN move history in order (e.g. ["e4", "e5", "Nf3", ...]).
     * @param fen  Current FEN for result determination (null = use default startpos).
     * @return Valid PGN string with Event/Date/Result headers and move text.
     */
    fun build(
        sans: List<String>,
        fen: String? = null,
    ): String {
        val board = Board()
        if (fen != null) {
            board.loadFromFen(fen)
        }

        val result = resultOf(board)
        val date = LocalDate.now().format(dateFormat)

        val sb = StringBuilder()
        sb.appendLine("[Event \"chesslab\"]")
        sb.appendLine("[Site \"?\"]")
        sb.appendLine("[Date \"$date\"]")
        sb.appendLine("[Round \"?\"]")
        sb.appendLine("[White \"?\"]")
        sb.appendLine("[Black \"?\"]")
        sb.appendLine("[Result \"$result\"]")

        if (sans.isEmpty()) {
            sb.appendLine("")
            sb.appendLine(result)
            return sb.toString()
        }

        sb.appendLine("")

        val moveText = formatMoveText(sans)
        sb.append(moveText)
        if (!moveText.endsWith(result)) {
            sb.append(" $result")
        }
        sb.appendLine()
        return sb.toString()
    }

    /**
     * Format SANs into PGN move text: "1. e4 e5 2. Nf3 Nc6 ..."
     * White moves get the move number prefix; black moves get a trailing space.
     */
    fun formatMoveText(sans: List<String>): String =
        buildString {
            var ply = 0
            for (san in sans) {
                if (ply % 2 == 0) {
                    // White move
                    if (ply > 0) append(" ")
                    append("${(ply / 2) + 1}. ")
                    append(san)
                } else {
                    // Black move
                    append(" $san")
                }
                ply++
            }
        }

    /**
     * Determine the PGN Result tag from the current board position.
     *
     * Returns "1-0", "0-1", "1/2-1/2", or "*" (unknown / game in progress).
     */
    fun resultOf(board: Board): String =
        when {
            board.isMated && board.sideToMove == com.github.bhlangonijr.chesslib.Side.WHITE -> "0-1"
            board.isMated -> "1-0"
            board.isDraw || board.isStaleMate -> "1/2-1/2"
            else -> "*"
        }
}
