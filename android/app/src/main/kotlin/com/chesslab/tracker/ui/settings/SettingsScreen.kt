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
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
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
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space

/**
 * Settings, and behind one door the mobile equivalent of the desktop's `--flags`.
 *
 * `specs/12` D5 cut the tuning surface from the phone entirely, which made a bad board/lighting
 * combination unfixable in the field. Every knob is still here — but not HERE: specs/51 moved the
 * six tuning groups, `Device & model` and the debug panels behind **Developer**, because the ratio
 * on this screen was roughly ten machine settings to one of the user's.
 *
 * What is left is the Android Settings pattern, taken literally (the user, 2026-08-04: *"tbh make
 * the settings menu exactly like the android settings menu"*): rows with a leading icon and a
 * summary that states the CURRENT VALUE, no chevrons, grouped by heading and space rather than by
 * container. One component does both shapes — see [DisclosureRow].
 */
@Composable
fun SettingsRoute(
    onBack: () -> Unit,
    onOpenDebug: () -> Unit,
    onOpenCalibration: () -> Unit,
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
        SettingsScreen(remember(bound) { SettingsViewModel(bound) }, onBack, onOpenDebug, onOpenCalibration, onRestartTracker)
    }
}

@Composable
private fun SettingsScreen(
    viewModel: SettingsViewModel,
    onBack: () -> Unit,
    onOpenDebug: () -> Unit,
    onOpenCalibration: () -> Unit,
    onRestartTracker: (() -> Unit)?,
) {
    val config by viewModel.config.collectAsStateWithLifecycle()
    val app by viewModel.app.collectAsStateWithLifecycle()
    val pending by viewModel.restartRequired.collectAsStateWithLifecycle()
    val note by viewModel.note.collectAsStateWithLifecycle()
    var confirmResetAll by remember { mutableStateOf(false) }
    var resetGroup by remember { mutableStateOf<KnobGroup?>(null) }
    var place by remember { mutableStateOf<SettingsPlace>(SettingsPlace.Groups) }
    var query by remember { mutableStateOf("") }

    // The search box lives with the LIST, and after specs/51 the list is on the developer page:
    // searching four rows is furniture, while `censusThr` is exactly what somebody hunts for.
    val searching = place is SettingsPlace.Developer && query.isNotBlank()
    val title = if (searching) "Search" else settingsTitle(place)
    // One back affordance, one meaning, and the arrow and the SYSTEM button call the same lambda so
    // the two can never diverge. [parentOf] is what makes a tuning group return to Developer rather
    // than to the player's landing page two levels up.
    val up: () -> Unit = {
        if (searching) {
            query = ""
        } else {
            val parent = parentOf(place)
            if (parent == null) onBack() else place = parent
        }
    }
    BackHandler(enabled = place !is SettingsPlace.Groups, onBack = up)

    ChesslabScaffold(title, up) { bars ->
        Column(Modifier.fillMaxSize().padding(bars)) {
            note?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Accent) }
            if (place is SettingsPlace.Developer) SearchField(query) { query = it }
            SettingsList(
                viewModel,
                config,
                app,
                pending,
                place,
                query,
                SettingsNav(
                    openGroup = { place = it },
                    openDebug = onOpenDebug,
                    openCalibration = onOpenCalibration,
                    resetGroup = { resetGroup = it },
                    resetAll = { confirmResetAll = true },
                ),
                Modifier.weight(1f),
            )
            if (pending.isNotEmpty()) RestartBar(pending, onRestartTracker, viewModel::onRestarted)
        }
    }

    if (confirmResetAll) {
        ConfirmResetAll(modifiedKnobs(config).size, onConfirm = {
            confirmResetAll = false
            viewModel.resetAll()
        }, onDismiss = { confirmResetAll = false })
    }
    resetGroup?.let { group ->
        ConfirmResetGroup(group, config, onConfirm = {
            viewModel.resetGroup(group)
            resetGroup = null
        }, onDismiss = { resetGroup = null })
    }
}

/**
 * The SIXTH irreversible action, and specs/48's list did not have it: resetting one group throws
 * away exactly the same kind of tuning as resetting all of them, in one tap.
 */
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

/**
 * The places this screen can send you, and the two things it can reset.
 *
 * One object rather than five parameters threaded through [SettingsList] into [landing]: they travel
 * together, they are all "what happens when a row is tapped", and the list that carries them is a
 * [LazyListScope] extension where a long parameter list is at its least readable.
 */
private class SettingsNav(
    val openGroup: (SettingsPlace) -> Unit,
    val openDebug: () -> Unit,
    val openCalibration: () -> Unit,
    val resetGroup: (KnobGroup) -> Unit,
    val resetAll: () -> Unit,
)

