package com.chesslab.engine

import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.tryDetect
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNotSame
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * `_commit_move` / `_commit_sequence` / `_set_ref` / `_record_decision` plus the user-correction
 * paths of the public API (`undo`, `reset_to_start`, `capture_baseline`, `choose_promotion`).
 */
class CommitTest {
    @Test
    fun commitAdvancesBaseTruthPair() {
        // `test_valid_move_advances_base_truth_with_fen`: base truth becomes the AFTER image and
        // the FEN moves with it — the pair is never split.
        val state = detectState(ref = grayFrame(listOf("e2")))
        val cur = grayFrame(listOf("e4"))
        state.tryDetect(cur, null, seq = 1)
        assertEquals(listOf("e4"), state.history)
        assertEquals("e2e4", state.lastMove)
        assertSame(cur, state.refGray)
        assertEquals(state.board.fen(), state.refFen)
        assertEquals(STATE_MOVE, state.state)
        assertEquals(VERIFY_STATE_CONFIRMED, state.verifyState)
    }

    @Test
    fun commitSequenceAppliesBothMovesAtomically() {
        val state = detectState()
        val first = moveOf(state, "e2e4")
        state.board.push(first)
        val second = moveOf(state, "e7e5")
        state.board.pop()
        val cur = grayFrame()
        val event = state.commitSequence(listOf(first, second), cur, null)
        assertEquals(listOf("e4", "e5"), state.history)
        assertEquals("e7e5", state.lastMove)
        assertEquals(DECIDER_DIFF_PAIR, state.decisionLog.last().decider)
        assertEquals(1, state.decisionLog.size, "provenance is recorded ONCE, on the last move")
        assertTrue(event is TrackerEvent.SequenceCommitted)
    }

    @Test
    fun decisionRecordedOnCommit() {
        val state = detectState(ref = grayFrame(listOf("e2")))
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        assertEquals(1, state.decisionLog.size)
        val record = state.decisionLog.last()
        assertEquals(DECIDER_DIFF, record.decider)
        assertEquals("e2e4", record.move)
        assertEquals("e4", record.san)
        assertEquals("frame-diff — UNVERIFIED, no CNN was available", record.reason)
        assertEquals(1, record.ply)
        assertEquals(state.board.fen(), record.fenAfter)
    }

    @Test
    fun deciderVocabularyIsPortedVerbatim() {
        // Phase 07's debug screen and the `track-feedback` ingest read these strings.
        assertEquals(
            listOf(
                "diff",
                "diff_pair",
                "cnn_pair",
                "cnn_occupancy",
                "cnn_overrule",
                "diff_after_verify",
                "cnn_recovery",
                "cnn_resync",
            ),
            DECIDER_REASON.keys.toList(),
        )
        assertEquals("position was LOST — rebuilt by the CNN, not detected", DECIDER_REASON.getValue(DECIDER_CNN_RECOVERY))
    }

    @Test
    fun priorTieBreakIsAppendedToTheReason() {
        val state = detectState()
        state.commitMove(moveOf(state, "e2e4"), grayFrame(), null, priorUsed = true)
        assertEquals("frame-diff — UNVERIFIED, no CNN was available + prior tie-break", state.decisionLog.last().reason)
        assertTrue(state.priorLast)
        assertTrue(state.note.orEmpty().contains("decided by prior"))
    }

    @Test
    fun setRefFromCommitDoesNotRebuildGamut() {
        // entry.md invariant 6: a commit-time reference may still carry hand residue.
        val state = detectState()
        state.setRef(grayFrame(), bgrFrame(), fromCommit = false)
        val quietGamut = requireNotNull(state.refGamut) { "the quiet capture builds the gamut" }
        state.setRef(grayFrame(), bgrFrame(level = 90), fromCommit = true)
        assertSame(quietGamut, state.refGamut, "a commit-time reference must not rebuild the gamut")
        state.setRef(grayFrame(), bgrFrame(level = 90), fromCommit = false)
        assertNotSame(quietGamut, state.refGamut, "the quiet re-anchor DOES rebuild it")
    }

    @Test
    fun setRefCouplesImageFenAndCorners() {
        val state = detectState()
        state.lastCorners = floatArrayOf(1f, 2f, 3f, 4f, 5f, 6f, 7f, 8f)
        state.motionSinceRef = true
        val cur = grayFrame()
        state.setRef(cur, null)
        assertSame(cur, state.refGray)
        assertEquals(state.board.fen(), state.refFen)
        assertNotNull(state.refCorners)
        assertNotSame(state.lastCorners, state.refCorners, "the corners are copied, not aliased")
        assertTrue(!state.motionSinceRef, "a fresh reference requires a new hand before the next commit")
    }

