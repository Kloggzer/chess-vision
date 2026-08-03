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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameSummary
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.settings.Card
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space

@Composable
fun GamesRoute(
    onBack: () -> Unit,
    onOpenGame: (String) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val model =
        remember(context) {
            GamesViewModel(games = GameStore(gamesDir(context)), sessions = SessionStore(sessionsDir(context)), scope = scope)
        }
    LaunchedEffect(model) { model.refresh() }
    GamesScreen(model, onBack, onOpenGame)
}

/**
 * The library, and only the library.
 *
 * It used to open on "Record training frames" — a developer data-capture setting with a five-line
 * explanation, four size chips and a second toggle — which was by far the tallest element on the
 * screen that holds the games, with the single stored game below it. That panel is a SETTING and it
 * is in Settings › Recording. The running game is not here either: the in-progress banner every
 * screen wears is one row instead of a card, and it is on this screen too.
 */
@Composable
private fun GamesScreen(
    model: GamesViewModel,
    onBack: () -> Unit,
    onOpenGame: (String) -> Unit,
) {
    val ui by model.ui.collectAsStateWithLifecycle()
    var renaming by remember { mutableStateOf<GameSummary?>(null) }
    var deleting by remember { mutableStateOf<GameSummary?>(null) }

    ChesslabScaffold("Games", onBack) { bars ->
        LazyColumn(
            Modifier.fillMaxSize().padding(bars),
            verticalArrangement = Arrangement.spacedBy(Space.sm),
        ) {
            items(ui.games, key = { it.id }) { row ->
                Card {
                    GameRow(row, onOpen = { onOpenGame(row.id) }, onRename = { renaming = row }, onDelete = { deleting = row })
                }
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

/**
 * Three lines, not four. Rename and Delete used to be permanent buttons on every row — two controls
 * per game, for acts taken once — and they are behind the row's own `⋯` now.
 */
@Composable
private fun GameRow(
    row: GameSummary,
    onOpen: () -> Unit,
    onRename: () -> Unit,
    onDelete: () -> Unit,
) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(
            Modifier.weight(1f).clickable(onClick = onOpen),
            verticalArrangement = Arrangement.spacedBy(Space.hair),
        ) {
            Text("${row.id}  ${row.result}", style = MaterialTheme.typography.titleMedium, color = OnSurface)
            Text(
                "${row.moveCount} moves · ${row.white} vs ${row.black}" + if (row.sessionId != null) " · recorded" else "",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceMuted,
            )
            // A game the app lost and rebuilt is not the same evidence as one it tracked cleanly, and
            // the row is where that has to be visible — the alternative is opening every game to find out.
            if (row.seams > 0) {
                Text(
                    "rebuilt ${row.seams}× — the app lost the board and picked it up again",
                    style = MaterialTheme.typography.bodySmall,
                    color = Danger,
                )
            }
        }
        RowMenu(onRename, onDelete)
    }
}

@Composable
private fun RowMenu(
    onRename: () -> Unit,
    onDelete: () -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    IconButton(onClick = { open = true }) {
        Icon(Icons.Filled.MoreVert, contentDescription = "Game options")
    }
    DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
        DropdownMenuItem(text = { Text("Rename") }, onClick = {
            open = false
            onRename()
        })
        DropdownMenuItem(text = { Text("Delete", color = Danger) }, onClick = {
            open = false
            onDelete()
        })
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
            Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
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
