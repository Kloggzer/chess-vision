package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * `_verify_tick` — mirrors `tests/test_move_tracker.py::TestCnnVerify` scenario by scenario, plus
 * the Spec-11 seq contract and the multi-glance vote.
 */
class VerifySingleTest {
    private fun EngineState.glance(
        cnn: CnnEvaluator?,
        obs: CnnObservation,
        seq: Long = 0,
    ): List<TrackerEvent> = VerifySingle.tick(this, cnn, snapOf(this, obs, seq))

    @Test
    fun shadowSuppressedNoCommit() {
        val state = pendingState()
        val candidateFrame = state.pending!!.cur
        val cnn = VerifyEvaluator(match = true)
        repeat(2) { state.glance(cnn, VerifyObs()) }

        assertEquals(emptyList<String>(), state.history)
        assertNull(state.pending)
        assertEquals("shadow", state.verifyState)
        assertEquals("shadow", state.cnnStatus)
        // Invariant 5: the verify path re-anchors on the candidate's own averaged frame, never on
        // the frame the CNN looked at.
        assertTrue(state.refGray === candidateFrame)
    }

    @Test
    fun occupancyConfirmsCommit() {
        val state = pendingState()
        val cnn = VerifyEvaluator(occAgree = 1.0, occN = 2)
        repeat(2) { state.glance(cnn, VerifyObs()) }

        assertEquals(listOf("e4"), state.history)
        assertEquals("e2e4", state.lastMove)
        assertNull(state.pending)
        assertEquals(VERIFY_STATE_CONFIRMED, state.verifyState)
        assertEquals(false, state.recoveredLast)
    }

    /**
     * `test_confirm_acts_on_one_glance_contradiction_still_needs_two`. One observation is a full
     * observer round trip (~0.21 s on the SM8650); the CONFIRM rung concurs with a candidate the
     * diff already carried through `confirmFrames`, the ambiguity margin and `commitLlFloor`, so it
     * acts on the first. Contradicting rungs still need `verifyObsVotes`.
     */
    @Test
    fun confirmActsOnOneGlanceContradictionStillNeedsTwo() {
        val state = pendingState()
        state.glance(VerifyEvaluator(occAgree = 1.0, occN = 2), VerifyObs())
        assertEquals(listOf("e4"), state.history)
        assertNull(state.pending)

        val ghost = pendingState()
        val obs = VerifyObs(mapOf("e4" to false, "e2" to true), mapOf("e4" to true, "e2" to true))
        ghost.glance(VerifyEvaluator(), obs)
        assertNotNull(ghost.pending)
        assertEquals(emptyList<String>(), ghost.history)
        ghost.glance(VerifyEvaluator(), obs)
        assertNull(ghost.pending)
        assertEquals("ghost", ghost.verifyState)
    }

    /**
     * `test_verify_resolves_on_the_wall_clock_not_only_the_observation_count`. `verifyWindow`
     * counts OBSERVATIONS and what one costs is set by the CNN, so 8 of them is 1.2 s on a warm
     * desktop batch and 2.4 s at the 290 ms measured on an SM8650. The candidate here is
     * undecidable (both endpoints unreadable) and only TWO observations arrive: on the count alone
     * it would hold for six more, on the clock it resolves.
     */
    @Test
    fun verifyResolvesOnTheWallClockNotOnlyTheObservationCount() {
        val state = pendingState()
        val obs = VerifyObs(mapOf("e4" to false, "e2" to false), mapOf("e4" to false, "e2" to false))
        state.glance(VerifyEvaluator(), obs)
        assertNotNull(state.pending)
        state.pending!!.startedS -= state.config.verifyTimeoutS + 0.01
        state.glance(VerifyEvaluator(), obs)
        assertNull(state.pending)
        assertEquals("ghost", state.verifyState)
        assertEquals(emptyList<String>(), state.history)
    }

