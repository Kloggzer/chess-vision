package com.chesslab.tracker.ui.settings

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.games.GameSessionState
import com.chesslab.tracker.record.RecordingPrefs
import com.chesslab.tracker.record.RecordingSettings
import com.chesslab.tracker.record.SessionInfo
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.record.formatBytes
import com.chesslab.tracker.record.zipSession
import com.chesslab.tracker.sync.readMark
import com.chesslab.tracker.ui.ConfirmDialog
import com.chesslab.tracker.ui.TextAction
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.games.RecordingSettingsHost
import com.chesslab.tracker.ui.games.sessionsDir
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.io.File

private const val MB = 1024L * 1024L

// 8 GB is `DEFAULT_CAP_BYTES`: a default the picker cannot show is a row with nothing selected.
private val CAPS = listOf(250L * MB, 1024L * MB, 2048L * MB, 8192L * MB, 0L)

/** Also the Settings landing summary — one place decides how a storage cap is written. */
internal fun capLabel(bytes: Long): String = if (bytes <= 0L) "unlimited" else formatBytes(bytes)

/** The screen renders before the service is bound; an unbound live game is simply an empty one. */
private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())

data class RecordingUi(
    val prefs: RecordingPrefs = RecordingPrefs(),
    val sessions: List<SessionInfo> = emptyList(),
    val sessionBytes: Long = 0L,
    /** Sessions the PC has acknowledged — the one thing that makes deleting one here safe. */
    val transferred: Set<String> = emptySet(),
)

/**
 * Recording's own state, split off the games screen when the panel moved here.
 *
 * [RecordingUi.sessionBytes] walks the sessions tree, so it is read on screen entry and on an
 * explicit action, never on the capture path.
 */
class RecordingViewModel(
    private val sessions: SessionStore,
    private val settings: RecordingSettings,
    private val scope: CoroutineScope,
) {
    private val mutable = MutableStateFlow(RecordingUi())
    val ui: StateFlow<RecordingUi> = mutable

    fun refresh() =
        io {
            val list = sessions.list()
            mutable.value =
                RecordingUi(
                    settings.load(),
                    list,
                    sessions.totalBytes(),
                    list.filter { readMark(sessions.dir(it.id)) != null }.map { it.id }.toSet(),
                )
        }

    fun setPrefs(prefs: RecordingPrefs) =
        io {
            settings.save(prefs)
            mutable.value = mutable.value.copy(prefs = prefs)
        }

    fun deleteSession(id: String) =
        io {
            sessions.delete(id)
            val list = sessions.list()
            mutable.value =
                mutable.value.copy(
                    sessions = list,
                    sessionBytes = sessions.totalBytes(),
                    transferred = list.filter { readMark(sessions.dir(it.id)) != null }.map { it.id }.toSet(),
                )
        }

    fun sessionDir(id: String): File = sessions.dir(id)

    private fun io(block: suspend () -> Unit) {
        scope.launch(Dispatchers.IO) { block() }
    }
}

/**
 * Session recording, off by default — a Settings subpage since specs/47.
 *
 * It was the first and tallest card on the Games screen, which is the screen that holds the game
 * library: a five-line explainer, four size chips and a second toggle, above the games themselves.
 * It is a setting; this is where settings are.
 *
 * The explanation is not decoration: this is the one switch in the app that makes the phone write
 * hundreds of megabytes of its own storage, and the payoff (auto-labeled training data for
 * `chesslab slice`) is invisible on the device itself.
 */
