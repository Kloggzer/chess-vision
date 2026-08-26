package com.chesslab.engine.still

import com.chesslab.engine.board.BOARD_SQUARES
import com.chesslab.engine.board.Reading
import com.github.bhlangonijr.chesslib.Board
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * A blind square must not mure its piece in place.
 *
 * Covered and blind leave the evidence by the same door, and that made them look interchangeable.
 * They are not: a hand lifts, so holding a move for one reading is right, while a blind square
 * never becomes legible and holding the move costs the piece forever. Live on 2026-08-26 the
 * knight on `b1` could not be seen to leave.
 */
class BlindOriginTest {
    private val classes = listOf("empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")

    /** The reading a perfect model would give for [fen], as a distribution per square. */
    private fun readingOf(fen: String): Reading {
        val board = Board().also { it.loadFromFen(fen) }
        val rows =
            Array(BOARD_SQUARES.size) { i ->
                val piece =
                    board.getPiece(
                        com.github.bhlangonijr.chesslib.Square
                            .squareAt(i),
                    )
                val label =
                    if (piece == com.github.bhlangonijr.chesslib.Piece.NONE) {
                        "empty"
                    } else {
                        (if (piece.pieceSide.name == "WHITE") "w" else "b") + piece.fenSymbol.uppercase()
                    }
                DoubleArray(classes.size) { c -> if (classes[c] == label) 0.99 else 0.01 / (classes.size - 1) }
            }
        return Reading(classes, rows, DoubleArray(BOARD_SQUARES.size))
    }

    private val start = "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2"
    private val afterNc3 = "rnbqkbnr/ppp1pppp/8/3p4/3P4/2N5/PPP1PPPP/R1BQKBNR b KQkq - 1 2"

    @Test
    fun `the knight commits with both squares legible`() {
        val verdict = MoveExplainer(classes).explain(Board().also { it.loadFromFen(start) }, readingOf(afterNc3), GATE)
        assertEquals(listOf("b1c3"), (verdict as Verdict.Moves).moves.map { it.toString() })
    }

    /** The arrival on `c3` is the whole case: `b1` carries no evidence either way. */
    @Test
    fun `the knight still commits when its origin square is blind`() {
        val reading = readingOf(afterNc3).also { it.hide(setOf("b1")) }
        val verdict = MoveExplainer(classes).explain(Board().also { it.loadFromFen(start) }, reading, GATE)
        assertEquals(listOf("b1c3"), (verdict as Verdict.Moves).moves.map { it.toString() })
    }

    /** A COVERED origin is the opposite case — the piece may still be in the hand above it. */
    @Test
    fun `a covered origin holds the move back`() {
        val reading = readingOf(afterNc3)
        reading.coverage[BOARD_SQUARES.indexOf("b1")] = 1.0
        val verdict = MoveExplainer(classes).explain(Board().also { it.loadFromFen(start) }, reading, GATE)
        assertTrue(verdict !is Verdict.Moves, "a move out of a covered square must not commit")
    }

    private companion object {
        const val GATE = 0.15
    }
}
