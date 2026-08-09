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

    /**
     * The knob exists because length used to be FREE: ranking was hits-first with length as a mere
     * tiebreak, so a fabrication needed exactly one more explained square than the truth to win —
     * and the identity head's B<->R confusion supplies one. Measured on rec-20260807-135238 under
     * dense evaluation: 12 phantoms at cost 0, 1 at cost 1, 0 at cost 2 (where recovery commits
     * nothing at all, which is why 2 is not automatically the answer).
     *
     * A price that also kills GENUINE deep recoveries would be no defence, so both directions are
     * pinned: the four-ply desync explains eight squares and must still pay for itself at 1.
     */
    @Test
    fun `a genuine four-ply recovery still pays for its length at cost 1`() {
        val row = deepRow("deep_four_ply")
        val priced = recoveryFor(row, plyCost = 1).deriveMovesDeepFull(row.board(), row.observation(), 4, 8)
        assertSequenceEquivalent(
            listOf("g1f3", "b8c6", "e2e4", "e7e5"),
            priced.moves.map { uciOf(it) },
            row.board(),
            "deep_four_ply at cost 1",
        )
    }

    @Test
    fun `a price above what the plies explain rejects the sequence`() {
        val row = deepRow("deep_four_ply")
        val overpriced = recoveryFor(row, plyCost = 3).deriveMovesDeepFull(row.board(), row.observation(), 4, 8)
        assertTrue(overpriced.moves.isEmpty(), "4 plies explaining 8 squares must not survive a 12-square bill")
    }

    @Test
    fun `the default is the historical behaviour`() {
        assertEquals(0, CnnConfig().plyCostSquares, "length stays free unless a measurement says otherwise")
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
        val result = recoveryFor(row).deriveMovesDeep(row.str("fen"), row.observation(), 4)
        assertSequenceEquivalent(listOf("g1f3", "b8c6", "e2e4", "e7e5"), result.moves, row.board(), "seam")
        assertClose(1.0, result.agreement, "agreement")
        assertTrue(!result.inconclusive)
        val empty = recoveryFor(row).deriveMovesDeep(START_FEN, row.observation().occupancyOnly(), 0)
        assertTrue(empty.inconclusive, "no sequence == inconclusive")
    }

    private fun deepRow(name: String): FixtureRow = CnnFixtures.rows(CnnFixtures.DERIVE).first { it.str("name") == name }

    private companion object {
        const val START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

        fun startBoard(): Board = Board().also { it.loadFromFen(START_FEN) }
    }
}
