package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Eine Hand ist keine Stellungsfrage: sonst exportiert `TrainingVideoPack` den Frame als sauber (E13). */
class FreshHandSquaresScopeBugTest {
    @Test
    fun aHandSeenJustBeforeTheCommitStillCounts() {
        val state = detectState().also { it.nowS = 100.0 }
        val hand = VerifyObs(occluded = setOf("e3", "e4"))
        state.cnnSnap = snapshotOf(state, hand).copy(fen = NF3_NO_CASTLING)
        state.lastMotionTs = state.nowS
        assertEquals(setOf("e3", "e4"), state.freshCnnOccludedSquares())
    }

    @Test
    fun aStaleHandNoLongerCounts() {
        val state = detectState().also { it.nowS = 100.0 }
        state.cnnSnap = snapshotOf(state, VerifyObs(occluded = setOf("e3", "e4")))
        state.nowS += OBS_MAX_AGE_S + 0.1
        state.lastMotionTs = state.nowS
        assertEquals(emptySet<String>(), state.freshCnnOccludedSquares())
    }
}
