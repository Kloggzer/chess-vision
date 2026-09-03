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
     * `applyVerdict` raeumte `pending` weg, BEVOR die Zeile geschrieben wurde, also trug ausgerechnet
     * die Zeile der Leiter `verify=` leer — und leer hiess beides (`docs/verifier-stall.md`).
     */
    @Test
    fun theCommittedRowNamesTheRungThatCommittedIt() {
        val state = pendingState()
        state.glance(VerifyEvaluator(occAgree = 1.0, occN = 2), VerifyObs())

        assertEquals(listOf("e4"), state.history)
        assertEquals("commit", state.decisionLog.last().verifyOutcome)
        assertNull(state.verdictOutcome, "genau eine Zeile erbt ihn")
    }

    /**
     * The 003957 ply-39 incident (2026-08-09): a resting hand over the destination read
     * "confidently occupied" — `pOccluded` is identically 0.0 under a 13-class model — and the
     * confirm rung committed a fabricated `g4` through it. The grid-groove read of the observed
     * frame is the model-free witness, and while it reports a HAND-SHAPED cluster
     * (`GRID_HAND_MIN_SQUARES`), the glance may neither confirm nor reject: no vote, no verdict,
     * liveness advances.
     */
    @Test
    fun aGridOccludedGlanceNeitherConfirmsNorRejects() {
        val state = pendingState()
        val wouldCommit = VerifyEvaluator(occAgree = 1.0, occN = 2)
        val events = VerifySingle.tick(state, wouldCommit, snapOf(state, VerifyObs(), gridOccluded = HAND_CLUSTER))

        assertTrue(events.isEmpty())
        assertEquals(emptyList<String>(), state.history)
        assertNotNull(state.pending)
        assertEquals(0, state.pending!!.frames, "not a vote, not a window tick")
        assertEquals(state.nowS, state.pending!!.lastTickS, "alive — a covered board is not a dead observer")

        // The A/B door: with the gate off the same glance commits, exactly as before the sensor.
        state.config = state.config.copy(gridHandGate = false)
        VerifySingle.tick(state, wouldCommit, snapOf(state, VerifyObs(), gridOccluded = HAND_CLUSTER))
        assertEquals(listOf("e4"), state.history)
    }

    /**
     * The h7h5 incident (session 20260814-203552): an ARRIVING hand reached over the kingside,
     * the grid map lagged it by one observation (empty at the confirming glances), occupancy read
     * the covered file as a move, and `cnn_pair` committed a never-played `h5`. The model's
     * occluded head had flagged the hand on those very glances — since the plausibility filter it
     * is trustworthy enough to hold the verdict alongside the groove read.
     */
    @Test
    fun anArrivingHandHoldsTheVerdictThroughTheModelHead() {
        val state = pendingState()
        state.lastMotionTs = state.nowS // arriving = motion is fresh, the filter lets the head speak
        val wouldCommit = VerifyEvaluator(occAgree = 1.0, occN = 2)
        val events = VerifySingle.tick(state, wouldCommit, snapOf(state, VerifyObs(occluded = setOf("h4", "h5"))))

        assertTrue(events.isEmpty())
        assertEquals(emptyList<String>(), state.history, "an occluded-reading glance must not confirm a pair or single")
        assertNotNull(state.pending)
        assertEquals(0, state.pending!!.frames, "not a vote, not a window tick")
        assertEquals(state.nowS, state.pending!!.lastTickS, "alive — a covered board is not a dead observer")
    }

    /**
     * The c8 lesson of VID_20260802_222741: ONE square flagged on 73 % of all frames — a piece
     * leaning over its own grooves, standing for minutes — and gating on the raw map blanked the
     * whole replay to zero plies. A lone flag is furniture, not a hand; it must not block. Nor
     * may two flags WITHOUT adjacency — that is the leaning piece plus scattered noise, and a
     * count threshold that blocked on it is how c8 kept blanking frames. A hand always leaves
     * neighbouring flags (its trailing edge is h3+h2 — a pair), which is the whole rule.
     */
    @Test
    fun flagsWithoutAdjacencyAreNotAHand() {
        val state = pendingState()
        val wouldCommit = VerifyEvaluator(occAgree = 1.0, occN = 2)
        VerifySingle.tick(state, wouldCommit, snapOf(state, VerifyObs(), gridOccluded = 1L))
        assertEquals(listOf("e4"), state.history, "a single flagged square must not hold the commit")

        val scattered = pendingState()
        VerifySingle.tick(scattered, wouldCommit, snapOf(scattered, VerifyObs(), gridOccluded = SCATTERED_FLAGS))
        assertEquals(listOf("e4"), scattered.history, "two non-adjacent flags must not hold the commit")
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

    /**
     * `pendingVoted` verlangt AUFEINANDERFOLGENDE Blicke, aber eine brauchbare, unentschiedene
     * Lesung fiel in das letzte `else` und liess Stimme und Zaehler stehen — shadow(1/2), neutral,
     * shadow(2/2) verwarf den Kandidaten auf zwei Stimmen, die nie hintereinander lagen.
     */
    @Test
    fun aNeutralGlanceRestartsTheVote() {
        val state = pendingState()
        val shadowing = VerifyEvaluator(match = true)
        val neutral = VerifyObs(mapOf("e4" to false, "e2" to false), mapOf("e4" to true, "e2" to true))

        state.glance(shadowing, VerifyObs())
        assertEquals(1, state.pending!!.voteCount)

        state.glance(VerifyEvaluator(), neutral)
        assertNull(state.pending!!.voteOutcome, "eine unentschiedene Lesung loescht die Serie")

        state.glance(shadowing, VerifyObs())
        assertNotNull(state.pending, "shadow, neutral, shadow sind keine zwei aufeinanderfolgenden Stimmen")
        assertEquals(1, state.pending!!.voteCount)
        assertEquals(emptyList<String>(), state.history)

        // Ein zu alter Blick erreicht die Leiter gar nicht — er darf die Serie auch nicht loeschen.
        state.glance(shadowing, VerifyObs(), seq = -1)
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
