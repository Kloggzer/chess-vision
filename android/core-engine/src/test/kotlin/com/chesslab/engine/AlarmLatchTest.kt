package com.chesslab.engine

import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.toStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The illegal-move latch. Every state is [underWay]: with no ply on the record there is no latch at
 * all (`Alarm.alarmable`), and a "never alarms" case would pass for the wrong reason.
 */
class AlarmLatchTest {
    /**
     * specs/39 phase 01: `guessIllegalMove`'s 1-and-1 shape names neither a castling nor a chronic
     * misread, so such a standoff was held silently forever (2026-08-02, rec-20260807 after Qh4).
     */
    @Test
    fun aStandoffOnOneSquareEventuallyAlarms() {
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator()
        val obs = obsForBoard(state.board, mapOf("g1" to LABEL_EMPTY))
        val bound = state.config.desyncStandoffObsN.toLong()
        for (seq in 1L until bound) {
            val events = state.desyncEvidence(cnn, recoverySnap(state, obs, seq), listOf("g1"))
            assertTrue(events.isEmpty(), "no alarm before the bound (observation $seq)")
            assertNull(state.alarm)
        }
        val events = state.desyncEvidence(cnn, recoverySnap(state, obs, bound), listOf("g1"))
        val raised = events.filterIsInstance<TrackerEvent.Alarm>().single()
        assertNull(raised.guess, "there is no move-shaped guess — the standoff bound latched without one")
        assertTrue("g1" in raised.conflicts)
        assertNotNull(state.alarm)
        assertTrue(state.note!!.contains("llegal move", ignoreCase = true), state.note!!)
    }

    @Test
    fun anUnstableConflictSetNeverReachesTheThreshold() {
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator()
        for (seq in 1L..STANDOFF_SOAK) {
            val square = if (seq % 2L == 0L) "g1" else "e4"
            val obs = obsForBoard(state.board, mapOf(square to LABEL_EMPTY))
            state.desyncEvidence(cnn, recoverySnap(state, obs, seq), listOf(square))
            assertNull(state.alarm, "an alternating conflict set restarts the streak at 1 (observation $seq)")
        }
    }

    @Test
    fun zeroDisablesTheStandoffBound() {
        val state = EngineState(recoveryConfig().copy(desyncStandoffObsN = 0), NF3_NO_CASTLING, whitePov = true).armed().underWay()
        val cnn = RecoveryEvaluator()
        val obs = obsForBoard(state.board, mapOf("g1" to LABEL_EMPTY))
        for (seq in 1L..STANDOFF_SOAK) {
            state.desyncEvidence(cnn, recoverySnap(state, obs, seq), listOf("g1"))
            assertNull(state.alarm, "0 means off, the way 0 means off for every knob (observation $seq)")
        }
    }

    /** The move-shaped guess is stronger evidence and must keep latching at `desyncObsN`, not 12. */
    @Test
    fun theMoveShapedGuessStillWinsFirst() {
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        val conflicts = listOf("e1", "g1")
        state.desyncEvidence(cnn, recoverySnap(state, obs, seq = 1), conflicts)
        state.desyncEvidence(cnn, recoverySnap(state, obs, seq = 2), conflicts)
        assertNull(state.alarm)
        val events = state.desyncEvidence(cnn, recoverySnap(state, obs, seq = 3), conflicts)
        val raised = events.filterIsInstance<TrackerEvent.Alarm>().single()
        assertEquals("e1g1", raised.guess, "a 1-and-1 contradiction still alarms at desyncObsN with its guess")
    }

