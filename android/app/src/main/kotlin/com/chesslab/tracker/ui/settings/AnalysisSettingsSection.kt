package com.chesslab.tracker.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.analysis.AnalysisSettingsHost
import com.chesslab.tracker.ui.analysis.AnalysisControls
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

/**
 * Stockfish, where a person looks for it.
 *
 * These knobs used to live behind a long-press on the ~6 dp eval bar beside the board and nowhere
 * else, which is not a discoverable control — the user had to be told the gesture exists. The sheet
 * stays as the mid-game shortcut; this is the way in. Both render [AnalysisControls] over the one
 * [AnalysisSettingsHost] flow, so a value changed here is the value the sheet shows.
 *
 * Not a [KnobGroup]: nothing here is a `TrackerConfig` field, and `KnobCatalogTest` asserts that
 * the knob catalog and that class match one-for-one.
 */
@Composable
fun AnalysisSettingsSection() {
    val settings by AnalysisSettingsHost.settings.collectAsStateWithLifecycle()
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = "Analysis",
            style = MaterialTheme.typography.titleMedium,
            color = OnSurface,
            modifier = Modifier.padding(top = 6.dp),
        )
        Card {
            Text("Stockfish", style = MaterialTheme.typography.labelLarge, color = OnSurface)
            Text(
                "Runs beside the tracker and only when the tracker can spare the frames: analysis is stopped " +
                    "outright below 15 fps, during warm-up, and — unless you say otherwise — under thermal or " +
                    "battery pressure. The eval bar beside the board opens the same knobs on a long press.",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceMuted,
            )
            AnalysisControls(settings, AnalysisSettingsHost::update)
        }
    }
}
