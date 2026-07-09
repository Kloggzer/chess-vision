package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Golden values harvested from the Python `loglik_scores` / `move_prior` / pair scoring. */
class MoveScoringTest {
    private fun zMap(vararg hot: Pair<String, Double>): Map<String, Double> {
        val z = Squares.all.associateWith { 0.3 }.toMutableMap()
        for ((sq, v) in hot) z[sq] = v
        return z
    }

    @Test
    fun `loglik top moves match python golden values`() {
        val game = Game()
        val scored = MoveScoring.loglikScores(game, zMap("e2" to 8.0, "e4" to 7.0))
        val top = scored.take(3).map { (mv, s) -> uciOf(mv) to s }
        assertEquals("e2e4", top[0].first)
        assertEquals(9.0, top[0].second, 1e-6)
        assertEquals("e2e3", top[1].first)
        assertEquals(2.3, top[1].second, 1e-6)
        assertEquals(-5.4, top[2].second, 1e-6)
    }

    @Test
    fun `pair scoring finds the double move`() {
        val game = Game()
        val pairs = MoveScoring.loglikPairScores(game, zMap("e2" to 8.0, "e4" to 7.0, "e7" to 7.5, "e5" to 6.5))
        val (seq, score) = pairs.first()
        assertEquals("e2e4 e7e5", seq.joinToString(" ") { uciOf(it) })
        assertEquals(17.0, score, 1e-6)
    }

    @Test
    fun `move prior matches python (forward pawn and knight both 0_2)`() {
        val game = Game()
        val e2e4 = game.legalMoves().first { uciOf(it) == "e2e4" }
        val g1f3 = game.legalMoves().first { uciOf(it) == "g1f3" }
        assertEquals(0.2, MoveScoring.movePrior(game, e2e4), 1e-9)
        assertEquals(0.2, MoveScoring.movePrior(game, g1f3), 1e-9)
    }

    @Test
    fun `touched squares include rook on castling and captured pawn on en passant`() {
        val castle = Game("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
        val oo = castle.legalMoves().first { uciOf(it) == "e1g1" }
        assertEquals(setOf("e1", "f1", "g1", "h1"), MoveScoring.moveTouchedSquares(castle, oo))
        val ooo = castle.legalMoves().first { uciOf(it) == "e1c1" }
        assertEquals(setOf("a1", "c1", "d1", "e1"), MoveScoring.moveTouchedSquares(castle, ooo))
        val ep = Game("rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3")
        val exf6 = ep.legalMoves().first { uciOf(it) == "e5f6" }
        assertEquals(setOf("e5", "f5", "f6"), MoveScoring.moveTouchedSquares(ep, exf6))
        assertEquals(true, MoveScoring.isEnPassant(ep, exf6))
        assertEquals(true, MoveScoring.isCapture(ep, exf6))
    }

    @Test
    fun `game san and history round trip`() {
        val game = Game()
        val e4 = game.legalMoves().first { uciOf(it) == "e2e4" }
        assertEquals("e4", game.san(e4))
        game.push(e4)
        assertEquals(false, game.whiteToMove)
        game.pop()
        assertEquals(STARTPOS, game.fen())
        assertEquals(listOf("e4", "e5", "Nf3"), Game().sanSequence(ucisToMoves(Game(), listOf("e2e4", "e7e5", "g1f3"))))
    }

    private fun ucisToMoves(game: Game, ucis: List<String>): List<com.github.bhlangonijr.chesslib.move.Move> {
        val g = game.copy()
        return ucis.map { uci ->
            val mv = g.legalMoves().first { uciOf(it) == uci }
            g.push(mv)
            mv
        }
    }
}
