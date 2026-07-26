package com.chesslab.tracker.analysis

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * The one [AnalysisSettings] the app has.
 *
 * Two surfaces write it — the eval bar's long-press sheet and the settings screen's Analysis group —
 * and a second copy would mean a value changed in one place silently reverting when the other one
 * next wrote. It also outlives the tracking screen, which the analyzer itself deliberately does not.
 *
 * Deliberately not in the `SettingsRepository`: these are not `TrackerConfig` knobs, nothing in the
 * engine reads them, and the settings catalog's reflection test covers exactly that seam.
 */
object AnalysisSettingsHost {
    private val state = MutableStateFlow(AnalysisSettings())

    val settings: StateFlow<AnalysisSettings> = state.asStateFlow()

    fun update(new: AnalysisSettings) {
        state.value = new
    }
}
