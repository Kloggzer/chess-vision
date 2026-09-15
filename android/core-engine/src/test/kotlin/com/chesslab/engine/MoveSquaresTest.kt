package com.chesslab.engine

import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.assertExactList
import com.github.bhlangonijr.chesslib.move.Move
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * `move_touched_squares` (`tracker.py`) and `move_destination_squares` against the
 * phase-00b golden fixtures (`tierA.moveTouchedSquares` / `tierA.moveDestinationSquares`, both
 * emitted for EVERY legal move of `frame.fen`).
 *
 * The two functions are different on purpose — the rook's from-square and the en-passant
 * captured square are touched but not destinations.
 */
class MoveSquaresTest {
    @Test
    fun everyFixtureFenRoundTripsThroughTheGameWrapper() {
        var checked = 0
        for (name in ParityFixtures.clips()) {
            for (frame in ParityFixtures.load(name).frames) {
                val fen = frame.fen ?: continue
                assertEquals(fen, Game(fen).fen(), "$name/${frame.frame}: FEN round trip")
                checked++
            }
        }
        assertConsumed(checked, "FEN round trips")
    }

    @Test
    fun touchedSquaresMatchPython() {
        var checked = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            for (frame in clip.tierAFrames()) {
                val expected = requireNotNull(frame.tierA).moveTouchedSquares
                val game = Game(requireNotNull(frame.fen))
                val moves = game.legalMoves()
                assertEquals(expected.size, moves.size, "$name/${frame.frame}: legal move count")
                for (mv in moves) {
                    val uci = uciOf(mv)
                    assertExactList(
                        requireNotNull(expected[uci]) { "$name/${frame.frame}: unknown uci $uci" },
                        moveTouchedMask(game, mv).sortedSquareNames(),
                        "$name/${frame.frame}: moveTouchedSquares[$uci]",
                    )
                    checked++
                }
            }
        }
        assertConsumed(checked, "moveTouchedSquares comparisons")
    }

    @Test
    fun destinationSquaresMatchPython() {
        var checked = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            for (frame in clip.tierAFrames()) {
                val expected = requireNotNull(frame.tierA).moveDestinationSquares
                val game = Game(requireNotNull(frame.fen))
                for (mv in game.legalMoves()) {
                    val uci = uciOf(mv)
                    assertExactList(
                        requireNotNull(expected[uci]) { "$name/${frame.frame}: unknown uci $uci" },
                        moveDestinationMask(game, mv).sortedSquareNames(),
                        "$name/${frame.frame}: moveDestinationSquares[$uci]",
                    )
                    checked++
                }
            }
        }
        assertConsumed(checked, "moveDestinationSquares comparisons")
    }

    // ---------------------------------------------------------------------------------------
    // Hand-written cases for the branches the quiet clips never reach.
    // ---------------------------------------------------------------------------------------

    @Test
    fun whiteKingsideCastlingTouchesBothRookSquaresButGainsOnlyTwo() {
        val game = Game(CASTLING_FEN)
        val mv = legal(game, "e1g1")
        assertTrue(isCastling(game, mv) && isKingsideCastling(game, mv), "e1g1 is kingside castling")
        assertEquals(ofSquares("e1", "g1", "h1", "f1"), moveTouchedMask(game, mv))
        assertEquals(ofSquares("g1", "f1"), moveDestinationMask(game, mv))
    }

    @Test
    fun blackQueensideCastlingTouchesBothRookSquaresButGainsOnlyTwo() {
        val game = Game(CASTLING_FEN.replace(" w ", " b "))
        val mv = legal(game, "e8c8")
        assertTrue(isQueensideCastling(game, mv), "e8c8 is queenside castling")
        assertEquals(ofSquares("e8", "c8", "a8", "d8"), moveTouchedMask(game, mv))
        assertEquals(ofSquares("c8", "d8"), moveDestinationMask(game, mv))
    }

    @Test
    fun enPassantTouchesTheCapturedPawnButOnlyGainsTheTarget() {
        val game = Game(EN_PASSANT_FEN)
        val mv = legal(game, "e5d6")
        assertTrue(isEnPassant(game, mv) && isCapture(game, mv), "e5d6 is an en-passant capture")
        assertEquals(ofSquares("e5", "d6", "d5"), moveTouchedMask(game, mv))
        assertEquals(ofSquares("d6"), moveDestinationMask(game, mv))
    }

    @Test
    fun thePromotionPieceDoesNotChangeTheSquareSets() {
        val game = Game(PROMOTION_FEN)
        for (uci in listOf("e7e8q", "e7e8n")) {
            val mv = legal(game, uci)
            assertEquals(ofSquares("e7", "e8"), moveTouchedMask(game, mv), uci)
            assertEquals(ofSquares("e8"), moveDestinationMask(game, mv), uci)
        }
    }

    @Test
    fun capturePromotionTouchesFromAndTo() {
        val game = Game(CAPTURE_PROMOTION_FEN)
        val mv = legal(game, "e7d8q")
        assertTrue(isCapture(game, mv) && !isEnPassant(game, mv), "e7d8q is a plain capture")
        assertEquals(ofSquares("e7", "d8"), moveTouchedMask(game, mv))
        assertEquals(ofSquares("d8"), moveDestinationMask(game, mv))
    }

    @Test
    fun aQuietMoveTouchesExactlyItsEndpoints() {
        val game = Game()
        val mv = legal(game, "e2e4")
        assertTrue(!isCastling(game, mv) && !isEnPassant(game, mv) && !isCapture(game, mv), "e2e4 is quiet")
        assertEquals(ofSquares("e2", "e4"), moveTouchedMask(game, mv))
        assertEquals(ofSquares("e4"), moveDestinationMask(game, mv))
    }

    @Test
    fun theGameWrapperReportsPiecesLabelsAndCastlingRights() {
        val game = Game()
        assertEquals('P', game.pieceCharAt("e2"))
        assertEquals('r', game.pieceCharAt("a8"))
        assertEquals(null, game.pieceCharAt("e4"))
        assertEquals("wP", game.labelAt("e2"))
        assertEquals("bN", game.labelAt("b8"))
        assertEquals("empty", game.labelAt("e4"))
        assertTrue(game.hasCastlingRights(white = true) && game.hasCastlingRights(white = false))
        assertEquals("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR", game.boardFen())
        assertTrue(game.whiteToMove)
        assertEquals("e4", game.san(legal(game, "e2e4")))
        assertEquals(listOf("e4", "e5", "Nf3"), game.sanSequence(moveLine(game, "e2e4", "e7e5", "g1f3")))
        assertEquals(STARTPOS, game.fen(), "sanSequence must not mutate the position")
    }

    @Test
    fun pushPopAndCopyKeepTheOriginalPosition() {
        val game = Game()
        val clone = game.copy()
        clone.push(legal(clone, "e2e4"))
        assertEquals(STARTPOS, game.fen(), "copy() must be detached")
        assertTrue(!clone.whiteToMove, "the copy advanced")
        game.push(legal(game, "e2e4"))
        game.pop()
        assertEquals(STARTPOS, game.fen(), "push/pop must restore the position")
    }

    // ---------------------------------------------------------------------------------------

    /** Resolves a UCI line against a detached copy, so [game] is never mutated. */
    private fun moveLine(
        game: Game,
        vararg ucis: String,
    ): List<Move> {
        val probe = game.copy()
        return ucis.map { uci ->
            val mv = legal(probe, uci)
            probe.push(mv)
            mv
        }
    }

    private fun assertConsumed(
        count: Int,
        what: String,
    ) = assertTrue(count > 0, "$what must not be empty — the fixture was never consumed")

    private companion object {
        const val CASTLING_FEN = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"
        const val EN_PASSANT_FEN = "rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3"
        const val PROMOTION_FEN = "8/4P3/8/8/8/8/8/K6k w - - 0 1"
        const val CAPTURE_PROMOTION_FEN = "3r4/4P3/8/8/8/8/8/K6k w - - 0 1"
    }
}

/** The single legal move with this uci, so the promotion piece is always the real one. */
internal fun legal(
    game: Game,
    uci: String,
): Move = game.legalMoves().first { uciOf(it) == uci }
