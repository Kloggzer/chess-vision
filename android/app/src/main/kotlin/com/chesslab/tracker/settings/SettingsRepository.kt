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

    suspend fun load() {
        val decoded = ConfigCodec.decode(store.read())
        loadNote.value = decoded.note
        current.value = decoded.config
        submit(decoded.config)
    }

    /**
     * Apply [new]. Persisting is asynchronous — the analyzer must never wait on disk — but the
     * engine sees the change on its next tick, because [submit] is a queue offer, not an edit.
     */
    fun update(new: TrackerConfig): UpdateResult {
        val changed = ConfigCodec.changedKeys(current.value, new)
        current.value = new
        submit(new)
        scope.launch { store.write(ConfigCodec.encode(new)) }
        return UpdateResult(
            note = if (changed.any { it.live }) NOTE_TUNED_LIVE else null,
            restartRequired = changed.filterNot { it.live }.map { it.key },
        )
    }

    /** 07a's "back to the Python defaults" action. */
    fun resetToDefaults(): UpdateResult = update(ConfigCodec.defaults)
}
