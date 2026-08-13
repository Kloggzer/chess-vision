package com.chesslab.tracker.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.games.GameResult
import com.chesslab.tracker.games.GameSessionState
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.service.TrackerRun
import com.chesslab.tracker.ui.Card
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.EmptyState
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.Rule
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.games.gamesDir
import com.chesslab.tracker.ui.percent
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Surface
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

    ChesslabScaffold(
        "chesslab",
        onBack = null,
        titleStyle = MaterialTheme.typography.titleLarge.copy(fontSize = 22.sp),
        actions = {
            IconButton(onClick = onOpenSettings) {
                Icon(Icons.Filled.Settings, contentDescription = "Settings")
            }
        },
        // Settings is a destination people go to on purpose and rarely, which is exactly what the
        // bar's action slot is for. As a row at the bottom of Home it took a full-width seat below
        // the games — the thing the screen is actually about — for the least frequent act on it.
    ) { bars ->
        Column(
            Modifier.fillMaxSize().padding(bars).padding(horizontal = HOME_EXTRA_SIDE_INSET),
        ) {
            if (running) {
                ResumeCard(live, onResume = onStartGame, onEnd = { controller?.endAndSave() })
            } else {
                StartCard(onStartGame)
            }
            if (ui.loaded && ui.games == 0) {
                Spacer(Modifier.height(Space.sm))
                NoGamesYet()
            } else {
                RecentHeading()
                ui.recent.forEach { row -> RecentGameCard(row) { onOpenGame(row.id) } }
                Spacer(Modifier.weight(1f))
                AllGamesRow(ui.games, onOpenGames)
            }
        }
    }
}

@Composable
private fun StartCard(onStart: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(Surface, RoundedCornerShape(NEW_GAME_RADIUS)).padding(NEW_GAME_PADDING),
        verticalArrangement = Arrangement.spacedBy(NEW_GAME_GAP),
    ) {
        Text(
            "New game",
            style = MaterialTheme.typography.titleLarge.copy(fontSize = 23.sp),
            color = OnSurface,
        )
        Text(
            "Point the phone at your board and I'll write down every move.",
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurfaceMuted,
        )
        Spacer(Modifier.height(NEW_GAME_TEXT_SPACER))
        // The ONE control on this screen that needs the camera, and the screen's one filled button.
        // It opens the tracker; the camera and its permission belong to the tracker's own switch.
        //
        // The label does NOT change with the library's state — the greeting above it carries that.
        // A control whose wording moves is a control no agent and no smoke test can tap by text.
        FilledAction("Start a game", onStart, Modifier.fillMaxWidth().height(NEW_GAME_BUTTON_HEIGHT))
    }
}

private val NEW_GAME_RADIUS = 22.dp

private val NEW_GAME_PADDING = 24.dp

private val NEW_GAME_GAP = 10.dp

private val NEW_GAME_TEXT_SPACER = 6.dp

private val NEW_GAME_BUTTON_HEIGHT = 52.dp

private val HOME_EXTRA_SIDE_INSET = 8.dp

@Composable
private fun RecentHeading() {
    Text(
        text = "RECENT",
        style =
            MaterialTheme.typography.labelMedium.copy(
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.08.sp,
            ),
        color = OnSurfaceMuted,
        modifier = Modifier.padding(start = Space.xs, top = Space.xl, bottom = RECENT_BOTTOM_GAP),
    )
}

private val RECENT_BOTTOM_GAP = 2.dp

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
    Column {
        Row(
            Modifier.fillMaxWidth().clickable(onClick = onOpen).padding(horizontal = Space.xs, vertical = RECENT_ROW_PADDING),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(Space.hair)) {
                Text(
                    "${sideLabel(row.white, "White")} vs. ${sideLabel(row.black, "Black")}",
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                    color = OnSurface,
                )
                Text(row.date, style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp), color = OnSurfaceMuted)
            }
            Text(resultMark(GameResult.of(row.result)), style = MaterialTheme.typography.bodyMedium, color = OnSurface)
        }
        Rule()
    }
}

private val RECENT_ROW_PADDING = 13.dp

@Composable
private fun AllGamesRow(
    games: Int,
    onOpen: () -> Unit,
) {
    Column {
        Rule()
        Row(
            Modifier.fillMaxWidth().clickable(onClick = onOpen).padding(horizontal = Space.xs, vertical = Space.lg),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("All games", style = MaterialTheme.typography.bodyMedium, color = OnSurface)
            Row(
                horizontalArrangement = Arrangement.spacedBy(Space.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("$games", style = MaterialTheme.typography.bodySmall.copy(fontSize = 14.sp), color = OnSurfaceMuted)
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = OnSurfaceMuted,
                    modifier = Modifier.size(ALL_GAMES_CHEVRON_SIZE),
                )
            }
        }
    }
}

private val ALL_GAMES_CHEVRON_SIZE = 20.dp

private fun resultMark(result: GameResult): String =
    when (result) {
        GameResult.WHITE -> "1–0"
        GameResult.BLACK -> "0–1"
        GameResult.DRAW -> "½–½"
        GameResult.UNFINISHED -> "—"
    }

/** Named by whoever was captured for the game, never by "you" — the app does not know which side. */
internal fun accuracyLine(row: HomeGame): String {
    val white = row.whiteAccuracy ?: return "not reviewed yet"
    val black = row.blackAccuracy ?: return "not reviewed yet"
    return "${sideLabel(row.white, "White")} ${percent(white)} · ${sideLabel(row.black, "Black")} ${percent(black)}"
}
