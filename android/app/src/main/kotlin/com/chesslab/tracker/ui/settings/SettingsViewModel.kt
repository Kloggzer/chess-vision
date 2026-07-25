package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.ConfigCodec
import com.chesslab.tracker.settings.SettingsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * The settings screen's state.
 *
 * It owns exactly one thing the repository does not: the set of edited knobs that Python cannot
 * retune while the tracker runs (`app.py::_live_tuning_kwargs` allows twelve, everything else is
 * read once at construction). The edit is persisted immediately either way — only its *effect*
 * waits — and the screen says so, because silently accepting a change that does nothing is how a
 * user spends an evening tuning a knob that never applied.
 *
 * Not an `androidx.lifecycle.ViewModel`: all durable state lives in the repository the service
 * owns, so this survives nothing and needs to survive nothing.
 */
class SettingsViewModel(
    private val settings: SettingsRepository,
) {
    val config: StateFlow<TrackerConfig> get() = settings.config
    val app: StateFlow<AppSettings> get() = settings.appSettings

    private val restart = MutableStateFlow<Set<String>>(emptySet())

    /** Knobs whose persisted value is ahead of the running tracker until it restarts. */
    val restartRequired: StateFlow<Set<String>> = restart.asStateFlow()

    private val noteState = MutableStateFlow<String?>(null)

    /** The last apply's outcome, mirroring Python's `tracker.note`. */
    val note: StateFlow<String?> = noteState.asStateFlow()

    fun setKnob(
        knob: KnobUi,
        value: Double,
    ) = commit(knob.applyTo(config.value, value))

    fun resetKnob(knob: KnobUi) = commit(knob.resetIn(config.value))

    fun resetGroup(group: KnobGroup) = commit(knobsIn(group).fold(config.value) { c, knob -> knob.resetIn(c) })

    fun resetAll() = commit(ConfigCodec.defaults)

    /** App-level settings take effect on the next tracker start; none of them is live (D07a-3). */
    fun setApp(new: AppSettings) {
        settings.updateApp(new)
        restart.value = restart.value + APP_RESTART_KEY
    }

    fun setDebugEnabled(on: Boolean) {
        settings.setDebugEnabled(on)
    }

    /** Called once the tracker has actually been rebuilt — the pending set is then a lie. */
    fun onRestarted() {
        restart.value = emptySet()
        noteState.value = null
    }

    private fun commit(new: TrackerConfig) {
        val result = settings.update(new)
        noteState.value = result.note
        restart.value = restart.value + result.restartRequired
    }

    private companion object {
        /** Model, EP, resolution and orientation are read at construction, like a restart-only knob. */
        const val APP_RESTART_KEY = "app settings"
    }
}

/** How many knobs of [group] differ from the Python default — the group header's badge. */
fun modifiedCount(
    group: KnobGroup,
    config: TrackerConfig,
): Int = knobsIn(group).count { !it.isDefault(config) }