    @Test
    fun alarmTriggersAfterNStableMismatches() {
        // `test_alarm_triggers_after_n_stable_mismatches`: e1/g1 stable over three glances.
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1))
        assertNull(state.alarm, "needs 3 observations")
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 2))
        assertNull(state.alarm, "needs 3 observations")
        val events = state.cnnTick(cnn, recoverySnap(state, obs, seq = 3))
        val alarm = requireNotNull(state.alarm)
        assertEquals(ALARM_ILLEGAL_MOVE, alarm.kind)
        assertEquals(setOf("e1", "g1"), alarm.conflicts.toSet())
        assertEquals("e1g1", alarm.guess)
        assertTrue(events.any { it is TrackerEvent.Alarm })
        assertTrue(state.note!!.contains("llegal", ignoreCase = true), state.note!!)
    }

    @Test
    fun identityOnlyConflictNeverAlarms() {
        // The N/B/R gap (~40% identity precision) is a model weakness, not a desync.
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("b1", "g1"), occupancyConflict = false, guess = "b1c3")
        val obs = obsForBoard(state.board, mapOf("b1" to "wB", "g1" to "wB"))
        for (seq in 1L..8L) state.cnnTick(cnn, recoverySnap(state, obs, seq))
        assertNull(state.alarm, "identity-only conflicts must never alarm")
        assertEquals(8, state.desyncObs, "the streak still runs — only the raise is gated")
    }

    /**
     * Not before the first ply: the latch has no automatic way out, and `2026-08-15-22-48-04` alarmed
     * at video t=0.8 s on the position it was HANDED, then replayed 0 of its 19 plies.
     */
    @Test
    fun noAlarmBeforeTheFirstPlyIsOnTheRecord() {
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        val fresh = recoveryState(NF3_NO_CASTLING)
        val obs = obsForBoard(fresh.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        for (seq in 1L..STANDOFF_SOAK) fresh.cnnTick(cnn, recoverySnap(fresh, obs, seq))
        assertNull(fresh.alarm, "nothing on the record: the handed-in position may not be declared lost")
        assertTrue(fresh.desyncObs >= fresh.config.desyncObsN, "the streak runs — only the latch is gated")
        // The SAME evidence one ply later does latch, so this is the guard and not the setup.
        val started = recoveryState(NF3_NO_CASTLING).underWay()
        for (seq in 1L..3L) started.cnnTick(cnn, recoverySnap(started, obs, seq))
        assertNotNull(started.alarm)
    }

    /**
     * The hand triggers the alarm it explains (User, 2026-08-24) — it covers exactly the squares that
     * then read wrong. The alarm path was the one place that never asked `handInFrame`.
     */
    @Test
    fun aHandInFrameDefersTheLatch() {
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        for (seq in 1L..STANDOFF_SOAK) {
            val hand = recoverySnap(state, obs, seq, tsMs = nowMs(state), gridOccluded = ofSquares("e1", "f1"))
            state.cnnSnap = hand
            state.cnnTick(cnn, hand)
            assertNull(state.alarm, "a hand over the board must not latch (observation $seq)")
        }
        assertTrue(state.desyncObs >= state.config.desyncObsN, "blitz needs the streak — only the latch waits")
        state.cnnSnap = null
        state.cnnTick(cnn, recoverySnap(state, obs, seq = STANDOFF_SOAK + 1))
        assertNotNull(state.alarm, "the hand leaves and the same evidence latches at once")
    }

    @Test
    fun noAlarmWithoutCnn() {
        // `test_no_alarm_without_cnn`: a diff-only tracker stuck on no_legal_move never alarms.
        val state = recoveryState()
        val obs = obsForBoard(state.board)
        for (seq in 1L..10L) state.cnnTick(null, recoverySnap(state, obs, seq))
        assertNull(state.alarm)
        assertEquals(0, state.desyncObs)
    }

    @Test
    fun anOccupancyConflictAlarmsOnAMoveShapedContradiction() {
        // The gate is OCCUPANCY: `guessIllegalMove` never compares piece names.
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY), identity = true)
        for (seq in 1L..3L) state.cnnTick(cnn, recoverySnap(state, obs, seq))
        assertNotNull(state.alarm, "a move-shaped occupancy contradiction must raise the alarm")
        assertEquals(3, state.desyncObs, "desyncObsN distinct observations, no more")
    }

    @Test
    fun noOccupancyConflictNoAlarm() {
        // "Alarm on any contradiction" was measured on the 18 clips and rejected for false alarms.
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("b1", "g1"), occupancyConflict = false, guess = "b1c3")
        val obs = obsForBoard(state.board, mapOf("b1" to LABEL_EMPTY), identity = true)
        for (seq in 1L..8L) state.cnnTick(cnn, recoverySnap(state, obs, seq))
        assertNull(state.alarm)
        assertEquals(8, state.desyncObs, "the streak runs — only the raise is gated")
    }

    @Test
    fun desyncCountsDistinctObservations() {
        // `TestSeqContract::test_desync_counts_distinct_observations`: `desyncObsN` means
        // "persistent over seconds", not "evaluated three times".
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 5))
        assertEquals(1, state.desyncObs)
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 5))
        assertEquals(1, state.desyncObs, "the same frame re-evaluated must not advance the streak")
        assertNull(state.alarm)
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 6))
        assertEquals(2, state.desyncObs)
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 7))
        assertEquals(3, state.desyncObs)
        assertNotNull(state.alarm)
    }

    @Test
    fun unstableConflictSetResetsStreakToOne() {
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1))
        cnn.conflicts = listOf("e1")
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 2))
        assertEquals(2, state.desyncObs, "a subset is still the same story")
        cnn.conflicts = listOf("a7", "b7")
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 3))
        assertEquals(1, state.desyncObs, "a disjoint set restarts at ONE, not zero")
        assertNull(state.alarm)
    }

    @Test
    fun inconclusiveObservationBreaksStreak() {
        // Occlusion is not evidence of a desync — it is the absence of evidence.
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1))
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 2))
        assertEquals(2, state.desyncObs)
        cnn.inconclusive = true
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 3))
        assertEquals(0, state.desyncObs)
        cnn.inconclusive = false
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 4))
        assertEquals(1, state.desyncObs)
        assertNull(state.alarm)
    }

    /** The reset lived only in `clearAlarm`, which returns early without a latch — so a MATCH never broke the streak. */
    @Test
    fun aMatchingObservationBreaksTheDesyncStreak() {
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1))
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 2))
        assertEquals(2, state.desyncObs)

        cnn.match = true
        state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), seq = 3))
        assertEquals(0, state.desyncObs, "the board agreed — the disagreement is over")
        assertEquals(0L, state.desyncConflicts, "and the set it was counted over goes with it")

        cnn.match = false
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 4))
        assertEquals(1, state.desyncObs, "the next mismatch is the FIRST of a new streak")
        assertNull(state.alarm, "two mismatches around a matching glance are not three in a row")
    }

    /** "Alarm feuert zu schnell beim Ziehen": die Serie der VORIGEN Stellung ueberlebte den Commit. */
    @Test
    fun aCommitClearsTheDesyncStreak() {
        val (state, cnn) = streakedState()
        state.commitMove(moveOf(state, "a7a6"), grayFrame(), null)
        assertEquals(0, state.desyncObs, "the streak was counted against the position that just left")

        state.nowS += STREAK_GAP_S
        state.markStuck(STUCK_NO_LEGAL_MOVE)
        state.mismatchGlance(cnn, seq = 3)

        assertEquals(1, state.desyncObs, "the next mismatch is the FIRST of a new streak")
        assertNull(state.alarm, "one read after a move may not latch the alarm")
    }

    /** Dieselbe Serie, derselbe Stellungswechsel — nur committet ihn die CNN-Recovery. */
    @Test
    fun aRecoveryCommitClearsTheDesyncStreak() {
        val (state, cnn) = streakedState()
        cnn.moves = listOf("a7a6")
        state.recoveryGlances(cnn, obsForBoard(state.board), gray = grayFrame())
        assertEquals("a6", state.history.last(), "precondition: the bridge committed")
        assertEquals(0, state.desyncObs, "the streak was counted against the position that just left")

        cnn.moves = emptyList()
        state.nowS += STREAK_GAP_S
        state.markStuck(STUCK_NO_LEGAL_MOVE)
        state.mismatchGlance(cnn, seq = 3)

        assertEquals(1, state.desyncObs, "the next mismatch is the FIRST of a new streak")
        assertNull(state.alarm, "one read after a bridge may not latch the alarm")
    }

    /**
     * Ohne Latch kehrt `clearAlarm` sofort zurueck, und genau dann raeumte niemand die Serie ab:
     * der Undo verliess die Stellung, gegen die sie gezaehlt war, und nahm sie mit.
     */
    @Test
    fun undoClearsTheDesyncStreakWithoutALatch() {
        val engine = TrackerEngine(recoveryConfig().copy(alarmMinS = STREAK_ALARM_MIN_S), NF3_NO_CASTLING)
        val state = engine.state
        state.commitMove(moveOf(state, "a7a6"), grayFrame(), null)
        state.commitMove(moveOf(state, "b1c3"), grayFrame(), null)
        state.armed()
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        engine.attachCnn(cnn)
        for (seq in 1L..2L) state.mismatchGlance(cnn, seq)
        check(state.desyncObs == 2 && state.alarm == null) { "precondition: a streak of two, no latch" }

        engine.undo()
        assertEquals(0, state.desyncObs, "the undo left the position the streak was counted against")

        state.nowS += STREAK_GAP_S
        state.markStuck(STUCK_NO_LEGAL_MOVE)
        state.mismatchGlance(cnn, seq = 3)

        assertEquals(1, state.desyncObs, "the next mismatch is the FIRST of a new streak")
        assertNull(state.alarm, "one read after an undo may not latch the alarm")
    }

    /**
     * `{e1}` → `{e1,g1}` → `{g1}` never has ONE square disagreeing throughout: the subset rule
     * carried the streak across a set that had drifted whole. The running core `{e1}∩{g1}` is empty.
     */
    @Test
    fun aStreakNeedsARunningCoreOfConflicts() {
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("e1"), guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1))
        cnn.conflicts = listOf("e1", "g1")
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 2))
        assertEquals(2, state.desyncObs, "e1 still disagrees — the streak holds")
        cnn.conflicts = listOf("g1")
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 3))
        assertEquals(1, state.desyncObs, "no square disagreed on all three looks — a new streak")
        assertNull(state.alarm)
    }

    /** A streak of two against the current position, with the latch's duration gate live. */
    private fun streakedState(): Pair<EngineState, RecoveryEvaluator> {
        val config = recoveryConfig().copy(alarmMinS = STREAK_ALARM_MIN_S)
        val state = EngineState(config, NF3_NO_CASTLING, whitePov = true).armed().underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        state.mismatchGlance(cnn, seq = 1)
        state.mismatchGlance(cnn, seq = 2)
        check(state.desyncObs == 2 && state.alarm == null) { "precondition: a streak of two, no latch" }
        return state to cnn
    }

    private fun EngineState.mismatchGlance(
        cnn: RecoveryEvaluator,
        seq: Long,
    ) = cnnTick(cnn, recoverySnap(this, obsForBoard(board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK")), seq))

    @Test
    fun alarmBlocksFabricatedRecovery() {
        // `test_alarm_blocks_fabricated_recovery`: a legal move that leaves the king on g1 unexplained.
        val (state, cnn) = alarmedState()
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        val fenBefore = state.board.fen()
        cnn.moves = listOf("g8f6")
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 4))
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 5))
        assertEquals(fenBefore, state.board.fen(), "committed despite the alarm")
        assertNotNull(state.alarm, "alarm cleared despite an unresolved conflict")
        assertTrue(state.note!!.contains("withholding"), state.note!!)
    }

    @Test
    fun alarmRecoveryIgnoresUnrelatedIdentityMistakes() {
        // Identity errors (a1 read as a knight) may travel in the diagnostic conflict list, but must
        // not block an occupancy-resolving bridge forever.
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("g8", "f6", "a1"), guess = "g8f6")
        val obs = obsForBoard(state.board, mapOf("g8" to LABEL_EMPTY, "f6" to "bN", "a1" to "wN"))
        for (seq in 1L..3L) state.cnnTick(cnn, recoverySnap(state, obs, seq))
        assertNotNull(state.alarm)

        cnn.moves = listOf("g8f6")
        val events = state.recoveryGlances(cnn, obs)

        assertTrue(events.any { it is TrackerEvent.MoveCommitted })
        assertNull(state.alarm)
        assertEquals("Nf6", state.history.last())
    }

    @Test
    fun verifiedRestoreClearsAlarm() {
        // `test_alarm_blocks_fabricated_recovery`'s tail: match_ok is the take-back the latch waits
        // for — the only release that is not a user correction.
        val (state, cnn) = alarmedState()
        cnn.match = true
        cnn.moves = emptyList()
        val events = state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), seq = 5))
        assertNull(state.alarm)
        assertEquals(0, state.desyncObs)
        assertEquals(0L, state.desyncConflicts)
        assertTrue(events.any { it is TrackerEvent.AlarmCleared })
        assertTrue(state.decisionLog.none { it.decider == DECIDER_USER }, "a restore is not a user row")
    }

    @Test
    fun undoClearsAlarmLatch() {
        // Black is to move in the fixture, and a6 leaves e1/g1 — the alarm's own squares — alone.
        val engine = alarmedEngine(commit = "a7a6")
        engine.undo()
        assertNull(engine.state.alarm)
        assertEquals(0, engine.state.desyncObs)
        assertTrue(engine.state.decisionLog.any { it.reason == "illegal_move_undone" })
    }

    /**
     * The undo deleted its own `decider = "user"` row: stamped with the CURRENT `history.size`, then
     * trimmed above the RESTORED one. [undoClearsAlarmLatch] has no history, so its trim never runs.
     */
    @Test
    fun undoKeepsItsOwnUserRow() {
        val engine = TrackerEngine(recoveryConfig(), STARTPOS)
        val state = engine.state
        state.commitMove(moveOf(state, "g1f3"), grayFrame(), null)
        assertEquals(1, state.history.size, "precondition: there is a ply to take back")
        state.armed()
        engine.attachCnn(RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1"))
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        for (seq in 1L..3L) engine.onCnnSnapshot(recoverySnap(state, obs, seq))
        checkNotNull(state.alarm) { "precondition: the latch is set" }

        engine.undo()

        assertTrue(state.history.isEmpty(), "precondition: the ply was popped, so the trim ran")
        val row = state.decisionLog.single { it.decider == DECIDER_USER }
        assertEquals("illegal_move_undone", row.reason)
        assertEquals(0, row.ply, "the row describes the position the user restored, not the one left")
    }

    @Test
    fun baselineClearsAlarmLatch() {
        val engine = alarmedEngine()
        engine.captureBaseline()
        assertNull(engine.state.alarm)
        assertTrue(engine.state.decisionLog.any { it.reason == "illegal_move_accepted" })
    }

    /**
     * Ein verrutschtes Brett sagt nichts darueber, ob Stellung und Brett wieder zusammenpassen —
     * also faellt die Pixel-Referenz und der Latch bleibt (Invariante 9, `docs/tracker-flow.md`).
     */
    @Test
    fun aChangedRectificationDropsTheReferenceAndKeepsTheLatch() {
        val engine = alarmedEngine()
        engine.state.refGray = grayFrame()
        engine.rectificationChanged()
        assertNull(engine.state.refGray)
        assertNotNull(engine.state.alarm)
    }

    @Test
    fun resetFenClearsAlarmLatch() {
        val engine = alarmedEngine()
        engine.setFen(engine.state.board.fen())
        assertNull(engine.state.alarm)
        assertTrue(engine.state.decisionLog.any { it.reason == "illegal_move_accepted" })
    }

    @Test
    fun alarmStatusFieldsForUi() {
        // `test_alarm_status_fields_for_ui`: everything the red-board card renders.
        val (state, _) = alarmedState()
        val alarm = requireNotNull(state.toStatus().alarm)
        assertEquals(ALARM_ILLEGAL_MOVE, alarm.kind)
        assertEquals(setOf("e1", "g1"), alarm.conflicts.toSet())
        assertEquals("e1g1", alarm.guess)
        assertEquals("K e1->g1 (castling not available)", alarm.guessSan)
        assertTrue(state.alarmSince > 0.0)
        assertTrue(state.toStatus().note!!.contains("llegal", ignoreCase = true))
    }

    @Test
    fun guessSanFallsBackToBareSquares() {
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        assertNull(state.board.alarmGuessSan(null))
        assertNull(state.board.alarmGuessSan("zz9"))
        assertEquals("a4->a5", state.board.alarmGuessSan("a4a5"), "an empty from-square has no piece")
        // Schwarz ist am Zug, der Springer auf f3 ist weiss — das ist der Grund, nicht "suspected".
        assertEquals("N f3->e5 (it is Black to move)", state.board.alarmGuessSan("f3e5"))
        // Dieselbe Stellung, aber eine schwarze Figur: die Seite stimmt, also bleibt es generisch.
        assertEquals("N b8->a6 (illegal move suspected)", state.board.alarmGuessSan("b8a6"))
    }

    @Test
    fun acceptCnnPositionAdoptsTheObservationAndClearsTheLatch() {
        // `test_accept_cnn_position_*`: "the board is right, the game state is not".
        val engine = alarmedEngine()
        val events = engine.acceptCnnPosition()
        assertEquals("rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQ1BKR b - - 1 1", engine.status().fen)
        assertNull(engine.state.alarm)
        assertTrue(engine.state.history.isEmpty(), "an illegal move broke game continuity")
        assertTrue(events.any { it is TrackerEvent.AlarmCleared })
        assertTrue(engine.state.decisionLog.any { it.reason == "illegal_move_accepted" })
    }

    @Test
    fun acceptCnnPositionRejectsAnObservationWithoutBothKings() {
        // A vanished king is a misread, never a position.
        val engine = alarmedEngine()
        val state = engine.state
        state.cnnSnap = recoverySnap(state, obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY)), seq = 9, tsMs = nowMs(state))
        val events = engine.acceptCnnPosition()
        assertEquals(NF3_NO_CASTLING, engine.status().fen)
        assertNotNull(state.alarm)
        assertTrue(events.single() is TrackerEvent.Note)
    }

    @Test
    fun acceptCnnPositionPrunesCastlingRightsAndKeepsSideToMove() {
        // The h1 rook is observed on h5, so White's kingside right cannot survive — but the queenside
        // right, both black rights and "White to move" must.
        val engine = TrackerEngine(recoveryConfig(), "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
        val state = engine.state
        state.cnnSnap =
            recoverySnap(state, obsForBoard(state.board, mapOf("h1" to LABEL_EMPTY, "h5" to "wR")), seq = 1)
        engine.acceptCnnPosition()
        assertEquals("r3k2r/8/8/7R/8/8/8/R3K3 w Qkq - 0 1", engine.status().fen)
    }

    /** [commit] plays a real ply for the `undo` caller; the others use `underWay`, which leaves the BOARD alone. */
    private fun alarmedEngine(commit: String? = null): TrackerEngine {
        val engine = TrackerEngine(recoveryConfig(), NF3_NO_CASTLING)
        val state = engine.state
        // The commit BEFORE `armed`: it clears the stuck latch that arms the CNN gates.
        commit?.let { state.commitMove(moveOf(state, it), grayFrame(), null) } ?: state.underWay()
        state.armed()
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        engine.attachCnn(RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1"))
        for (seq in 1L..3L) engine.onCnnSnapshot(recoverySnap(state, obs, seq, tsMs = nowMs(state)))
        checkNotNull(state.alarm)
        return engine
    }
}

/** The glance the user is answering happened NOW — `adoptableCnnFen` only reads a fresh one. */
private fun nowMs(state: EngineState): Long = (state.nowS * 1000.0).toLong()

/** Far past every threshold: long enough that "never" means never, cheap enough to soak. */
private const val STANDOFF_SOAK = 50L

/** The latch's duration gate, live — a streak that survives a commit brings its clock along. */
private const val STREAK_ALARM_MIN_S = 5.0

private const val STREAK_GAP_S = 30.0
