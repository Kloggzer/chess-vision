package com.chesslab.tracker.record

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.io.writeAtomic
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.ConfigCodec
import com.chesslab.tracker.settings.encodeAppSettings
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.io.File
import java.time.Instant

const val SETTINGS_FILE = "settings.json"

// NaN carries "no override" for the Int? knobs, inside the envelope and in history rows.
private val JSON = Json { allowSpecialFloatingPointValues = true }

data class BuildStamp(
    val versionName: String,
    val versionCode: Long,
)

/** The full config in the ConfigCodec envelope (never a second serialization), the [AppSettings], the build and a
 *  history. Without it no one could say whether `handTolerantCells` was on. A mid-session change is appended:
 *  a replay under the final state answers a different question. */
class SessionSettingsWriter(
    private val dir: File,
    app: AppSettings,
    private val build: BuildStamp,
    initial: TrackerConfig,
    private val now: () -> String = { Instant.now().toString() },
) {
    private var config = initial
    private val history = mutableListOf<JsonObject>()

    /** Stable across rewrites. */
    private val openedAt = now()

    // AppSettings are restart-required, so they cannot change under a running session.
    private val appJson: JsonElement = JSON.parseToJsonElement(encodeAppSettings(app))

    init {
        write()
    }

    /** No change, no write — the flow re-emits. */
    fun configChanged(new: TrackerConfig) {
        val changed = ConfigCodec.changedKeys(config, new)
        if (changed.isEmpty()) return
        val at = now()
        changed.forEach { knob ->
            history +=
                buildJsonObject {
                    put("key", knob.key)
                    put("old", knob.get(config))
                    put("new", knob.get(new))
                    put("at", at)
                }
        }
        config = new
        write()
    }

    private fun write() {
        val root =
            buildJsonObject {
                put("recorded_at", openedAt)
                put("app_version_name", build.versionName)
                put("app_version_code", build.versionCode)
                // `:desktop replay ... config=settings.json` reads this block verbatim.
                put("config", JSON.parseToJsonElement(ConfigCodec.encode(config)))
                put("app", appJson)
                put("history", JsonArray(history))
            }
        writeAtomic(File(dir, SETTINGS_FILE), JSON.encodeToString(JsonObject.serializer(), root))
    }
}

/** Everything the file says is decided here, on the JVM, testably. */
class SessionSettingsHost(
    private val build: BuildStamp,
    private val app: () -> AppSettings,
    private val config: () -> TrackerConfig,
    private val now: () -> String = { Instant.now().toString() },
) {
    @Volatile
    private var writer: SessionSettingsWriter? = null

    fun opened(dir: File) {
        writer = SessionSettingsWriter(dir, app(), build, config(), now)
    }

    fun finished() {
        writer = null
    }

    fun configChanged(new: TrackerConfig) {
        writer?.configChanged(new)
    }
}
