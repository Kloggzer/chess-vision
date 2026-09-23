package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

private const val BOARD = 400

private const val Z_HOT = 9.0

/** The taint's start was reconstructed as `expiry - occluderHoldS`, a LIVE knob: raising it widened the window
 *  backwards over earlier motion. */
class TaintHoldKnobTest {
    @Test
    fun raisingTheHoldMustNotReleaseALatchOverOlderMotion() {
        val state = EngineState(testConfig(boardSize = BOARD).copy(occluderHoldS = 0.2), STARTPOS, whitePov = true)
        state.nowS = 100.0
        state.lastMotionTs = 99.0
        state.motionOccluded = ofSquares("e3", "e4", "e5")
        hot(state)
        state.applyTaints()
        assertEquals(ofSquares("e3", "e4", "e5"), state.tainted, "the hand latches")

        state.nowS = 100.5
        hot(state)
        state.applyTaints()
        assertEquals(ofSquares("e3", "e4", "e5"), state.tainted, "no motion since the taint, so it holds")

        state.config = state.config.copy(occluderHoldS = 5.0)
        hot(state)
        state.applyTaints()

        assertEquals(ofSquares("e3", "e4", "e5"), state.tainted, "a longer hold must not release the latch")
    }

    private fun hot(state: EngineState) {
        state.lastZ.fill(0.0)
        for (square in listOf("e3", "e4", "e5")) state.lastZ[Squares.index(square)] = Z_HOT
    }
}
