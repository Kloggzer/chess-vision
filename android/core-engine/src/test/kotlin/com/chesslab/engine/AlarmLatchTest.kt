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
 * The illegal-move latch — `tests/test_move_tracker.py`'s alarm block plus the Spec-11 seq
 * contract. Every scenario exists because the alarm once fired when it should not have, or healed
 * when it should not have. Every state is [underWay]: no ply on the record, no latch at all
 * (`Alarm.alarmable`), and a "never alarms" case would then pass for the wrong reason.
 */
class AlarmLatchTest {
    /**
     * specs/39 phase 01. A castling vacates two squares and fills two, a single chronic misread
     * vacates one and fills none — `guessIllegalMove`'s 1-and-1 shape can never name either, and
     * until this bound the engine held such a standoff silently forever (the 2026-08-02 endgame,
     * and the rec-20260807 video's illegal white castling after Qh4).
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
        assertTrue(state.note!!.contains("ILLEGAL MOVE?"), state.note!!)
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
        assertTrue(state.note!!.contains("ILLEGAL"), state.note!!)
    }

    @Test
    fun identityOnlyConflictNeverAlarms() {
        // The N/B/R gap (~40% identity precision) is a known model weakness, not a desync: with no
        // OCCUPANCY conflict the streak runs forever and the latch never trips.
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("b1", "g1"), occupancyConflict = false, guess = "b1c3")
        val obs = obsForBoard(state.board, mapOf("b1" to "wB", "g1" to "wB"))
        for (seq in 1L..8L) state.cnnTick(cnn, recoverySnap(state, obs, seq))
        assertNull(state.alarm, "identity-only conflicts must never alarm")
        assertEquals(8, state.desyncObs, "the streak still runs — only the raise is gated")
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
        // The alarm gate is OCCUPANCY, one layer down: `guessIllegalMove` demands exactly one
        // vacated and one received square and never compares piece names. Only e1 disagrees here,
        // and the labels of every other square match — an occupancy test wearing label clothing.
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY), identity = true)
        for (seq in 1L..3L) state.cnnTick(cnn, recoverySnap(state, obs, seq))
        assertNotNull(state.alarm, "a move-shaped occupancy contradiction must raise the alarm")
        assertEquals(3, state.desyncObs, "desyncObsN distinct observations, no more")
    }

    @Test
    fun noOccupancyConflictNoAlarm() {
        // The bar: no occupancy disagreement, no alarm, however long the streak runs. Without this
        // the behaviour would be "alarm on any contradiction", which was measured on the 18 clips
        // and rejected for false alarms.
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

    /**
     * A matching glance is the strongest thing the CNN can say, and it did not break the streak
     * unless an alarm happened to be latched already — the reset lived only in `clearAlarm`, which
     * returns early when nothing is latched. So three mismatches spread across otherwise clean
     * observations latched the alarm, while a merely *inconclusive* glance broke the streak.
     */
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

    @Test
    fun alarmBlocksFabricatedRecovery() {
        // `test_alarm_blocks_fabricated_recovery`: g2g4 is legal and plausible but leaves the white
        // king on g1 unexplained, so it must NOT commit while the latch is set.
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
        // The observation sees the legal ...Nf6 occupancy change correctly, but calls the rook on
        // a1 a knight. Identity errors are allowed to travel in the alarm's diagnostic conflict
        // list; they must not make an occupancy-resolving bridge impossible forever.
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
     * The undo deleted the row the undo had just written.
     *
     * `clearAlarm` stamps its `decider = "user"` row with the CURRENT `history.size`, and the trim
     * that ran right after it drops every row above the RESTORED size — so the one thing in the log
     * that remembers a human rejection was removed by the same press that recorded it. It survived
     * because [undoClearsAlarmLatch] runs on an engine with no history at all, where the whole
     * pop-and-trim block is skipped and the row is never in the trim's way.
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
        assertTrue(state.toStatus().note!!.contains("ILLEGAL"))
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
        // `test_accept_cnn_position_*`: the user says "the board is right, the game state is not".
        // The observation has the white king on g1, so that is the position the game continues from.
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
        // A vanished king is a misread, never a position: adopting it would make every later
        // legality check meaningless, so the latch stays exactly where it was.
        val engine = alarmedEngine()
        val state = engine.state
        state.cnnSnap = recoverySnap(state, obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY)), seq = 9)
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

    /**
     * A `TrackerEngine` whose latch is set, so the public user-correction paths can release it.
     *
     * [commit] plays a real ply first, for the one caller whose `undo` needs something to pop.
     * The others take the bare history row `underWay` writes: the latch needs a ply on the record,
     * and a move on the BOARD would move the position these tests assert on.
     */
    private fun alarmedEngine(commit: String? = null): TrackerEngine {
        val engine = TrackerEngine(recoveryConfig(), NF3_NO_CASTLING)
        val state = engine.state
        // The commit BEFORE `armed`: it clears the stuck latch that arms the CNN gates.
        commit?.let { state.commitMove(moveOf(state, it), grayFrame(), null) } ?: state.underWay()
        state.armed()
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        engine.attachCnn(RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1"))
        for (seq in 1L..3L) engine.onCnnSnapshot(recoverySnap(state, obs, seq))
        checkNotNull(state.alarm)
        return engine
    }
}

/** Far past every threshold: long enough that "never" means never, cheap enough to soak. */
private const val STANDOFF_SOAK = 50L