@Composable
fun RecordingSection() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val model =
        remember(context) {
            RecordingViewModel(SessionStore(sessionsDir(context)), RecordingSettingsHost.get(context), scope)
        }
    LaunchedEffect(model) { model.refresh() }
    val ui by model.ui.collectAsStateWithLifecycle()
    val controller by GameSessionHost.controller.collectAsStateWithLifecycle()
    val live by (controller?.state ?: NO_LIVE_GAME).collectAsStateWithLifecycle()
    var expanded by remember { mutableStateOf(false) }

    Column {
        SwitchPreference(
            title = "Record training video",
            summary = "Save QHD video, tracker timeline and one reference frame per committed move",
            checked = ui.prefs.enabled,
            onCheckedChange = { model.setPrefs(ui.prefs.copy(enabled = it)) },
        )
        PreferenceRow("Recording status", recordingStatus(live, tracking = controller != null, enabled = ui.prefs.enabled))
        live.recordingReason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
        ValuePreference(
            title = "Storage limit",
            summary = "${formatBytes(ui.sessionBytes)} in ${ui.sessions.size} sessions",
            options = CAPS.map { capLabel(it) to it },
            selected = ui.prefs.capBytes,
            onSelect = { model.setPrefs(ui.prefs.copy(capBytes = it)) },
        )
        if (ui.prefs.capBytes in 1..<ui.sessionBytes) {
            Text(
                "Recording is paused because the existing data exceeds this limit. Nothing was deleted.",
                style = MaterialTheme.typography.bodySmall,
                color = Busy,
            )
        }
        SwitchPreference(
            title = "Reject impossible positions",
            summary = "Skip frames whose piece inventory cannot occur in a legal game",
            checked = ui.prefs.inventoryFilter,
            onCheckedChange = { model.setPrefs(ui.prefs.copy(inventoryFilter = it)) },
        )
        PreferenceRow(
            title = "Stored recordings",
            summary = "${ui.sessions.size} sessions · ${formatBytes(ui.sessionBytes)}",
            value = if (expanded) "Hide" else "Show",
            onClick = { expanded = !expanded },
        )
        if (expanded) ui.sessions.forEach { SessionRow(it, model, it.id in ui.transferred) }
    }
}

/**
 * What the running recorder is actually doing.
 *
 * The panel used to show only the on-disk total, and that is a snapshot taken when the screen
 * opened. A recorder that had silently stopped writing — cap reached, geometry suspended, a frame
 * that would not encode — was indistinguishable from one that was working, which is why the only
 * report this feature ever got was "recording doesn't work well".
 *
 * ARMED is its own state since the pre-roll (2026-08-14): while the tracker runs and no move has
 * committed, nothing is on disk BY DESIGN — the encoder holds the last 20 s in memory and the
 * first committed move writes them out. A row that implied "recording" here would be the lie the
 * measurement caught from the other side: eleven recordings, nine without a game.
 */
private fun recordingStatus(
    live: GameSessionState,
    tracking: Boolean,
    enabled: Boolean,
): String {
    val session = live.recordingSessionId
    return when {
        session != null -> "Recording $session · ${live.recordedFrames} reference frames written"
        tracking && enabled -> "Armed — video starts with the first move"
        else -> "Start the tracker to open a recording session"
    }
}

@Composable
private fun SessionRow(
    session: SessionInfo,
    model: RecordingViewModel,
    transferred: Boolean,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val export =
        rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/zip")) { uri ->
            uri ?: return@rememberLauncherForActivityResult
            // SAF: the user picks the destination, so no storage permission is involved.
            scope.launch(Dispatchers.IO) {
                context.contentResolver.openOutputStream(uri)?.use { zipSession(model.sessionDir(session.id), it) }
            }
        }
    var confirming by remember { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(
            "${session.id} · ${session.frames} frames · ${formatBytes(session.bytes)}" + if (transferred) " · on the PC" else "",
            style = MaterialTheme.typography.bodySmall,
            color = if (transferred) Accent else OnSurfaceMuted,
            modifier = Modifier.weight(1f).padding(end = Space.sm),
        )
        Row {
            TextAction("Export", { export.launch("${session.id}.zip") })
            TextButton(onClick = { confirming = true }) { Text("Delete", color = Danger) }
        }
    }
    // The SEVENTH irreversible action, and not on the pack's list either. These frames are the only
    // copy: nothing on the phone reads them back, so a deletion is discovered on the PC or not at all.
    if (confirming) {
        ConfirmDialog(
            title = "Delete ${session.id}?",
            body =
                if (transferred) {
                    "${session.frames} recorded frames, ${formatBytes(session.bytes)}. This session has been transferred " +
                        "to the PC, so the copy that matters survives. This cannot be undone."
                } else {
                    "${session.frames} recorded frames, ${formatBytes(session.bytes)}. They exist nowhere else unless " +
                        "this session was exported. This cannot be undone."
                },
            verb = "Delete",
            onConfirm = {
                model.deleteSession(session.id)
                confirming = false
            },
            onDismiss = { confirming = false },
        )
    }
}
