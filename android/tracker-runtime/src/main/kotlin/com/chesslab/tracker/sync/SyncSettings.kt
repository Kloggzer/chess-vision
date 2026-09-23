package com.chesslab.tracker.sync

import com.chesslab.tracker.settings.ConfigStore
import com.chesslab.tracker.settings.JsonPrefs
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** Its own slot, like recording's: a transfer is not a tracker knob and never reaches the engine. */
const val SLOT_SYNC = "sync_prefs_json"

/** What the platform app answers on by default (`next dev`). */
const val DEFAULT_INGEST_PORT = 3000

private val JSON =
    Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

/**
 * Off until paired, and it cannot be otherwise: without the server's token every upload is refused,
 * so an enabled-by-default switch would only produce failed transfers on somebody else's Wi-Fi.
 *
 * [host] is the manual override and always wins over discovery — a router with client isolation or
 * a guest VLAN kills a scan, and then the address the user reads off the transfers page is the only
 * thing that works. [lastHost] is what discovery found last time; trying it first turns the usual
 * case into one request instead of a subnet sweep.
 */
@Serializable
data class SyncPrefs(
    val enabled: Boolean = false,
    val token: String = "",
    val host: String = "",
    val port: Int = DEFAULT_INGEST_PORT,
    val lastHost: String = "",
    /** Days a `landed` recording stays on the phone after the server sealed it; 0 keeps it. */
    val retentionDays: Int = 7,
) {
    val paired: Boolean get() = token.isNotBlank()
}

class SyncSettings(
    store: ConfigStore,
) : JsonPrefs<SyncPrefs>(store, SLOT_SYNC, SyncPrefs.serializer(), SyncPrefs(), JSON) {
    /**
     * Remember the address that answered. Written by the worker after a successful transfer, so the
     * next run skips the scan — a DHCP lease that moved simply costs one scan again.
     */
    suspend fun rememberHost(base: String) {
        val current = prefs.value
        if (current.lastHost != base) save(current.copy(lastHost = base))
    }
}