    /**
     * `test_a_stalled_observer_cannot_pin_the_tracker_forever`. The other end of the same defect:
     * `frames` only advances inside a tick, so a candidate that receives NO observation is bounded
     * by nothing and the engine refuses every detection while routing nothing to recovery.
     */
    @Test
    fun aStalledObserverCannotPinTheEngineForever() {
        val state = pendingState()
        state.expireStalledVerify()
        assertNotNull(state.pending)
        state.pending!!.lastTickS -= state.config.verifyTimeoutS + 0.01
        state.expireStalledVerify()
        assertNull(state.pending)
        assertEquals(VERIFY_STATE_STALLED, state.verifyState)
        assertEquals(emptyList<String>(), state.history)
    }

    @Test
    fun hardVetoRejectsGhostToStillEmpty() {
        val state = pendingState()
        val obs = VerifyObs(mapOf("e4" to false, "e2" to true), mapOf("e4" to true, "e2" to true))
        repeat(2) { state.glance(VerifyEvaluator(), obs) }

        assertEquals(emptyList<String>(), state.history)
        assertNull(state.pending)
        assertEquals("ghost", state.verifyState)
        assertEquals("ghost", state.cnnStatus)
    }

    @Test
    fun fromEmptyButToEmptyHoldsNonCastling() {
        val state = pendingState()
        val obs = VerifyObs(mapOf("e4" to false, "e2" to false), mapOf("e4" to true, "e2" to true))
        state.glance(VerifyEvaluator(), obs)

        assertEquals(emptyList<String>(), state.history)
        assertNotNull(state.pending)
        assertEquals(VERIFY_STATE_VERIFYING, state.verifyState)
    }

    @Test
    fun fromLeftAloneNeverCommitsNonCastling() {
        // b1c4 incident: the knight was physically placed on c4 (illegal), the diff proposed the
        // best LEGAL move Na3. b1 confidently empty is TRUE and must still not commit.
        val state = pendingState(uci = "b1a3")
        val obs = VerifyObs(mapOf("a3" to false, "b1" to false), mapOf("a3" to false, "b1" to true))
        state.glance(VerifyEvaluator(), obs)

        assertEquals(emptyList<String>(), state.history)
        assertNotNull(state.pending)
        assertEquals(VERIFY_STATE_VERIFYING, state.verifyState)
    }

    @Test
    fun fromLeftCommitsWhenOccupancyDerivesSameMove() {
        val state = pendingState()
        val cnn = VerifyEvaluator(deriveMove = "e2e4", deriveAgreement = 0.99)
        val obs = VerifyObs(mapOf("e4" to false, "e2" to false), mapOf("e4" to false, "e2" to true))
        repeat(2) { state.glance(cnn, obs) }

        assertEquals(listOf("e4"), state.history)
        assertEquals(VERIFY_STATE_CONFIRMED, state.verifyState)
    }

    @Test
    fun castlingCommitsDespiteKingSquareMisreadEmpty() {
        val state =
            pendingState(uci = "e1g1", fen = "rnbqkbnr/pppppppp/8/8/8/5NP1/PPPPPPBP/RNBQK2R w KQkq - 0 1")
        val obs = VerifyObs(mapOf("g1" to false, "e1" to false), mapOf("g1" to true, "e1" to true))
        repeat(2) { state.glance(VerifyEvaluator(), obs) }

        assertEquals(listOf("O-O"), state.history)
        assertEquals(VERIFY_STATE_CONFIRMED, state.verifyState)
    }

    @Test
    fun fromOccupiedButArrivedCommitsAfterWindow() {
        // d2d4 case: the destination arrived but the origin is mis-read as still occupied. Both
        // signals contradict, so it HOLDS; the window fallback checks the whole post-move board.
        val state = pendingState(verifyWindow = 2)
        val obs = VerifyObs(mapOf("e4" to true, "e2" to true), mapOf("e4" to true, "e2" to true))
        state.glance(VerifyEvaluator(), obs)

        assertEquals(emptyList<String>(), state.history)
        assertNotNull(state.pending)

        state.glance(VerifyEvaluator(), obs)
        assertEquals(listOf("e4"), state.history)
        assertEquals(VERIFY_STATE_CONFIRMED, state.verifyState)
    }

