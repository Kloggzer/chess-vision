package com.chesslab.tracker.ui.analysis

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.analysis.AnalysisSettings
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import java.util.Locale
import kotlin.math.roundToInt

/**
 * 07c's own surface, reached by long-pressing the eval bar — analysis knobs are not tracker knobs
 * and do not belong on the settings screen.
 */
@Composable
fun AnalysisSettingsSheet(
    settings: AnalysisSettings,
    onChange: (AnalysisSettings) -> Unit,
    onDismiss: () -> Unit,
) {
    val options = settings.options
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Done") } },
        title = { Text("Analysis", color = OnSurface) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Toggle("Engine analysis", settings.enabled) { onChange(settings.copy(enabled = it)) }
                Toggle("Pause on thermal / battery pressure", settings.respectPressure) {
                    onChange(settings.copy(respectPressure = it))
                }
                Knob("Movetime", "%.1f s".format(Locale.ROOT, options.movetimeMs / 1000.0), options.movetimeMs / 1000f, 0.1f, 2f) {
                    onChange(settings.copy(options = options.copy(movetimeMs = (it * 1000f).roundToInt().toLong())))
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
        },
    )
}

@Composable
private fun Toggle(
    label: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = OnSurface)
        Switch(checked = checked, onCheckedChange = onChange)
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
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = OnSurface)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted)
    }
    Slider(value = position, onValueChange = onChange, valueRange = min..max)
}
