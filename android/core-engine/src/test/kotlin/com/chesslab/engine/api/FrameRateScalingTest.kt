package com.chesslab.engine.api

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Test

/** Die Kopplung ist am Regressionssatz gemessen; sie stand zweimal im Baum, je mit eigener Referenzkonstante —
 *  driftet eine, misst das Replay einen Tracker, den das Handy nicht faehrt. */
class FrameRateScalingTest {
    private val base = TrackerConfig(motionThr = 0.25)

    @Test
    fun `the reference rate leaves the config untouched`() {
        assertSame(base, base.atFrameRate(MOTION_THR_REFERENCE_FPS))
    }

    @Test
    fun `half the rate doubles the per-frame motion`() {
        assertEquals(0.50, base.atFrameRate(15.0).motionThr, 1e-9)
    }

    @Test
    fun `twice the rate halves it`() {
        assertEquals(0.125, base.atFrameRate(60.0).motionThr, 1e-9)
    }

    @Test
    fun `nothing but motionThr moves`() {
        val scaled = base.atFrameRate(15.0)

        assertEquals(base.copy(motionThr = scaled.motionThr), scaled)
    }
}
