package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The search and the "what did I change" view — the two things that make 46 documented knobs
 * usable rather than merely present.
 */
class SettingsNavTest {
    @Test
    fun everyKnobIsReachableFromExactlyOneGroup() {
        val viaGroups = KnobGroup.entries.flatMap { knobsIn(it) }
        assertEquals(KNOB_CATALOG.size, viaGroups.size, "a knob is in two groups or in none")
        assertEquals(KNOB_CATALOG.map { it.key }.toSet(), viaGroups.map { it.key }.toSet())
    }

    @Test
    fun anEmptyQueryFindsNothingRatherThanEverything() {
        // A blank box means "show me the groups", never "show me all 46 rows again".
        assertTrue(searchKnobs("").isEmpty())
        assertTrue(searchKnobs("   ").isEmpty())
    }

    /**
     * Substring, not equality: "censusThr" is meant to surface `occlCensusThr` alongside it. Both
     * are census thresholds and someone hunting one usually wants to see the other.
     */
    @Test
    fun searchFindsAKnobByItsKeyAndItsRelatives() {
        assertEquals(listOf("censusThr", "occlCensusThr"), searchKnobs("censusThr").map { it.key }.sorted())
        assertEquals(listOf("darkLumaThr"), searchKnobs("darkLuma").map { it.key })
    }

    /**
     * The reason the help text is in the haystack: nobody remembers that the shadow veto is called
     * `censusThr`, and the word "shadow" appears only in its explanation.
     */
    @Test
    fun searchFindsAKnobByAWordFromItsExplanation() {
        val hits = searchKnobs("shadow").map { it.key }
        assertTrue("censusThr" in hits, "the shadow threshold must be findable by the word shadow: $hits")
        assertFalse(hits.isEmpty())
    }

    @Test
    fun searchIsCaseInsensitiveAndAllTermsMustMatch() {
        assertTrue(searchKnobs("CNN").isNotEmpty())
        val both = searchKnobs("cnn timeout").map { it.key }
        assertEquals(listOf("verifyTimeoutS"), both, "every term has to match, not just one")
    }

    @Test
    fun searchByGroupNameReturnsThatWholeGroup() {
        assertEquals(knobsIn(KnobGroup.MOTION).map { it.key }.toSet(), searchKnobs("motion").map { it.key }.toSet())
    }

    @Test
    fun aFreshConfigHasNothingModified() {
        assertTrue(modifiedKnobs(TrackerConfig()).isEmpty())
        KnobGroup.entries.forEach { assertEquals(0, modifiedCount(it, TrackerConfig())) }
    }

    @Test
    fun aTunedKnobShowsUpInModifiedAndInItsGroupsBadge() {
        val knob = KNOB_CATALOG.first { it.key == "zThr" }
        val tuned = knob.applyTo(TrackerConfig(), knob.pythonDefault + 1.0)
        assertEquals(listOf("zThr"), modifiedKnobs(tuned).map { it.key })
        assertEquals(1, modifiedCount(knob.group, tuned))
        assertEquals(0, modifiedCount(KnobGroup.CAMERA, tuned))
    }
}