    @Test
    fun arrivedButOriginNeverEmptiedDiscards() {
        // d4b3 incident: a foreign piece landed on the destination while the origin pawn provably
        // never moved. The post-move board check conflicts on the origin → discard.
        val state = pendingState(verifyWindow = 2)
        val cnn = VerifyEvaluator(conflicts = listOf("e2"))
        val obs = VerifyObs(mapOf("e4" to true, "e2" to true), mapOf("e4" to true, "e2" to true))
        repeat(2) { state.glance(cnn, obs) }

        assertEquals(emptyList<String>(), state.history)
        assertNull(state.pending)
        assertEquals("ghost", state.verifyState)
    }

    @Test
    fun alarmDiscardsPendingCandidate() {
        val state = pendingState()
        state.alarm = TrackerEvent.Alarm("illegal_move", listOf("b1", "d4"), null, null)
        state.glance(VerifyEvaluator(occAgree = 1.0), VerifyObs())

        assertEquals(emptyList<String>(), state.history)
        assertNull(state.pending)
        assertTrue(state.note!!.contains("desynced"))
    }

    @Test
    fun fromOccupiedNoArrivalRejectsAfterWindow() {
        val state = pendingState(verifyWindow = 2)
        val obs = VerifyObs(mapOf("e2" to true), mapOf("e4" to false, "e2" to true))
        repeat(2) { state.glance(VerifyEvaluator(), obs) }

        assertEquals(emptyList<String>(), state.history)
        assertNull(state.pending)
        assertEquals("ghost", state.verifyState)
    }

    @Test
    fun counterMoveOverrules() {
        // The endpoints of e2e4 are unreadable while d2d4's own ARE read (d2 empty, d4 occupied),
        // so the CNN's move wins — and it commits in THIS cycle, carried by the verdict's
        // replacement move (invariant 10).
        val state = pendingState()
        val cnn = VerifyEvaluator(deriveMove = "d2d4", deriveAgreement = 0.99)
        val obs =
            VerifyObs(
                occupancy = mapOf("e4" to true, "e2" to false, "d4" to true, "d2" to false),
                confidence = mapOf("e4" to false, "e2" to false, "d4" to true, "d2" to true),
            )

        assertTrue(state.glance(cnn, obs).isEmpty())
        val events = state.glance(cnn, obs)

        assertEquals(listOf("d4"), state.history)
        assertEquals("d2d4", state.lastMove)
        assertEquals("overruled", state.verifyState)
        val committed = events.filterIsInstance<TrackerEvent.MoveCommitted>().single()
        assertEquals("d2d4", committed.uci)
        assertEquals(DECIDER_CNN_OVERRULE, committed.decider)
        assertTrue(state.note!!.contains("CNN overruled e4"))
    }

    /**
     * S17-SIM-3: the whole-board score alone let a phantom Bg5 — whose destination the model never
     * read confidently — discard the correct Bf4. An overruling move whose endpoints are inferred
     * rather than observed must NOT overrule; the diff candidate falls through to the window.
     */
    @Test
    fun overruleNeedsItsOwnEndpointsRead() {
        val state = pendingState(verifyWindow = 99)
        val cnn = VerifyEvaluator(deriveMove = "d2d4", deriveAgreement = 0.99)
        val obs =
            VerifyObs(
                occupancy = mapOf("e4" to true, "e2" to false, "d2" to false),
                confidence = mapOf("e4" to false, "e2" to false, "d4" to false, "d2" to true),
            )

        repeat(3) { state.glance(cnn, obs) }

        assertEquals(emptyList<String>(), state.history)
        assertEquals("verifying", state.verifyState)
    }

    @Test
    fun occlusionTimesOutRejects() {
        val state = pendingState(verifyWindow = 3)
        val cnn = VerifyEvaluator(occN = 0)
        val obs = VerifyObs(confidence = mapOf("e4" to false, "e2" to false))
        state.glance(cnn, obs)
        assertEquals(emptyList<String>(), state.history)

        repeat(2) { state.glance(cnn, obs) }
        assertEquals(emptyList<String>(), state.history)
        assertNull(state.pending)
        assertEquals("ghost", state.verifyState)
        assertTrue(state.note!!.contains("timed out under occlusion"))
    }

