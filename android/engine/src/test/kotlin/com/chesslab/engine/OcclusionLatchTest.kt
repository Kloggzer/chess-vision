package com.chesslab.engine

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Occlusion-latch invariant (ports 211744f + the blocked-count part of 6368b88): a taint
 * releases only when its hold expired AND (motion since the last refresh OR the square is
 * back at baseline); latched squares carry no evidence and count toward maxChanged.
 */
class OcclusionLatchTest {
    private val config = TrackerConfig(confirmFrames = 1)

    private class Rig(
        config: TrackerConfig,
    ) {
        val state = EngineState()
        val detector = Detector(config, state) { null }
        val events = mutableListOf<TrackerEvent>()

        init {
            val ref = Phase00Images.flatBgr(BOARD_V, BOARD_V, BOARD_V)
            state.setRef(Phase00Images.toGray(ref), ref)
            state.motionSinceRef = true
        }

        fun detect(
            now: Double,
            hotSquares: List<String> = emptyList(),
        ) {
            val cur = Phase00Images.flatBgr(BOARD_V, BOARD_V, BOARD_V)
            for (sq in hotSquares) Phase00Images.fillCellBgr(cur, sq, HOT_V, HOT_V, HOT_V)
            detector.tryDetect(Phase00Images.toGray(cur), cur, now, events)
        }
    }

    @Test
    fun `still hand stays latched past the hold without motion`() {
        val rig = Rig(config)
        rig.state.tainted["e4"] = TAINT_EXPIRY
        rig.state.lastMotionTs = TAINT_EXPIRY - 1.0 // before the taint refresh
        rig.detect(now = TAINT_EXPIRY + 5.0, hotSquares = listOf("e4"))
        assertTrue("e4" in rig.state.tainted, "hot square without motion must stay latched")
        assertTrue(rig.events.filterIsInstance<TrackerEvent.MoveCommitted>().isEmpty())
        assertFalse("e4" in rig.state.changed, "latched square carries no evidence")
        assertTrue("e4" in rig.state.occludedVetoed, "latched square displays as occluded")
    }

    @Test
    fun `motion since the taint refresh releases the latch`() {
        val rig = Rig(config)
        rig.state.tainted["e4"] = TAINT_EXPIRY
        rig.state.lastMotionTs = TAINT_EXPIRY // >= expiry - motionHold
        rig.detect(now = TAINT_EXPIRY + 5.0, hotSquares = listOf("e4"))
        assertFalse("e4" in rig.state.tainted, "motion after the refresh must release")
    }

    @Test
    fun `return to baseline releases the latch without motion`() {
        val rig = Rig(config)
        rig.state.tainted["e4"] = TAINT_EXPIRY
        rig.state.lastMotionTs = TAINT_EXPIRY - 1.0
        rig.detect(now = TAINT_EXPIRY + 5.0) // board quiet again
        assertFalse("e4" in rig.state.tainted, "baseline return must release the false taint")
    }

    @Test
    fun `hold not yet expired keeps the latch even at baseline`() {
        val rig = Rig(config)
        rig.state.tainted["e4"] = TAINT_EXPIRY
        rig.state.lastMotionTs = TAINT_EXPIRY
        rig.detect(now = TAINT_EXPIRY - 0.2)
        assertTrue("e4" in rig.state.tainted)
    }

    @Test
    fun `latched squares count toward maxChanged as blocked`() {
        val rig = Rig(config)
        val far = 1_000.0
        for (sq in listOf("a8", "b8", "c8", "d8")) rig.state.tainted[sq] = far
        rig.state.lastMotionTs = 0.0
        // 3 clean changed + 4 latched = 7 > maxChanged 6 -> no candidate, stuck.
        rig.detect(now = 10.0, hotSquares = listOf("e4", "d5", "h3"))
        assertTrue(rig.events.filterIsInstance<TrackerEvent.MoveCommitted>().isEmpty())
        assertEquals("too_many_changed", rig.state.stuckReason)
        assertEquals(4, rig.state.tainted.size, "latch untouched while hold is active")
    }

    private companion object {
        const val BOARD_V = 120
        const val HOT_V = 220
        const val TAINT_EXPIRY = 50.0
    }
}
