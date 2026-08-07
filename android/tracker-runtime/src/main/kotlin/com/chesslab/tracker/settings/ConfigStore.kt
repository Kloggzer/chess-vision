package com.chesslab.tracker.settings

/** The `TrackerConfig` slot — the parity seam's knobs. */
const val SLOT_CONFIG = "tracker_config_json"

/** The app-level slot: resolution, orientation, model, EP, debug. Never mixed into the config. */
const val SLOT_APP = "app_settings_json"

/**
 * Where the settings live. Behind an interface so [SettingsRepository]'s decisions are testable
 * on the desktop JVM — DataStore needs a `Context` and a real file, and neither exists there.
 *
 * The slot NAMES are part of the contract and live here, with the interface: they key what is
 * already on every installed device, and a host that renamed one would silently read defaults.
 */
interface ConfigStore {
    suspend fun read(slot: String): String?

    suspend fun write(
        slot: String,
        text: String,
    )
}
