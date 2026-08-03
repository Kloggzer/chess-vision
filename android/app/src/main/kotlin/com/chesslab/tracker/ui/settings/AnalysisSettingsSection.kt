package com.chesslab.tracker.ui.settings

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.analysis.AnalysisSettingsHost
import com.chesslab.tracker.ui.Card
import com.chesslab.tracker.ui.analysis.AnalysisControls
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

/**
 * Stockfish, where a person looks for it — and, since specs/47, the ONLY place.
 *
 * These knobs used to be reachable by long-pressing the 40 dp eval bar beside the board as well.
 * That sheet was a second surface over the same `AnalysisSettingsHost` flow, behind a gesture
 * nobody could discover, and it was the documented reason the bar could not shrink. It is gone;
 * this is the way in.
 *
 * Not a [KnobGroup]: nothing here is a `TrackerConfig` field, and `KnobCatalogTest` asserts that
 * the knob catalog and that class match one-for-one.
 */
@Composable
fun AnalysisSettingsSection() {
    val settings by AnalysisSettingsHost.settings.collectAsStateWithLifecycle()
    Card {
        Text("Stockfish", style = MaterialTheme.typography.labelLarge, color = OnSurface)
        Text(
            "Runs beside the tracker and only when the tracker can spare the frames: analysis is stopped " +
                "outright below 15 fps, during warm-up, and — unless you say otherwise — under thermal or " +
                "battery pressure. The bar beside the board shows the result; tapping it opens the engine's lines.",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
        AnalysisControls(settings, AnalysisSettingsHost::update)
    }
}
