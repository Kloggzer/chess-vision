package com.chesslab.engine.changeset

import com.chesslab.engine.board.BOARD_SQUARES
import com.chesslab.engine.board.Reading
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.Side
import com.github.bhlangonijr.chesslib.Square

/**
 * The model's veto, on the one axis it is good at.
 *
 * Empty / white / black only — never which piece. Measured live on 2026-08-26 over eight
 * consecutive readings of one board: `c1` read as a knight where a bishop stood, `f1` as a rook,
 * `e8` as a knight where the KING stood, ten such squares every time. On the same readings the
 * empty/white/black call was right nearly everywhere. An engine that vetoes on identity vetoes
 * correct boards; one that vetoes on colour catches a move that landed on the wrong square.
 *
 * The veto needs CONFIDENCE, because the two group errors seen that day (`d1:empty@1.00`,
 * `c6:bP@1.00`) prove the axis is not infallible either — so it may only overrule a commit the
 * pixels support when it is sure, and it is never asked about a covered square.
 */
class ColourCheck(
    private val reading: Reading,
    private val gate: Double,
) {
    private val classes = reading.classes
    private val emptyColumn = classes.indexOf("empty")
    private val whiteColumns = classes.indices.filter { classes[it].startsWith("w") }.toSet()

    /** Squares the model reports as covered — a hand, and a reason to hold a move rather than veto it. */
    fun covered(): Set<Int> =
        (0 until ChangeEvidence.SQUARES)
            .filterTo(HashSet()) { reading.coverage[indexIn(it)] > gate }

    /**
     * Squares where the model contradicts [board] on group, confidently. Empty means "no
     * objection", which includes "no opinion" — an unreadable square objects to nothing.
     */
    fun objections(
        board: Board,
        squares: Set<Int>,
    ): List<Int> =
        squares.filter { square ->
            val row = reading.rows[indexIn(square)]
            if (row.isEmpty() || square in covered()) return@filter false
            val mass = groupMass(row)
            val wanted = groupOf(board.getPiece(Square.squareAt(square)))
            mass[wanted] < 1.0 - SURE && mass.max() >= SURE
        }

    private fun groupMass(row: DoubleArray): DoubleArray {
        val out = DoubleArray(GROUPS)
        for (c in classes.indices) out[groupOfColumn(c)] += row[c]
        return out
    }

    private fun groupOfColumn(column: Int): Int =
        when {
            column == emptyColumn -> EMPTY
            column in whiteColumns -> WHITE
            else -> BLACK
        }

    private fun groupOf(piece: Piece): Int =
        when {
            piece == Piece.NONE -> EMPTY
            piece.pieceSide == Side.WHITE -> WHITE
            else -> BLACK
        }

    private fun indexIn(square: Int): Int = BOARD_SQUARES.indexOf(ChangeEvidence.nameOf(square))

    private companion object {
        const val GROUPS = 3
        const val EMPTY = 0
        const val WHITE = 1
        const val BLACK = 2

        /**
         * How sure the model must be before it may overrule pixels that plainly moved. Set high
         * on purpose: this axis was measured wrong at full confidence twice in one session, so it
         * gets to stop a commit only where it is not merely leaning.
         */
        const val SURE = 0.9
    }
}
