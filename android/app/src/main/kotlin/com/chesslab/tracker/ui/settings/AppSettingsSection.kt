package com.chesslab.tracker.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import com.chesslab.tracker.cnn.BUNDLED_MODELS
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.BoardOrientation
import com.chesslab.tracker.settings.EpRequest
import com.chesslab.tracker.settings.FrameRateMode
import com.chesslab.tracker.settings.ResolutionMode

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
            title = "Camera frame rate",
            summary = "Locked onto the sensor · 15 keeps the battery charging, 30 reads fast play better",
            options = FrameRateMode.entries.map { it.label to it },
            selected = app.frameRate,
            onSelect = { onChange(app.copy(frameRate = it)) },
        )
        ValuePreference(
            title = "CNN model",
            summary =
                "Bundled square classifier · declares its input size and crop padding; one that " +
                    "declares none is served the profile's and marked LEGACY",
            options = BUNDLED_MODELS.map { it to it },
            selected = app.modelDir,
            onSelect = { onChange(app.copy(modelDir = it)) },
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

/** Hinter der Developer-Tuer: AUTO ist richtig, aber zum Debuggen muss er erreichbar sein — fuer
 *  `AppSettings` gibt es auf dem Geraet keinen `set:`-Weg. */
@Composable
fun RuntimeSettingsSection(
    app: AppSettings,
    onChange: (AppSettings) -> Unit,
) {
    ValuePreference(
        title = "Execution provider",
        summary = "Preferred hardware backend",
        options = EpRequest.entries.map { it.label to it },
        selected = app.epRequest,
        onSelect = { onChange(app.copy(epRequest = it)) },
    )
}
