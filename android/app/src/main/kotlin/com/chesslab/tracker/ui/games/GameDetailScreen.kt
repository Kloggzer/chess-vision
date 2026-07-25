package com.chesslab.tracker.ui.games

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
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
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.StoredGame
import com.chesslab.tracker.games.StoredMove
import com.chesslab.tracker.games.buildPgn
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

@Composable
fun GameDetailRoute(
    id: String,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val model =
        remember(context) {
            GamesViewModel(GameStore(gamesDir(context)), SessionStore(sessionsDir(context)), RecordingSettingsHost.get(context), scope)
        }
    var game by remember { mutableStateOf<StoredGame?>(null) }
    LaunchedEffect(id) { game = model.open(id) }
    game?.let { GameDetailScreen(it, onBack) } ?: Text("Game not found.", color = OnSurfaceMuted)
}

@Composable
private fun GameDetailScreen(
    game: StoredGame,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    var provenance by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 10.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(game.id, style = MaterialTheme.typography.displayMedium, color = OnSurface)
            TextButton(onClick = onBack) { Text("Back", color = OnSurfaceMuted) }
        }
        Text(
            "${game.white} vs ${game.black} · ${game.result} · profile ${game.profileName}",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
        Text("Start FEN: ${game.startFen}", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Include provenance comments", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            Switch(provenance, { provenance = it })
        }
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            TextButton(onClick = { share(context, buildPgn(game, provenance), game.id) }) { Text("Share PGN", color = Accent) }
            TextButton(onClick = { copy(context, buildPgn(game, provenance)) }) { Text("Copy", color = Accent) }
        }
        LazyColumn(Modifier.weight(1f)) {
            items(game.moves.size, key = { game.moves[it].ply }) { index -> MoveRow(game.moves[index]) }
        }
    }
}

@Composable
private fun MoveRow(move: StoredMove) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("${move.ply}.", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
        Text(move.san, style = MaterialTheme.typography.bodyMedium, color = OnSurface)
        move.provenance?.let { Text(it.decider, style = MaterialTheme.typography.bodySmall, color = Accent) }
    }
}

/**
 * `EXTRA_TEXT`, not a `FileProvider` URI: a provider needs a manifest entry and the manifest is
 * 06c's file (same reasoning as 07b's decision-log share). A PGN is a few kB of text.
 */
private fun share(
    context: Context,
    pgn: String,
    id: String,
) {
    val send =
        Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "$id.pgn")
            putExtra(Intent.EXTRA_TEXT, pgn)
        }
    context.startActivity(Intent.createChooser(send, "Share PGN"))
}

private fun copy(
    context: Context,
    pgn: String,
) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("PGN", pgn))
}
