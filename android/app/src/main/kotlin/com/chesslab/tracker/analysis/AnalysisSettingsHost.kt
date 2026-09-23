package com.chesslab.tracker.analysis

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** One instance: two surfaces write it, and a second copy would silently revert the other's change.
 *  Not in `SettingsRepository` — these are not `TrackerConfig` knobs. */
object AnalysisSettingsHost {
    private val state = MutableStateFlow(AnalysisSettings())

    val settings: StateFlow<AnalysisSettings> = state.asStateFlow()

    fun update(new: AnalysisSettings) {
        state.value = new
    }
}
