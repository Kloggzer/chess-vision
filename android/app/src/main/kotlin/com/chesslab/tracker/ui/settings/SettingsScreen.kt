package com.chesslab.tracker.ui.settings

import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.analysis.AnalysisSettings
import com.chesslab.tracker.analysis.AnalysisSettingsHost
import com.chesslab.tracker.record.RecordingPrefs
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.SettingsHost
import com.chesslab.tracker.speech.ui.SPEECH_LANGUAGES
import com.chesslab.tracker.speech.ui.SpeechSection
import com.chesslab.tracker.sync.SyncHost
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.ConfirmDialog
import com.chesslab.tracker.ui.DangerAction
import com.chesslab.tracker.ui.DisclosureRow
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.SectionHeading
import com.chesslab.tracker.ui.games.RecordingSettingsHost
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space

/** The phone keeps every knob — cutting them made a bad board/lighting unfixable in the field — but behind
 *  **Developer** (specs/51). The rest follows the Android Settings pattern: summaries state the CURRENT VALUE. */
@Composable
fun SettingsRoute(
    onBack: () -> Unit,
    onOpenDebug: () -> Unit,
    onOpenCalibration: () -> Unit,
    onOpenCapture: () -> Unit,
    onRestartTracker: (() -> Unit)? = null,
) {
    val repository by SettingsHost.repository.collectAsStateWithLifecycle()
    val bound = repository
    if (bound == null) {
        Column(Modifier.fillMaxSize().padding(Space.lg), verticalArrangement = Arrangement.spacedBy(Space.md)) {
            Text("Reading the stored settings…", color = OnSurfaceMuted)
            OutlineAction("Back", onBack)
        }
    } else {
        SettingsScreen(
            remember(bound) { SettingsViewModel(bound) },
            onBack,
            onOpenDebug,
            onOpenCalibration,
            onOpenCapture,
            onRestartTracker,
        )
    }
}

@Composable
private fun SettingsScreen(
    viewModel: SettingsViewModel,
    onBack: () -> Unit,
    onOpenDebug: () -> Unit,
    onOpenCalibration: () -> Unit,
    onOpenCapture: () -> Unit,
    onRestartTracker: (() -> Unit)?,
) {
    val config by viewModel.config.collectAsStateWithLifecycle()
    val app by viewModel.app.collectAsStateWithLifecycle()
    val pending by viewModel.restartRequired.collectAsStateWithLifecycle()
    val note by viewModel.note.collectAsStateWithLifecycle()
    val saveError by viewModel.saveError.collectAsStateWithLifecycle()
    val loadNote by viewModel.loadNote.collectAsStateWithLifecycle()
    val screen = remember { SettingsUiState() }

    val title = if (screen.searchOpen) "Search" else settingsTitle(screen.place)
    // The app-bar arrow and system Back share this parent traversal.
    val up: () -> Unit = { screen.up(onBack) }
    BackHandler(enabled = screen.place !is SettingsPlace.Groups || screen.searchOpen, onBack = up)

    ChesslabScaffold(
        title = title,
        onBack = up,
        actions = {
            SettingsActions(
                place = screen.place,
                searchOpen = screen.searchOpen,
                onSearch = { screen.searchOpen = true },
                onReset = { screen.resetGroup = it },
            )
        },
    ) { bars ->
        Column(Modifier.fillMaxSize().padding(bars)) {
            (saveError ?: loadNote)?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
            note?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Accent) }
            if (screen.place is SettingsPlace.Developer && screen.searchOpen) SearchField(screen.query) { screen.query = it }
            SettingsList(
                viewModel,
                config,
                app,
                pending,
                screen.place,
                screen.query,
                SettingsNav(
                    openGroup = { screen.place = it },
                    openDebug = onOpenDebug,
                    openCalibration = onOpenCalibration,
                    openCapture = onOpenCapture,
                    resetGroup = { screen.resetGroup = it },
                    resetAll = { screen.confirmResetAll = true },
                ),
                Modifier.weight(1f),
            )
            if (pending.isNotEmpty()) RestartBar(pending, onRestartTracker, viewModel::onRestarted)
        }
    }

    SettingsResetDialogs(
        confirmResetAll = screen.confirmResetAll,
        resetGroup = screen.resetGroup,
        config = config,
        viewModel = viewModel,
        dismissAll = { screen.confirmResetAll = false },
        dismissGroup = { screen.resetGroup = null },
    )
}

