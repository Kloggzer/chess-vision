package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * `_verify_pair_tick`. Python reference: `tests/test_move_tracker.py::TestPipelineRegressions`
 * (the five pair scenarios) plus the three properties the 2026-07-21 rework turns on.
 */
class VerifyPairTest {
    @Test
    fun pairVerifyCommitsOnAfterMatch() {
        val state = pairState()
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val cnn = PairRecovery(matchFen = afterFen(state, moves))
        // One glance: the CONFIRM rung concurs with the diff (COMMIT_VOTES).
        pairTick(state, cnn, moves, PairObs())
        assertEquals(listOf("e4", "e5"), state.history)
        assertNull(state.pending)
        assertEquals(VERIFY_STATE_CONFIRMED, state.verifyState)
        assertEquals(DECIDER_CNN_PAIR, state.decisionLog.last().decider)
    }

    /** Inside the motion hold a pair needs all four squares seen settled; without sights it waits. */
    @Test
    fun anEarlyPairWaitsForItsSquaresSeenSettled() {
        val early =
            pairState().also {
                it.nowS = 10.0
                it.refHoldUntil = 10.2
            }
        val moves = pairMoves(early, listOf("e2e4", "e7e5"))
        val cnn = PairRecovery(matchFen = afterFen(early, moves))
        pairTick(early, cnn, moves, PairObs())
        assertEquals(emptyList<String>(), early.history)

        val seen =
            pairState().also {
                it.nowS = 10.0
                it.refHoldUntil = 10.2
            }
        val all = -1L
        val occupied = (1L shl Squares.index("e4")) or (1L shl Squares.index("e5"))
        repeat(2) { seen.sights.addLast(SquareSight(it.toLong(), visible = all, confident = all, occupied = occupied)) }
        pairTick(seen, cnn, pairMoves(seen, listOf("e2e4", "e7e5")), PairObs())
        assertEquals(listOf("e4", "e5"), seen.history)
    }

    @Test
    fun pairVerifyRejectsShadow() {
        val state = pairState(cur = grayFrame())
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val cnn = PairRecovery(match = true)
        val candidateFrame = state.pending!!.cur
        repeat(2) { pairTick(state, cnn, moves, PairObs()) }
        assertEquals(emptyList<String>(), state.history)
        assertNull(state.pending)
        assertEquals("shadow", state.verifyState)
        // The shadow re-anchors on the frame the candidate was raised from (invariant 5).
        assertSame(candidateFrame, state.refGray)
    }

    @Test
    fun pairTouchedSquaresFastAccept() {
        val state = pairState()
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        // A chronic confident misread on c6 keeps the whole-board match false forever; the four
        // squares the pair physically changed read correctly.
        val cnn = PairRecovery(conflicts = listOf("c6"))
        val obs =
            PairObs(
                occupancy = mapOf("e2" to false, "e4" to true, "e7" to false, "e5" to true, "c6" to true),
                sure = setOf("e2", "e4", "e7", "e5", "c6"),
            )
        pairTick(state, cnn, moves, obs)
        assertEquals(listOf("e4", "e5"), state.history)
        assertEquals(VERIFY_STATE_CONFIRMED, state.verifyState)
        assertEquals(DECIDER_CNN_PAIR, state.decisionLog.last().decider)
    }

    @Test
    fun pairFastAcceptNeedsThreeCheckedSquares() {
        val state = pairState()
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val cnn = PairRecovery(conflicts = listOf("c6"))
        // Two correct touched squares — a fraction of two must never reach minAgreement.
        val obs = PairObs(occupancy = mapOf("e4" to true, "e5" to true), sure = setOf("e4", "e5"))
        repeat(2) { pairTick(state, cnn, moves, obs) }
        assertEquals(emptyList<String>(), state.history)
        assertNotNull(state.pending)
    }

    @Test
    fun pairSecondHalfTouchedOnMidBoard() {
        // Nb1c3 followed by b4xc3: on the MID board c3 is occupied, so the reply is an ordinary
        // capture. Read on the pre-move board it would look like en passant and drag in c4 —
        // the one square this observation misreads.
        val state =
            pairState(
                fen = "4k3/8/8/8/1pP5/8/8/1N2K3 w - - 0 1",
                ucis = listOf("b1c3", "b4c3"),
                cur = grayFrame(listOf("c3")),
            )
        val moves = pairMoves(state, listOf("b1c3", "b4c3"))
        val cnn = PairRecovery(conflicts = listOf("c4"))
        val obs =
            PairObs(
                occupancy = mapOf("b1" to false, "c3" to true, "b4" to false, "c4" to false),
                sure = setOf("b1", "c3", "b4", "c4"),
            )
        pairTick(state, cnn, moves, obs)
        assertEquals(DECIDER_CNN_PAIR, state.decisionLog.last().decider)
        assertNull(state.pending)
    }

    @Test
    fun pairWindowEndPreexistingConflictsCommit() {
        val state = pairState(verifyWindow = 3)
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val cnn = PairRecovery(conflicts = listOf("c6"))
        val obs = PairObs(occupancy = mapOf("e4" to true), sure = setOf("e4"))
        repeat(3) { pairTick(state, cnn, moves, obs) }
        assertEquals(listOf("e4", "e5"), state.history)
        assertEquals(DECIDER_DIFF_AFTER_VERIFY, state.decisionLog.last().decider)
        assertTrue(state.note!!.contains("pre-existed"), state.note!!)
    }

