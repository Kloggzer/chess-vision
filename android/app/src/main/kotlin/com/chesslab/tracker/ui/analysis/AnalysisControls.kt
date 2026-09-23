package com.chesslab.tracker.ui.analysis

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import com.chesslab.tracker.analysis.AnalysisSettings
import com.chesslab.tracker.ui.settings.SliderPreference
import com.chesslab.tracker.ui.settings.SwitchPreference
import com.chesslab.tracker.ui.theme.Space
import java.util.Locale
import kotlin.math.roundToInt

private const val MS_PER_S = 1000f

/** Rendered in two places, so it exists once; both pass `AnalysisSettingsHost` in and out, neither owns state. */
@Composable
fun AnalysisControls(
    settings: AnalysisSettings,
    onChange: (AnalysisSettings) -> Unit,
) {
    val options = settings.options
    Column(verticalArrangement = Arrangement.spacedBy(Space.hair)) {
        SwitchPreference("Engine analysis", "Show Stockfish's evaluation while tracking", settings.enabled) {
            onChange(settings.copy(enabled = it))
        }
        SwitchPreference("Respect device pressure", "Pause under thermal or battery pressure", settings.respectPressure) {
            onChange(settings.copy(respectPressure = it))
        }
        SliderPreference(
            "Thinking time",
            "Maximum time per live position",
            "%.1f s".format(Locale.ROOT, options.movetimeMs / MS_PER_S),
            options.movetimeMs / MS_PER_S,
            0.1f..2f,
        ) {
            onChange(settings.copy(options = options.copy(movetimeMs = (it * MS_PER_S).roundToInt().toLong())))
        }
        SliderPreference("Lines", "Alternative engine continuations", "${options.multiPv}", options.multiPv.toFloat(), 1f..5f) {
            onChange(settings.copy(options = options.copy(multiPv = it.roundToInt())))
        }
        SliderPreference("Threads", "CPU threads used by Stockfish", "${options.threads}", options.threads.toFloat(), 1f..2f) {
            onChange(settings.copy(options = options.copy(threads = it.roundToInt())))
        }
        SliderPreference("Hash memory", "Engine transposition table", "${options.hashMb} MB", options.hashMb.toFloat(), 16f..256f) {
            onChange(settings.copy(options = options.copy(hashMb = it.roundToInt())))
        }
    }
}
