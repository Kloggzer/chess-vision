package com.chesslab.tracker.record

import com.chesslab.tracker.settings.ConfigStore
import com.chesslab.tracker.settings.JsonPrefs
import kotlinx.serialization.json.Json

/** Its own slot in 06c's store — recording is not a tracker knob and must never reach the engine. */
const val SLOT_RECORDING = "recording_prefs_json"

private val JSON = Json { ignoreUnknownKeys = true }

/**
 * Persisted recording preferences, plus the in-memory value the capture path reads.
 *
 * A decode failure falls back to the defaults, which are the SAFE ones: recording off, inventory
 * filter on. A corrupt preferences blob must never be the reason the phone starts filling its own
 * storage with unlabeled frames.
 */
class RecordingSettings(
    store: ConfigStore,
) : JsonPrefs<RecordingPrefs>(store, SLOT_RECORDING, RecordingPrefs.serializer(), RecordingPrefs(), JSON)
