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
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.games.GameResult
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameSummary
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.ui.Card
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.ConfirmDialog
import com.chesslab.tracker.ui.EmptyState
import com.chesslab.tracker.ui.SectionHeading
import com.chesslab.tracker.ui.StatRow
import com.chesslab.tracker.ui.StatTile
import com.chesslab.tracker.ui.percent
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
            val dir = gamesDir(context)
            GamesViewModel(GameStore(dir), ReviewStore(dir), SessionStore(sessionsDir(context)), scope)
        }
    LaunchedEffect(model) { model.refresh() }
    GamesScreen(model, onBack, onOpenGame)
}

/**
 * The library, its statistics, and nothing else.
 *
 * It used to open on "Record training frames" — a developer data-capture setting with a five-line
 * explanation, four size chips and a second toggle — which was by far the tallest element on the
 * screen that holds the games, with the single stored game below it. That panel is a SETTING and it
 * is in Settings › Recording. The running game is not here either: the in-progress banner every
 * screen wears is one row instead of a card, and it is on this screen too.
 *
 * The four tiles arrived from Home (specs/48): they are a summary of THIS list, and on Home they
 * were four numbers about data that was one tap away, one of them duplicating the row beside it.
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
            // The empty state REPLACES the grid — four tiles of zeroes are the thing it exists to
            // prevent — and it is the whole screen, so nothing else renders behind it.
            ui.error?.let { error ->
                item(key = "error") { Text(error, style = MaterialTheme.typography.bodySmall, color = Danger) }
            }
            if (ui.loaded && ui.games.isEmpty()) {
                item(key = "empty") {
                    EmptyState("No games yet", "Track a game and it appears here with its review.")
                }
                return@LazyColumn
            }
            item(key = "stats") { LibraryGrid(ui.stats) }
            item(key = "games-heading") { SectionHeading("Your games") }
            items(ui.games, key = { it.id }) { row ->
                Card {
                    GameRow(row, onOpen = { onOpenGame(row.id) }, onRename = { renaming = row }, onDelete = { deleting = row })
                }
            }
        }
    }

    renaming?.let { row ->
        GameDetailsDialog(
            initialWhite = row.white,
            initialBlack = row.black,
            initialEvent = row.event,
            initialResult = GameResult.of(row.result),
            onDismiss = { renaming = null },
        ) { white, black, event, result ->
            model.updateDetails(row.id, white, black, event, result)
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

/** Four tiles, each stating its own denominator. See [LibraryStats] for where they came from. */
@Composable
private fun LibraryGrid(stats: LibraryStats) {
    Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
        SectionHeading("Your library")
        StatRow {
            StatTile("Games", "${stats.games}", "${stats.moves} moves recorded", Modifier.weight(1f))
            StatTile(
                "Accuracy",
                stats.accuracy?.let { percent(it) } ?: "—",
                if (stats.reviewed == 0) "no game reviewed yet" else "both sides, ${stats.reviewed} reviewed",
                Modifier.weight(1f),
            )
        }
        StatRow {
            StatTile(
                "Clean records",
                "${stats.clean} of ${stats.games}",
                rebuiltNote(stats.games - stats.clean),
                Modifier.weight(1f),
            )
            StatTile("With frames", "${stats.recorded} of ${stats.games}", "for training", Modifier.weight(1f))
        }
    }
}

private fun rebuiltNote(rebuilt: Int): String = if (rebuilt == 0) "none rebuilt" else "$rebuilt rebuilt"

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
        DropdownMenuItem(text = { Text("Edit game details") }, onClick = {
            open = false
            onRename()
        })
        DropdownMenuItem(text = { Text("Delete", color = Danger) }, onClick = {
            open = false
            onDelete()
        })
    }
}

/** Irreversible: the record, its PGN and its stored analysis. The body says how much, in moves. */
@Composable
private fun DeleteDialog(
    row: GameSummary,
    onDismiss: () -> Unit,
    onConfirm: (Boolean) -> Unit,
) {
    var withSession by remember { mutableStateOf(false) }
    ConfirmDialog(
        title = "Delete ${row.id}?",
        body = "${row.moveCount} moves, their PGN and any stored review. This cannot be undone.",
        verb = "Delete",
        onConfirm = { onConfirm(withSession) },
        onDismiss = onDismiss,
    ) {
        row.sessionId?.let { session ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(withSession, { withSession = it })
                Text("Also delete the recorded frames ($session)", color = OnSurfaceMuted)
            }
        }
    }
}
