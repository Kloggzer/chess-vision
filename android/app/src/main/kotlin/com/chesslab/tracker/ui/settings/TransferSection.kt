package com.chesslab.tracker.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.record.formatBytes
import com.chesslab.tracker.sync.SyncHost
import com.chesslab.tracker.sync.SyncPrefs
import com.chesslab.tracker.sync.SyncReport
import com.chesslab.tracker.sync.emptyRecordings
import com.chesslab.tracker.sync.isEmptyRecording
import com.chesslab.tracker.sync.readMark
import com.chesslab.tracker.sync.syncNow
import com.chesslab.tracker.sync.unsentSessions
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.games.sessionsDir
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

/**
 * The recordings' way to the PC, in the two facts a user can act on: is it paired, and what is
 * still here.
 *
 * The transfer itself has no screen and must not have one — it runs as a WorkManager job so the
 * recording reaches the machine that trains on it whether or not this page was ever opened. What is
 * left here is pairing (a token the server prints) and the report of the last run, because a
 * transfer that quietly does nothing is exactly what this feature exists to replace.
 */
@Composable
fun TransferSection() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val settings = remember(context) { SyncHost.get(context) }
    LaunchedEffect(settings) { settings.load() }
    val prefs by settings.prefs.collectAsStateWithLifecycle()
    val report by SyncHost.report.collectAsStateWithLifecycle()
    val progress by SyncHost.progress.collectAsStateWithLifecycle()
    val store = remember(context) { SessionStore(sessionsDir(context)) }
    var stored by remember { mutableStateOf("counting…") }
    LaunchedEffect(store, report) { stored = waiting(store, sessionsDir(context)) }
    val save: (SyncPrefs) -> Unit = { next -> scope.launch { settings.save(next) } }

    Column {
        SwitchPreference(
            title = "Transfer recordings over Wi-Fi",
            summary = "Send finished recordings to the chesslab server on this network, unmetered only",
            checked = prefs.enabled,
            onCheckedChange = { save(prefs.copy(enabled = it)) },
        )
        TokenField(prefs.token) { save(prefs.copy(token = it)) }
        HostField(prefs.host) { save(prefs.copy(host = it)) }
        RetentionField(prefs.retentionDays) { save(prefs.copy(retentionDays = it)) }
        PreferenceRow(
            title = "Server",
            summary = serverSummary(prefs),
            value = if (prefs.paired) "paired" else "no token",
        )
        PreferenceRow(title = "Waiting to be sent", summary = stored)
        PreferenceRow(title = "Last run", summary = progress ?: describe(report))
        report?.failed?.firstOrNull()?.let {
            Text(it.reason, style = MaterialTheme.typography.bodySmall, color = Danger, modifier = Modifier.padding(bottom = Space.sm))
        }
        FilledAction("Transfer now", { syncNow(context) }, Modifier.padding(vertical = Space.sm))
        Text(
            "The token is printed by the server on its /transfers page. Leave the address empty unless the " +
                "search comes back empty — a guest network or client isolation is when it does.",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
    }
}

@Composable
private fun TokenField(
    token: String,
    onSave: (String) -> Unit,
) {
    var text by remember(token) { mutableStateOf(token) }
    OutlinedTextField(
        value = text,
        onValueChange = {
            text = it.trim()
            onSave(text)
        },
        label = { Text("Pairing token") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth().padding(vertical = Space.sm),
    )
}

@Composable
private fun HostField(
    host: String,
    onSave: (String) -> Unit,
) {
    var text by remember(host) { mutableStateOf(host) }
    OutlinedTextField(
        value = text,
        onValueChange = {
            text = it.trim()
            onSave(text)
        },
        label = { Text("Server address (optional)") },
        placeholder = { Text("192.168.178.20:3000") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth().padding(vertical = Space.sm),
    )
}

@Composable
private fun RetentionField(
    days: Int,
    onSave: (Int) -> Unit,
) {
    var text by remember(days) { mutableStateOf(days.toString()) }
    OutlinedTextField(
        value = text,
        onValueChange = { raw ->
            text = raw.filter(Char::isDigit).take(3)
            text.toIntOrNull()?.let(onSave)
        },
        label = { Text("Delete sent recordings after (days, 0 = keep)") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth().padding(vertical = Space.sm),
    )
}

/** The Settings landing summary — one place decides how the transfer state is written. */
internal fun transferSummary(
    prefs: SyncPrefs,
    report: SyncReport?,
): String =
    when {
        !prefs.enabled -> "Off"
        !prefs.paired -> "On · not paired"
        report == null -> "On · no run yet"
        report.failed.isNotEmpty() -> "On · last run failed"
        report.sent.isNotEmpty() -> "On · ${report.sent.size} sent, ${formatBytes(report.bytes)}"
        else -> "On · ${report.note ?: "idle"}"
    }

private fun serverSummary(prefs: SyncPrefs): String =
    when {
        prefs.host.isNotBlank() -> prefs.host
        prefs.lastHost.isNotBlank() -> "${prefs.lastHost} (found)"
        else -> "searched on this Wi-Fi"
    }

private fun describe(report: SyncReport?): String {
    val value = report ?: return "not run in this session"
    return when {
        value.failed.isNotEmpty() -> "failed on ${value.failed.first().sessionId}"
        value.sent.isNotEmpty() -> "${value.sent.size} sent · ${formatBytes(value.bytes)} · ${value.base}"
        else -> value.note ?: "nothing to do"
    }
}

/**
 * What is still here, counted off the marker files — true even for a transfer this screen never saw.
 *
 * Walked on the IO dispatcher and once per screen entry, like recording's own storage total: the
 * sessions tree holds gigabytes and a composition must never be the thing that reads it.
 */
private suspend fun waiting(
    store: SessionStore,
    sessions: File,
): String =
    withContext(Dispatchers.IO) {
        val empty = emptyRecordings(sessions).size
        val unsent = unsentSessions(sessions).filterNot { isEmptyRecording(it) }
        val sent = store.list().count { readMark(store.dir(it.id)) != null }
        // Empty recordings are named rather than hidden: they stay on the phone forever otherwise,
        // and a "waiting" count that never reaches zero is the kind of lie that gets ignored.
        val tail = if (empty > 0) " · $empty empty, nothing to label" else ""
        if (unsent.isEmpty()) {
            "$sent transferred, nothing waiting$tail"
        } else {
            "${unsent.size} sessions · ${formatBytes(unsent.sumOf { dir -> dir.walkBottomUp().sumOf { it.length() } })}$tail"
        }
    }
