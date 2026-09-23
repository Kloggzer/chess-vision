package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.ConfigCodec
import com.chesslab.tracker.settings.SettingsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Owns one thing the repository does not: edited knobs that only take effect on a restart. Persisted at
 *  once either way — the screen says the effect waits, or a user tunes a knob that never applied. */
class SettingsViewModel(
    private val settings: SettingsRepository,
) {
    val config: StateFlow<TrackerConfig> get() = settings.config
    val app: StateFlow<AppSettings> get() = settings.appSettings

    val saveError: StateFlow<String?> get() = settings.saveError
    val loadNote: StateFlow<String?> get() = settings.note

    private val restart = MutableStateFlow<Set<String>>(emptySet())

    val restartRequired: StateFlow<Set<String>> = restart.asStateFlow()

    private val noteState = MutableStateFlow<String?>(null)

    val note: StateFlow<String?> = noteState.asStateFlow()

    fun setKnob(
        knob: KnobUi,
        value: Double,
    ) = commit(knob.applyTo(config.value, value))

    fun resetKnob(knob: KnobUi) = commit(knob.resetIn(config.value))

    fun resetGroup(group: KnobGroup) = commit(knobsIn(group).fold(config.value) { c, knob -> knob.resetIn(c) })

    fun resetAll() = commit(ConfigCodec.defaults)

    /** App-level settings take effect on the next tracker start; none is live. */
    fun setApp(new: AppSettings) {
        settings.updateApp(new)
        restart.value = restart.value + APP_RESTART_KEY
    }

    fun setDebugEnabled(on: Boolean) {
        settings.setDebugEnabled(on)
    }

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
        const val APP_RESTART_KEY = "app settings"
    }
}

fun modifiedCount(
    group: KnobGroup,
    config: TrackerConfig,
): Int = knobsIn(group).count { !it.isDefault(config) }