    /**
     * Every commit path states its size, because `undo` takes back a COMMIT and a commit is not
     * always one ply. The CNN recovery of 2026-08-02 pushed four and `undo` popped one.
     */
    @Test
    fun everyCommitPathRecordsHowManyPliesItPushed() {
        val single = detectState()
        single.commitMove(moveOf(single, "e2e4"), grayFrame(), null)
        assertEquals(1, single.lastCommitSize)

        val pair = detectState()
        val first = moveOf(pair, "e2e4")
        pair.board.push(first)
        val second = moveOf(pair, "e7e5")
        pair.board.pop()
        pair.commitSequence(listOf(first, second), grayFrame(), null)
        assertEquals(2, pair.lastCommitSize)

        val recovered = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4", "e7e5", "g1f3"), agreement = 0.95)
        recovered.cnnTick(cnn, recoverySnap(recovered, obsForBoard(recovered.board), 1, grayFrame()))
        assertEquals(3, recovered.lastCommitSize)
    }

    @Test
    fun undoClearsBuffers() {
        val engine = TrackerEngine(detectConfig())
        val state = engine.state
        state.refGray = grayFrame(listOf("e2"))
        state.refFen = state.board.fen()
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        state.grayBuf.append(grayFrame(listOf("e4")))
        state.bgrBuf.append(bgrFrame())
        engine.undo()
        assertEquals(0, state.grayBuf.size)
        assertEquals(0, state.bgrBuf.size)
        assertEquals(emptyList<String>(), state.history)
        assertNull(state.refGray, "undo forces a fresh reference capture")
        assertEquals(0, state.decisionLog.size, "the undone move's provenance row is dropped")
    }

    /**
     * The incident of 2026-08-02. A recovery bridged four plies in one commit, `undo` popped one,
     * and nothing anywhere said how many presses were left — *"ich habe keine Chance wieder zum
     * Spielstate zurückzukommen"*. One press now unwinds the commit.
     */
    @Test
    fun undoUnwindsAMultiMoveRecoveryAsAUnit() {
        val engine = TrackerEngine(recoveryConfig(), STARTPOS)
        val state = engine.state.armed()
        val fenBefore = state.board.fen()
        engine.attachCnn(RecoveryEvaluator(moves = listOf("e2e4", "e7e5", "g1f3", "b8c6"), agreement = 0.95))
        engine.onCnnSnapshot(recoverySnap(state, obsForBoard(state.board), seq = 1, gray = grayFrame()))
        assertEquals(4, state.history.size, "precondition: the bridge committed four plies")

        engine.undo()

        assertEquals(fenBefore, state.board.fen())
        assertEquals(emptyList<String>(), state.history)
        // Including phase 00's per-move rows: the trim drops every row above the restored history.
        assertEquals(0, state.decisionLog.count { it.accepted }, "orphan rows for moves that no longer exist")
        assertTrue(state.note!!.contains("4 moves undone"), state.note!!)
    }

    /**
     * The single commit is the common path and the regression risk — pin it. One press must still
     * mean one ply, with the same note it has always had.
     */
    @Test
    fun undoOfAnOrdinaryCommitIsUnchanged() {
        val engine = TrackerEngine(detectConfig())
        val state = engine.state
        state.commitMove(moveOf(state, "e2e4"), grayFrame(), null)
        state.commitMove(moveOf(state, "e7e5"), grayFrame(), null)

        engine.undo()

        assertEquals(listOf("e4"), state.history)
        assertEquals("last move undone (logged as bad example)", state.note)
    }

    /**
     * The record is of the LAST commit only. After it is spent the next press is an ordinary
     * single-ply undo — anything older is a normal move, not a bridge.
     */
    @Test
    fun asecondUndoAfterASequenceTakesBackOneOrdinaryMove() {
        val engine = TrackerEngine(recoveryConfig(), STARTPOS)
        val state = engine.state.armed()
        state.commitMove(moveOf(state, "d2d4"), grayFrame(), null)
        state.armed()
        engine.attachCnn(RecoveryEvaluator(moves = listOf("d7d5", "c2c4"), agreement = 0.95))
        engine.onCnnSnapshot(recoverySnap(state, obsForBoard(state.board), seq = 1, gray = grayFrame()))
        assertEquals(3, state.history.size)

        engine.undo()
        assertEquals(listOf("d4"), state.history, "the bridge came back whole")
        engine.undo()
        assertEquals(emptyList<String>(), state.history, "and the ordinary move one at a time")
    }

