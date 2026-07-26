package com.chesslab.tracker.ui.games

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
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
import com.chesslab.tracker.record.SessionInfo
import com.chesslab.tracker.record.formatBytes
import com.chesslab.tracker.record.zipSession
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

private const val MB = 1024L * 1024L
private val CAPS = listOf(250L * MB, 1024L * MB, 2048L * MB, 0L)

private fun capLabel(bytes: Long): String = if (bytes <= 0L) "unlimited" else formatBytes(bytes)

/**
 * Session recording, off by default.
 *
 * The explanation is not decoration: this is the one switch in the app that makes the phone write
 * hundreds of megabytes of its own storage, and the payoff (auto-labeled training data for
 * `chesslab slice`) is invisible on the device itself.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RecordingPanel(
    ui: GamesUi,
    model: GamesViewModel,
) {
    var expanded by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Record training frames", style = MaterialTheme.typography.titleMedium, color = OnSurface)
            Switch(ui.prefs.enabled, { model.setPrefs(ui.prefs.copy(enabled = it)) })
        }
        Text(
            "Each committed move stores the raw camera frame with its FEN and board corners — exactly what " +
                "`chesslab slice` turns into 64 labeled crops. It costs storage (a game is tens of megabytes) " +
                "and nothing on the phone reads it back, so it is off unless you want the data.",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
        Text(
            "On disk: ${formatBytes(ui.sessionBytes)} in ${ui.sessions.size} sessions · limit ${capLabel(ui.prefs.capBytes)}",
            style = MaterialTheme.typography.bodySmall,
            color = Accent,
        )
        // Real chips, not coloured text: as plain labels the four caps had no tappable affordance
        // and the selected one was distinguishable only by hue.
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            CAPS.forEach { cap ->
                FilterChip(
                    selected = cap == ui.prefs.capBytes,
                    onClick = { model.setPrefs(ui.prefs.copy(capBytes = cap)) },
                    label = { Text(capLabel(cap), style = MaterialTheme.typography.labelMedium) },
                )
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Skip physically impossible positions", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            Switch(ui.prefs.inventoryFilter, { model.setPrefs(ui.prefs.copy(inventoryFilter = it)) })
        }
        TextButton(onClick = { expanded = !expanded }) {
            Text(if (expanded) "Hide recordings" else "Show recordings (${ui.sessions.size})", color = OnSurfaceMuted)
        }
        if (expanded) ui.sessions.forEach { SessionRow(it, model) }
    }
}

@Composable
private fun SessionRow(
    session: SessionInfo,
    model: GamesViewModel,
) {
    val context = LocalContext.current
    val export =
        rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/zip")) { uri ->
            uri ?: return@rememberLauncherForActivityResult
            // SAF: the user picks the destination, so no storage permission is involved.
            context.contentResolver.openOutputStream(uri)?.use { zipSession(model.sessionDir(session.id), it) }
        }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(
            "${session.id} · ${session.frames} frames · ${formatBytes(session.bytes)}",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
        Row {
            TextButton(onClick = { export.launch("${session.id}.zip") }) { Text("Export", color = Accent) }
            TextButton(onClick = { model.deleteSession(session.id) }) { Text("Delete", color = Danger) }
        }
    }
}
