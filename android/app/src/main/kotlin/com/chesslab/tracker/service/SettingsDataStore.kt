package com.chesslab.tracker.service

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "tracker_settings")

/** Process-wide singleton preferences store for [SettingsRepository]. */
fun settingsDataStore(context: Context): DataStore<Preferences> = context.applicationContext.dataStore
