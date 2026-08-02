package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.KNOBS
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SettingsExportTest {
    private fun sections(
        config: TrackerConfig,
        app: AppSettings = AppSettings(),
    ) = Json.parseToJsonElement(SettingsExport.toJson(config, app, "0.1.0", "Pixel")).jsonObject

    @Test
    fun aPristineConfigReportsNoDeviations() {
        val json = sections(TrackerConfig())
        assertTrue(json.getValue("nonDefault").jsonObject.isEmpty())
        // KNOBS, not KNOB_CATALOG: a bug report carries the whole config, including the knobs the
        // screen withholds because they are not decisions.
        assertEquals(KNOBS.size, json.getValue("config").jsonObject.size)
    }

    @Test
    fun oneEditIsExactlyOneDeviation() {
        val json = sections(TrackerConfig(censusThr = 55.0))
        val deviations = json.getValue("nonDefault").jsonObject
        assertEquals(setOf("censusThr"), deviations.keys)
        assertEquals("55", deviations.getValue("censusThr").toString().trim('"'))
    }

    @Test
    fun theAppSectionCarriesWhatABugReportNeeds() {
        val app = json(AppSettings(debugEnabled = true))
        assertEquals(
            // `modelDir` before `modelAsset`: with three bundled models a report that names only the
            // graph FILE cannot say which model produced the reads it is reporting.
            setOf("version", "device", "resolutionMode", "orientation", "modelDir", "modelAsset", "epRequest", "debugEnabled"),
            app.keys,
        )
    }

    private fun json(app: AppSettings) = sections(TrackerConfig(), app).getValue("app").jsonObject
}
