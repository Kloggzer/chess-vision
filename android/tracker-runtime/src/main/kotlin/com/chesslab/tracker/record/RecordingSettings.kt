package com.chesslab.tracker.record

import com.chesslab.tracker.settings.ConfigStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
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
    private val store: ConfigStore,
) {
    private val cache = MutableStateFlow(RecordingPrefs())

    /** Read synchronously by the capture path; the toggle in the UI writes through [save]. */
    val prefs: StateFlow<RecordingPrefs> = cache

    suspend fun load(): RecordingPrefs {
        val text = store.read(SLOT_RECORDING)
        val loaded = text?.let { runCatching { JSON.decodeFromString(RecordingPrefs.serializer(), it) }.getOrNull() }
        return (loaded ?: RecordingPrefs()).also { cache.value = it }
    }

    suspend fun save(prefs: RecordingPrefs) {
        cache.value = prefs
        store.write(SLOT_RECORDING, JSON.encodeToString(RecordingPrefs.serializer(), prefs))
    }
}
