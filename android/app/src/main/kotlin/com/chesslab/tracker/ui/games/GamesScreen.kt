package com.chesslab.tracker.ui.games

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.games.GameSessionState
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameSummary
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import kotlinx.coroutines.flow.MutableStateFlow

@Composable
fun GamesRoute(
    onBack: () -> Unit,
    onOpenGame: (String) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val model =
        remember(context) {
            GamesViewModel(
                games = GameStore(gamesDir(context)),
                sessions = SessionStore(sessionsDir(context)),
                settings = RecordingSettingsHost.get(context),
                scope = scope,
            )
        }
    LaunchedEffect(model) { model.refresh() }
    GamesScreen(model, onBack, onOpenGame)
}

/** The screen renders before the service is bound; an unbound live game is simply an empty one. */
private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())

@Composable
private fun GamesScreen(
    model: GamesViewModel,
    onBack: () -> Unit,
    onOpenGame: (String) -> Unit,
) {
    val ui by model.ui.collectAsStateWithLifecycle()
    val controller by GameSessionHost.controller.collectAsStateWithLifecycle()
    val live by (controller?.state ?: NO_LIVE_GAME).collectAsStateWithLifecycle()
    var renaming by remember { mutableStateOf<GameSummary?>(null) }
    var deleting by remember { mutableStateOf<GameSummary?>(null) }

    Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 10.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Games", style = MaterialTheme.typography.displayMedium, color = OnSurface)
            TextButton(onClick = onBack) { Text("Back", color = OnSurfaceMuted) }
        }
        LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item(key = "live") {
                LiveGameRow(live.moveCount, live.recordingReason) {
                    controller?.endAndSave()
                    model.refresh()
                }
            }
            item(key = "recording") { RecordingPanel(ui, model) }
            items(ui.games, key = { it.id }) { row ->
                GameRow(row, onOpen = { onOpenGame(row.id) }, onRename = { renaming = row }, onDelete = { deleting = row })
            }
            if (ui.games.isEmpty()) {
                item(key = "empty") { Text("No games yet.", color = OnSurfaceMuted) }
            }
        }
    }

    renaming?.let { row ->
        RenameDialog(row, onDismiss = { renaming = null }) { white, black, event ->
            model.rename(row.id, white, black, event)
            renaming = null
        }
    }
    deleting?.let { row ->
        DeleteDialog(row, onDismiss = { deleting = null }) { withSession ->
            model.delete(row.id, withSession)
            deleting = null
        }
    }
}

@Composable
private fun LiveGameRow(
    moves: Int,
    reason: String?,
    onEnd: () -> Unit,
) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(
                if (moves == 0) "No game in progress" else "Game in progress — $moves moves",
                style = MaterialTheme.typography.titleMedium,
                color = if (moves == 0) OnSurfaceMuted else OnSurface,
            )
            if (moves > 0) TextButton(onClick = onEnd) { Text("End game & save", color = Accent) }
        }
        reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
    }
}

@Composable
private fun GameRow(
    row: GameSummary,
    onOpen: () -> Unit,
    onRename: () -> Unit,
    onDelete: () -> Unit,
) {
    Column(Modifier.fillMaxWidth().clickable(onClick = onOpen), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text("${row.id}  ${row.result}", style = MaterialTheme.typography.titleMedium, color = OnSurface)
        Text(
            "${row.moveCount} moves · ${row.white} vs ${row.black}" + if (row.sessionId != null) " · recorded" else "",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            TextButton(onClick = onRename) { Text("Rename", color = OnSurfaceMuted) }
            TextButton(onClick = onDelete) { Text("Delete", color = Danger) }
        }
    }
}

@Composable
private fun RenameDialog(
    row: GameSummary,
    onDismiss: () -> Unit,
    onConfirm: (String, String, String) -> Unit,
) {
    var white by remember { mutableStateOf(row.white) }
    var black by remember { mutableStateOf(row.black) }
    var event by remember { mutableStateOf("chesslab") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Rename game") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedTextField(white, { white = it }, label = { Text("White") })
                OutlinedTextField(black, { black = it }, label = { Text("Black") })
                OutlinedTextField(event, { event = it }, label = { Text("Event") })
            }
        },
        confirmButton = { TextButton(onClick = { onConfirm(white, black, event) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun DeleteDialog(
    row: GameSummary,
    onDismiss: () -> Unit,
    onConfirm: (Boolean) -> Unit,
) {
    var withSession by remember { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete ${row.id}?") },
        text = {
            Column {
                Text("The PGN and its provenance are removed.")
                if (row.sessionId != null) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(withSession, { withSession = it })
                        Text("Also delete the recorded frames (${row.sessionId})")
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = { onConfirm(withSession) }) { Text("Delete", color = Danger) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
