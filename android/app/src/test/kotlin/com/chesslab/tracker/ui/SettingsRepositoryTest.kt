package com.chesslab.tracker.ui

import androidx.datastore.preferences.core.mutablePreferencesOf
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.camera.Resolution
import com.chesslab.tracker.service.FakeDataStore
import com.chesslab.tracker.service.OverlayView
import com.chesslab.tracker.service.SettingsRepository
import com.chesslab.tracker.service.TrackerSettings
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Pure mapping + live/constructor split of [TrackerSettings] and the
 * (de)serialization of [SettingsRepository] (no DataStore instance required —
 * encode/decode operate on a plain in-memory `Preferences`).
 */
class SettingsRepositoryTest {
    private fun repo() = SettingsRepository(FakeDataStore())

    @Test
    fun `defaults map to TrackerConfig defaults`() {
        assertEquals(TrackerConfig(), TrackerSettings().toTrackerConfig())
    }

    @Test
    fun `custom settings propagate into TrackerConfig`() {
        val s =
            TrackerSettings(
                pairLookAhead = false,
                usePrior = false,
                ambiguityMargin = 3.5,
                motionThr = 0.5,
                censusThr = 200.0,
                claheClip = 4.0,
            )
        val cfg = s.toTrackerConfig()
        assertFalse(cfg.pairLookAhead)
        assertFalse(cfg.usePrior)
        assertEquals(3.5, cfg.ambiguityMarginLl)
        assertEquals(0.5, cfg.motionThr)
        assertEquals(200.0, cfg.censusThr)
        assertEquals(4.0, cfg.diffClaheClip)
    }

    @Test
    fun `live tunable change does not require engine restart`() {
        val base = TrackerSettings()
        assertFalse(base.copy(motionThr = 0.9).requiresEngineRestart(base))
        assertFalse(base.copy(claheClip = 6.0).requiresEngineRestart(base))
        assertFalse(base.copy(censusThr = 100.0).requiresEngineRestart(base))
    }

    @Test
    fun `constructor param change requires engine restart`() {
        val base = TrackerSettings()
        assertTrue(base.copy(pairLookAhead = false).requiresEngineRestart(base))
        assertTrue(base.copy(usePrior = false).requiresEngineRestart(base))
        assertTrue(base.copy(resolution = Resolution.R4K).requiresEngineRestart(base))
        assertTrue(base.copy(dynamicResolution = false).requiresEngineRestart(base))
    }

    @Test
    fun `decode of empty preferences yields defaults`() {
        assertEquals(TrackerSettings(), repo().decode(mutablePreferencesOf()))
    }

    @Test
    fun `encode then decode round-trips every field`() {
        val s =
            TrackerSettings(
                pairLookAhead = false,
                ambiguityMargin = 1.5,
                usePrior = false,
                resolution = Resolution.R4K,
                dynamicResolution = false,
                motionThr = 0.4,
                zThr = 2.5,
                censusThr = 180.0,
                occlusionColorThr = 2.0,
                motionMargin = 0.2,
                overhang = 0.5,
                motionHoldS = 0.6,
                claheClip = 5.0,
                cnnConfThr = 0.7,
                analysisDepth = 18,
                experimentalDetection = true,
                debugCard = true,
                overlayView = OverlayView.OCCLUSION,
            )
        val prefs = mutablePreferencesOf()
        val repo = repo()
        repo.encode(prefs, s)
        assertEquals(s, repo.decode(prefs))
    }
}
