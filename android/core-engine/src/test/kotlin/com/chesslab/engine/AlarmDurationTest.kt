package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The latch measures a DURATION, and a burst of readings is not one.
 *
 * `desyncObsN` claimed "persistent over seconds" but only counted observations. Since the CNN
 * reads on settle they arrive every 0.07 s, so three of them are 0.21 s — measured on
 * `VID_20260824_154327`, where the latch then cost 107 of 117 plies (`docs/alarm-path.md`).
 */
class AlarmDurationTest {
    private val obsGapS = 0.07

    /** A move-shaped guess, so the bound under test is `desyncObsN` and not the standoff bound. */
    private fun heldFor(
        seconds: Double,
        minS: Double,
    ): EngineState {
        val state = EngineState(recoveryConfig().copy(alarmMinS = minS), NF3_NO_CASTLING, whitePov = true).armed().underWay()
        val cnn = RecoveryEvaluator(guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        // Elapsed, not absolute: `armed()` starts the deterministic clock at 1000 s.
        val start = state.nowS
        var seq = 0L
        while (state.nowS - start < seconds) {
            seq += 1
            state.nowS += obsGapS
            state.desyncEvidence(cnn, recoverySnap(state, obs, seq), listOf("e1", "g1"))
        }
        return state
    }

    @Test
    fun `a burst of readings does not latch`() {
        val state = heldFor(seconds = 3 * obsGapS, minS = BOUND_S)
        assertNull(state.alarm, "0.21 s of disagreement is a misread, not a lost board")
    }

    /** The same disagreement, held over seconds, is what the bound was always meant to mean. */
    @Test
    fun `a disagreement held for seconds does latch`() {
        val state = heldFor(seconds = BOUND_S + 1.0, minS = BOUND_S)
        assertTrue(state.alarm != null, "a disagreement that outlasts the bound must still be reported")
    }

    /** The knob at zero is the old behaviour, and it stays reachable. */
    @Test
    fun `zero turns the duration bound off`() {
        val state = heldFor(seconds = 3 * obsGapS, minS = 0.0)
        assertTrue(state.alarm != null, "0 means off, the way 0 means off for every knob")
    }

    private companion object {
        const val BOUND_S = 1.5
    }
}
