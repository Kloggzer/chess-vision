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

/** The provenance file beside `session.yaml` — see [SessionSettingsWriter]. */
const val SETTINGS_FILE = "settings.json"

// NaN carries "no override" for the three Int? knobs (ConfigCodec's convention), and it can
// appear both inside the embedded envelope and in a history row's old/new.
private val JSON = Json { allowSpecialFloatingPointValues = true }

/** The build identifiers only the Android host knows; the writer itself stays platform-free. */
data class BuildStamp(
    val versionName: String,
    val versionCode: Long,
)

/**
 * Writes `settings.json` into the session directory: the full [TrackerConfig] in the ConfigCodec
 * envelope (the SAME wire form as the phone's `tracker_config_json` slot — never a second
 * serialization), the [AppSettings] that decide what the tracker sees (model, execution provider,
 * resolution, orientation, camera look, lens mode), the build, and a change history.
 *
 * It exists because on 2026-08-14 the question "was `handTolerantCells` on during
 * `2026-08-13-19-34-23`?" had NO answer: the phone recorded neither its config nor its model
 * choice anywhere, and the replay's config dump was hand-maintained and missing exactly that key.
 * A recording whose settings cannot be recovered is a measurement of an unknown instrument.
 *
 * The file is rewritten on every mid-session knob change, and the change is appended to
 * `history` — a session whose config moved under the game must say so, or a replay under the
 * final state silently answers a different question than the recording asked.
 */
class SessionSettingsWriter(
    private val dir: File,
    app: AppSettings,
    private val build: BuildStamp,
    initial: TrackerConfig,
    private val now: () -> String = { Instant.now().toString() },
) {
    private var config = initial
    private val history = mutableListOf<JsonObject>()

    /** Session-open time, kept stable across rewrites — the history rows carry their own clock. */
    private val openedAt = now()

    // Snapshotted at open: AppSettings are restart-required (D07a-3), so they cannot change
    // under a running session — a change means a new tracker and with it a new session.
    private val appJson: JsonElement = JSON.parseToJsonElement(encodeAppSettings(app))

    init {
        write()
    }

    /** A live-tuned (or engine-resubmitted) config. No change, no write — the flow re-emits. */
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
                // The envelope verbatim — `:desktop replay ... config=settings.json` reads this
                // block, and ConfigCodec is the one codec both ends already share.
                put("config", JSON.parseToJsonElement(ConfigCodec.encode(config)))
                put("app", appJson)
                put("history", JsonArray(history))
            }
        writeAtomic(File(dir, SETTINGS_FILE), JSON.encodeToString(JsonObject.serializer(), root))
    }
}

/**
 * Routes the live config flow into whichever session is open. The host wires three suppliers and
 * two hooks; everything the file says is decided here, on the JVM, testably.
 */
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
