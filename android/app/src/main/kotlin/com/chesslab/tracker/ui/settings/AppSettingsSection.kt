package com.chesslab.tracker.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import com.chesslab.tracker.cnn.BUNDLED_MODELS
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.BoardOrientation
import com.chesslab.tracker.settings.EpRequest
import com.chesslab.tracker.settings.ResolutionMode

/** Only the graph that this build can execute. */
private val MODEL_ASSETS = listOf("model.onnx")

@Composable
fun BoardOrientationSection(
    app: AppSettings,
    onChange: (AppSettings) -> Unit,
) {
    ValuePreference(
        title = "Board orientation",
        summary = "Choose which physical corner is a8",
        options = BoardOrientation.entries.map { it.label to it },
        selected = app.orientation,
        onSelect = { onChange(app.copy(orientation = it)) },
    )
}

/** Device-facing choices use the same rows and radio dialogs as the player settings. */
@Composable
fun AppSettingsSection(
    app: AppSettings,
    onChange: (AppSettings) -> Unit,
) {
    Column {
        ValuePreference(
            title = "Camera resolution",
            summary = "Requested capture size",
            options = ResolutionMode.entries.map { it.label to it },
            selected = app.resolutionMode,
            onSelect = { onChange(app.copy(resolutionMode = it)) },
        )
        ValuePreference(
            title = "CNN model",
            summary = "Bundled square classifier",
            options = BUNDLED_MODELS.map { it to it },
            selected = app.modelDir,
            onSelect = { onChange(app.copy(modelDir = it)) },
        )
        ValuePreference(
            title = "CNN graph",
            summary = "Model asset loaded by the runtime",
            options = MODEL_ASSETS.map { it to it },
            selected = app.modelAsset,
            onSelect = { onChange(app.copy(modelAsset = it)) },
        )
        ValuePreference(
            title = "Execution provider",
            summary = "Preferred hardware backend",
            options = EpRequest.entries.map { it.label to it },
            selected = app.epRequest,
            onSelect = { onChange(app.copy(epRequest = it)) },
        )
    }
}

@Composable
fun DebugRow(
    enabled: Boolean,
    onEnabled: (Boolean) -> Unit,
    onOpen: () -> Unit,
) {
    Column {
        SwitchPreference(
            title = "Collect debug data",
            summary = "Timings, evidence, crops and decision logs",
            checked = enabled,
            onCheckedChange = onEnabled,
        )
        PreferenceRow(
            title = "Open diagnostics",
            summary = if (enabled) "Inspect the current tracker state" else "Enable debug data first",
            enabled = enabled,
            onClick = onOpen,
        )
    }
}
