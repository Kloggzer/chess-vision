package com.chesslab.tracker.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import com.chesslab.tracker.cnn.BUNDLED_MODELS
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.BoardOrientation
import com.chesslab.tracker.settings.EngineKind
import com.chesslab.tracker.settings.EpRequest
import com.chesslab.tracker.settings.FrameRateMode
import com.chesslab.tracker.settings.ResolutionMode

/** Only the graph that this build can execute. */

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
            title = "Camera frame rate",
            summary = "Locked onto the sensor · 15 keeps the battery charging, 30 reads fast play better",
            options = FrameRateMode.entries.map { it.label to it },
            selected = app.frameRate,
            onSelect = { onChange(app.copy(frameRate = it)) },
        )
        ValuePreference(
            title = "Move engine",
            summary =
                "Which engine decides what a move is · Diff reads what CHANGED against a reference, " +
                    "Stillness waits for rest and asks which legal move explains the reading, " +
                    "Change waits for rest but decides on the pixels and asks the model only for colour",
            options = EngineKind.entries.map { it.label to it },
            selected = app.engine,
            onSelect = { onChange(app.copy(engine = it)) },
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

/**
 * Der Backend-Wunsch, hinter der Developer-Tuer statt neben Aufloesung und Modell.
 *
 * AUTO ist die richtige Antwort (CLAUDE.md), also ist das kein Spielerregler — aber beim Debuggen
 * eines Laufzeitproblems will man ihn erreichen, und fuer `AppSettings` gibt es auf dem Geraet
 * keinen `set:`-Weg wie fuer die Engine-Knobs.
 */
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
