package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.ConfigCodec
import com.chesslab.tracker.settings.KNOBS
import com.chesslab.tracker.settings.Knob
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
 *
 * Both sections read the PERSISTENCE table, not the settings screen's catalog. The screen shows
 * only the knobs a person decides; a bug report needs the rest too, and `boardSize` — which the
 * screen deliberately does not offer because the calibration profile owns it — is one of the first
 * things anyone diagnosing a tracker that sees nothing would want to read.
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
                put("nonDefault", values(KNOBS.filterNot { same(it.get(config), it.get(ConfigCodec.defaults)) }, config))
                put("config", values(KNOBS, config))
            },
        )

    private fun values(
        knobs: List<Knob>,
        config: TrackerConfig,
    ): JsonObject = buildJsonObject { knobs.forEach { put(it.key, format(it, it.get(config))) } }

    /** The screen's formatting where there is a row, the raw value where there is none. */
    private fun format(
        knob: Knob,
        value: Double,
    ): String = KNOB_CATALOG.firstOrNull { it.key == knob.key }?.format(value) ?: value.toString()

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
            put("modelDir", app.modelDir)
            put("modelAsset", app.modelAsset)
            put("epRequest", app.epRequest.name)
            put("debugEnabled", app.debugEnabled)
        }
}
