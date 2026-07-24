package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.system.measureTimeMillis

class DeepSearchTest {
    @Test
    fun `derive_moves_deep matches every golden deep row`() {
        val rows = CnnFixtures.rows(CnnFixtures.DERIVE).filter { it.str("mode") == "deep" }
        assertEquals(6, rows.size, "deep row count")
        for (row in rows) {
            val name = row.str("name")
            val derived =
                recoveryFor(row).deriveMovesDeepFull(
                    row.board(),
                    row.observation(),
                    row.int("maxPlies"),
                    row.int("beam"),
                )
            assertSequenceEquivalent(row.strings("seq"), derived.moves.map { uciOf(it) }, row.board(), "$name seq")
            assertClose(row.num("best"), derived.best, "$name best")
            assertClose(row.num("second"), derived.second, "$name second")
        }
    }

    @Test
    fun `a four-ply desync is recovered exactly`() {
        val row = deepRow("deep_four_ply")
        val derived = recoveryFor(row).deriveMovesDeepFull(row.board(), row.observation(), 4, 8)
        assertSequenceEquivalent(
            listOf("g1f3", "b8c6", "e2e4", "e7e5"),
            derived.moves.map { uciOf(it) },
            row.board(),
            "deep_four_ply",
        )
    }

    @Test
    fun `transpositions collapse into one hypothesis`() {
        for (name in listOf("deep_transposition_a", "deep_transposition_b")) {
            val row = deepRow(name)
            val derived = recoveryFor(row).deriveMovesDeepFull(row.board(), row.observation(), 4, 8)
            assertTrue(derived.moves.isNotEmpty(), "$name: the transposition must not eat the margin")
            assertClose(1.0, derived.best, "$name best")
        }
    }

    @Test
    fun `the shortest sequence wins a tie`() {
        val row = deepRow("deep_two_ply_preferred")
        val derived = recoveryFor(row).deriveMovesDeepFull(row.board(), row.observation(), 4, 8)
        assertEquals(2, derived.moves.size, "a 2-ply explanation beats a 4-ply one")
        assertEquals(listOf("e2e4", "e7e5"), derived.moves.map { uciOf(it) })
    }

    @Test
    fun `a matching board has nothing to recover`() {
        val row = deepRow("deep_already_matching")
        val derived = recoveryFor(row).deriveMovesDeepFull(row.board(), row.observation(), 4, 8)
        assertTrue(derived.moves.isEmpty(), "the empty sequence is never accepted")
        assertClose(1.0, derived.best, "best")
    }

    @Test
    fun `conflict-guided pruning keeps a nonsense observation fast`() {
        val row = deepRow("deep_nonsense_observation")
        val recovery = recoveryFor(row)
        val board = row.board()
        val obs = row.observation()
        val elapsed = measureTimeMillis { recovery.deriveMovesDeepFull(board, obs, 4, 8) }
        assertTrue(elapsed < 1000, "4 plies / beam 8 took ${elapsed}ms")
    }

    @Test
    fun `the occupancy channel is used when identity is stripped`() {
        val row = deepRow("deep_two_ply_preferred")
        val derived = recoveryFor(row).deriveMovesDeepFull(row.board(), row.observation().occupancyOnly(), 4, 8)
        assertTrue(derived.best > 0.0, "occupancy fallback still scores")
    }

    @Test
    fun `the seam maps the deep result onto DeriveResult`() {
        val row = deepRow("deep_four_ply")
        val result = recoveryFor(row).deriveMovesDeep(row.board(), row.observation(), 4)
        assertSequenceEquivalent(listOf("g1f3", "b8c6", "e2e4", "e7e5"), result.moves, row.board(), "seam")
        assertClose(1.0, result.agreement, "agreement")
        assertTrue(!result.inconclusive)
        val empty = recoveryFor(row).deriveMovesDeep(startBoard(), row.observation().occupancyOnly(), 0)
        assertTrue(empty.inconclusive, "no sequence == inconclusive")
    }

    private fun deepRow(name: String): FixtureRow = CnnFixtures.rows(CnnFixtures.DERIVE).first { it.str("name") == name }

    private companion object {
        const val START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

        fun startBoard(): Board = Board().also { it.loadFromFen(START_FEN) }
    }
}
