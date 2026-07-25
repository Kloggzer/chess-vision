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
 * contract. Every scenario here exists because the alarm once fired when it should not have, or
 * healed when it should not have.
 */
class AlarmLatchTest {
    @Test
    fun alarmTriggersAfterNStableMismatches() {
        // `test_alarm_triggers_after_n_stable_mismatches`: e1/g1 stable over three glances.
        val state = recoveryState(NF3_NO_CASTLING)
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
        val state = recoveryState(NF3_NO_CASTLING)
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
    fun occupancyOnlyObservationNeverAlarms() {
        // No identity axis to be stable about — the streak is held at zero, not merely ungated.
        val state = recoveryState(NF3_NO_CASTLING)
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY), identity = false)
        for (seq in 1L..5L) state.cnnTick(cnn, recoverySnap(state, obs, seq))
        assertNull(state.alarm)
        assertEquals(0, state.desyncObs)
    }

    @Test
    fun desyncCountsDistinctObservations() {
        // `TestSeqContract::test_desync_counts_distinct_observations`: `desyncObsN` means
        // "persistent over seconds", not "evaluated three times".
        val state = recoveryState(NF3_NO_CASTLING)
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
        val state = recoveryState(NF3_NO_CASTLING)
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
        val state = recoveryState(NF3_NO_CASTLING)
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

    @Test
    fun alarmBlocksFabricatedRecovery() {
        // `test_alarm_blocks_fabricated_recovery`: g2g4 is legal and plausible but leaves the white
        // king on g1 unexplained, so it must NOT commit while the latch is set.
        val (state, cnn) = alarmedState()
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        val fenBefore = state.board.fen()
        cnn.moves = listOf("g8f6")
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 4))
        assertEquals(fenBefore, state.board.fen(), "committed despite the alarm")
        assertNotNull(state.alarm, "alarm cleared despite an unresolved conflict")
        assertTrue(state.note!!.contains("withholding"), state.note!!)
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
        val engine = alarmedEngine()
        engine.undo()
        assertNull(engine.state.alarm)
        assertEquals(0, engine.state.desyncObs)
        assertTrue(engine.state.decisionLog.any { it.reason == "illegal_move_undone" })
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
        val state = recoveryState(NF3_NO_CASTLING)
        assertNull(state.board.alarmGuessSan(null))
        assertNull(state.board.alarmGuessSan("zz9"))
        assertEquals("a4->a5", state.board.alarmGuessSan("a4a5"), "an empty from-square has no piece")
        assertEquals("N f3->e5 (illegal move suspected)", state.board.alarmGuessSan("f3e5"))
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

    /** A `TrackerEngine` whose latch is set, so the public user-correction paths can release it. */
    private fun alarmedEngine(): TrackerEngine {
        val engine = TrackerEngine(recoveryConfig(), NF3_NO_CASTLING)
        val state = engine.state.armed()
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        engine.attachCnn(RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1"))
        for (seq in 1L..3L) engine.onCnnSnapshot(recoverySnap(state, obs, seq))
        checkNotNull(state.alarm)
        return engine
    }
}