    @Test
    fun fallbackRejectsWhenPostmoveBoardContradicts() {
        // b1d4 incident: endpoint-local reasoning never looked at the square the piece landed on.
        val state = pendingState(verifyWindow = 2)
        val cnn = VerifyEvaluator(conflicts = listOf("d4"))
        val obs = VerifyObs(mapOf("e4" to false, "e2" to false), mapOf("e4" to false, "e2" to true))
        repeat(2) { state.glance(cnn, obs) }

        assertEquals(emptyList<String>(), state.history)
        assertNull(state.pending)
        assertEquals("ghost", state.verifyState)
    }

    @Test
    fun clearviewBorderlineAcceptsAfterWindow() {
        val state = pendingState(verifyWindow = 3)
        val obs = VerifyObs(mapOf("e4" to true, "e2" to false), mapOf("e4" to true, "e2" to true))
        repeat(3) { state.glance(VerifyEvaluator(occN = 2), obs) }

        assertEquals(listOf("e4"), state.history)
        assertNull(state.pending)
    }

    @Test
    fun cnnUnavailableCommitsPending() {
        val state = pendingState()
        val events = VerifySingle.tick(state, null, snapOf(state, VerifyObs()))

        assertEquals(listOf("e4"), state.history)
        assertNull(state.pending)
        assertEquals(DECIDER_DIFF, events.filterIsInstance<TrackerEvent.MoveCommitted>().single().decider)
    }

    @Test
    fun staleObservationNeitherConfirmsNorRejects() {
        val state = pendingState()
        state.pending = state.pending!!.copy(seq = 10)
        val cnn = VerifyEvaluator(occAgree = 1.0, occN = 2)

        state.glance(cnn, VerifyObs(), seq = 9)
        assertEquals(emptyList<String>(), state.history)
        assertNotNull(state.pending)
        // Ignored ENTIRELY: not held, not voted, not counted.
        assertEquals(0, state.pending!!.frames)
        assertNull(state.pending!!.voteOutcome)

        state.glance(cnn, VerifyObs(), seq = 10)
        state.glance(cnn, VerifyObs(), seq = 11)
        assertEquals(listOf("e4"), state.history)
        assertNull(state.pending)
        assertEquals(VERIFY_STATE_CONFIRMED, state.verifyState)
    }

    @Test
    fun singleGlanceNeverDecidesAgainstTheDiff() {
        // g8h6 incident: one frame's confident-empty misread overruled a real move. Every rung
        // that CONTRADICTS the diff still needs `verifyObsVotes`; only the confirm rung is exempt
        // (see COMMIT_VOTES and confirmActsOnOneGlanceContradictionStillNeedsTwo).
        val state = pendingState()
        val shadowing = VerifyEvaluator(match = true)
        val ghostObs = VerifyObs(mapOf("e4" to false, "e2" to true), mapOf("e4" to true, "e2" to true))

        state.glance(shadowing, VerifyObs())
        assertEquals(emptyList<String>(), state.history)
        assertEquals(1, state.pending!!.voteCount)
        assertTrue(state.note!!.contains("confirming (1/2)"))

        // A DIFFERENT outcome resets the count — two alternating glances decide nothing.
        state.glance(VerifyEvaluator(), ghostObs)
        assertEquals(1, state.pending!!.voteCount)
        assertEquals("ghost", state.pending!!.voteOutcome)

        state.glance(shadowing, VerifyObs())
        assertEquals(emptyList<String>(), state.history)
        assertNotNull(state.pending)
        assertEquals(1, state.pending!!.voteCount)
        assertEquals("shadow", state.pending!!.voteOutcome)
    }

    @Test
    fun blindGlanceDoesNotReAnchorOnACoveredBoard() {
        // `resyncCheck` matches VACUOUSLY under a hand. With the real `minConfidentBoard` the
        // shadow rung must not fire, and the candidate must not be silently accepted either.
        val state = pendingState(verifyWindow = 2)
        val cnn = VerifyEvaluator(match = true, minConfidentBoard = 32)
        val obs = VerifyObs(confidence = mapOf("e4" to false, "e2" to false))

        state.glance(cnn, obs)
        assertNotNull(state.pending)
        assertEquals(VERIFY_STATE_VERIFYING, state.verifyState)

        state.glance(cnn, obs)
        assertEquals(emptyList<String>(), state.history)
        assertEquals("ghost", state.verifyState)
        assertTrue(state.note!!.contains("timed out under occlusion"))
    }
}
