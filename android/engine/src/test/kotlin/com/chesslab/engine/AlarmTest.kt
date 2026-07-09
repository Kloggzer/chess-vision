package com.chesslab.engine

import com.chesslab.engine.api.AlarmState
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Illegal-move referee alarm gates (ports 6368b88/e867df1) and the resting-hand
 * observation taint (cf31c81 + the 3 s freshness bound of e065051).
 */
class AlarmTest {
    private val config = TrackerConfig(confirmFrames = 1)
    private val alarm = AlarmState(listOf("b1", "d4"), guessUci = null)

    private class Rig(
        config: TrackerConfig,
    ) {
        val state = EngineState()
        val detector = Detector(config, state) { null }
        val events = mutableListOf<TrackerEvent>()

        init {
            val ref = Phase00Images.flatBgr(BOARD_V, BOARD_V, BOARD_V)
            Phase00Images.fillCellBgr(ref, "e2", PIECE_V, PIECE_V, PIECE_V)
            state.setRef(Phase00Images.toGray(ref), ref)
            state.motionSinceRef = true
            state.lastMotionTs = NOW - 1.0
        }

        fun detect(vararg pieceSquares: String) {
            val cur = Phase00Images.flatBgr(BOARD_V, BOARD_V, BOARD_V)
            for (sq in pieceSquares) Phase00Images.fillCellBgr(cur, sq, PIECE_V, PIECE_V, PIECE_V)
            detector.tryDetect(Phase00Images.toGray(cur), cur, NOW, events)
        }
    }

    @Test
    fun `alarm blocks dispatch commits`() {
        val rig = Rig(config)
        rig.state.alarm = alarm
        rig.detect("e4") // clean e2e4 evidence
        assertTrue(rig.events.filterIsInstance<TrackerEvent.MoveCommitted>().isEmpty())
        assertTrue("desynced" in rig.state.note)
    }

    @Test
    fun `alarm blocks the quiet re-anchor`() {
        val rig = Rig(config)
        rig.state.alarm = alarm
        val refBefore = rig.state.refGray
        rig.detect("e2") // quiet board (matches the reference)
        assertEquals("no_legal_move", rig.state.stuckReason)
        assertTrue(rig.state.refGray === refBefore, "illegal position must not become base truth")
    }

    @Test
    fun `engine alarm API - recovery gated, resync blocked, reset logs discontinuity`() {
        val engine = TrackerEngine()
        val gray = GrayImage(SMALL, SMALL, ByteArray(SMALL * SMALL))
        val bgr = BgrImage(SMALL, SMALL, ByteArray(SMALL * SMALL * 3))
        engine.raiseAlarm(alarm)
        assertNotNull(engine.status.alarm)
        // Recovery without conflict resolution is refused; re-anchor via resync is blocked.
        assertFalse(engine.applyRecoveredMoves(listOf("e2e4"), engine.status.fen, gray, bgr))
        assertFalse(engine.resyncReference(engine.status.fen, gray, bgr))
        // A recovery that RESOLVES the conflicts commits and clears the alarm.
        assertTrue(engine.applyRecoveredMoves(listOf("e2e4"), engine.status.fen, gray, bgr, resolvesAlarm = true))
        assertNull(engine.status.alarm)
        assertEquals(listOf("e4"), engine.status.history)
        // User resync while alarmed logs a discontinuity.
        engine.raiseAlarm(alarm)
        engine.reset()
        val events = engine.onFrame(gray, bgr, 1L)
        assertTrue(events.any { it is TrackerEvent.Discontinuity && it.reason == "illegal_move_accepted" })
        assertTrue(events.any { it is TrackerEvent.AlarmCleared })
        assertNull(engine.status.alarm)
    }

    @Test
    fun `clearAlarm on take-back match`() {
        val engine = TrackerEngine()
        engine.raiseAlarm(alarm)
        engine.clearAlarm()
        assertNull(engine.status.alarm)
        assertTrue("alarm cleared" in engine.status.note)
    }

    private companion object {
        const val NOW = 100.0
        const val BOARD_V = 120
        const val PIECE_V = 255
        const val SMALL = 64
    }
}
