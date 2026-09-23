package com.chesslab.tracker.settings

const val SLOT_CONFIG = "tracker_config_json"

/** Never mixed into the config. */
const val SLOT_APP = "app_settings_json"

/** Testable without DataStore. The slot NAMES key what is on every installed device: rename one and it reads
 *  defaults silently. */
interface ConfigStore {
    suspend fun read(slot: String): String?

    suspend fun write(
        slot: String,
        text: String,
    )
}
