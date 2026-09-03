package com.chesslab.engine

import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
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
    fun recoveryReceivesTheRawViewOfAConditionedSnapshot() {
        val engine = TrackerEngine(recoveryConfig(), STARTPOS)
        val raw = obsForBoard(engine.state.board, mapOf("e5" to "wP"))
        val conditioned =
            object : CnnObservation by obsForBoard(engine.state.board) {
                override fun rawObservation(): CnnObservation = raw
            }
        val cnn = RecoveryEvaluator(match = true)
        engine.attachCnn(cnn)
        engine.state.armed()

        engine.onCnnSnapshot(recoverySnap(engine.state, conditioned, seq = 1))

        assertTrue(cnn.observations.isNotEmpty())
        assertSame(raw, cnn.observations.first(), "recovery must not receive the prior-conditioned view")
        assertSame(raw, engine.state.cnnSnap?.obs, "background desync gates must also retain pixels alone")
    }

    @Test
    fun observerRunsWhileEvaluationIsNotDue() {
        // Observation is unconditional, evaluation is not.
        val state = recoveryState()
        state.clearStuck()
        state.lastCnnTs = state.nowS
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

    /**
     * The stuck arm of `evaluationDue` is what routes a stuck board to recovery, and its
     * `stuckCount >= settleFrames` half had no coverage anywhere: every fixture in this file
     * overrides `settleFrames` to 1, which the single `markStuck` in `armed()` already satisfies,
     * so deleting the clause outright left all 365 `:core-engine` tests green. It is the only
     * thing that distinguishes "one awkward frame" from "this tracker is stuck".
     */
    @Test
    fun theStuckGateNeedsSettleFramesOfTheSameReason() {
        val state = EngineState(recoveryConfig().copy(settleFramesOverride = 3), STARTPOS, whitePov = true)
        state.cnnRun = true
        state.nowS = 1000.0
        state.markStuck(STUCK_NO_LEGAL_MOVE)
        val cnn = RecoveryEvaluator(match = true)
        assertEquals(1, state.stuckCount)

        state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), seq = 1))
        assertNull(state.cnnStatus, "one stuck frame is not a stuck tracker")

        state.markStuck(STUCK_NO_LEGAL_MOVE)
        state.markStuck(STUCK_NO_LEGAL_MOVE)
        assertEquals(3, state.stuckCount, "the streak counts repeats of the SAME reason")
        state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), seq = 2))
        assertEquals("ok", state.cnnStatus, "settleFrames repeats open the gate")
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

    /**
     * The mirror image, and the dangerous direction: `boardMatchesIdentity` builds its conflict set
     * from LABEL-confident squares only, so an extra piece on a square that is occupancy-confident
     * but label-unconfident (wN 0.50 / wB 0.45 -> pOcc 0.95, no label at 0.85) is never checked.
     * `match = true` then had `onMatchOk` clear the latch and pull the reference over that piece.
     */
    @Test
    fun anIdentityMatchThatOccupancyContradictsIsNotAMatch() {
        val (state, cnn) = alarmedState()
        cnn.match = true
        cnn.occupancyMatch = false
        cnn.conflicts = listOf("e5")

        state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), seq = 11, gray = grayFrame()))

        assertNotEquals("ok", state.cnnStatus, "an unexplained piece is not an unchanged board")
        assertNotNull(state.alarm, "the latch may not be released over it")
        assertEquals(listOf("e5"), state.cnnConflicts, "the occupancy conflicts are what is reported")
        assertEquals(1, state.desyncObs, "and the mismatch path counted this observation")
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

    /**
     * The phantom starvation of 2026-08-08-00-39-57. The diff channel re-proposed `a2a4` on every
     * cycle — a shadow on the a-file — and each dispatch cleared the streak, so the CNN's correct
     * `c3e4` never got past 1/2 and 17 plies were lost while the read was right the whole time.
     * A candidate merely ENTERING verification is not evidence against what the CNN sees.
     */
    @Test
    fun aCandidateEnteringVerifyDoesNotResetTheRecoveryVote() {
        val state = recoveryState(confirmFrames = 2)
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        val obs = obsForBoard(state.board)
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1, gray = grayFrame()))
        assertTrue(state.note!!.contains("(1/2)"), state.note!!)

        state.dispatch(listOf(moveOf(state, "g1f3")), grayFrame(), null, priorUsed = false, candidateNote = null, seq = 2)
        assertNotNull(state.pending, "the candidate must be pending, not committed")
        state.pending = null

        state.cnnTick(cnn, recoverySnap(state, obs, seq = 3, gray = grayFrame()))
        assertEquals(listOf("e4"), state.history, "a rejected candidate may not cost the vote")
    }

    /**
     * The vote asks for two looks at the SAME board; a cooldown between them asks for two looks at
     * a board that had seconds to change. On 2026-08-08-11-59-12 the bridge `f2f4 e5c4` stood at
     * agreement 1.000 and vote 1/2, the next glance came 98 frames later, and by then two more
     * plies had been played — the key never repeated and the session never recovered.
     */
    @Test
    fun anOpenRecoveryVoteIsDueDespiteTheCooldown() {
        val state = recoveryState(confirmFrames = 2)
        state.config = state.config.copy(cnnCooldownS = 60.0)
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        val obs = obsForBoard(state.board)
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1, gray = grayFrame()))
        assertTrue(state.note!!.contains("(1/2)"), state.note!!)

        state.cnnTick(cnn, recoverySnap(state, obs, seq = 2, gray = grayFrame()))
        assertEquals(listOf("e4"), state.history, "the second look may not wait out the cooldown")
    }

    @Test
    fun recoveryCommitAnchorsOnObservedFrame() {
        val state = recoveryState()
        val observed = grayFrame(listOf("e4"))
        state.lastCur = grayFrame(listOf("d4"))
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        val events = state.recoveryGlances(cnn, obsForBoard(state.board), gray = observed)
        assertEquals(listOf("e4"), state.history)
        assertSame(observed, state.refGray)
        assertEquals(state.board.fen(), state.refFen)
        assertEquals(DECIDER_CNN_RECOVERY, state.decisionLog.last().decider)
        assertEquals(STATE_WAITING, state.state, "MOVE would suppress the very window the commit grants")
        assertTrue(state.recoveredLast)
        assertFalse(state.priorLast)
        assertNull(state.stuckReason)
        assertTrue(events.any { it is TrackerEvent.MoveCommitted })
        assertTrue(state.note!!.contains("CNN recovery"), state.note!!)
    }

    /**
     * A bridge rewrites history, and the only thing keeping a mid-move glance out of it is the
     * occluded check of `recoveryVoteConfirmed` — whose model arm is blind on 13-class models.
     * The grid-groove arm (`CnnSnapshot.gridOccluded`) must refuse the vote on its own.
     */
    @Test
    fun aGridOccludedGlanceRefusesTheRecoveryVote() {
        val state = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        val obs = obsForBoard(state.board)
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 21, gridOccluded = HAND_CLUSTER))
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 22, gridOccluded = HAND_CLUSTER))
        assertEquals(emptyList<String>(), state.history)
        assertTrue(state.note!!.contains("occluded"), state.note!!)

        // The same evaluator with clean glances commits — the grid arm alone held the vote.
        state.recoveryGlances(cnn, obs, gray = grayFrame())
        assertEquals(listOf("e4"), state.history)
    }

    @Test
    fun recoveryCommitGrantsOneMotionWindow() {
        // Recovery means we WERE behind: a reply played during the recovery window is already
        // visible against this old reference, so the recency gate must not hold it hostage.
        val state = recoveryState()
        state.motionSinceRef = false
        state.lastMotionTs = 0.0
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        state.recoveryGlances(cnn, obsForBoard(state.board), gray = grayFrame())
        assertTrue(state.motionSinceRef, "setRef cleared it — the grant must come afterwards")
        assertEquals(state.nowS, state.lastMotionTs)
    }

    @Test
    fun recoveryCommitsASequenceAtomically() {
        val state = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4", "e7e5"), agreement = 0.95)
        val events = state.recoveryGlances(cnn, obsForBoard(state.board), gray = grayFrame())
        assertEquals(listOf("e4", "e5"), state.history)
        assertEquals("e7e5", state.lastMove)
        // COMMIT rows, not every row: `markStuck` now writes its own provenance line on the
        // transition, and the state this test starts from is a stuck one.
        assertEquals(2, state.decisionLog.count { it.accepted }, "one row per move — a bridge is not one decision")
        assertTrue(events.any { it is TrackerEvent.SequenceCommitted })
    }

    /**
     * The incident of 2026-08-02: a four-move bridge left ONE line in the log and a four-ply gap in
     * the ply numbers, so three of its four moves existed nowhere. Reading it took a full log dump
     * and a read of `commitRecovery`; the log alone could only show that something had happened.
     */
    @Test
    fun everyMoveOfARecoveryGetsItsOwnRow() {
        val state = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4", "e7e5", "g1f3"), agreement = 0.95)
        state.recoveryGlances(cnn, obsForBoard(state.board), gray = grayFrame())

        val rows = state.decisionLog.filter { it.accepted }
        assertEquals(listOf("e4", "e5", "Nf3"), rows.map { it.san })
        assertEquals(listOf("e2e4", "e7e5", "g1f3"), rows.map { it.move })
        assertEquals(listOf(1, 2, 3), rows.map { it.ply }, "the plies are contiguous, not a gap")
        // Each row's "before" is the position that move was actually played from — the single row
        // used to carry a `fenBefore` as many plies stale as the bridge was long.
        assertEquals(STARTPOS, rows.first().fenBefore)
        assertEquals(rows[0].fenAfter, rows[1].fenBefore)
        assertEquals(rows[1].fenAfter, rows[2].fenBefore)
        assertEquals(state.board.fen(), rows.last().fenAfter)
    }

    /** The common case must not get noisier: one recovery, one row, the same text as before. */
    @Test
    fun aOneMoveRecoveryStillWritesExactlyOneUnchangedRow() {
        val state = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        state.recoveryGlances(cnn, obsForBoard(state.board), gray = grayFrame())

        val row = state.decisionLog.single { it.accepted }
        assertEquals(1, row.ply)
        assertEquals("e2e4", row.move)
        assertEquals(STARTPOS, row.fenBefore)
        assertEquals(DECIDER_REASON.getValue(DECIDER_CNN_RECOVERY), row.reason)
    }

    /**
     * Four rows that each say "position was LOST — rebuilt by the CNN" are indistinguishable from
     * four separate one-move recoveries, which is a different and far less alarming event. The
     * stamp is what tells them apart, and it groups the bridge back together for a reader.
     */
    @Test
    fun theRowsOfOneBridgeCarryTheirPositionInItAndItsKey() {
        val state = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4", "e7e5", "g1f3"), agreement = 0.95)
        state.recoveryGlances(cnn, obsForBoard(state.board), gray = grayFrame())

        val rows = state.decisionLog.filter { it.accepted }
        val key = "e2e4 e7e5 g1f3"
        assertEquals(
            listOf("[move 1/3 of recovery $key]", "[move 2/3 of recovery $key]", "[move 3/3 of recovery $key]"),
            rows.map { it.reason.substringAfter(DECIDER_REASON.getValue(DECIDER_CNN_RECOVERY)).trim() },
        )
        // And the whole stamp reaches the log line, which is the only form anyone reads live.
        // Via `toDebugDecision` since the sink carries structure rather than a sentence (specs/34).
        val line = rows.last().toDebugDecision().toLogLine()
        assertTrue(line.contains("[move 3/3 of recovery $key]"), line)
    }

    @Test
    fun recoveryDropsAnUnplayableSequence() {
        val state = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4", "e2e4"), agreement = 0.95)
        state.recoveryGlances(cnn, obsForBoard(state.board), gray = grayFrame())
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
        state.recoveryGlances(cnn, obsForBoard(state.board))
        assertEquals(listOf("e4"), state.history)
        assertNull(state.refGray)
        assertNull(state.refFen)
        assertEquals(0, state.grayBuf.size)
    }

    /**
     * specs/39 phase 02, the case the two-vote floor actually defends: a beam search whose answer
     * CHANGES between two glances used to commit whichever answer arrived first. Alternating
     * derivations must never reach the board — the confirmer's streak restarts on every new key.
     */
    @Test
    fun aBridgeThatChangesBetweenGlancesNeverCommits() {
        val state = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        val obs = obsForBoard(state.board)
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1, gray = grayFrame()))
        cnn.moves = listOf("d2d4")
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 2, gray = grayFrame()))
        cnn.moves = listOf("e2e4")
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 3, gray = grayFrame()))
        cnn.moves = listOf("d2d4")
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 4, gray = grayFrame()))
        assertEquals(emptyList<String>(), state.history, "an unstable derivation must never commit")
    }

    /**
     * The observer is not motion-gated and the stuck arm needs no stable board, so the ONLY thing
     * keeping a mid-move glance out of a bridge is the clean-board gate: a snapshot with a hand in
     * it may not vote, and it resets the streak — two CLEAN agreeing looks or nothing.
     */
    @Test
    fun aGlanceWithAHandInItBlocksTheVoteAndResetsTheStreak() {
        val state = recoveryState()
        // The hand ARRIVED: fresh motion lets the model head through the plausibility filter.
        state.lastMotionTs = state.nowS
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        val clean = obsForBoard(state.board)
        val hand = RecoveryObs(Squares.ALL.associateWith { state.board.labelAt(it) }, occluded = setOf("h4", "h5"))

        state.cnnTick(cnn, recoverySnap(state, clean, seq = 1, gray = grayFrame()))
        assertTrue(state.note!!.contains("(1/2)"), state.note!!)

        state.cnnTick(cnn, recoverySnap(state, hand, seq = 2, gray = grayFrame()))
        assertEquals(emptyList<String>(), state.history, "a hand in the glance must not complete the vote")
        assertTrue(state.note!!.contains("waiting for a clean board"), state.note!!)

        state.cnnTick(cnn, recoverySnap(state, clean, seq = 3, gray = grayFrame()))
        assertEquals(emptyList<String>(), state.history, "the streak was reset — this is vote 1, not 2")
        assertTrue(state.note!!.contains("(1/2)"), state.note!!)

        state.cnnTick(cnn, recoverySnap(state, clean, seq = 4, gray = grayFrame()))
        assertEquals(listOf("e4"), state.history, "two clean agreeing glances commit")
    }

    /**
     * The starvation of session 20260814-142947: `real14-80` flags phantom `occluded` squares on a
     * quiet board, and with `RECOVERY_OCCLUDED_LIMIT = 0` every raw flag refused every vote —
     * recovery never ran for the rest of the session. A lone flag is not hand-shaped, so the
     * plausibility filter (`modelHandSquares`) lets the vote proceed.
     */
    @Test
    fun aPhantomOccludedFlagCannotStarveRecovery() {
        val state = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        val phantom = RecoveryObs(Squares.ALL.associateWith { state.board.labelAt(it) }, occluded = setOf("h4"))

        state.cnnTick(cnn, recoverySnap(state, phantom, seq = 1, gray = grayFrame()))
        assertTrue(state.note!!.contains("(1/2)"), state.note!!)

        state.cnnTick(cnn, recoverySnap(state, phantom, seq = 2, gray = grayFrame()))
        assertEquals(listOf("e4"), state.history, "a lone misread flag must not refuse the vote")
    }

    /** One snapshot, one vote: re-feeding the same `seq` must not count the second time. */
    @Test
    fun oneSnapshotCannotVoteTwice() {
        val state = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        val obs = obsForBoard(state.board)
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1, gray = grayFrame()))
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1, gray = grayFrame()))
        assertEquals(emptyList<String>(), state.history, "the same observation must not confirm itself")
        assertEquals(1, state.recoveryConfirmer.count)
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