/**
 * Android's own search bar, which is the whole specification (the user: *"like android does it in
 * the settings"*, with the magnifier on the right).
 *
 * It was a large rounded container whose placeholder — *"Search settings — try \"shadow\", \"cnn\",
 * \"timeout\""* — wrapped to two lines, so the tallest thing at the top of the screen was a hint
 * about how to use a search box. The examples moved into the empty result, where somebody who found
 * nothing can act on them.
 *
 * The trailing icon turns into a clear ✕ once there is text — the magnifier stays on the right for
 * the whole time it means anything, and the ✕ is the only affordance that can empty the field.
 */
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

    LazyColumn(modifier, verticalArrangement = Arrangement.spacedBy(Space.sm)) {
        if (searching && rows.isEmpty()) {
            item(key = "empty") { NoMatch(query) }
        }
        if (place is SettingsPlace.Group) {
            item(key = "resetGroup") {
                OutlineAction("Reset ${place.group.title} to defaults", { nav.resetGroup(place.group) })
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
        subpage(place, app, viewModel)
        if (place is SettingsPlace.Groups) landing(app, nav)
        if (place is SettingsPlace.Developer && !searching) developer(viewModel, config, app, context, nav)
    }
}

/** The examples that used to be the placeholder, where they are of some use: nothing was found. */
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

/** The subpages that are not knob lists. Each is exactly what used to be a surface of its own. */
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
        SettingsPlace.Board -> item(key = "board") { BoardOrientationSection(app) { viewModel.setApp(it) } }
        else -> Unit
    }
}

/**
 * **The player's screen.** Four things a chess player changes, two doors for the board, and one
 * clearly labelled door for everything that belongs to the machine.
 *
 * Every summary states the CURRENT VALUE rather than describing the destination, which is the half
 * of the Android pattern that does the work: `Spoken moves · Off` answers the question without the
 * tap. The two board rows are grouped by a heading and separated by rules, never by a container.
 */
private fun LazyListScope.landing(
    app: AppSettings,
    nav: SettingsNav,
) {
    item(key = "board-heading") { SectionHeading("Board") }
    // The SECOND door to calibration (specs/48 §3). It is a setup task that happens to need a live
    // camera, so the tracker reaches it too — but somebody looking for setup looks in Settings, and
    // two entrances to one room is not duplication as long as they are one route (`ROUTE_CAMERA`).
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

/**
 * The engine's summary, read from the host rather than passed down: it is the only consumer and
 * `AnalysisSettingsHost` is a singleton flow, so threading it through two layout functions would buy
 * nothing.
 */
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

/**
 * The recorder's summary. [com.chesslab.tracker.record.RecordingSettings.load] is called here
 * because the cache is otherwise the DEFAULT until the tracker service has wired itself — a summary
 * that reads "Off" over a running recorder is worse than no summary at all.
 */
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

/**
 * **The developer door.** Everything whose usable range was established by measurement rather than
 * by preference: the six tuning groups, the device and model choices, the diagnostics, the export
 * and the reset.
 *
 * **There is no gate in front of it** — no switch, no seven taps — and that is decided rather than
 * skipped. Nothing here is dangerous to LOOK at; the danger is a stray tuning knob, and a knob needs
 * a deliberate slider drag, not a stumble. A hidden entrance would recreate exactly what `specs/12`
 * D5 cost: a bad board under a strange lamp with no way to fix it in the field. `debugEnabled` keeps
 * its real job one row below, which is gating the debug PAYLOAD's cost, not access to it.
 */
private fun LazyListScope.developer(
    viewModel: SettingsViewModel,
    config: TrackerConfig,
    app: AppSettings,
    context: Context,
    nav: SettingsNav,
) {
    val changed = modifiedKnobs(config)
    if (changed.isNotEmpty()) {
        // First, and only when it exists: on a tuned board this is the whole answer to "what did I
        // do to this thing", and on a fresh one it is noise.
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
    item(key = "device-heading") { SectionHeading("Device") }
    item(key = "device-row") {
        DisclosureRow("Device & model", "Camera resolution, CNN model, graph and execution provider") {
            nav.openGroup(SettingsPlace.Device)
        }
    }
    item(key = "diagnostics-heading") { SectionHeading("Diagnostics") }
    // The debug panels kept their own route: `TrackerStatus.debug` is assembled only while that
    // screen is composed, and thirteen panels do not belong inside a settings LazyColumn. What the
    // user asked to remove was the MENU ENTRY beside "Spoken moves", and this is where it went.
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

/** `Off`, or the two facts the subpage would tell you anyway. */
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
            // The screen's ONE filled action, and it only exists while there is something to apply.
            FilledAction("Apply & restart tracker", {
                onRestartTracker()
                onRestarted()
            })
        }
    }
}

/** Irreversible: every value tuned for this board. The body counts how many are about to move. */
@Composable
private fun ConfirmResetAll(
    modified: Int,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    ConfirmDialog(
        title = "Reset all to Python defaults?",
        body =
            "$modified ${if (modified == 1) "setting is" else "settings are"} away from " +
                "src/chesslab/config.py TRACK_DEFAULTS and go back to it. Tuning done for this board " +
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
