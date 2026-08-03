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
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.SettingsHost
import com.chesslab.tracker.speech.ui.SpeechSection
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.DisclosureRow
import com.chesslab.tracker.ui.SectionHeading
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space

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
        Column(Modifier.fillMaxSize().padding(Space.lg), verticalArrangement = Arrangement.spacedBy(Space.md)) {
            Text("Reading the stored settings…", color = OnSurfaceMuted)
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
    var place by remember { mutableStateOf<SettingsPlace>(SettingsPlace.Groups) }
    var query by remember { mutableStateOf("") }

    // One back affordance, two meanings: inside a group it returns to the list, at the top it
    // leaves. A screen that drops you out of Settings from three levels down is the reason nobody
    // opens the third level twice.
    val title = if (query.isNotBlank()) "Search" else settingsTitle(place)
    val up: () -> Unit = { if (place is SettingsPlace.Groups) onBack() else place = SettingsPlace.Groups }

    ChesslabScaffold(title, up) { bars ->
        Column(Modifier.fillMaxSize().padding(bars)) {
            note?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Accent) }
            SearchField(query) { query = it }
            SettingsList(
                viewModel,
                config,
                app,
                pending,
                place,
                query,
                onOpenDebug,
                Modifier.weight(1f),
                onOpenGroup = { place = it },
                onResetAll = { confirmResetAll = true },
            )
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

/** Filters as you type, across key, group and the help line — see [searchKnobs]. */
@Composable
private fun SearchField(
    query: String,
    onQuery: (String) -> Unit,
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQuery,
        singleLine = true,
        modifier = Modifier.fillMaxWidth().padding(vertical = Space.sm),
        placeholder = { Text("Search settings — try \"shadow\", \"cnn\", \"timeout\"", color = OnSurfaceMuted) },
        trailingIcon = {
            if (query.isNotEmpty()) {
                TextButton(onClick = { onQuery("") }) {
                    Text("clear", style = MaterialTheme.typography.labelMedium, color = OnSurfaceMuted)
                }
            }
        },
    )
}

@Composable
private fun SettingsList(
    viewModel: SettingsViewModel,
    config: TrackerConfig,
    app: AppSettings,
    pending: Set<String>,
    place: SettingsPlace,
    query: String,
    onOpenDebug: () -> Unit,
    modifier: Modifier = Modifier,
    onOpenGroup: (SettingsPlace) -> Unit,
    onResetAll: () -> Unit,
) {
    val context = LocalContext.current
    val rows =
        when {
            query.isNotBlank() -> searchKnobs(query)
            place is SettingsPlace.Group -> knobsIn(place.group)
            place is SettingsPlace.Modified -> modifiedKnobs(config)
            else -> emptyList()
        }
    val listing = query.isBlank() && place is SettingsPlace.Groups

    LazyColumn(modifier, verticalArrangement = Arrangement.spacedBy(Space.sm)) {
        if (query.isNotBlank() && rows.isEmpty()) {
            item(key = "empty") {
                Text("Nothing matches “$query”.", style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted)
            }
        }
        if (place is SettingsPlace.Group && query.isBlank()) {
            item(key = "resetGroup") {
                Row(horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
                    SectionButton("Reset ${place.group.title} to defaults") { viewModel.resetGroup(place.group) }
                }
            }
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
        if (query.isBlank()) subpage(place, app, viewModel)
        if (listing) landing(viewModel, config, app, context, onOpenGroup, onOpenDebug, onResetAll)
    }
}

/** The four pages that are not knob lists. Each is exactly what used to be a surface of its own. */
private fun LazyListScope.subpage(
    place: SettingsPlace,
    app: AppSettings,
    viewModel: SettingsViewModel,
) {
    when (place) {
        SettingsPlace.Speech -> item(key = "speech") { SpeechSection() }
        SettingsPlace.Analysis -> item(key = "analysis") { AnalysisSettingsSection() }
        SettingsPlace.Recording -> item(key = "recording") { RecordingSection() }
        SettingsPlace.Device -> item(key = "device") { AppSettingsSection(app) { viewModel.setApp(it) } }
        else -> Unit
    }
}

/**
 * The landing page: what was changed, the six tracker groups, the four app pages, diagnostics.
 *
 * Every row is the same [DisclosureRow] the review screen's "Analysis details" uses — one
 * disclosure pattern for the whole app — and the three headings exist so that eleven of them are
 * not one flat wall.
 */
private fun LazyListScope.landing(
    viewModel: SettingsViewModel,
    config: TrackerConfig,
    app: AppSettings,
    context: Context,
    onOpenGroup: (SettingsPlace) -> Unit,
    onOpenDebug: () -> Unit,
    onResetAll: () -> Unit,
) {
    val changed = modifiedKnobs(config)
    if (changed.isNotEmpty()) {
        // First, and only when it exists: on a tuned board this is the whole answer to "what did I
        // do to this thing", and on a fresh one it is noise.
        item(key = "modified") {
            DisclosureRow("Modified", "${changed.size} away from the Python default") {
                onOpenGroup(SettingsPlace.Modified)
            }
        }
    }
    item(key = "tracking-heading") { SectionHeading("TRACKING") }
    items(KnobGroup.entries.size, key = { KnobGroup.entries[it].name }) { index ->
        val group = KnobGroup.entries[index]
        val n = modifiedCount(group, config)
        DisclosureRow(
            title = group.title,
            subtitle = "${knobsIn(group).size} settings" + if (n > 0) "  •$n modified" else "",
        ) { onOpenGroup(SettingsPlace.Group(group)) }
    }
    item(key = "app-heading") { SectionHeading("APP") }
    item(key = "speech-row") {
        DisclosureRow("Spoken moves", "Announce moves and alarms, language, verbosity") {
            onOpenGroup(SettingsPlace.Speech)
        }
    }
    item(key = "analysis-row") {
        DisclosureRow("Analysis (Stockfish)", "The engine beside the board, and when it may run") {
            onOpenGroup(SettingsPlace.Analysis)
        }
    }
    item(key = "recording-row") {
        DisclosureRow("Recording", "Store camera frames as training data") {
            onOpenGroup(SettingsPlace.Recording)
        }
    }
    item(key = "device-row") {
        DisclosureRow("Device & model", "Camera resolution, board orientation, CNN model and provider") {
            onOpenGroup(SettingsPlace.Device)
        }
    }
    item(key = "diagnostics-heading") { SectionHeading("DIAGNOSTICS") }
    item(key = "debug") {
        DebugRow(enabled = app.debugEnabled, onEnabled = viewModel::setDebugEnabled, onOpen = onOpenDebug)
    }
    item(key = "footer") {
        Row(horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
            SectionButton("Export settings as JSON") { share(context, exportText(context, config, app)) }
            SectionButton("Reset all to Python defaults") { onResetAll() }
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
    Column(Modifier.fillMaxWidth().padding(top = Space.sm), verticalArrangement = Arrangement.spacedBy(Space.xs)) {
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
