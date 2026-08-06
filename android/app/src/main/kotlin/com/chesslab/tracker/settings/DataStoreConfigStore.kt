package com.chesslab.tracker.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.trackerDataStore: DataStore<Preferences> by preferencesDataStore(name = "chesslab-tracker")

/** The Android half of [ConfigStore]: a DataStore keyed by the slot names the interface defines. */
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
