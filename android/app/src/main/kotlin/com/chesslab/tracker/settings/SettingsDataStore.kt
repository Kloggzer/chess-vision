package com.chesslab.tracker.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.trackerDataStore: DataStore<Preferences> by preferencesDataStore(name = "chesslab-tracker")

private val CONFIG_KEY = stringPreferencesKey("tracker_config_json")

/**
 * Where the settings live. Behind an interface so [SettingsRepository]'s decisions are testable
 * on the desktop JVM — DataStore needs a `Context` and a real file, and neither exists there.
 */
interface ConfigStore {
    suspend fun read(): String?

    suspend fun write(text: String)
}

class DataStoreConfigStore(
    context: Context,
) : ConfigStore {
    private val store = context.applicationContext.trackerDataStore

    override suspend fun read(): String? = store.data.first()[CONFIG_KEY]

    override suspend fun write(text: String) {
        store.edit { it[CONFIG_KEY] = text }
    }
}
