package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

private const val BOARD = 400

private const val Z_HOT = 9.0

/**
 * `releaseLatches` reconstructs the taint's start as `taintExpiry - config.occluderHoldS`, but the
 * hold is a LIVE knob (`ConfigKnobs`): raising it widens the window backwards over motion that
 * happened before the taint, and the "an occluder cannot vanish without motion" rule falls away.
 */
class TaintHoldKnobTest {
    @Test
    fun raisingTheHoldMustNotReleaseALatchOverOlderMotion() {
        val state = EngineState(testConfig(boardSize = BOARD).copy(occluderHoldS = 0.2), STARTPOS, whitePov = true)
        state.nowS = 100.0
        // Motion BEFORE the taint — a hand arriving is exactly this.
        state.lastMotionTs = 99.0
        state.motionOccluded = ofSquares("e3", "e4", "e5")
        hot(state)
        state.applyTaints()
        assertEquals(ofSquares("e3", "e4", "e5"), state.tainted, "the hand latches")

        // The hold runs out, nothing moved since, the evidence is still hot: the latch must hold.
        state.nowS = 100.5
        hot(state)
        state.applyTaints()
        assertEquals(ofSquares("e3", "e4", "e5"), state.tainted, "no motion since the taint, so it holds")

        // The user raises the hold in Settings. Nothing about the board changed.
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
