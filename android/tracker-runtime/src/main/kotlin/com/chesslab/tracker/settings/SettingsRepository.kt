package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/** Python's `_apply_live_tuning` note — the user's proof that the change took effect. */
const val NOTE_TUNED_LIVE = "tracker tuning updated live"

/**
 * What one [SettingsRepository.update] did.
 *
 * [restartRequired] is the honest half: Python's web UI can only retune twelve knobs at runtime
 * (`app.py::_live_tuning_kwargs`), and the rest are read once at construction. Silently accepting
 * a change that does nothing is how a user spends an evening tuning a knob that never applied.
 */
class UpdateResult(
    val note: String?,
    val restartRequired: List<String>,
)

/**
 * The single source of the live [TrackerConfig].
 *
 * It persists and announces; it does NOT implement the side effects. `motionMargin` resetting the
 * motion ROI, `overhang` invalidating the reference census cache and `diffClaheClip` rebuilding
 * CLAHE all belong to the objects that own that state (the engine and the frame pipeline), and
 * they receive the new config on the analyzer thread through [submit]. Reaching into either from
 * here would be a second owner of the same state.
 */
class SettingsRepository(
    private val store: ConfigStore,
    private val scope: CoroutineScope,
    /**
     * The live engine's seat. A `var` because the repository outlives the tracker: the settings
     * screen works with nothing running, and the service claims this on start and gives it back on
     * destroy rather than the repository being rebuilt around it.
     */
    var submit: (TrackerConfig) -> Unit = {},
) {
    private val current = MutableStateFlow(ConfigCodec.defaults)
    val config: StateFlow<TrackerConfig> = current.asStateFlow()

    private val loadNote = MutableStateFlow<String?>(null)

    /** Non-null when the stored settings could not be read and the defaults were used instead. */
    val note: StateFlow<String?> = loadNote.asStateFlow()

    private val appState = MutableStateFlow(AppSettings())
    val appSettings: StateFlow<AppSettings> = appState.asStateFlow()

    // Kept in step with [appSettings] by hand rather than derived with `map(...).stateIn(scope)`:
    // an eagerly started flow in this scope is a live coroutine, and a test that owns the scope
    // then never completes (STATUS D06c-12).
    private val debugState = MutableStateFlow(AppSettings().debugEnabled)

    /** Read by 07b's debug payload; only the settings screen writes it. */
    val debugEnabled: StateFlow<Boolean> = debugState.asStateFlow()

    private val loadedState = MutableStateFlow(false)

    /**
     * Read the persisted truth. Called exactly once per process, by [SettingsHost].
     *
     * `finally`, because everything downstream waits on this: a store that throws must leave the
     * defaults standing and the tracker startable, not hang [awaitLoaded] forever.
     */
    suspend fun load() {
        try {
            val decoded = ConfigCodec.decode(store.read(SLOT_CONFIG))
            loadNote.value = decoded.note
            current.value = decoded.config
            publishApp(decodeAppSettings(store.read(SLOT_APP)))
            submit(decoded.config)
        } finally {
            loadedState.value = true
        }
    }

    /** The service reads `appSettings` before it builds anything, and defaults would build the wrong thing. */
    suspend fun awaitLoaded() {
        loadedState.first { it }
    }

    /**
     * Apply [new]. Persisting is asynchronous — the analyzer must never wait on disk — but the
     * engine sees the change on its next tick, because [submit] is a queue offer, not an edit.
     */
    fun update(new: TrackerConfig): UpdateResult {
        val changed = ConfigCodec.changedKeys(current.value, new)
        current.value = new
        submit(new)
        scope.launch { store.write(SLOT_CONFIG, ConfigCodec.encode(new)) }
        return UpdateResult(
            note = if (changed.any { it.live }) NOTE_TUNED_LIVE else null,
            restartRequired = changed.filterNot { it.live }.map { it.key },
        )
    }

    /** "Back to the Python defaults" — same live/restart rules as any other edit. */
    fun resetToDefaults(): UpdateResult = update(ConfigCodec.defaults)

    /** App-level settings. None of them is live: every one is read at construction (D07a-3). */
    fun updateApp(new: AppSettings) {
        publishApp(new)
        scope.launch { store.write(SLOT_APP, encodeAppSettings(new)) }
    }

    fun setDebugEnabled(on: Boolean) = updateApp(appState.value.copy(debugEnabled = on))

    private fun publishApp(new: AppSettings) {
        appState.value = new
        debugState.value = new.debugEnabled
    }
}
