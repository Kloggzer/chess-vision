package com.chesslab.tracker.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.analysis.AnalysisSettingsHost
import com.chesslab.tracker.ui.SectionHeading
import com.chesslab.tracker.ui.analysis.AnalysisControls

@Composable
fun AnalysisSettingsSection() {
    val settings by AnalysisSettingsHost.settings.collectAsStateWithLifecycle()
    Column {
        SectionHeading("Stockfish")
        AnalysisControls(settings, AnalysisSettingsHost::update)
    }
}