    /** One sure square of the four the pair touches: under the full-mask rule that is an occlusion timeout. */
    @Test
    fun pairWindowEndNeedsEveryTouchedSquareWhenBothEndsAreRequired() {
        val state = pairState(verifyWindow = 3, bothEnds = true)
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val cnn = PairRecovery(conflicts = listOf("c6"))
        val obs = PairObs(occupancy = mapOf("e4" to true), sure = setOf("e4"))
        repeat(3) { pairTick(state, cnn, moves, obs) }
        assertEquals(emptyList<String>(), state.history)
        assertNull(state.pending)
        assertTrue(state.note!!.contains("occlusion"), state.note!!)
    }

    @Test
    fun pairWindowEndOccludedDiscards() {
        val state = pairState(verifyWindow = 3)
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val cnn = PairRecovery(conflicts = listOf("c6"))
        repeat(3) { pairTick(state, cnn, moves, PairObs()) }
        assertEquals(emptyList<String>(), state.history)
        assertNull(state.pending)
        assertEquals("ghost", state.verifyState)
        assertTrue(state.note!!.contains("occlusion"), state.note!!)
    }

    @Test
    fun pairBlindGlanceNeverShadowRejects() {
        val state = pairState(verifyWindow = 3, cur = grayFrame())
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val refBefore = state.refGray
        // resyncCheck matches VACUOUSLY under a covering hand: zero confident squares.
        val cnn = PairRecovery(minConfidentBoard = 32, match = true)
        repeat(3) { pairTick(state, cnn, moves, PairObs()) }
        assertNotEquals("shadow", state.verifyState)
        assertSame(refBefore, state.refGray)
        assertEquals(emptyList<String>(), state.history)
    }

    @Test
    fun pairTerminalsThatContradictTheDiffNeedTwoGlances() {
        // The shadow rung DISCARDS the pair, so it still votes on `verifyObsVotes`; only the
        // confirm rung acts on one glance (COMMIT_VOTES).
        val state = pairState(cur = grayFrame())
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val cnn = PairRecovery(match = true)
        pairTick(state, cnn, moves, PairObs())
        assertNotNull(state.pending)
        assertEquals(emptyList<String>(), state.history)
        assertTrue(state.note!!.contains("confirming"), state.note!!)
        pairTick(state, cnn, moves, PairObs())
        assertNull(state.pending)
        assertEquals("shadow", state.verifyState)
    }

    /**
     * `VerifySingle.reject` schreibt jede Ablehnung ins Protokoll, die Paar-Leiter loeschte
     * `pending` still — eine verworfene Hypothese war von einer nie gesehenen nicht zu unterscheiden.
     */
    @Test
    fun aRejectedPairReachesTheDecisionLog() {
        val state = pairState(verifyWindow = 1)
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        pairTick(state, PairRecovery(conflicts = listOf("c6")), moves, PairObs())

        val row = state.decisionLog.last()
        assertEquals(DECIDER_REJECTED, row.decider)
        assertEquals("e2e4 e7e5", row.move, "die Zeile traegt den Paar-Schluessel")
        assertTrue(row.reason.contains("occlusion"), row.reason)
        assertFalse(row.accepted)
    }

    /** Und der Schatten-Ausgang ist genauso eine Ablehnung wie jeder andere. */
    @Test
    fun anAcceptedShadowReachesTheDecisionLog() {
        val state = pairState(cur = grayFrame())
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val cnn = PairRecovery(match = true)
        repeat(2) { pairTick(state, cnn, moves, PairObs()) }

        val row = state.decisionLog.last()
        assertEquals(DECIDER_REJECTED, row.decider)
        assertEquals("e2e4 e7e5", row.move)
        assertFalse(row.accepted)
    }

    /** `Commit.recordDecision`: genau EINE Zeile erbt den Spruch der Leiter, nicht jede Ebene. */
    @Test
    fun onlyTheFirstRowOfACommittedPairCarriesTheVerdict() {
        val state = pairState()
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        pairTick(state, PairRecovery(matchFen = afterFen(state, moves)), moves, PairObs())

        assertEquals(listOf("e4", "e5"), state.history)
        val rows = state.decisionLog.takeLast(2)
        assertEquals("commit", rows[0].verifyOutcome)
        assertNull(rows[1].verifyOutcome, "genau eine Zeile erbt ihn")
    }

    /** Dieselbe Luecke in der Paar-Leiter: das letzte `else` liess die Stimme stehen. */
    @Test
    fun aNeutralGlanceRestartsThePairVote() {
        val state = pairState(cur = grayFrame())
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val shadowing = PairRecovery(match = true)
        val undecided = PairObs(occupancy = mapOf("e4" to true, "e5" to true), sure = setOf("e4", "e5"))

        pairTick(state, shadowing, moves, PairObs())
        assertEquals(1, state.pending!!.voteCount)

        pairTick(state, PairRecovery(conflicts = listOf("c6")), moves, undecided)
        assertNull(state.pending!!.voteOutcome, "eine unentschiedene Lesung loescht die Serie")

        pairTick(state, shadowing, moves, PairObs())
        assertNotNull(state.pending, "shadow, neutral, shadow sind keine zwei aufeinanderfolgenden Stimmen")
        assertEquals(emptyList<String>(), state.history)
    }

    @Test
    fun windowEndTerminalIsNotVoteGated() {
        val state = pairState(verifyWindow = 1)
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val cnn = PairRecovery(conflicts = listOf("c6"))
        val obs = PairObs(occupancy = mapOf("e4" to true), sure = setOf("e4"))
        pairTick(state, cnn, moves, obs)
        assertEquals(listOf("e4", "e5"), state.history)
        assertEquals(DECIDER_DIFF_AFTER_VERIFY, state.decisionLog.last().decider)
    }
}
