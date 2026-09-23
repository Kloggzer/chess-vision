package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.IOException

/** The user's proof that the change took effect. */
const val NOTE_TUNED_LIVE = "tracker tuning updated live"

/** [restartRequired] is the honest half: accepting a change that does nothing costs an evening of tuning. */
class UpdateResult(
    val note: String?,
    val restartRequired: List<String>,
)

/** Persists and announces, does NOT implement the side effects: those belong to the engine and pipeline, which
 *  receive the config on the analyzer thread through [submit]. A second owner of that state would be wrong. */
class SettingsRepository(
    private val store: ConfigStore,
    private val scope: CoroutineScope,
    /** A `var`: the repository outlives the tracker, which claims this on start and gives it back on destroy. */
    var submit: (TrackerConfig) -> Unit = {},
) {
    private val current = MutableStateFlow(ConfigCodec.defaults)
    val config: StateFlow<TrackerConfig> = current.asStateFlow()

    private val loadNote = MutableStateFlow<String?>(null)

    val note: StateFlow<String?> = loadNote.asStateFlow()

    private val saveState = MutableStateFlow<String?>(null)

    /** Screen and engine run the new value, the next process starts with the old one. */
    val saveError: StateFlow<String?> = saveState.asStateFlow()

    private val appState = MutableStateFlow(AppSettings())
    val appSettings: StateFlow<AppSettings> = appState.asStateFlow()

    // By hand, not `stateIn(scope)`: an eager flow is a live coroutine, and a test owning the scope never completes.
    private val debugState = MutableStateFlow(AppSettings().debugEnabled)

    val debugEnabled: StateFlow<Boolean> = debugState.asStateFlow()

    private val loadedState = MutableStateFlow(false)

    private val writing = Mutex()

    private val failedSlots = mutableMapOf<String, String>()

    /** `finally`: a store that throws must leave defaults standing, not hang [awaitLoaded] forever. */
    suspend fun load() {
        try {
            val decoded = ConfigCodec.decode(store.read(SLOT_CONFIG))
            loadNote.value = decoded.note
            current.value = decoded.config
            submit(decoded.config)
            publishApp(decodeAppSettings(store.read(SLOT_APP)))
        } catch (e: IOException) {
            loadNote.value = "stored settings could not be read (${e.message}); defaults in use"
        } finally {
            loadedState.value = true
        }
    }

    /** Defaults would build the wrong thing. */
    suspend fun awaitLoaded() {
        loadedState.first { it }
    }

    /** The analyzer must never wait on disk; [submit] is a queue offer, so the engine sees it on its next tick. */
    fun update(new: TrackerConfig): UpdateResult {
        val changed = ConfigCodec.changedKeys(current.value, new)
        current.value = new
        submit(new)
        persist(SLOT_CONFIG) { ConfigCodec.encode(current.value) }
        return UpdateResult(
            note = if (changed.any { it.live }) NOTE_TUNED_LIVE else null,
            restartRequired = changed.filterNot { it.live }.map { it.key },
        )
    }

    /** None of them is live: every one is read at construction. */
    fun updateApp(new: AppSettings) {
        publishApp(new)
        persist(SLOT_APP) { encodeAppSettings(appState.value) }
    }

    fun setDebugEnabled(on: Boolean) = updateApp(appState.value.copy(debugEnabled = on))

    /** Writes the LATEST state, not the queued value: the older of two burst edits landing last left the store
     *  disagreeing with the screen until the next process start. */
    private fun persist(
        slot: String,
        latest: () -> String,
    ) {
        scope.launch {
            writing.withLock {
                try {
                    store.write(slot, latest())
                    failedSlots.remove(slot)
                } catch (e: IOException) {
                    failedSlots[slot] = "settings not saved (${e.message}); a restart brings back the old values"
                }
                saveState.value = failedSlots.values.firstOrNull()
            }
        }
    }

    private fun publishApp(new: AppSettings) {
        appState.value = new
        debugState.value = new.debugEnabled
    }
}
