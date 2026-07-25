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
        // The endpoints of e2e4 are unreadable, so the CNN's own confident move wins — and it
        // commits in THIS cycle, carried by the verdict's replacement move (invariant 10).
        val state = pendingState()
        val cnn = VerifyEvaluator(deriveMove = "d2d4", deriveAgreement = 0.99)
        val obs = VerifyObs(confidence = mapOf("e4" to false, "e2" to false))

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
    fun singleGlanceNeverDecides() {
        // g8h6 incident: one frame's confident-empty misread overruled a real move.
        val state = pendingState()
        val committing = VerifyEvaluator(occAgree = 1.0, occN = 2)
        val shadowing = VerifyEvaluator(match = true)

        state.glance(committing, VerifyObs())
        assertEquals(emptyList<String>(), state.history)
        assertEquals(1, state.pending!!.voteCount)
        assertTrue(state.note!!.contains("confirming (1/2)"))

        // A DIFFERENT outcome resets the count — two alternating glances decide nothing.
        state.glance(shadowing, VerifyObs())
        assertEquals(1, state.pending!!.voteCount)
        assertEquals("shadow", state.pending!!.voteOutcome)

        state.glance(committing, VerifyObs())
        assertEquals(emptyList<String>(), state.history)
        assertNotNull(state.pending)
        assertEquals(1, state.pending!!.voteCount)
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
