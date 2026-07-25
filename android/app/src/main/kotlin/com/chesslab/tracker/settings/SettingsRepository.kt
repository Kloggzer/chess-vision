package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
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
    private val submit: (TrackerConfig) -> Unit,
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

    suspend fun load() {
        val decoded = ConfigCodec.decode(store.read(SLOT_CONFIG))
        loadNote.value = decoded.note
        current.value = decoded.config
        publishApp(decodeAppSettings(store.read(SLOT_APP)))
        submit(decoded.config)
        // The service constructs this repository; there is no other path from the composition
        // root to it, so it announces itself once it holds the persisted truth (D07a-2).
        SettingsHost.publish(this)
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

/**
 * Where the UI picks the repository up, mirroring 06b's `TrackerSessionHost`.
 *
 * The settings screen needs the ONE repository the service owns — a second one over the same
 * DataStore would be a second source of truth, and the engine would never see its edits.
 */
object SettingsHost {
    private val current = MutableStateFlow<SettingsRepository?>(null)

    val repository: StateFlow<SettingsRepository?> = current

    fun publish(repository: SettingsRepository?) {
        current.value = repository
    }
}
