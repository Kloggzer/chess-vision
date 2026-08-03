package com.chesslab.tracker.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.games.GameSessionState
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.service.TrackerRun
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.DisclosureRow
import com.chesslab.tracker.ui.SectionHeading
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.games.gamesDir
import com.chesslab.tracker.ui.review.resultHeadline
import com.chesslab.tracker.ui.settings.Card
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Surface
import kotlinx.coroutines.flow.MutableStateFlow
import kotlin.math.roundToInt

/** The screen renders before the service is bound; an unbound live game is simply an empty one. */
private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())

/**
 * The landing screen.
 *
 * Until specs/47 the app opened on the tracker, and since specs/43 it launches with no camera — so
 * the first thing a user saw was a tracker that was not tracking, over a start-position board of a
 * board nobody was looking at, above an empty move list. This is the hub instead: one primary
 * action, what has been played, and what the library adds up to.
 *
 * **Every number on it is one the app already measured.** There is no card that would need a
 * statistic to be invented, and the empty state is one sentence and one button rather than a wall
 * of zeroes.
 */
@Composable
fun HomeRoute(
    onStartGame: () -> Unit,
    onOpenGames: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenGame: (String) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val model =
        remember(context) {
            val dir = gamesDir(context)
            HomeViewModel(GameStore(dir), ReviewStore(dir), scope)
        }
    val ui by model.ui.collectAsStateWithLifecycle()
    val running by TrackerRun.running.collectAsStateWithLifecycle()
    val controller by GameSessionHost.controller.collectAsStateWithLifecycle()
    val live by (controller?.state ?: NO_LIVE_GAME).collectAsStateWithLifecycle()
    // Refreshed when the tracker stops too: that is the moment a game joins the library.
    LaunchedEffect(running) { model.refresh() }

    ChesslabScaffold("chesslab", onBack = null) { bars ->
        LazyColumn(
            Modifier.fillMaxSize().padding(bars),
            verticalArrangement = Arrangement.spacedBy(Space.sm),
        ) {
            item(key = "primary") {
                if (running) {
                    ResumeCard(live, onResume = onStartGame, onEnd = { controller?.endAndSave() })
                } else {
                    StartCard(fresh = ui.stats.games == 0, onStart = onStartGame)
                }
            }
            if (ui.loaded && ui.stats.games == 0) {
                item(key = "empty") { EmptyLibraryNote() }
            } else {
                recentGames(ui, onOpenGame, onOpenGames)
                item(key = "stats") { LibraryStats(ui.stats) }
            }
            item(key = "settings") {
                DisclosureRow("Settings", "Tracking, analysis, recording and the debug menu", onOpenSettings)
            }
        }
    }
}

private fun LazyListScope.recentGames(
    ui: HomeUi,
    onOpenGame: (String) -> Unit,
    onOpenGames: () -> Unit,
) {
    item(key = "recent-heading") { SectionHeading("RECENT GAMES") }
    items(ui.recent, key = { it.id }) { row -> RecentGameCard(row) { onOpenGame(row.id) } }
    item(key = "all-games") {
        DisclosureRow("Games", "${ui.stats.games} stored · rename, delete and share", onOpenGames)
    }
}

@Composable
private fun StartCard(
    fresh: Boolean,
    onStart: () -> Unit,
) {
    Card {
        Text(
            if (fresh) "Welcome" else "Welcome back",
            style = MaterialTheme.typography.titleLarge,
            color = OnSurface,
        )
        if (fresh) {
            Text(
                "chesslab watches a real board through the camera and writes the game down.",
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceMuted,
            )
        }
        // The ONE control on this screen that needs the camera. It opens the tracker; the camera and
        // its permission belong to the tracker's own switch and are asked for there.
        TextButton(onClick = onStart) {
            Text(if (fresh) "Start your first game" else "Start a game", color = Accent)
        }
    }
}

@Composable
private fun ResumeCard(
    live: GameSessionState,
    onResume: () -> Unit,
    onEnd: () -> Unit,
) {
    Card {
        Text(
            if (live.moveCount == 0) "Game in progress" else "Game in progress — ${live.moveCount} moves",
            style = MaterialTheme.typography.titleMedium,
            color = OnSurface,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
            TextButton(onClick = onResume) { Text("Resume", color = Accent) }
            if (live.moveCount > 0) TextButton(onClick = onEnd) { Text("End & save", color = OnSurfaceMuted) }
        }
    }
}

@Composable
private fun EmptyLibraryNote() {
    Text(
        "Your games and statistics appear here once you have played one.",
        style = MaterialTheme.typography.bodyMedium,
        color = OnSurfaceMuted,
        modifier = Modifier.padding(vertical = Space.sm),
    )
}

@Composable
private fun RecentGameCard(
    row: HomeGame,
    onOpen: () -> Unit,
) {
    Card {
        Column(Modifier.fillMaxWidth().clickable(onClick = onOpen), verticalArrangement = Arrangement.spacedBy(Space.hair)) {
            Text(
                "${row.date} · ${resultHeadline(row.result)} · ${row.moveCount} moves",
                style = MaterialTheme.typography.titleMedium,
                color = OnSurface,
            )
            Text(accuracyLine(row), style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            // A game the app lost and rebuilt is not the same evidence as one it tracked cleanly.
            if (row.seams > 0) {
                Text("rebuilt ${row.seams}×", style = MaterialTheme.typography.bodySmall, color = Danger)
            }
        }
    }
}

/** Named by whoever was captured for the game, never by "you" — the app does not know which side. */
internal fun accuracyLine(row: HomeGame): String {
    val white = row.whiteAccuracy ?: return "not reviewed yet"
    val black = row.blackAccuracy ?: return "not reviewed yet"
    return "${sideLabel(row.white, "White")} ${white.roundToInt()} % · ${sideLabel(row.black, "Black")} ${black.roundToInt()} %"
}

/**
 * Four tiles, each stating its own denominator.
 *
 * The "most played opening" tile the sketch drew is NOT here: it needs an opening book, the book is
 * out of scope (decision 4), and a card that shows a number nobody measured is worse than no card.
 */
@Composable
private fun LibraryStats(stats: HomeStats) {
    Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
        SectionHeading("YOUR LIBRARY")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
            StatTile("Games", "${stats.games}", "${stats.moves} moves recorded", Modifier.weight(1f))
            StatTile(
                "Accuracy",
                stats.accuracy?.let { "${it.roundToInt()} %" } ?: "—",
                if (stats.reviewed == 0) "no game reviewed yet" else "both sides, over ${stats.reviewed} reviewed",
                Modifier.weight(1f),
            )
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
            StatTile(
                "Clean records",
                "${stats.clean} of ${stats.games}",
                rebuiltNote(stats.games - stats.clean),
                Modifier.weight(1f),
            )
            StatTile(
                "With frames",
                "${stats.recorded} of ${stats.games}",
                "recorded for training",
                Modifier.weight(1f),
            )
        }
    }
}

private fun rebuiltNote(rebuilt: Int): String = if (rebuilt == 0) "none rebuilt" else "$rebuilt rebuilt"

@Composable
private fun StatTile(
    label: String,
    value: String,
    note: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .background(Surface, RoundedCornerShape(Radius.md))
            .padding(horizontal = Space.md, vertical = Space.sm),
        verticalArrangement = Arrangement.spacedBy(Space.hair),
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = OnSurfaceMuted)
        Text(value, style = MaterialTheme.typography.titleLarge, color = OnSurface)
        Text(note, style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
    }
}