private class SettingsUiState {
    var confirmResetAll by mutableStateOf(false)
    var resetGroup by mutableStateOf<KnobGroup?>(null)
    var place by mutableStateOf<SettingsPlace>(SettingsPlace.Groups)
    var query by mutableStateOf("")
    var searchOpen by mutableStateOf(false)

    fun up(onBack: () -> Unit) {
        if (searchOpen) {
            query = ""
            searchOpen = false
            return
        }
        val parent = parentOf(place)
        if (parent == null) onBack() else place = parent
    }
}

@Composable
private fun SettingsResetDialogs(
    confirmResetAll: Boolean,
    resetGroup: KnobGroup?,
    config: TrackerConfig,
    viewModel: SettingsViewModel,
    dismissAll: () -> Unit,
    dismissGroup: () -> Unit,
) {
    if (confirmResetAll) {
        ConfirmResetAll(
            modifiedKnobs(config).size,
            onConfirm = {
                dismissAll()
                viewModel.resetAll()
            },
            onDismiss = dismissAll,
        )
    }
    resetGroup?.let { group ->
        ConfirmResetGroup(
            group,
            config,
            onConfirm = {
                viewModel.resetGroup(group)
                dismissGroup()
            },
            onDismiss = dismissGroup,
        )
    }
}

@Composable
private fun SettingsActions(
    place: SettingsPlace,
    searchOpen: Boolean,
    onSearch: () -> Unit,
    onReset: (KnobGroup) -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }
    if (place is SettingsPlace.Developer && !searchOpen) {
        IconButton(onClick = onSearch) {
            Icon(Icons.Filled.Search, contentDescription = "Search settings")
        }
    }
    val group = place as? SettingsPlace.Group ?: return
    IconButton(onClick = { menuOpen = true }) {
        Icon(Icons.Filled.MoreVert, contentDescription = "Section options")
    }
    DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
        DropdownMenuItem(
            text = { Text("Reset ${group.group.title} to defaults") },
            onClick = {
                menuOpen = false
                onReset(group.group)
            },
        )
    }
}

/** Irreversible: resetting one group throws away the same kind of tuning as resetting all. */
@Composable
private fun ConfirmResetGroup(
    group: KnobGroup,
    config: TrackerConfig,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    ConfirmDialog(
        title = "Reset ${group.title} to defaults?",
        body =
            "${modifiedCount(group, config)} of ${knobsIn(group).size} settings in this group are " +
                "away from the Python default and go back to it. This cannot be undone.",
        verb = "Reset ${group.title}",
        onConfirm = onConfirm,
        onDismiss = onDismiss,
    )
}

private class SettingsNav(
    val openGroup: (SettingsPlace) -> Unit,
    val openDebug: () -> Unit,
    val openCalibration: () -> Unit,
    val openCapture: () -> Unit,
    val resetGroup: (KnobGroup) -> Unit,
    val resetAll: () -> Unit,
)

/** Android's own search bar. The examples moved out of the placeholder (it wrapped to two lines) into
 *  the empty result; the ✕ is the only affordance that can empty the field. */
