package com.chesslab.tracker.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.chesslab.tracker.cnn.BUNDLED_MODELS
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.BoardOrientation
import com.chesslab.tracker.settings.EpRequest
import com.chesslab.tracker.settings.ResolutionMode
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.SurfaceRaised

/**
 * Only the FP32 graph, because only it can execute. This is the graph FILE inside the selected
 * model directory — orthogonal to which model is selected (`BUNDLED_MODELS`).
 *
 * `model.qnn.onnx` is still bundled — the QNN branch in `OrtSessionRunner` is what a QNN-capable
 * build would need back — but this build has no QNN AAR, so offering it as a choice only lets a
 * device pin itself to a graph no provider wants AND silently stop receiving `model.onnx` updates.
 * Restore this entry in the same change that restores the AAR, never before.
 */
private val MODEL_ASSETS = listOf("model.onnx")

/**
 * Everything that is not a `TrackerConfig` knob: what the camera is asked for, which way the board
 * faces, which graph and provider the CNN should use. All of it is read when the tracker is built,
 * so all of it needs a restart.
 */
@Composable
fun AppSettingsSection(
    app: AppSettings,
    onChange: (AppSettings) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(Space.md)) {
        Choice(
            title = "Camera resolution",
            help =
                "Never trust the requested resolution — the pipeline calibrates against the DELIVERED size. " +
                    "Asking for more than the device can sustain costs frames, not detail.",
            options = ResolutionMode.entries.map { it.label to it },
            selected = app.resolutionMode,
            onSelect = { onChange(app.copy(resolutionMode = it)) },
        )
        Choice(
            title = "Board orientation",
            help = "Which physical corner is a8. A wrong a8 assignment silently transposes every label.",
            options = BoardOrientation.entries.map { it.label to it },
            selected = app.orientation,
            onSelect = { onChange(app.copy(orientation = it)) },
        )
        Choice(
            title = "CNN model",
            help =
                "Which bundled model reads the squares. Each declares its own input size and the crops " +
                    "follow it, so switching changes what the camera feed is scaled to. The debug " +
                    "screen's CNN panel names the model that actually attached, and at what size.",
            options = BUNDLED_MODELS.map { it to it },
            selected = app.modelDir,
            onSelect = { onChange(app.copy(modelDir = it)) },
        )
        Choice(
            title = "CNN graph",
            help = "model.qnn.onnx is the INT8/QDQ graph the Hexagon NPU needs; the HTP backend rejects float32.",
            options = MODEL_ASSETS.map { it to it },
            selected = app.modelAsset,
            onSelect = { onChange(app.copy(modelAsset = it)) },
        )
        Choice(
            title = "Execution provider",
            help = "What to ASK for. Which provider was actually selected is shown by the debug screen's CNN panel.",
            options = EpRequest.entries.map { it.label to it },
            selected = app.epRequest,
            onSelect = { onChange(app.copy(epRequest = it)) },
        )
    }
}

/** The debug menu lives behind settings — never on the tracking flow, where it is noise mid-game. */
@Composable
fun DebugRow(
    enabled: Boolean,
    onEnabled: (Boolean) -> Unit,
    onOpen: () -> Unit,
) {
    Card {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            // `weight` on the text, never a fixed width: measured first it takes the whole row and
            // its next line runs under the Switch, which keeps its minimum size regardless.
            Text(
                text = "Debug menu",
                style = MaterialTheme.typography.labelLarge,
                color = OnSurface,
                modifier = Modifier.weight(1f).padding(end = Space.md),
            )
            Switch(checked = enabled, onCheckedChange = onEnabled)
        }
        Text(
            "Timings, evidence heatmap, crops and the decision log. Off means the payload is not even " +
                "assembled, so it costs nothing while closed.",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
        SectionButton("Open debug menu", enabled) { onOpen() }
    }
}

@Composable
private fun <T> Choice(
    title: String,
    help: String,
    options: List<Pair<String, T>>,
    selected: T,
    onSelect: (T) -> Unit,
) {
    Card {
        Text(title, style = MaterialTheme.typography.labelLarge, color = OnSurface)
        Text(help, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
        Options(options, selected, onSelect)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun <T> Options(
    options: List<Pair<String, T>>,
    selected: T,
    onSelect: (T) -> Unit,
) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
        options.forEach { (label, value) ->
            FilterChip(
                selected = value == selected,
                onClick = { onSelect(value) },
                label = { Text(label, style = MaterialTheme.typography.labelMedium) },
            )
        }
    }
}

@Composable
fun SectionButton(
    text: String,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    OutlinedButton(onClick = onClick, enabled = enabled) {
        Text(text, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
fun Card(content: @Composable ColumnScope.() -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(SurfaceRaised, RoundedCornerShape(Radius.sm))
            .padding(horizontal = Space.md, vertical = Space.sm),
        verticalArrangement = Arrangement.spacedBy(Space.sm),
        content = content,
    )
}
