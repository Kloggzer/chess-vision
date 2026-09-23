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

/** `nonDefault` is the message; `config` beside it keeps the report self-contained. Both read the
 *  PERSISTENCE table: a bug report needs `boardSize` too, which the screen deliberately does not offer. */
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
            put("frameRate", app.frameRate.name)
            put("orientation", app.orientation.name)
            put("modelDir", app.modelDir)
            put("modelAsset", app.modelAsset)
            put("epRequest", app.epRequest.name)
            put("debugEnabled", app.debugEnabled)
        }
}
