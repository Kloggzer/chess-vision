package com.chesslab.tracker.geometry

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

// Carry-over rule (`calibration.py`): falling back to defaults would reset a hand-set `white_pov: false`
// and transpose every label of the next session.

private val PROFILE_KEY = stringPreferencesKey("calibration_profile")

private val Context.calibrationDataStore: DataStore<Preferences> by preferencesDataStore(name = "calibration")

object CalibrationStoreHost {
    private var instance: CalibrationStore? = null

    @Synchronized
    fun of(context: Context): CalibrationStore =
        instance ?: CalibrationStore(DataStoreProfileBacking(context.applicationContext.calibrationDataStore)).also { instance = it }
}

class DataStoreProfileBacking(
    private val store: DataStore<Preferences>,
) : ProfileBacking {
    override val text: Flow<String?> = store.data.map { it[PROFILE_KEY] }

    override suspend fun write(text: String) {
        store.edit { it[PROFILE_KEY] = text }
    }
}
