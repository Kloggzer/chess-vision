package com.chesslab.engine

import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/**
 * `raiseAlarmIfDue` latchte die AKTUELLE Konfliktliste statt des Kerns aus `advanceDesyncStreak`
 * (Bug-Audit E10, `docs/bug-audit-2026-09-13.md`).
 */
class AlarmTransientExtrasBugTest {
    @Test
    fun raisesAlarmWithStableCoreNotTransientExtras() {
        val state = recoveryState(NF3_NO_CASTLING).underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("e2", "e4"), guess = "e2e4")
        val obs = obsForBoard(state.board, mapOf("e2" to LABEL_EMPTY, "e4" to "wP"))

        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1))
        assertEquals(1, state.desyncObs)
        assertNull(state.alarm)

        state.cnnTick(cnn, recoverySnap(state, obs, seq = 2))
        assertEquals(2, state.desyncObs)
        assertNull(state.alarm)

        cnn.conflicts = listOf("e2", "e4", "a1")
        val events = state.cnnTick(cnn, recoverySnap(state, obs, seq = 3))

        val raised = events.filterIsInstance<TrackerEvent.Alarm>().single()
        assertNotNull(state.alarm)

        assertEquals(
            setOf("e2", "e4"),
            raised.conflicts.toSet(),
            "alarm must latch only the stable core {e2,e4}, not the transient a1",
        )
    }
}
