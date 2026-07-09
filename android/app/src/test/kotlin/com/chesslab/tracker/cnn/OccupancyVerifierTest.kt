package com.chesslab.tracker.cnn

import com.chesslab.engine.Game
import com.chesslab.engine.STARTPOS
import com.chesslab.engine.api.VerifyVerdict
import com.chesslab.engine.uciOf
import com.chesslab.tracker.cnn.ObservationFixtures.obsOf
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class OccupancyVerifierTest {
    private val verifier = OccupancyVerifier()
    private val window = CnnConfig().verifyWindow

    private fun afterMoves(vararg ucis: String): Game {
        val g = Game()
        for (u in ucis) g.push(g.legalMoves().first { uciOf(it) == u })
        return g
    }

    // -- reliable-axis rule (acceptance criterion) --

    @Test
    fun `from-square confidently empty counts FOR`() {
        // Only the from-square is readable and demonstrably emptied: FOR at frame 1.
        val obs =
            obsOf(
                afterMoves("e2e4"),
                occluded = ALL_SQUARES.filterNot { it == "e2" }.toSet(),
            )
        val step = verifier.evaluate(STARTPOS, listOf("e2e4"), obs, framesSeen = 1)
        assertEquals(VerifyVerdict.For(listOf("e2e4")), (step as VerifyStep.Decided).verdict)
    }

    @Test
    fun `to-square confidently empty counts AGAINST`() {
        // e2 still occupied, e4 still empty (hand-wave ghost); a second conflict
        // (h7 forced empty) keeps the observation from matching the pre-move board.
        val obs = obsOf(Game(), overrides = mapOf("h7" to false))
        val step = verifier.evaluate(STARTPOS, listOf("e2e4"), obs, framesSeen = 1)
        val verdict = (step as VerifyStep.Decided).verdict
        assertTrue(verdict is VerifyVerdict.Against)
        assertFalse((verdict as VerifyVerdict.Against).boardUnchanged)
        assertTrue(verdict.reason.contains("e4 still empty"))
    }

    // -- shadow killer --

    @Test
    fun `board unchanged rejects as shadow with boardUnchanged`() {
        val obs = obsOf(Game()) // observation still matches the pre-move position
        val step = verifier.evaluate(STARTPOS, listOf("e2e4"), obs, framesSeen = 1)
        val verdict = (step as VerifyStep.Decided).verdict
        assertTrue(verdict is VerifyVerdict.Against)
        assertTrue((verdict as VerifyVerdict.Against).boardUnchanged)
    }

    @Test
    fun `full after-position agreement confirms`() {
        val obs = obsOf(afterMoves("e2e4"))
        val step = verifier.evaluate(STARTPOS, listOf("e2e4"), obs, framesSeen = 1)
        assertEquals(VerifyVerdict.For(listOf("e2e4")), (step as VerifyStep.Decided).verdict)
    }

    // -- window resolution --

    @Test
    fun `occluded endpoints continue then time out at the window`() {
        // Endpoints unreadable the whole window; h7 conflict prevents the shadow match.
        val obs = obsOf(Game(), occluded = setOf("e2", "e4"), overrides = mapOf("h7" to false))
        val mid = verifier.evaluate(STARTPOS, listOf("e2e4"), obs, framesSeen = window - 1)
        assertTrue(mid is VerifyStep.Continue)
        val end = verifier.evaluate(STARTPOS, listOf("e2e4"), obs, framesSeen = window)
        assertEquals(VerifyVerdict.Timeout(listOf("e2e4")), (end as VerifyStep.Decided).verdict)
    }

    @Test
    fun `clear view without contradiction accepts the diff at the window`() {
        // Capture candidate e4xd5: destination stays occupied (no toArrived signal),
        // origin occluded, plus an unexplained h7 conflict -> undecided until the
        // window, then the diff is trusted (tracker.py:1639-1641).
        val before = afterMoves("e2e4", "d7d5")
        val after = afterMoves("e2e4", "d7d5", "e4d5")
        val obs = obsOf(after, occluded = setOf("e4"), overrides = mapOf("h7" to false))
        val mid = verifier.evaluate(before.fen(), listOf("e4d5"), obs, framesSeen = 1)
        assertTrue(mid is VerifyStep.Continue)
        val end = verifier.evaluate(before.fen(), listOf("e4d5"), obs, framesSeen = window)
        assertEquals(VerifyVerdict.For(listOf("e4d5")), (end as VerifyStep.Decided).verdict)
    }

    @Test
    fun `from-square still occupied at the window rejects as ghost`() {
        // e2 confidently still occupied, destination occluded, h7 conflict.
        val obs = obsOf(Game(), occluded = setOf("e4"), overrides = mapOf("h7" to false))
        val end = verifier.evaluate(STARTPOS, listOf("e2e4"), obs, framesSeen = window)
        val verdict = (end as VerifyStep.Decided).verdict
        assertTrue(verdict is VerifyVerdict.Against)
        assertTrue((verdict as VerifyVerdict.Against).reason.contains("e2 still occupied"))
    }

    // -- pair candidates (fast play) --

    @Test
    fun `pair confirmed when observation matches the position after both half-moves`() {
        val obs = obsOf(afterMoves("e2e4", "e7e5"))
        val step = verifier.evaluate(STARTPOS, listOf("e2e4", "e7e5"), obs, framesSeen = 1)
        assertEquals(VerifyVerdict.For(listOf("e2e4", "e7e5")), (step as VerifyStep.Decided).verdict)
    }

    @Test
    fun `pair rejected as shadow when the board is unchanged`() {
        val obs = obsOf(Game())
        val step = verifier.evaluate(STARTPOS, listOf("e2e4", "e7e5"), obs, framesSeen = 1)
        val verdict = (step as VerifyStep.Decided).verdict
        assertTrue(verdict is VerifyVerdict.Against)
        assertTrue((verdict as VerifyVerdict.Against).boardUnchanged)
    }

    @Test
    fun `undecided pair times out at the window`() {
        // Matches neither before nor after (only the first half-move happened).
        val obs = obsOf(afterMoves("e2e4"))
        val mid = verifier.evaluate(STARTPOS, listOf("e2e4", "e7e5"), obs, framesSeen = 1)
        assertTrue(mid is VerifyStep.Continue)
        val end = verifier.evaluate(STARTPOS, listOf("e2e4", "e7e5"), obs, framesSeen = window)
        assertEquals(VerifyVerdict.Timeout(listOf("e2e4", "e7e5")), (end as VerifyStep.Decided).verdict)
    }

    // -- helpers ported from cnn_recovery.py --

    @Test
    fun `verifyMove needs both endpoints confident`() {
        val game = Game()
        val move = game.legalMoves().first { uciOf(it) == "e2e4" }
        val obs = obsOf(afterMoves("e2e4"), occluded = setOf("e4"))
        val (agree, n) = verifier.verifyMove(game, move, obs)
        assertEquals(0.0, agree)
        assertEquals(1, n)
    }

    @Test
    fun `scoreMoves finds the single explaining move with a square margin`() {
        val game = Game()
        val (mv, best, second) = verifier.scoreMoves(game, obsOf(afterMoves("e2e4")))
        assertEquals("e2e4", mv?.let(::uciOf))
        assertTrue(best >= 0.97)
        assertTrue(best > second)
    }
}
