package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class RecoveryTest {
    @Test
    fun `score_moves matches every golden row`() {
        val rows = CnnFixtures.rows(CnnFixtures.SCORE)
        assertEquals(3, rows.size, "row count")
        for (row in rows) {
            val name = row.str("name")
            val scored = recoveryFor(row).scoreMoves(row.board(), row.observation())
            assertEquals(row.strOrNull("move"), scored.move?.let { uciOf(it) }, "$name move")
            assertClose(row.num("best"), scored.best, "$name best")
            assertClose(row.num("second"), scored.second, "$name second")
        }
    }

    @Test
    fun `verify_move and verify_move_identity match every golden row`() {
        val rows = CnnFixtures.rows(CnnFixtures.VERIFY)
        assertEquals(4, rows.size, "row count")
        for (row in rows) {
            val name = row.str("name")
            val recovery = recoveryFor(row)
            val board = row.board()
            val obs = row.observation()
            val (agreement, checked) = recovery.verifyMove(board, row.str("uci"), obs)
            assertClose(row.num("agreement"), agreement, "$name agreement")
            assertEquals(row.int("checked"), checked, "$name checked")
            val (idAgreement, idChecked) = recovery.verifyMoveIdentity(board, row.str("uci"), obs)
            assertClose(row.num("identityAgreement"), idAgreement, "$name identityAgreement")
            assertEquals(row.int("identityChecked"), idChecked, "$name identityChecked")
        }
    }

    @Test
    fun `board_matches_identity matches every golden row`() {
        val rows = CnnFixtures.rows(CnnFixtures.IDENTITY)
        assertEquals(3, rows.size, "row count")
        for (row in rows) {
            val name = row.str("name")
            val check = recoveryFor(row).boardMatchesIdentityFull(row.board(), row.observation())
            assertEquals(row.bool("match"), check.match, "$name match")
            assertEquals(row.bool("inconclusive"), check.inconclusive, "$name inconclusive")
            assertEquals(row.strings("conflicts"), check.conflicts, "$name conflicts")
            assertEquals(row.int("n"), check.n, "$name n")
        }
    }

    @Test
    fun `score_moves needs minConfidentRecovery squares`() {
        val blind = FakeSquareClassifier(START_FEN, overrides = occluded(ALL_SQUARES)).observe()
        assertEquals(0, blind.confidentSquares(THR).size, "a covered board has no confident square")
        val scored = RECOVERY.scoreMoves(startBoard(), blind)
        assertNull(scored.move)
        assertEquals(0.0, scored.best)
        assertEquals(0.0, scored.second)
    }

    @Test
    fun `promotion variants are occupancy-identical and yield no move`() {
        val row = CnnFixtures.rows(CnnFixtures.SCORE).first { it.str("name") == "promotion_variants" }
        val scored = recoveryFor(row).scoreMoves(row.board(), row.observation())
        assertNull(scored.move, "a 0-square margin must not be resolved")
        assertClose(1.0, scored.best, "best is still reported")
    }

    @Test
    fun `verify_move is local - a far misread does not lower a correct e2e4`() {
        val obs = FakeSquareClassifier(fenAfter("e2e4"), overrides = mapOf("c6" to ("bN" to 0.99))).observe()
        val (agreement, checked) = RECOVERY.verifyMove(startBoard(), "e2e4", obs)
        assertEquals(1.0, agreement)
        assertEquals(2, checked)
    }

    @Test
    fun `board_matches_identity is inconclusive at 31 and conclusive at 32`() {
        val obs31 = FakeSquareClassifier(START_FEN, overrides = occluded(ALL_SQUARES.take(33))).observe()
        val check31 = RECOVERY.boardMatchesIdentityFull(startBoard(), obs31)
        assertEquals(31, check31.n)
        assertTrue(check31.inconclusive)
        assertTrue(!check31.match && check31.conflicts.isEmpty(), "inconclusive is NOT a mismatch")

        val wrong = occluded(ALL_SQUARES.take(32)) + ("b8" to ("bB" to 0.99))
        val obs32 = FakeSquareClassifier(START_FEN, overrides = wrong).observe()
        val check32 = RECOVERY.boardMatchesIdentityFull(startBoard(), obs32)
        assertEquals(32, check32.n)
        assertTrue(!check32.inconclusive && !check32.match)
        assertEquals(listOf("b8"), check32.conflicts)
    }

    private fun occluded(squares: List<String>): Map<String, Pair<String, Double>> = squares.associateWith { "occluded" to 0.99 }

    private companion object {
        const val THR = 0.85
        const val START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        val RECOVERY = CnnRecovery()

        fun startBoard(): Board = Board().also { it.loadFromFen(START_FEN) }

        fun fenAfter(uci: String): String {
            val board = startBoard()
            board.doMove(parseMove(board, uci))
            return board.fen
        }
    }
}
