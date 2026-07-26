package com.chesslab.tracker.ui.analysis

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import com.chesslab.tracker.analysis.AnalysisSettings
import com.chesslab.tracker.ui.theme.OnSurface

/**
 * The mid-game shortcut: long-press the eval bar and the same knobs the settings screen's Analysis
 * group shows appear over the board, without navigating away from the running game.
 *
 * It is no longer the ONLY way in — nobody found a long-press on a sliver beside the board — but it
 * stays, because walking to Settings mid-game to stop the engine is the wrong ask.
 */
@Composable
fun AnalysisSettingsSheet(
    settings: AnalysisSettings,
    onChange: (AnalysisSettings) -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Done") } },
        title = { Text("Analysis", color = OnSurface) },
        text = { AnalysisControls(settings, onChange) },
    )
}
