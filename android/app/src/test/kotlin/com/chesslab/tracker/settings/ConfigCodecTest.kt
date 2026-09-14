package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ConfigCodecTest {
    @Test
    fun roundTripsEveryTrackerConfigField() {
        // Every knob moved off its default, so a forgotten row in the table cannot pass.
        val tuned = KNOBS.fold(TrackerConfig()) { config, knob -> knob.set(config, mutate(knob, config)) }
        val decoded = ConfigCodec.decode(ConfigCodec.encode(tuned))
        assertNull(decoded.note)
        assertEquals(tuned, decoded.config)
        assertTrue(KNOBS.none { it.get(tuned) == it.get(ConfigCodec.defaults) }, "a knob was not mutated")
    }

    @Test
    fun defaultsMatchTrackerConfigDefaults() {
        // entry.md invariant 12: config.py TRACK_DEFAULTS wins over the tracker.py constructor
        // signature, which disagrees on occlusionColorThr (1.5 there, 3.0 in TRACK_DEFAULTS).
        val defaults = ConfigCodec.decode(null).config
        assertEquals(40.0, defaults.censusThr)
        assertEquals(3.0, defaults.occlusionColorThr)
        assertEquals(18.0, defaults.darkLumaThr)
        assertEquals(TrackerConfig(), defaults)
    }

    @Test
    fun unknownSchemaVersionFallsBackToDefaultsWithANote() {
        val fromTheFuture = """{"version":99,"values":{"censusThr":11.0}}"""
        val decoded = ConfigCodec.decode(fromTheFuture)
        assertEquals(TrackerConfig(), decoded.config)
        assertNotNull(decoded.note)
        assertEquals(TrackerConfig(), ConfigCodec.decode("not json at all").config)
        assertNotNull(ConfigCodec.decode("not json at all").note)
    }

    /**
     * Version 4 stored `reanchorLlFloor` and `handTolerantCells`; both are gone from the seam, so an
     * envelope from 4 is not the config this build runs. `ignoreUnknownKeys` would take it silently.
     */
    @Test
    fun theEnvelopeOfTheTwoRemovedKnobsIsRejected() {
        val stored = """{"version":4,"values":{"censusThr":11.0,"reanchorLlFloor":2.0,"handTolerantCells":1.0}}"""
        val decoded = ConfigCodec.decode(stored)
        assertEquals(TrackerConfig(), decoded.config)
        assertEquals("settings schema 4 is unknown — reset to defaults", decoded.note)
        assertEquals(6, CONFIG_SCHEMA_VERSION)
    }

    @Test
    fun theCurrentSchemaRoundTripsLossless() {
        val tuned = TrackerConfig(censusThr = 41.0, verifyWindow = 9)
        val encoded = ConfigCodec.encode(tuned)
        assertTrue(encoded.startsWith("""{"version":6,"""), "the envelope must name the schema it was written under: $encoded")
        assertEquals(tuned, ConfigCodec.decode(encoded).config)
        assertNull(ConfigCodec.decode(encoded).note)
    }

    @Test
    fun liveTunableTableContainsExactlyTheTwelveAppPyKnobs() {
        val expected =
            listOf(
                "motionThr",
                "zThr",
                "censusThr",
                "censusZWeight",
                "occlCensusThr",
                "occlusionColorThr",
                "minGridLineCoverage",
                "motionMargin",
                "overhang",
                "motionHoldS",
                "diffClaheClip",
                "commitLlFloor",
            )
        // The set is app.py's twelve; the declaration keeps app.py's ORDER, while the knob table
        // keeps TrackerConfig's field order, so only one of the two can be compared as a list.
        assertEquals(expected, LIVE_TUNABLE_KEYS.toList())
        assertEquals(expected.toSet(), KNOBS.filter { it.live }.map { it.key }.toSet())
        // Every live key must exist as a knob — a typo would silently make a knob non-live.
        assertTrue(LIVE_TUNABLE_KEYS.all { key -> KNOBS.any { it.key == key } })
    }

    @Test
    fun anUnknownKeyIsIgnoredRatherThanFatal() {
        val decoded = ConfigCodec.decode("""{"version":$CONFIG_SCHEMA_VERSION,"values":{"censusThr":41.0,"knobFromTheFuture":1.0}}""")
        assertNull(decoded.note)
        assertEquals(41.0, decoded.config.censusThr)
    }

    @Test
    fun changedKeysSplitsLiveFromRestartRequired() {
        val live = ConfigCodec.changedKeys(TrackerConfig(), TrackerConfig(censusThr = 41.0))
        assertEquals(listOf("censusThr"), live.map { it.key })
        assertTrue(live.single().live)
        val restart = ConfigCodec.changedKeys(TrackerConfig(), TrackerConfig(verifyWindow = 9))
        assertEquals(listOf("verifyWindow"), restart.map { it.key })
        assertTrue(!restart.single().live)
    }
}

/** A value that differs from the current one for every knob kind, including `null` overrides. */
private fun mutate(
    knob: Knob,
    config: TrackerConfig,
): Double =
    when (knob.kind) {
        KnobKind.BOOL -> if (knob.get(config) == 0.0) 1.0 else 0.0
        KnobKind.OPTIONAL_INT -> 3.0
        KnobKind.INT -> knob.get(config) + 1.0
        KnobKind.DOUBLE -> knob.get(config) + 0.5
    }
