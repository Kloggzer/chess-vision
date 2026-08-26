package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The latch measures a DURATION, and a burst of readings is not one.
 *
 * `desyncObsN` always claimed to mean "persistent over seconds" — its own KDoc says so — but it
 * only ever counted observations. While the CNN read on a clock those were the same thing. Since
 * it reads when the board settles (`feat(engine): auf Stellungswechsel takten`, 2026-08-24) the
 * observations arrive in bursts: measured on `VID_20260824_154327`, one every **0.07 s**, so three
 * of them are 0.21 s and the phrase "over seconds" was gone without the number changing.
 *
 * What it cost, on the same recording: the latch fired at ply 10 on a board whose FEN matched the
 * label character for character, and the remaining **107 of 117 plies** never committed, because a
 * latched alarm has no way out that is not a human resync.
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
