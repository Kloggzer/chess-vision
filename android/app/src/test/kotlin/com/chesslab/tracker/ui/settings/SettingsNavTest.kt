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

class SettingsNavTest {
    @Test
    fun developerKeysGetReadablePrimaryLabels() {
        assertEquals("Motion threshold", knobTitle("motionThr"))
        assertEquals("Motion pixel threshold", knobTitle("motionPxThr"))
        assertEquals("CNN IoU threshold", knobTitle("cnnIouThr"))
    }

    @Test
    fun tuningValuesNameTheirHumanUnit() {
        // FESTE Eingaben: geprueft wird die Einheit, nicht die Vorgabe.
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
        assertTrue(searchKnobs("").isEmpty())
        assertTrue(searchKnobs("   ").isEmpty())
    }

    /** Substring: "censusThr" surfaces `occlCensusThr` too — someone hunting one wants the other. */
    @Test
    fun searchFindsAKnobByItsKeyAndItsRelatives() {
        assertEquals(listOf("censusThr", "occlCensusThr"), searchKnobs("censusThr").map { it.key }.sorted())
        assertEquals(listOf("darkLumaThr"), searchKnobs("darkLuma").map { it.key })
    }

    /** Nobody remembers `censusThr`; "shadow" appears only in its help text. */
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

    /** A tuning group's way out is Developer, never the landing page: two levels on one tap. */
    @Test
    fun aTuningGroupReturnsToDeveloperAndAPlayerPageToSettings() {
        assertEquals(SettingsPlace.Developer, parentOf(SettingsPlace.Group(KnobGroup.MOTION)))
        assertEquals(SettingsPlace.Developer, parentOf(SettingsPlace.Modified))
        assertEquals(SettingsPlace.Developer, parentOf(SettingsPlace.Device))
        assertEquals(SettingsPlace.Groups, parentOf(SettingsPlace.Developer))
        assertEquals(SettingsPlace.Groups, parentOf(SettingsPlace.Board))
        assertEquals(SettingsPlace.Groups, parentOf(SettingsPlace.Speech))
    }

    @Test
    fun onlyTheLandingPageLeavesSettings() {
        assertNull(parentOf(SettingsPlace.Groups))
    }

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
