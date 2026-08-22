package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertNotSame
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Test

class GameMemoizationTest {
    @Test
    fun `fen and legal moves are reused until the position changes`() {
        val game = Game()
        val fen = game.fen()
        val moves = game.legalMoves()

        assertSame(fen, game.fen())
        assertSame(moves, game.legalMoves())

        game.push(moves.single { uciOf(it) == "e2e4" })

        assertNotSame(fen, game.fen())
        assertNotSame(moves, game.legalMoves())
    }

    @Test
    fun `pop restores the cached parent position`() {
        val game = Game()
        val parentFen = game.fen()
        val parentMoves = game.legalMoves()

        game.push(parentMoves.single { uciOf(it) == "e2e4" })
        game.fen()
        game.legalMoves()
        game.pop()

        assertSame(parentFen, game.fen())
        assertSame(parentMoves, game.legalMoves())
    }
}
