package com.chesslab.engine

import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNotSame
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The free-running observer schedule and `_cnn_tick` — evaluation gates, the occupancy fallback,
 * the recovery confirmer, and the anchoring rule that made this phase necessary.
 */
class CnnTickTest {
    @Test
    fun observerIntervalThrottles() {
        // `test_observer_interval_throttles`: the interval throttles observation STARTS.
        val state = recoveryState()
        state.config = state.config.copy(observerIntervalS = 10.0)
        assertTrue(state.observerDue(now = 100.0), "the first observation starts immediately")
        state.observationStarted(now = 100.0)
        state.observationFinished()
        assertFalse(state.observerDue(now = 101.0))
        assertTrue(state.observerDue(now = 111.0))
    }

    @Test
    fun singleFlightNeverOverlapsObservations() {
        // `_observer_due`: `cnnBusy` IS the concurrency model — one observation at a time, no queue.
        val state = recoveryState()
        state.observationStarted(now = 100.0)
        assertFalse(state.observerDue(now = 200.0), "a second worker must never spawn")
        state.observationFinished()
        assertTrue(state.observerDue(now = 200.0))
        state.cnnFailed = true
        assertFalse(state.observerDue(now = 200.0))
    }

    @Test
    fun observationFailureBacksOffOneSecond() {
        // With the default free-running interval a persistent failure would retry at loop rate.
        val state = recoveryState()
        state.observationFailed(now = 100.0)
        assertFalse(state.observerDue(now = 100.5))
        assertTrue(state.observerDue(now = 101.0))
    }

