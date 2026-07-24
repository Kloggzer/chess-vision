package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class DeriveIdentityTest {
    @Test
    fun `derive_moves_identity matches every golden identity row`() {
        val rows = CnnFixtures.rows(CnnFixtures.DERIVE).filter { it.str("mode") == "identity" }
        assertEquals(4, rows.size, "identity row count")
        for (row in rows) {
            val name = row.str("name")
            val derived = recoveryFor(row).deriveMovesIdentity(row.board(), row.observation(), row.int("maxPlies"))
            assertEquals(row.strings("seq"), derived.moves.map { uciOf(it) }, "$name seq")
            assertClose(row.num("best"), derived.best, "$name best")
            assertClose(row.num("second"), derived.second, "$name second")
        }
    }

    @Test
    fun `a single explanation is not returned as a pair`() {
        val row = CnnFixtures.rows(CnnFixtures.DERIVE).first { it.str("name") == "identity_single_not_a_pair" }
        assertEquals(2, row.int("maxPlies"), "the fixture must exercise the pair pass")
        val derived = recoveryFor(row).deriveMovesIdentity(row.board(), row.observation(), maxPlies = 2)
        assertEquals(listOf("e2e4"), derived.moves.map { uciOf(it) })
    }

    @Test
    fun `a blitz pair is returned in side-to-move order`() {
        val row = CnnFixtures.rows(CnnFixtures.DERIVE).first { it.str("name") == "identity_blitz_pair" }
        val derived = recoveryFor(row).deriveMovesIdentity(row.board(), row.observation(), maxPlies = 2)
        assertEquals(listOf("e2e4", "e7e5"), derived.moves.map { uciOf(it) })
    }

    @Test
    fun `a pair that does not beat the best single yields nothing`() {
        val row = CnnFixtures.rows(CnnFixtures.DERIVE).first { it.str("name") == "identity_nothing_changed" }
        val derived = recoveryFor(row).deriveMovesIdentity(row.board(), row.observation(), maxPlies = 2)
        assertTrue(derived.moves.isEmpty(), "an unchanged board explains nothing")
    }

    @Test
    fun `derive_move_identity is the 1-ply wrapper`() {
        val row = CnnFixtures.rows(CnnFixtures.DERIVE).first { it.str("name") == "identity_single_e2e4" }
        val single = recoveryFor(row).deriveMoveIdentity(row.board(), row.observation())
        assertEquals("e2e4", single.move?.let { uciOf(it) })
        assertClose(row.num("best"), single.best, "best")
    }

    @Test
    fun `too few label-confident squares short-circuits`() {
        val blind = FakeSquareClassifier(START_FEN, overrides = ALL_SQUARES.associateWith { "occluded" to 0.99 })
        val derived = CnnRecovery().deriveMovesIdentity(startBoard(), blind.observe(), maxPlies = 2)
        assertTrue(derived.moves.isEmpty())
        assertEquals(0.0, derived.best)
    }

    private companion object {
        const val START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

        fun startBoard(): Board = Board().also { it.loadFromFen(START_FEN) }
    }
}
