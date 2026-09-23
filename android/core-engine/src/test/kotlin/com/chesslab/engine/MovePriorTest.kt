package com.chesslab.engine

import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.assertClose
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Against `tierA.movePrior`, emitted for EVERY legal move of `frame.fen`. */
class MovePriorTest {
    @Test
    fun movePriorMatchesPython() {
        var checked = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            for (frame in clip.tierAFrames()) {
                val expected = requireNotNull(frame.tierA).movePrior
                val game = Game(requireNotNull(frame.fen))
                val moves = game.legalMoves()
                assertEquals(expected.size, moves.size, "$name/${frame.frame}: legal move count")
                for (mv in moves) {
                    val uci = uciOf(mv)
                    assertClose(
                        requireNotNull(expected[uci]) { "$name/${frame.frame}: unknown uci $uci" },
                        movePrior(game, mv),
                        "$name/${frame.frame}: movePrior[$uci]",
                    )
                    checked++
                }
            }
        }
        assertTrue(checked > 0, "movePrior comparisons must not be empty — the fixture was never consumed")
    }

    @Test
    fun aQuietForwardPawnScoresTheForwardBonusOnly() {
        val game = Game()
        assertClose(PRIOR_FORWARD, movePrior(game, legal(game, "e2e4")), "e2e4")
    }

    @Test
    fun captureCheckAndForwardCapAtOne() {
        val game = Game(CAPTURE_CHECK_FEN)
        val mv = legal(game, "h1h5")
        assertTrue(isCapture(game, mv) && givesCheck(game, mv), "Qxh5+ is a capturing check")
        assertClose(PRIOR_CAP, movePrior(game, mv), "Qxh5+")
        assertEquals(CAPTURE_CHECK_FEN, game.fen(), "movePrior must not mutate the position")
    }

    @Test
    fun aBackwardKingMoveScoresNothing() {
        val game = Game(BACKWARD_KING_FEN)
        assertClose(0.0, movePrior(game, legal(game, "e2e1")), "Ke1")
    }

    @Test
    fun forwardForBlackMeansADecreasingRank() {
        val game = Game(BLACK_TO_MOVE_FEN)
        assertTrue(!game.whiteToMove, "black to move")
        assertClose(PRIOR_FORWARD, movePrior(game, legal(game, "d7d5")), "d5")
        assertClose(PRIOR_FORWARD, movePrior(game, legal(game, "g8f6")), "Nf6 is forward too")
    }

    private companion object {
        const val CAPTURE_CHECK_FEN = "7k/8/8/7r/8/8/8/K6Q w - - 0 1"
        const val BACKWARD_KING_FEN = "4k3/8/8/8/8/8/4K3/8 w - - 0 1"
        const val BLACK_TO_MOVE_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    }
}