@Composable
private fun SearchField(
    query: String,
    onQuery: (String) -> Unit,
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQuery,
        singleLine = true,
        shape = RoundedCornerShape(Radius.lg),
        modifier = Modifier.fillMaxWidth().padding(vertical = Space.sm),
        placeholder = { Text("Search settings", color = OnSurfaceMuted) },
        trailingIcon = {
            if (query.isEmpty()) {
                Icon(Icons.Filled.Search, contentDescription = "Search", tint = OnSurfaceMuted)
            } else {
                IconButton(onClick = { onQuery("") }) {
                    Icon(Icons.Filled.Close, contentDescription = "Clear search", tint = OnSurfaceMuted)
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
    nav: SettingsNav,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val searching = place is SettingsPlace.Developer && query.isNotBlank()
    val rows =
        when {
            searching -> searchKnobs(query)
            place is SettingsPlace.Group -> knobsIn(place.group)
            place is SettingsPlace.Modified -> modifiedKnobs(config)
            else -> emptyList()
        }

    LazyColumn(modifier, verticalArrangement = Arrangement.Top) {
        if (searching && rows.isEmpty()) {
            item(key = "empty") { NoMatch(query) }
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
        subpage(place, app, viewModel)
        if (place is SettingsPlace.Groups) landing(app, nav)
        if (place is SettingsPlace.Developer && !searching) developer(viewModel, config, app, context, nav)
    }
}

@Composable
private fun NoMatch(query: String) {
    Column(verticalArrangement = Arrangement.spacedBy(Space.xs)) {
        Text("Nothing matches “$query”.", style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted)
        Text(
            "The key, the group and the explanation are all searched — try “shadow”, “cnn” or “timeout”.",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
    }
}

private fun LazyListScope.subpage(
    place: SettingsPlace,
    app: AppSettings,
    viewModel: SettingsViewModel,
) {
    when (place) {
        SettingsPlace.Speech -> item(key = "speech") { SpeechSection() }
        SettingsPlace.Analysis -> item(key = "analysis") { AnalysisSettingsSection() }
        SettingsPlace.Recording -> item(key = "recording") { RecordingSection() }
        SettingsPlace.Transfer -> item(key = "transfer") { TransferSection() }
        SettingsPlace.Device -> item(key = "device") { AppSettingsSection(app) { viewModel.setApp(it) } }
        SettingsPlace.Board -> item(key = "board") { BoardOrientationSection(app) { viewModel.setApp(it) } }
        else -> Unit
    }
}

/** **The player's screen.** Every summary states the CURRENT VALUE (`Spoken moves · Off`), which answers
 *  without the tap. */
private fun LazyListScope.landing(
    app: AppSettings,
    nav: SettingsNav,
) {
    item(key = "board-heading") { SectionHeading("Board") }
    // The SECOND door to calibration: somebody looking for setup looks in Settings; one route (`ROUTE_CAMERA`).
    item(key = "calibration-row") {
        DisclosureRow(
            title = "Board calibration",
            subtitle = "Point the camera at the board and fit the grid",
            onOpen = nav.openCalibration,
            icon = Icons.Filled.Place,
            chevron = false,
        )
    }
    item(key = "orientation-row") {
        DisclosureRow(
            title = "Board orientation",
            subtitle = app.orientation.label,
            onOpen = { nav.openGroup(SettingsPlace.Board) },
            icon = Icons.Filled.Refresh,
            chevron = false,
        )
    }
    item(key = "playing-heading") { SectionHeading("Playing") }
    item(key = "speech-row") {
        DisclosureRow(
            title = "Spoken moves",
            subtitle = speechSummary(app),
            onOpen = { nav.openGroup(SettingsPlace.Speech) },
            icon = Icons.Filled.Notifications,
            chevron = false,
        )
    }
    item(key = "analysis-row") { AnalysisRow(nav) }
    item(key = "recording-row") { RecordingRow(nav) }
    item(key = "transfer-row") { TransferRow(nav) }
    item(key = "capture-row") { CaptureRow(nav) }
    item(key = "camera-heading") { SectionHeading("Camera & model") }
    // Die drei, die der Nutzer tatsaechlich anfasst (fps, Aufloesung, Modell) — nicht hinter der Developer-Tuer.
    item(key = "device-row-top") {
        DisclosureRow(
            title = "Camera & model",
            subtitle = "${app.resolutionMode.label} · ${app.frameRate.label} · ${app.modelDir}",
            onOpen = { nav.openGroup(SettingsPlace.Device) },
            icon = Icons.Filled.Build,
            chevron = false,
        )
    }
    item(key = "advanced-heading") { SectionHeading("Advanced") }
    item(key = "developer-row") {
        DisclosureRow(
            title = "Developer",
            subtitle = "Tracker tuning, diagnostics, export and reset",
            onOpen = { nav.openGroup(SettingsPlace.Developer) },
            icon = Icons.Filled.Build,
            chevron = false,
        )
    }
}

/** Not behind the developer door: a RECORDING task the user starts on purpose. */
@Composable
private fun CaptureRow(nav: SettingsNav) {
    DisclosureRow(
        title = "Targeted capture",
        subtitle = "Record the shots the coverage report asks for",
        onOpen = nav.openCapture,
        icon = Icons.Filled.Star,
        chevron = false,
    )
}

/** From the host: [landing] is a `LazyListScope`, not a composable. */
@Composable
private fun AnalysisRow(nav: SettingsNav) {
    val analysis by AnalysisSettingsHost.settings.collectAsStateWithLifecycle()
    DisclosureRow(
        title = "Analysis",
        subtitle = analysisSummary(analysis),
        onOpen = { nav.openGroup(SettingsPlace.Analysis) },
        icon = Icons.Filled.Star,
        chevron = false,
    )
}

/** `load()` here: until the service has wired itself the cache is the DEFAULT, and "Off" over a running
 *  recorder is worse than no summary. */
@Composable
private fun RecordingRow(nav: SettingsNav) {
    val context = LocalContext.current
    val settings = remember(context) { RecordingSettingsHost.get(context) }
    LaunchedEffect(settings) { settings.load() }
    val prefs by settings.prefs.collectAsStateWithLifecycle()
    DisclosureRow(
        title = "Recording",
        subtitle = recordingSummary(prefs),
        onOpen = { nav.openGroup(SettingsPlace.Recording) },
        icon = Icons.Filled.PlayArrow,
        chevron = false,
    )
}

@Composable
private fun TransferRow(nav: SettingsNav) {
    val context = LocalContext.current
    val settings = remember(context) { SyncHost.get(context) }
    LaunchedEffect(settings) { settings.load() }
    val prefs by settings.prefs.collectAsStateWithLifecycle()
    val report by SyncHost.report.collectAsStateWithLifecycle()
    DisclosureRow(
        title = "Transfer",
        subtitle = transferSummary(prefs, report),
        onOpen = { nav.openGroup(SettingsPlace.Transfer) },
        icon = Icons.Filled.Refresh,
        chevron = false,
    )
}

/** **The developer door**, deliberately without a gate: nothing here is dangerous to LOOK at, and a hidden
 *  entrance recreates specs/12 D5 — a bad board under a strange lamp, unfixable in the field. */
private fun LazyListScope.developer(
    viewModel: SettingsViewModel,
    config: TrackerConfig,
    app: AppSettings,
    context: Context,
    nav: SettingsNav,
) {
    val changed = modifiedKnobs(config)
    if (changed.isNotEmpty()) {
        // First, and only when it exists: on a tuned board it answers "what did I do to this thing".
        item(key = "modified") {
            DisclosureRow("Modified", "${changed.size} away from the Python default") {
                nav.openGroup(SettingsPlace.Modified)
            }
        }
    }
    item(key = "tracking-heading") { SectionHeading("Tracker tuning") }
    items(KnobGroup.entries.size, key = { KnobGroup.entries[it].name }) { index ->
        val group = KnobGroup.entries[index]
        val n = modifiedCount(group, config)
        DisclosureRow(
            title = group.title,
            subtitle = "${knobsIn(group).size} settings" + if (n > 0) "  •$n modified" else "",
        ) { nav.openGroup(SettingsPlace.Group(group)) }
    }
    item(key = "runtime-heading") { SectionHeading("Runtime") }
    item(key = "runtime-row") { RuntimeSettingsSection(app) { viewModel.setApp(it) } }
    item(key = "diagnostics-heading") { SectionHeading("Diagnostics") }
    // Its own route: `TrackerStatus.debug` is assembled only while that screen is composed.
    item(key = "debug") {
        DebugRow(enabled = app.debugEnabled, onEnabled = viewModel::setDebugEnabled, onOpen = nav.openDebug)
    }
    item(key = "footer") {
        Row(horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
            OutlineAction("Export settings as JSON", { share(context, exportText(context, config, app)) })
            DangerAction("Reset all to Python defaults", nav.resetAll)
        }
    }
}

internal fun speechSummary(app: AppSettings): String =
    if (!app.speechEnabled) {
        "Off"
    } else {
        val language = SPEECH_LANGUAGES.firstOrNull { it.second == app.speechLanguage }?.first ?: app.speechLanguage
        "$language · ${app.speechVerbosity.label}"
    }

internal fun analysisSummary(settings: AnalysisSettings): String =
    if (!settings.enabled) "Off" else "Stockfish · ${settings.options.movetimeMs} ms a move"

internal fun recordingSummary(prefs: RecordingPrefs): String =
    when {
        !prefs.enabled -> "Off"
        prefs.capBytes <= 0L -> "On · no storage limit"
        else -> "On · up to ${capLabel(prefs.capBytes)}"
    }

/** The edit is already persisted, only its effect waits; the bar says which knobs wait. Never a button
 *  that silently does nothing. */
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
            FilledAction("Apply & restart tracker", {
                onRestartTracker()
                onRestarted()
            })
        }
    }
}

@Composable
private fun ConfirmResetAll(
    modified: Int,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    ConfirmDialog(
        title = "Reset all to engine defaults?",
        body =
            "$modified ${if (modified == 1) "setting is" else "settings are"} away from " +
                "the engine defaults (TrackerConfig) and go back to them. Tuning done for this board " +
                "is lost and cannot be undone.",
        verb = "Reset all",
        onConfirm = onConfirm,
        onDismiss = onDismiss,
    )
}

private fun exportText(
    context: Context,
    config: TrackerConfig,
    app: AppSettings,
): String = SettingsExport.toJson(config, app, appVersion(context), "${Build.MANUFACTURER} ${Build.MODEL}")

/** From the package: this module generates no `BuildConfig`. */
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
