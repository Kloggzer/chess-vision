package com.chesslab.engine

import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The seam between a pending PAIR and the pair verifier — the one route no test drove.
 *
 * `VerifyPairTest` calls `VerifyPair.tick` directly (`VerifyPairFixtures.pairTick`), so it proves
 * the verifier and says nothing about whether anything reaches it. Nothing did:
 * `VerifySingle.evaluate` resolved the pending ucis with `legalMoveFor`, which means legal in the
 * CURRENT position, and a pair's second uci is the OPPONENT's reply generated on the board after
 * the first was pushed. In the pre-move position its from-square still holds an enemy piece, so it
 * was never legal, `mapNotNull` always dropped it, and every pair arrived at the verifier as a
 * single. `VerifyPair.tick` was unreachable in production.
 *
 * The cost was not a dead branch. The commit then anchored the reference on `pend.cur` — the frame
 * that already shows BOTH half-moves — so the reply was baked into the reference and could never be
 * detected: a silent, permanent one-ply desync, on the path that exists to prevent exactly that,
 * and only with a CNN attached (`pairBeforeSingle` runs `if (cnnOn)`).
 *
 * The fixtures had it right all along: `pairMoves` resolves the second half-move on the MID board
 * and says so in its own KDoc. Production did not.
 */
class VerifyPairSeamTest {
    @Test
    fun `a pending pair reaches the pair verifier and commits both half-moves`() {
        val state = pairState(ucis = listOf("e2e4", "e7e5"))
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val after = afterFen(state, moves)
        // Agrees with the board AFTER both half-moves — the pair verifier's positive case.
        val cnn = PairRecovery(matchFen = after)

        val events = VerifySingle.tick(state, cnn, snapshotOf(state, PairObs(emptyMap())))

        val committed = events.filterIsInstance<TrackerEvent.SequenceCommitted>().firstOrNull()
        assertNotNull(committed, "a pair must commit as a sequence, not as its first half: $events")
        assertEquals(DECIDER_CNN_PAIR, committed!!.decider)
        assertEquals(after, state.board.fen(), "both half-moves must be on the board")
    }

    @Test
    fun `the reply survives resolution even though it is illegal before the first half-move`() {
        // The regression in one assertion, with no verifier involved: the reply e7e5 is not among
        // White's legal moves in the start position, which is precisely why the old filter lost it.
        val state = pairState(ucis = listOf("e2e4", "e7e5"))
        assertTrue(state.legalMoveFor("e7e5") == null, "the reply is illegal before the first move")
        assertEquals(2, state.pendingMoves(listOf("e2e4", "e7e5")).size)
    }

    @Test
    fun `a uci that is legal nowhere in the sequence still stops the resolution`() {
        // Resolving in sequence must not become "accept anything": a second uci that is illegal
        // even after the first is dropped, and the candidate degrades to the single it really is.
        val state = pairState(ucis = listOf("e2e4", "a1a8"))
        assertEquals(1, state.pendingMoves(listOf("e2e4", "a1a8")).size)
    }
}
