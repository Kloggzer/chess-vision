package com.chesslab.tracker.ui.home

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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import com.chesslab.tracker.ui.Card
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.DisclosureRow
import com.chesslab.tracker.ui.EmptyState
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.SectionHeading
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.games.gamesDir
import com.chesslab.tracker.ui.percent
import com.chesslab.tracker.ui.review.resultHeadline
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import kotlinx.coroutines.flow.MutableStateFlow

/** The screen renders before the service is bound; an unbound live game is simply an empty one. */
private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())

/**
 * The landing screen: **a launcher, not a dashboard.**
 *
 * Until specs/47 the app opened on the tracker, and since specs/43 it launches with no camera — so
 * the first thing a user saw was a tracker that was not tracking, over a start-position board of a
 * board nobody was looking at, above an empty move list.
 *
 * It then did two jobs and the second badly (specs/48): four stat tiles reading `0`, `0 of 1`, `1`
 * on a fresh install, and a "Games" disclosure row sitting beside a "Games" tile counting the same
 * thing. **The statistics are on Games now**, beside the data they describe, and the duplication
 * went with them. What is left is the one action, what was played last, and two doors.
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
                    StartCard(fresh = ui.games == 0, onStart = onStartGame)
                }
            }
            if (ui.loaded && ui.games == 0) {
                item(key = "empty") { NoGamesYet() }
            } else {
                recentGames(ui, onOpenGame, onOpenGames)
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
    item(key = "recent-heading") { SectionHeading("Recent games") }
    items(ui.recent, key = { it.id }) { row -> RecentGameCard(row) { onOpenGame(row.id) } }
    item(key = "all-games") {
        DisclosureRow("All games", "${ui.games} stored · statistics, rename, delete and share", onOpenGames)
    }
}

@Composable
private fun StartCard(
    fresh: Boolean,
    onStart: () -> Unit,
) {
    Card(accented = true) {
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
        // The ONE control on this screen that needs the camera, and the screen's one filled button.
        // It opens the tracker; the camera and its permission belong to the tracker's own switch.
        //
        // The label does NOT change with the library's state — the greeting above it carries that.
        // A control whose wording moves is a control no agent and no smoke test can tap by text.
        FilledAction("Start a game", onStart, Modifier.fillMaxWidth())
        Text(
            "The camera starts when you do.",
            style = MaterialTheme.typography.labelSmall,
            color = OnSurfaceMuted,
        )
    }
}

@Composable
private fun ResumeCard(
    live: GameSessionState,
    onResume: () -> Unit,
    onEnd: () -> Unit,
) {
    Card(accented = true) {
        Text(
            if (live.moveCount == 0) "Game in progress" else "Game in progress — ${live.moveCount} moves",
            style = MaterialTheme.typography.titleMedium,
            color = OnSurface,
        )
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
            // One filled button, and it is the one the screen is for. Ending a game is not.
            FilledAction("Resume", onResume, Modifier.weight(1f))
            if (live.moveCount > 0) OutlineAction("End & save", onEnd, Modifier.weight(1f))
        }
    }
}

/** One sentence naming what will appear. The button that makes it appear is the card above. */
@Composable
private fun NoGamesYet() {
    EmptyState("No games yet", "Track a game and it appears here with its review.")
}

@Composable
private fun RecentGameCard(
    row: HomeGame,
    onOpen: () -> Unit,
) {
    Card {
        Column(Modifier.fillMaxWidth().clickable(onClick = onOpen), verticalArrangement = Arrangement.spacedBy(Space.hair)) {
            Text(
                "${row.date} · ${resultHeadline(row.result)}",
                style = MaterialTheme.typography.titleMedium,
                color = OnSurface,
            )
            Text(
                "${row.moveCount} moves · ${accuracyLine(row)}",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceMuted,
            )
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
    return "${sideLabel(row.white, "White")} ${percent(white)} · ${sideLabel(row.black, "Black")} ${percent(black)}"
}
