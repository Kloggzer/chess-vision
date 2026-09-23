package com.chesslab.tracker.sync

import com.chesslab.tracker.settings.ConfigStore
import com.chesslab.tracker.settings.JsonPrefs
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** A transfer is not a tracker knob and never reaches the engine. */
const val SLOT_SYNC = "sync_prefs_json"

/** `next dev`. */
const val DEFAULT_INGEST_PORT = 3000

private val JSON =
    Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

/** Off until paired: without the token every upload is refused. [host] always wins over discovery — client
 *  isolation kills a scan. [lastHost] first turns the usual case into one request instead of a sweep. */
@Serializable
data class SyncPrefs(
    val enabled: Boolean = false,
    val token: String = "",
    val host: String = "",
    val port: Int = DEFAULT_INGEST_PORT,
    val lastHost: String = "",
    /** After the server sealed it (`landed`); 0 keeps it. */
    val retentionDays: Int = 7,
) {
    val paired: Boolean get() = token.isNotBlank()
}

class SyncSettings(
    store: ConfigStore,
) : JsonPrefs<SyncPrefs>(store, SLOT_SYNC, SyncPrefs.serializer(), SyncPrefs(), JSON) {
    /** A DHCP lease that moved simply costs one scan again. */
    suspend fun rememberHost(base: String) {
        val current = prefs.value
        if (current.lastHost != base) save(current.copy(lastHost = base))
    }
}
