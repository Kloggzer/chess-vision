package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.analysis.AnalysisSettings
import com.chesslab.tracker.record.RecordingPrefs
import com.chesslab.tracker.settings.AppSettings
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The search, the "what did I change" view, and the two-level shape specs/51 gave this screen —
 * the things that make ~37 documented knobs usable rather than merely present, without putting
 * them in front of somebody who came here to turn spoken moves on.
 */
class SettingsNavTest {
    @Test
    fun developerKeysGetReadablePrimaryLabels() {
        assertEquals("Motion threshold", knobTitle("motionThr"))
        assertEquals("Motion pixel threshold", knobTitle("motionPxThr"))
        assertEquals("CNN IoU threshold", knobTitle("cnnIouThr"))
    }

    @Test
    fun tuningValuesNameTheirHumanUnit() {
        // FESTE Eingaben: geprueft wird die Einheit, nicht die Vorgabe -- sonst bricht der Test
        // bei jeder Neujustierung, obwohl die Darstellung unveraendert stimmt.
        fun shown(
            key: String,
            value: Double,
        ): String = knobDisplayValue(KNOB_CATALOG.first { it.key == key }, value)

        assertEquals("0.25 %", shown("motionThr", 0.25))
        assertEquals("20 / 255", shown("motionPxThr", 20.0))
        assertEquals("10 %", shown("motionMargin", 0.10))
        assertEquals("0.2 s", shown("motionHoldS", 0.20))
    }

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

    /**
     * The whole point of the developer door: a tuning group's way out is Developer, never the
     * player's landing page. Getting this wrong drops the user two levels on one tap, which is the
     * exact bug specs/47 fixed for the system back button.
     */
    @Test
    fun aTuningGroupReturnsToDeveloperAndAPlayerPageToSettings() {
        assertEquals(SettingsPlace.Developer, parentOf(SettingsPlace.Group(KnobGroup.MOTION)))
        assertEquals(SettingsPlace.Developer, parentOf(SettingsPlace.Modified))
        assertEquals(SettingsPlace.Developer, parentOf(SettingsPlace.Device))
        assertEquals(SettingsPlace.Groups, parentOf(SettingsPlace.Developer))
        assertEquals(SettingsPlace.Groups, parentOf(SettingsPlace.Board))
        assertEquals(SettingsPlace.Groups, parentOf(SettingsPlace.Speech))
    }

    /** `null` is the one place that leaves Settings altogether, and only the landing page may. */
    @Test
    fun onlyTheLandingPageLeavesSettings() {
        assertNull(parentOf(SettingsPlace.Groups))
    }

    /**
     * Every summary states the CURRENT VALUE, and "off" has to read as off — a row that describes
     * the destination instead is the half of the Android pattern that does no work.
     */
    @Test
    fun aSummaryStatesTheValueAndNotTheDestination() {
        assertEquals("Off", speechSummary(AppSettings()))
        assertEquals("Deutsch · Words", speechSummary(AppSettings(speechEnabled = true, speechLanguage = "de-DE")))
        assertEquals("Off", analysisSummary(AnalysisSettings()))
        assertEquals("Stockfish · 400 ms a move", analysisSummary(AnalysisSettings(enabled = true)))
        assertEquals("Off", recordingSummary(RecordingPrefs()))
        assertEquals("On · no storage limit", recordingSummary(RecordingPrefs(enabled = true, capBytes = 0L)))
        assertEquals("On · up to 250 MB", recordingSummary(RecordingPrefs(enabled = true, capBytes = 250L * 1024 * 1024)))
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