    @Test
    fun observerRunsWhileEvaluationIsNotDue() {
        // `test_observer_snapshots_on_quiet_board`: observation is unconditional, evaluation is not.
        val state = recoveryState()
        state.clearStuck()
        state.lastCnnTs = state.nowS
        assertTrue(state.observerDue(state.nowS))
        val cnn = RecoveryEvaluator(conflicts = listOf("e1"))
        assertTrue(state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), seq = 7)).isEmpty())
        assertEquals(0, state.desyncObs, "no evaluation side effects")
        assertNull(state.cnnStatus)
    }

    @Test
    fun periodicCheckRunsOnAStableQuietBoard() {
        val state = recoveryState()
        state.clearStuck()
        repeat(state.avgFrames) { state.grayBuf.append(grayFrame()) }
        state.lastCnnTs = state.nowS - state.config.cnnCheckIntervalS
        val cnn = RecoveryEvaluator(match = true)
        state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), seq = 1))
        assertEquals("ok", state.cnnStatus)
    }

    @Test
    fun gatesBlockEvaluationWhenNeitherStuckNorPeriodic() {
        val state = recoveryState()
        state.clearStuck()
        state.lastCnnTs = state.nowS
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"))
        assertTrue(state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), seq = 1)).isEmpty())
        assertEquals(emptyList<String>(), state.history)
        assertEquals(state.nowS, state.lastCnnTs, "an ungated tick must not even touch the cooldown")
    }

    @Test
    fun stuckEvaluationDoesNotRequireAStableBoard() {
        // `stuck` is precisely the case where the board never looks quiet enough.
        val state = recoveryState()
        assertEquals(0, state.grayBuf.size)
        state.cnnTick(RecoveryEvaluator(match = true), recoverySnap(state, obsForBoard(state.board), seq = 1))
        assertEquals("ok", state.cnnStatus)
    }

    @Test
    fun boardChangedDuringObservationDiscards() {
        val state = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"))
        val snap = recoverySnap(state, obsForBoard(state.board), seq = 1, fen = "8/8/8/8/8/8/8/K6k w - - 0 1")
        assertTrue(state.cnnTick(cnn, snap).isEmpty())
        assertEquals(emptyList<String>(), state.history)
        assertNull(state.cnnStatus)
        assertNull(state.recoveryConfirmer.key)
    }

    @Test
    fun matchOkPullsReferenceForwardFromSnapshot() {
        // entry.md invariant 5: the reference becomes the frame the CNN LOOKED at, never `lastCur`
        // — which is several frames newer and may already contain the opponent's next move.
        val state = recoveryState()
        val observed = grayFrame(listOf("e2"))
        state.lastCur = grayFrame(listOf("e4"))
        state.cnnTick(RecoveryEvaluator(match = true), recoverySnap(state, obsForBoard(state.board), 1, observed))
        assertSame(observed, state.refGray)
        assertNotSame(state.lastCur, state.refGray)
        assertNull(state.stuckReason)
        assertEquals(VERIFY_STATE_RESYNCED, state.verifyState)
        assertEquals(state.board.fen(), state.refFen)
    }

    @Test
    fun matchOkDoesNotRebuildTheGamut() {
        // invariant 6: the CNN tolerates partial occlusion, so this frame is not verifiably clean.
        val state = recoveryState()
        state.cnnTick(
            RecoveryEvaluator(match = true),
            recoverySnap(state, obsForBoard(state.board), 1, grayFrame(), warped = bgrFrame()),
        )
        assertNull(state.refGamut)
    }

    @Test
    fun snapshotWarpMustBeAtDetSize() {
        // entry.md invariant 1: a reference at the wrong resolution corrupts every later diff.
        val state = recoveryState()
        val wrongSize = grayFrame(boardSize = TEST_BOARD_SIZE / 2)
        state.lastCur = grayFrame(listOf("e4"))
        state.cnnTick(RecoveryEvaluator(match = true), recoverySnap(state, obsForBoard(state.board), 1, wrongSize))
        assertNotSame(wrongSize, state.refGray, "a mis-sized warp must be rejected, not anchored")
        assertSame(state.lastCur, state.refGray)
    }

    @Test
    fun occupancyFallbackRescuesIdentityMismatch() {
        // The b8b6->c6 incident: identity is the weak axis, so an identity-only mismatch that
        // occupancy contradicts counts as a MATCH.
        val state = recoveryState()
        val cnn = RecoveryEvaluator(match = false, conflicts = listOf("b8"), occupancyMatch = true)
        state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board, mapOf("b8" to "bB")), 1, grayFrame()))
        assertEquals("ok", state.cnnStatus)
        assertEquals(emptyList<String>(), state.cnnConflicts)
        assertNull(state.stuckReason)
    }

    @Test
    fun recoveryNeedsConfirmFramesVotes() {
        // specs/12 D6: the legacy port pushed a whole sequence on ONE glance.
        val state = recoveryState(confirmFrames = 2)
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        val obs = obsForBoard(state.board)
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1, gray = grayFrame()))
        assertEquals(emptyList<String>(), state.history, "one glance must not commit")
        assertTrue(state.note!!.contains("(1/2)"), state.note!!)
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 2, gray = grayFrame()))
        assertEquals(listOf("e4"), state.history)
    }

    @Test
    fun recoveryCommitAnchorsOnObservedFrame() {
        val state = recoveryState()
        val observed = grayFrame(listOf("e4"))
        state.lastCur = grayFrame(listOf("d4"))
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        val events = state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), 1, observed))
        assertEquals(listOf("e4"), state.history)
        assertSame(observed, state.refGray)
        assertEquals(state.board.fen(), state.refFen)
        assertEquals(DECIDER_CNN_RECOVERY, state.decisionLog.last().decider)
        assertEquals(STATE_MOVE, state.state)
        assertTrue(state.recoveredLast)
        assertFalse(state.priorLast)
        assertNull(state.stuckReason)
        assertTrue(events.any { it is TrackerEvent.MoveCommitted })
        assertTrue(state.note!!.contains("CNN recovery"), state.note!!)
    }

    @Test
    fun recoveryCommitGrantsOneMotionWindow() {
        // Recovery means we WERE behind: a reply played during the recovery window is already
        // visible against this old reference, so the recency gate must not hold it hostage.
        val state = recoveryState()
        state.motionSinceRef = false
        state.lastMotionTs = 0.0
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), 1, grayFrame()))
        assertTrue(state.motionSinceRef, "setRef cleared it — the grant must come afterwards")
        assertEquals(state.nowS, state.lastMotionTs)
    }

    @Test
    fun recoveryCommitsASequenceAtomically() {
        val state = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4", "e7e5"), agreement = 0.95)
        val events = state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), 1, grayFrame()))
        assertEquals(listOf("e4", "e5"), state.history)
        assertEquals("e7e5", state.lastMove)
        // COMMIT rows, not every row: `markStuck` now writes its own provenance line on the
        // transition, and the state this test starts from is a stuck one.
        assertEquals(1, state.decisionLog.count { it.accepted }, "provenance is recorded ONCE, on the last move")
        assertTrue(events.any { it is TrackerEvent.SequenceCommitted })
    }

    @Test
    fun recoveryDropsAnUnplayableSequence() {
        val state = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4", "e2e4"), agreement = 0.95)
        state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), 1, grayFrame()))
        assertEquals(emptyList<String>(), state.history)
    }

    @Test
    fun recoveryWithoutAnyAnchorDropsBaseTruth() {
        // No observed warp and no live buffer: the pair (image, FEN) must be dropped whole rather
        // than left pointing at the pre-move reference.
        val state = recoveryState()
        state.refGray = grayFrame()
        state.refFen = state.board.fen()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), seq = 1))
        assertEquals(listOf("e4"), state.history)
        assertNull(state.refGray)
        assertNull(state.refFen)
        assertEquals(0, state.grayBuf.size)
    }

    /**
     * D04c-2. In occupancy-only mode Python takes the move `resync_check` NAMES
     * (`tracker.py:2021-2023`) and reaches for the deep beam search only when resync named none.
     * The port ran the deep search on every non-match, so where Python commits one ply the phone
     * committed up to `recoveryMaxPlies`.
     *
     * The divergence was accepted as "unreachable with the bundled 14-class model". Shipping a
     * 2-class model made this the ONLY reachable arm, and 69 recorded plies on the device then
     * contained two bursts of 3 and 4.
     */
    @Test
    fun theOccupancyArmPrefersTheMoveResyncNamesOverTheDeepSearch() {
        val state = recoveryState(confirmFrames = 1)
        val cnn =
            // `moves` is what the deep search WOULD return if it were consulted — three plies.
            RecoveryEvaluator(moves = listOf("g1f3", "b8c6", "e2e4"), agreement = 0.98).apply {
                resyncMove = "e2e4"
                resyncAgreement = 0.99
            }
        val obs = obsForBoard(state.board, emptyMap(), identity = false)
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1, gray = grayFrame()))
        assertEquals(listOf("e4"), state.history, "resync named one move; the deep search must not run")
        assertEquals(0.99, state.cnnAgreement, 1e-9, "and its agreement is the one reported")
    }

    /** With no move from resync and no match, the deep search is still the fallback Python uses. */
    @Test
    fun theOccupancyArmStillFallsBackToTheDeepSearch() {
        val state = recoveryState(confirmFrames = 1)
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.98)
        val obs = obsForBoard(state.board, emptyMap(), identity = false)
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1, gray = grayFrame()))
        assertEquals(listOf("e4"), state.history)
        assertEquals(0.98, state.cnnAgreement, 1e-9)
    }

    @Test
    fun aBlindGlanceCannotReportTheBoardUnchanged() {
        // `resyncCheckFull` builds its conflict set from CONFIDENT squares only, so zero confident
        // squares yields an empty set, `match = true` and agreement 1.0 — vacuously. Without the
        // guard a hand over the board clears the alarm and pulls the reference onto the covered
        // frame. The verify ladder has guarded exactly this since it was written; the periodic
        // check never did, and neither does Python.
        val state = recoveryState(NF3_NO_CASTLING)
        state.markStuck(STUCK_NO_LEGAL_MOVE)
        state.alarm = TrackerEvent.Alarm("illegal_move", listOf("e1"), null, null)
        val cnn = RecoveryEvaluator(match = true).apply { minConfidentBoard = 32 }
        // Confidence below the threshold on every square: the glance saw nothing.
        val blind = RecoveryObs(Squares.ALL.associateWith { state.board.labelAt(it) }, confidence = 0.10)

        state.cnnTick(cnn, recoverySnap(state, blind, seq = 1))

        assertNotNull(state.alarm, "a blind glance must not clear the alarm")
        assertEquals(STUCK_NO_LEGAL_MOVE, state.stuckReason, "and must not re-anchor")
    }
}
