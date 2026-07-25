package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.KNOBS
import com.chesslab.tracker.settings.LIVE_TUNABLE_KEYS
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.lang.reflect.Modifier

/**
 * `TrackerConfig`'s constructor properties, by reflection.
 *
 * Java fields and not `memberProperties`: kotlin-reflect is not on this module's classpath, and a
 * backing field is exactly what a settable knob has — the derived `detSize` has none, and
 * `settleFrames(cnnOn)` is a function, so both drop out without a filter that could hide a real one.
 */
private fun trackerConfigFields(): Set<String> =
    TrackerConfig::class.java.declaredFields
        .filterNot { it.isSynthetic || Modifier.isStatic(it.modifiers) }
        .map { it.name }
        .toSet()

class KnobCatalogTest {
    @Test
    fun catalogCoversEveryTrackerConfigProperty() {
        val fields = trackerConfigFields()
        val catalog = KNOB_CATALOG.map { it.key }.toSet()
        // Both directions: a knob added to the seam must appear on the screen, and a row for a
        // field that no longer exists would tune nothing.
        assertEquals(emptySet<String>(), fields - catalog, "TrackerConfig fields missing from the settings catalog")
        assertEquals(emptySet<String>(), catalog - fields, "catalog rows with no TrackerConfig field")
        assertEquals(fields.size, KNOB_CATALOG.size, "one row per field, no duplicates")
    }

    @Test
    fun catalogAndPersistenceTableAgree() {
        assertEquals(KNOBS.map { it.key }.toSet(), KNOB_CATALOG.map { it.key }.toSet())
    }

    @Test
    fun everyKnobBelongsToExactlyOneGroup() {
        val grouped = KnobGroup.entries.flatMap { knobsIn(it) }
        assertEquals(KNOB_CATALOG.size, grouped.size)
        assertEquals(KNOB_CATALOG.map { it.key }.toSet(), grouped.map { it.key }.toSet())
    }

    @Test
    fun liveKnobsAreExactlyThePythonTwelve() {
        val live = KNOB_CATALOG.filter { it.live }.map { it.key }.toSet()
        assertEquals(LIVE_TUNABLE_KEYS, live)
        assertEquals(TWELVE, live.size)
    }

    @Test
    fun defaultsAreTheTrackerConfigDefaults() {
        val defaults = TrackerConfig()
        KNOB_CATALOG.forEach {
            assertTrue(same(it.pythonDefault, it.valueOf(defaults)), "${it.key} default drifted")
            assertTrue(it.isDefault(defaults), "${it.key} does not read as default on a pristine config")
        }
    }

    @Test
    fun everyDefaultLiesInsideItsOwnRange() {
        KNOB_CATALOG.filterNot { it.isFlag }.forEach {
            val value = it.pythonDefault
            // `NaN` is the optional knobs' "auto", which is deliberately outside the range.
            if (!value.isNaN()) {
                assertTrue(value in it.min..it.max, "${it.key} default $value is outside ${it.min}..${it.max}")
            }
            assertTrue(it.step > 0.0, "${it.key} has no step")
        }
    }

    @Test
    fun everyKnobCarriesHelpTakenFromConfigPy() {
        KNOB_CATALOG.forEach {
            assertTrue(it.help.isNotBlank() && it.help.trim().endsWith("."), "${it.key} has no usable help text")
        }
    }

    @Test
    fun valuesAreClampedToTheirRange() {
        val censusThr = KNOB_CATALOG.first { it.key == "censusThr" }
        assertEquals(255.0, censusThr.clamp(9000.0))
        assertEquals(0.0, censusThr.clamp(-9000.0))
        val zThr = KNOB_CATALOG.first { it.key == "zThr" }
        assertEquals(3.0, zThr.applyTo(TrackerConfig(), 3.0001).zThr, "a slider's epsilon must not hide the default")
        assertEquals(10.0, zThr.applyTo(TrackerConfig(), 99.0).zThr)
    }

    @Test
    fun anIntKnobNeverStoresAFraction() {
        val verifyWindow = KNOB_CATALOG.first { it.key == "verifyWindow" }
        assertEquals(9, verifyWindow.applyTo(TrackerConfig(), 8.7).verifyWindow)
    }

    @Test
    fun anOptionalKnobFallsToAutoBelowItsRange() {
        val settle = KNOB_CATALOG.first { it.key == "settleFramesOverride" }
        assertTrue(settle.isOptional)
        assertEquals(null, settle.applyTo(TrackerConfig(settleFramesOverride = 3), 0.0).settleFramesOverride)
        assertEquals(4, settle.applyTo(TrackerConfig(), 4.0).settleFramesOverride)
        assertEquals("auto", settle.format(Double.NaN))
    }

    @Test
    fun aFlagKnobIsRenderedAsOnOff() {
        val prior = KNOB_CATALOG.first { it.key == "usePrior" }
        assertTrue(prior.isFlag)
        assertEquals("on", prior.format(1.0))
        assertEquals("off", prior.format(0.0))
        assertFalse(prior.applyTo(TrackerConfig(), 0.0).usePrior)
    }
}

private const val TWELVE = 12
