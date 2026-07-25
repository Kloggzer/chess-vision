package com.chesslab.tracker.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.trackerDataStore: DataStore<Preferences> by preferencesDataStore(name = "chesslab-tracker")

/** The `TrackerConfig` slot — the parity seam's knobs. */
const val SLOT_CONFIG = "tracker_config_json"

/** The app-level slot: resolution, orientation, model, EP, debug. Never mixed into the config. */
const val SLOT_APP = "app_settings_json"

/**
 * Where the settings live. Behind an interface so [SettingsRepository]'s decisions are testable
 * on the desktop JVM — DataStore needs a `Context` and a real file, and neither exists there.
 */
interface ConfigStore {
    suspend fun read(slot: String): String?

    suspend fun write(
        slot: String,
        text: String,
    )
}

class DataStoreConfigStore(
    context: Context,
) : ConfigStore {
    private val store = context.applicationContext.trackerDataStore

    override suspend fun read(slot: String): String? = store.data.first()[stringPreferencesKey(slot)]

    override suspend fun write(
        slot: String,
        text: String,
    ) {
        store.edit { it[stringPreferencesKey(slot)] = text }
    }
}
