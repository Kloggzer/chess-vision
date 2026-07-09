package com.chesslab.tracker.service

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.mutablePreferencesOf
import kotlinx.coroutines.flow.MutableStateFlow

/** In-memory [DataStore] for unit tests — no Android/file backing. */
class FakeDataStore : DataStore<Preferences> {
    private val state = MutableStateFlow<Preferences>(mutablePreferencesOf())

    override val data = state

    override suspend fun updateData(transform: suspend (t: Preferences) -> Preferences): Preferences {
        val updated = transform(state.value)
        state.value = updated
        return updated
    }
}
