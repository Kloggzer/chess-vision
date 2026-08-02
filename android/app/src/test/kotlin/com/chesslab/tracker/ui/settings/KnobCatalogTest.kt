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
    /**
     * Every field is classified — shown to a person, or named in [NOT_A_SETTING] with the reason.
     *
     * The old rule was "every field must have a row", which is how the screen came to offer 46
     * sliders: it made adding a knob to the seam the same act as offering it to a user, and nobody
     * ever had to argue that a human should see it. The partition forces that argument, in the
     * direction that matters — a new knob is invisible until someone writes down why it is a
     * decision, or why it is not.
     */
    @Test
    fun everyTrackerConfigFieldIsEitherShownOrExplained() {
        val fields = trackerConfigFields()
        val catalog = KNOB_CATALOG.map { it.key }.toSet()
        assertEquals(emptySet<String>(), fields - catalog - NOT_A_SETTING.keys, "TrackerConfig fields nobody classified")
        assertEquals(emptySet<String>(), catalog - fields, "catalog rows with no TrackerConfig field")
        assertEquals(emptySet<String>(), NOT_A_SETTING.keys - fields, "NOT_A_SETTING entries with no TrackerConfig field")
        assertEquals(emptySet<String>(), catalog intersect NOT_A_SETTING.keys, "a knob is shown or explained, never both")
        assertEquals(fields.size, KNOB_CATALOG.size + NOT_A_SETTING.size, "one entry per field, no duplicates")
    }

    /** A reason that says nothing is the same as no reason — this is the whole value of the table. */
    @Test
    fun everyWithheldKnobSaysWhy() {
        NOT_A_SETTING.forEach { (key, why) ->
            assertTrue(why.trim().endsWith(".") && why.length > MIN_REASON, "$key has no usable reason")
        }
    }

    @Test
    fun catalogAndPersistenceTableAgree() {
        assertEquals(KNOBS.map { it.key }.toSet(), KNOB_CATALOG.map { it.key }.toSet() + NOT_A_SETTING.keys)
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
    fun aFlagKnobIsRenderedAsOnOff() {
        val prior = KNOB_CATALOG.first { it.key == "usePrior" }
        assertTrue(prior.isFlag)
        assertEquals("on", prior.format(1.0))
        assertEquals("off", prior.format(0.0))
        assertFalse(prior.applyTo(TrackerConfig(), 0.0).usePrior)
    }
}

private const val TWELVE = 12

/** Long enough to be a sentence rather than a shrug. */
private const val MIN_REASON = 40
