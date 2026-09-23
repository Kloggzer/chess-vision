package com.chesslab.tracker.record

import com.chesslab.tracker.settings.ConfigStore
import com.chesslab.tracker.settings.JsonPrefs
import kotlinx.serialization.json.Json

/** Recording is not a tracker knob and must never reach the engine. */
const val SLOT_RECORDING = "recording_prefs_json"

private val JSON = Json { ignoreUnknownKeys = true }

/** A decode failure falls back to the SAFE defaults: recording off, inventory filter on. */
class RecordingSettings(
    store: ConfigStore,
) : JsonPrefs<RecordingPrefs>(store, SLOT_RECORDING, RecordingPrefs.serializer(), RecordingPrefs(), JSON)
