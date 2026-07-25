package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.AppSettings
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * The settings as a bug report.
 *
 * `nonDefault` is the section that matters: forty-odd thresholds all reading their Python default
 * say nothing, and the three that do not are the whole message. `config` is kept beside it so the
 * report is self-contained and a reader never has to guess which build's defaults applied.
 */
object SettingsExport {
    private val json = Json { prettyPrint = true }

    fun toJson(
        config: TrackerConfig,
        app: AppSettings,
        appVersion: String,
        deviceModel: String,
    ): String =
        json.encodeToString(
            JsonObject.serializer(),
            buildJsonObject {
                put("app", appSection(app, appVersion, deviceModel))
                put("nonDefault", values(KNOB_CATALOG.filterNot { it.isDefault(config) }, config))
                put("config", values(KNOB_CATALOG, config))
            },
        )

    private fun values(
        knobs: List<KnobUi>,
        config: TrackerConfig,
    ): JsonObject = buildJsonObject { knobs.forEach { put(it.key, it.format(it.valueOf(config))) } }

    private fun appSection(
        app: AppSettings,
        appVersion: String,
        deviceModel: String,
    ): JsonObject =
        buildJsonObject {
            put("version", appVersion)
            put("device", deviceModel)
            put("resolutionMode", app.resolutionMode.name)
            put("orientation", app.orientation.name)
            put("modelAsset", app.modelAsset)
            put("epRequest", app.epRequest.name)
            put("debugEnabled", app.debugEnabled)
        }
}
