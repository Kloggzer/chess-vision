package com.chesslab.tracker.ui.settings

import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.SettingsHost
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

/**
 * The mobile equivalent of the desktop's `--flags` plus `app.py`'s live-tuning endpoint.
 *
 * `specs/12` D5 cut the tuning surface from the phone entirely, which made a bad board/lighting
 * combination unfixable in the field. Every knob is here, grouped, with the Python default beside
 * the live value and one line of why it is what it is.
 */
@Composable
fun SettingsRoute(
    onBack: () -> Unit,
    onOpenDebug: () -> Unit,
    onRestartTracker: (() -> Unit)? = null,
) {
    val repository by SettingsHost.repository.collectAsStateWithLifecycle()
    val bound = repository
    if (bound == null) {
        Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("The tracker service is not running yet.", color = OnSurfaceMuted)
            SectionButton("Back") { onBack() }
        }
    } else {
        SettingsScreen(remember(bound) { SettingsViewModel(bound) }, onBack, onOpenDebug, onRestartTracker)
    }
}

@Composable
private fun SettingsScreen(
    viewModel: SettingsViewModel,
    onBack: () -> Unit,
    onOpenDebug: () -> Unit,
    onRestartTracker: (() -> Unit)?,
) {
    val config by viewModel.config.collectAsStateWithLifecycle()
    val app by viewModel.app.collectAsStateWithLifecycle()
    val pending by viewModel.restartRequired.collectAsStateWithLifecycle()
    val note by viewModel.note.collectAsStateWithLifecycle()
    var confirmResetAll by remember { mutableStateOf(false) }

    ChesslabScaffold("Settings", onBack) { bars ->
        Column(Modifier.fillMaxSize().padding(bars).padding(horizontal = 12.dp)) {
            note?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Accent) }
            SettingsList(viewModel, config, app, pending, onOpenDebug, Modifier.weight(1f)) { confirmResetAll = true }
            if (pending.isNotEmpty()) RestartBar(pending, onRestartTracker, viewModel::onRestarted)
        }
    }

    if (confirmResetAll) {
        ConfirmResetAll(onConfirm = {
            confirmResetAll = false
            viewModel.resetAll()
        }, onDismiss = { confirmResetAll = false })
    }
}

@Composable
private fun SettingsList(
    viewModel: SettingsViewModel,
    config: TrackerConfig,
    app: AppSettings,
    pending: Set<String>,
    onOpenDebug: () -> Unit,
    modifier: Modifier = Modifier,
    onResetAll: () -> Unit,
) {
    val context = LocalContext.current
    LazyColumn(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        KnobGroup.entries.forEach { group ->
            val rows = knobsIn(group)
            item(key = group.name) {
                GroupHeader(group, modifiedCount(group, config)) { viewModel.resetGroup(group) }
            }
            items(rows.size, key = { rows[it].key }) { index ->
                val knob = rows[index]
                KnobRow(
                    knob = knob,
                    config = config,
                    restartPending = knob.key in pending,
                    onValue = { viewModel.setKnob(knob, it) },
                    onReset = { viewModel.resetKnob(knob) },
                )
            }
        }
        item(key = "analysis") { AnalysisSettingsSection() }
        item(key = "app") { AppSettingsSection(app) { viewModel.setApp(it) } }
        item(key = "debug") {
            DebugRow(enabled = app.debugEnabled, onEnabled = viewModel::setDebugEnabled, onOpen = onOpenDebug)
        }
        item(key = "footer") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SectionButton("Export settings as JSON") { share(context, exportText(context, config, app)) }
                SectionButton("Reset all to Python defaults") { onResetAll() }
            }
        }
    }
}

@Composable
private fun GroupHeader(
    group: KnobGroup,
    modified: Int,
    onResetGroup: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().padding(top = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = if (modified == 0) group.title else "${group.title}  •$modified modified",
            style = MaterialTheme.typography.titleMedium,
            color = OnSurface,
        )
        TextButton(onClick = onResetGroup) {
            Text("Reset group", style = MaterialTheme.typography.labelMedium, color = OnSurfaceMuted)
        }
    }
}

/**
 * The honest half of live tuning: the eleven-out-of-twelve case.
 *
 * The edit is already persisted — only its effect waits — and the bar says which knobs are waiting
 * and on what. It never offers a button that silently does nothing.
 */
@Composable
private fun RestartBar(
    pending: Set<String>,
    onRestartTracker: (() -> Unit)?,
    onRestarted: () -> Unit,
) {
    Column(Modifier.fillMaxWidth().padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            "Saved, waiting for a tracker restart: ${pending.sorted().joinToString(", ")}",
            style = MaterialTheme.typography.bodySmall,
            color = Busy,
        )
        if (onRestartTracker == null) {
            Text(
                "This build cannot restart the tracker from here — close and reopen the app to apply.",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceMuted,
            )
        } else {
            SectionButton("Apply & restart tracker") {
                onRestartTracker()
                onRestarted()
            }
        }
    }
}

@Composable
private fun ConfirmResetAll(
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Reset all to Python defaults?") },
        text = { Text("Every knob goes back to src/chesslab/config.py TRACK_DEFAULTS. Tuning done for this board is lost.") },
        confirmButton = { TextButton(onClick = onConfirm) { Text("Reset all") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

private fun exportText(
    context: Context,
    config: TrackerConfig,
    app: AppSettings,
): String = SettingsExport.toJson(config, app, appVersion(context), "${Build.MANUFACTURER} ${Build.MODEL}")

/** Read from the package, not from `BuildConfig`: this module does not generate one. */
private fun appVersion(context: Context): String =
    runCatching { context.packageManager.getPackageInfo(context.packageName, 0).versionName }.getOrNull() ?: "unknown"

/** Share, never write: a bug report has no business asking for storage permission. */
private fun share(
    context: Context,
    text: String,
) {
    val send =
        Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
        }
    context.startActivity(Intent.createChooser(send, "Export settings"))
}
