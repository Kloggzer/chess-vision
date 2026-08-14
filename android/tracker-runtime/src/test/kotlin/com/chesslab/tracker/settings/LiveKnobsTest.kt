package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * [withLiveKnobsOf]: the run's config wins, except for the twelve knobs that may change under it.
 *
 * The rule `TrackerStack` obeys, and a rule because the repository is not every host's run config:
 * a replay leaves it at [ConfigCodec.defaults], so a restart-only knob read off it is a default
 * served over the run's own — a recorded `alignEvery`, a `set:cnnVerify=false`.
 */
class LiveKnobsTest {
    private val base =
        TrackerConfig().copy(
            // restart-only, and each one a knob a replay actually sets
            alignEvery = 2,
            alignScale = 0.25,
            liveAlign = false,
            cnnVerify = false,
            observerIntervalS = 0.15,
            // live-tunable
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
        // `changedKeys` is the codec's own diff, NaN-aware — the three optional ints carry NaN as
        // "no override", and a raw `!=` would report all three as changed on every comparison.
        val through = ConfigCodec.changedKeys(base, base.withLiveKnobsOf(ConfigCodec.defaults))
        assertTrue(through.all { it.live }, "a restart-only knob was taken from the repository: ${through.map { it.key }}")
        assertEquals(LIVE_TUNABLE_KEYS, KNOBS.filter { it.live }.map { it.key }.toSet())
    }
}
