package com.chesslab.cnn

import com.chesslab.engine.api.IllegalMoveException
import com.chesslab.engine.api.STARTPOS
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

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
    fun `verify_move matches every golden row`() {
        val rows = CnnFixtures.rows(CnnFixtures.VERIFY)
        assertEquals(4, rows.size, "row count")
        for (row in rows) {
            val name = row.str("name")
            val (agreement, checked) = recoveryFor(row).verifyMove(row.str("fen"), row.str("uci"), row.observation())
            assertClose(row.num("agreement"), agreement, "$name agreement")
            assertEquals(row.int("checked"), checked, "$name checked")
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
        val blind = FakeSquareClassifier(STARTPOS, overrides = occluded(ALL_SQUARES)).observe()
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

    /** The live phantom of 30.07.2026: the g7 pawn on the square's edge read `p(occupied) = 0.13`,
     *  and g7g6, the only move vacating g7, explained 58 of 59 squares — exactly as well as standing still. */
    @Test
    fun `one square read as wrongly empty does not fabricate a move`() {
        val board = boardOf(PHANTOM_FEN)
        val obs = FakeSquareClassifier(PHANTOM_FEN, overrides = mapOf("g7" to ("empty" to 0.99))).observe()
        val scored = RECOVERY.scoreMoves(board, obs)
        assertNull(scored.move, "a move that only explains an absence is not evidence")
        assertEquals(scored.best, scored.second, "g7g6 ties with the position as it stands")
    }

    @Test
    fun `the standing position is a rival, not a veto - a move explaining more still wins`() {
        val obs = FakeSquareClassifier(fenAfter("e2e4"), overrides = mapOf("g7" to ("empty" to 0.99))).observe()
        val scored = RECOVERY.scoreMoves(startBoard(), obs)
        assertEquals("e2e4", scored.move?.let { uciOf(it) })
        assertClose(63.0 / 64.0, scored.best, "one unrelated square is missed")
    }

    @Test
    fun `verify_move is local - a far misread does not lower a correct e2e4`() {
        val obs = FakeSquareClassifier(fenAfter("e2e4"), overrides = mapOf("c6" to ("bN" to 0.99))).observe()
        val (agreement, checked) = RECOVERY.verifyMove(STARTPOS, "e2e4", obs)
        assertEquals(1.0, agreement)
        assertEquals(2, checked)
    }

    @Test
    fun `board_matches_identity is inconclusive at 31 and conclusive at 32`() {
        val obs31 = FakeSquareClassifier(STARTPOS, overrides = occluded(ALL_SQUARES.take(33))).observe()
        val check31 = RECOVERY.boardMatchesIdentityFull(startBoard(), obs31)
        assertEquals(31, check31.n)
        assertTrue(check31.inconclusive)
        assertTrue(!check31.match && check31.conflicts.isEmpty(), "inconclusive is NOT a mismatch")

        val wrong = occluded(ALL_SQUARES.take(32)) + ("b8" to ("bB" to 0.99))
        val obs32 = FakeSquareClassifier(STARTPOS, overrides = wrong).observe()
        val check32 = RECOVERY.boardMatchesIdentityFull(startBoard(), obs32)
        assertEquals(32, check32.n)
        assertTrue(!check32.inconclusive && !check32.match)
        assertEquals(listOf("b8"), check32.conflicts)
    }

    /** The seam takes the move as a STRING, so a fabrication would enter here. It THROWS: an abstention
     *  would read as "too few confident squares", which means something else to the verify ladder. */
    @Test
    fun `verify_move refuses an illegal uci and stays distinguishable from an unreadable one`() {
        val blind = FakeSquareClassifier(STARTPOS, overrides = occluded(ALL_SQUARES)).observe()
        assertEquals(NO_AGREEMENT to 0, RECOVERY.verifyMove(STARTPOS, "e2e4", blind), "unreadable abstains")

        val obs = FakeSquareClassifier(STARTPOS).observe()
        val refused = assertThrows<IllegalMoveException> { RECOVERY.verifyMove(STARTPOS, "e2e5", obs) }
        assertEquals("e2e5", refused.uci)
        assertEquals(STARTPOS, refused.fen)
    }

    private fun occluded(squares: List<String>): Map<String, Pair<String, Double>> = squares.associateWith { "occluded" to 0.99 }

    private companion object {
        const val THR = 0.85

        /** The position the phantom g6 was committed from (session 20260730-160914, ply 15). */
        const val PHANTOM_FEN = "r1bqkb2/pppp1pp1/2n2n2/1B2p1Nr/4P3/2NP4/PPP2P1P/R1BQK1R1 b Qq - 4 10"
        val RECOVERY = CnnRecovery()

        fun startBoard() = boardOf(STARTPOS)

        fun fenAfter(uci: String): String {
            val board = startBoard()
            board.doMove(parseMove(board, uci))
            return board.fen
        }
    }
}