    /**
     * The post-undo cleanup is not part of the pop — the obvious wrong shape here is to loop the
     * whole body N times, which clears the latch, re-notes and re-trims once per popped ply.
     *
     * The note is the counter that can actually fail: a looped body would end on "last move undone"
     * for a four-ply take-back, because each iteration writes its own. `clearAlarm` is idempotent by
     * design and releases at most one latch however often it is called, so the event count pins the
     * release without being able to distinguish the two shapes on its own.
     */
    @Test
    fun theCleanupRunsOncePerUndoNotOncePerPoppedMove() {
        val engine = TrackerEngine(recoveryConfig(), STARTPOS)
        val state = engine.state.armed()
        engine.attachCnn(RecoveryEvaluator(moves = listOf("e2e4", "e7e5", "g1f3", "b8c6"), agreement = 0.95))
        engine.onCnnSnapshot(recoverySnap(state, obsForBoard(state.board), seq = 1, gray = grayFrame()))
        // Latched AFTER the commit: a recovery clears the alarm itself (defect 2, not this pack's).
        state.alarm = TrackerEvent.Alarm("illegal_move", listOf("e4"), null, null)

        val events = engine.undo()

        assertEquals(1, events.count { it is TrackerEvent.AlarmCleared }, "one undo, one release")
        assertNull(state.alarm)
        assertTrue(state.note!!.contains("4 moves undone"), state.note!!)
    }

    @Test
    fun userCorrectionClearsAlarmLatch() {
        for (correction in listOf("undo", "setFen", "captureBaseline")) {
            val engine = TrackerEngine(detectConfig())
            engine.state.alarm = TrackerEvent.Alarm("illegal_move", listOf("b1", "d4"), null, null)
            engine.state.desyncObs = 3
            engine.state.desyncConflicts = ofSquares("b1")
            val events =
                when (correction) {
                    "undo" -> engine.undo()
                    "setFen" -> engine.setFen(STARTPOS)
                    else -> engine.captureBaseline()
                }
            assertNull(engine.state.alarm, "$correction must release the latch")
            assertEquals(0, engine.state.desyncObs, correction)
            assertEquals(0L, engine.state.desyncConflicts, correction)
            assertTrue(events.any { it is TrackerEvent.AlarmCleared }, correction)
            val logged = engine.state.decisionLog.last()
            assertEquals(DECIDER_USER, logged.decider, correction)
            assertTrue(logged.reason.startsWith("illegal_move_"), correction)
        }
    }

    @Test
    fun choosePromotionRejectsInvalidPiece() {
        val engine = TrackerEngine(detectConfig())
        assertTrue(engine.choosePromotion('k').single() is TrackerEvent.Note)
        // A valid piece with nothing pending is an error too.
        assertTrue(engine.choosePromotion('q').single() is TrackerEvent.Note)
        assertEquals(emptyList<String>(), engine.state.history)
    }

    @Test
    fun choosePromotionCommitsChosenPiece() {
        val engine = TrackerEngine(detectConfig(), "8/P6k/8/8/8/8/7K/8 w - - 0 1")
        val state = engine.state
        state.refGray = grayFrame(listOf("a7"))
        state.refFen = state.board.fen()
        state.tryDetect(grayFrame(listOf("a8")), null, seq = 1)
        val pending = requireNotNull(state.promoPending) { "a promotion must wait for the user" }
        assertEquals("a7", pending.from)
        assertEquals("a8", pending.to)
        assertEquals(emptyList<String>(), state.history)
        val events = engine.choosePromotion('n')
        assertEquals(1, events.filterIsInstance<TrackerEvent.MoveCommitted>().size)
        assertTrue(state.history.single().startsWith("a8=N"), "history was ${state.history}")
        assertNull(state.promoPending)
    }

    @Test
    fun statusIsAPureFunctionOfState() {
        val engine = TrackerEngine(detectConfig())
        val state = engine.state
        state.refGray = grayFrame(listOf("e2"))
        state.refFen = state.board.fen()
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        val first = engine.status()
        assertEquals(first, engine.status(), "two calls with no frame in between must be equal")
        assertEquals(state.board.fen(), first.fen)
        assertEquals(STATE_MOVE, first.state)
        assertEquals(Squares.COUNT, first.z.size)
        assertEquals(Squares.COUNT, first.diffs.size)
        assertEquals(Squares.COUNT, first.census.size)
        assertTrue(first.changed.isNotEmpty())
        assertNotNull(first.note)
        assertEquals("e2e4", first.bestUci)
        assertEquals(VERIFY_STATE_CONFIRMED, first.verifyState)
        assertEquals(0, first.pendingFrames)
        assertNull(first.debug)
    }

    @Test
    fun updateConfigRebuildsBuffersAndConfirmerButKeepsTheReference() {
        val engine = TrackerEngine(detectConfig())
        val ref = grayFrame()
        engine.state.refGray = ref
        engine.state.grayBuf.append(grayFrame())
        engine.updateConfig(detectConfig(confirmFrames = 3).copy(avgFramesOverride = 4))
        assertSame(ref, engine.state.refGray, "live tuning must never drop the reference")
        assertEquals(0, engine.state.grayBuf.size, "the averaging window was resized")
        engine.state.confirmer.feed("e2e4")
        engine.state.confirmer.feed("e2e4")
        assertEquals(2, engine.state.confirmer.count)
        assertTrue(engine.state.confirmer.feed("e2e4"), "confirmFrames = 3 confirms on the third feed")
    }
}
