package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** A replay's repository holds the defaults, so a restart-only knob read off it overrides the run's own. */
class LiveKnobsTest {
    private val base =
        TrackerConfig().copy(
            alignEvery = 2,
            alignScale = 0.25,
            liveAlign = false,
            cnnVerify = false,
            observerIntervalS = 0.15,
            motionThr = 0.40,
        )

    @Test
    fun `a restart-only knob comes from the run, never from the repository`() {
        val tuned = base.withLiveKnobsOf(ConfigCodec.defaults)
        assertEquals(2, tuned.alignEvery)
        assertEquals(0.25, tuned.alignScale)
        assertEquals(false, tuned.liveAlign)
        assertEquals(false, tuned.cnnVerify)
        assertEquals(0.15, tuned.observerIntervalS)
    }

    @Test
    fun `a live knob comes from the repository`() {
        val tuned = base.withLiveKnobsOf(ConfigCodec.defaults.copy(motionThr = 0.10))
        assertEquals(0.10, tuned.motionThr)
    }

    @Test
    fun `equal sources are a no-op, whole-object`() {
        assertEquals(base, base.withLiveKnobsOf(base))
        assertEquals(ConfigCodec.defaults, ConfigCodec.defaults.withLiveKnobsOf(ConfigCodec.defaults))
    }

    @Test
    fun `the knobs it lets through are exactly the twelve the catalog calls live`() {
        // NaN-aware: a raw `!=` reports the three optional ints as changed on every comparison.
        val through = ConfigCodec.changedKeys(base, base.withLiveKnobsOf(ConfigCodec.defaults))
        assertTrue(through.all { it.live }, "a restart-only knob was taken from the repository: ${through.map { it.key }}")
        assertEquals(LIVE_TUNABLE_KEYS, KNOBS.filter { it.live }.map { it.key }.toSet())
    }
}
