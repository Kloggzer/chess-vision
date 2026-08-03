package com.chesslab.tracker.ui.analysis

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.chesslab.tracker.analysis.AnalysisSettings
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.chesslabSwitchColors
import java.util.Locale
import kotlin.math.roundToInt

private const val MS_PER_S = 1000f

/**
 * The analysis knobs themselves, with no surface of their own.
 *
 * They are rendered in two places — the eval bar's long-press sheet and the settings screen's
 * Analysis group — so they exist exactly once here. Both callers pass the same
 * `AnalysisSettingsHost` flow in and its `update` out, so neither surface owns state.
 */
@Composable
fun AnalysisControls(
    settings: AnalysisSettings,
    onChange: (AnalysisSettings) -> Unit,
) {
    val options = settings.options
    Column(verticalArrangement = Arrangement.spacedBy(Space.hair)) {
        Toggle("Engine analysis", settings.enabled) { onChange(settings.copy(enabled = it)) }
        Toggle("Pause on thermal / battery pressure", settings.respectPressure) {
            onChange(settings.copy(respectPressure = it))
        }
        Knob("Movetime", "%.1f s".format(Locale.ROOT, options.movetimeMs / MS_PER_S), options.movetimeMs / MS_PER_S, 0.1f, 2f) {
            onChange(settings.copy(options = options.copy(movetimeMs = (it * MS_PER_S).roundToInt().toLong())))
        }
        Knob("Lines", "${options.multiPv}", options.multiPv.toFloat(), 1f, 5f) {
            onChange(settings.copy(options = options.copy(multiPv = it.roundToInt())))
        }
        Knob("Threads", "${options.threads}", options.threads.toFloat(), 1f, 2f) {
            onChange(settings.copy(options = options.copy(threads = it.roundToInt())))
        }
        Knob("Hash", "${options.hashMb} MB", options.hashMb.toFloat(), 16f, 256f) {
            onChange(settings.copy(options = options.copy(hashMb = it.roundToInt())))
        }
    }
}

/**
 * The label carries the weight, not the switch.
 *
 * With the text measured first it took the full row, wrapped, and its second line ran straight
 * under the Switch — the same defect the spectator screen had.
 */
@Composable
private fun Toggle(
    label: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit,
) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurface,
            modifier = Modifier.weight(1f).padding(end = Space.md),
        )
        Switch(checked = checked, onCheckedChange = onChange, colors = chesslabSwitchColors())
    }
}

@Composable
private fun Knob(
    label: String,
    value: String,
    position: Float,
    min: Float,
    max: Float,
    onChange: (Float) -> Unit,
) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurface,
            modifier = Modifier.weight(1f).padding(end = Space.md),
        )
        Figure(value, Accent)
    }
    Slider(value = position, onValueChange = onChange, valueRange = min..max)
}
