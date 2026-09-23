package com.chesslab.tracker.ui.settings

import android.provider.DocumentsContract
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
import com.chesslab.tracker.ui.launchStorageWork
import com.chesslab.tracker.ui.notSaved
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart.ATOMIC
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.job
import java.io.FilterOutputStream
import java.io.IOException
import java.io.OutputStream
import kotlin.coroutines.CoroutineContext

private const val MB = 1024L * 1024L

// 8 GB is `DEFAULT_CAP_BYTES`: a default the picker cannot show is a row with nothing selected.
private val CAPS = listOf(250L * MB, 1024L * MB, 2048L * MB, 8192L * MB, 0L)

internal fun capLabel(bytes: Long): String = if (bytes <= 0L) "unlimited" else formatBytes(bytes)

private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())

data class RecordingUi(
    val prefs: RecordingPrefs = RecordingPrefs(),
    val sessions: List<SessionInfo> = emptyList(),
    val sessionBytes: Long = 0L,
    /** Acknowledged by the PC — what makes deleting one here safe. */
    val transferred: Set<String> = emptySet(),
    val error: String? = null,
)

/** [RecordingUi.sessionBytes] walks the sessions tree: read on entry and on explicit action, never on the capture path. */
class RecordingViewModel(
    private val sessions: SessionStore,
    private val settings: RecordingSettings,
    private val scope: CoroutineScope,
    private val context: CoroutineContext = Dispatchers.IO,
) {
    private val mutable = MutableStateFlow(RecordingUi())
    val ui: StateFlow<RecordingUi> = mutable

    fun refresh() = io { mutable.value = onDisk(RecordingUi(settings.load())) }

    fun setPrefs(prefs: RecordingPrefs) =
        io {
            try {
                settings.save(prefs)
                mutable.value = mutable.value.copy(prefs = prefs, error = null)
            } catch (e: IOException) {
                mutable.value = mutable.value.copy(prefs = settings.prefs.value, error = notSaved(e))
            }
        }

    fun deleteSession(id: String) =
        io {
            val deleted = sessions.delete(id)
            mutable.value = onDisk(mutable.value).copy(error = if (deleted) null else "$id could not be deleted completely")
        }

    /** A SAF document cannot be renamed into place: an unfinished export [discard]s it, even before the start. */
    fun exportSession(
        id: String,
        open: () -> OutputStream?,
        discard: () -> Boolean,
    ) = scope.launchStorageWork(
        context,
        { mutable.value = mutable.value.copy(error = it) },
        { export(id, open, discard) },
        ATOMIC,
    )

    private suspend fun export(
        id: String,
        open: () -> OutputStream?,
        discard: () -> Boolean,
    ) {
        val job = currentCoroutineContext().job
        try {
            CancellableOutput(opened(open), job).use { zipSession(sessions.dir(id), it) }
        } catch (e: CancellationException) {
            mutable.value = mutable.value.copy(error = "Export of $id cancelled; ${discarded(discard)}")
            throw e
        } catch (e: IOException) {
            throw IOException("${e.message}; ${discarded(discard)}", e)
        }
        mutable.value = mutable.value.copy(error = null)
    }

    private fun onDisk(base: RecordingUi): RecordingUi {
        val list = sessions.list()
        val transferred = list.filter { readMark(sessions.dir(it.id)) != null }.map { it.id }.toSet()
        return base.copy(sessions = list, sessionBytes = sessions.totalBytes(), transferred = transferred)
    }

    private fun opened(open: () -> OutputStream?): OutputStream =
        try {
            open()
        } catch (e: SecurityException) {
            throw IOException("access to the export destination was refused (${e.message})", e)
        } ?: throw IOException("the export destination could not be opened")

    private fun discarded(discard: () -> Boolean): String =
        if (runCatching(discard).getOrDefault(false)) {
            "the partial export was deleted"
        } else {
            "the partial export could not be deleted, remove it by hand"
        }

    private fun io(block: suspend () -> Unit) {
        scope.launchStorageWork(context, { mutable.value = mutable.value.copy(error = it) }, block)
    }
}

/** Checks the job on every write, or a blocking zip outlives its screen. */
private class CancellableOutput(
    out: OutputStream,
    private val job: Job,
) : FilterOutputStream(out) {
    override fun write(b: Int) {
        job.ensureActive()
        out.write(b)
    }

    override fun write(
        b: ByteArray,
        off: Int,
        len: Int,
    ) {
        job.ensureActive()
        out.write(b, off, len)
    }
}

/** Explained, not decorated: the one switch that writes hundreds of MB, and the payoff is invisible on the device. */
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
        ui.error?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
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

/** A silently stopped recorder (cap, suspended geometry, an unencodable frame) looked like a working one.
 *  ARMED: before the first commit nothing is on disk BY DESIGN — the encoder holds the pre-roll in memory. */
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
    val export =
        rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/zip")) { uri ->
            uri ?: return@rememberLauncherForActivityResult
            model.exportSession(
                session.id,
                open = { context.contentResolver.openOutputStream(uri) },
                discard = { DocumentsContract.deleteDocument(context.contentResolver, uri) },
            )
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
    // These frames are the only copy: a deletion is discovered on the PC or not at all.
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
