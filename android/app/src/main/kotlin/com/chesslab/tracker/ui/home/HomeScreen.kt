package com.chesslab.tracker.ui.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
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
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.R
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.games.GameResult
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
import com.chesslab.tracker.ui.theme.Background
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.PieceWhite
import com.chesslab.tracker.ui.theme.Space
import kotlinx.coroutines.flow.MutableStateFlow

/** The mark in the app bar: reads at a glance, and does not compete with the title. */
private val LOGO_SIZE = 28.dp

/** The watermark's height. Big enough to read as ground, small enough to stay inside the panel. */
private val WATERMARK_HEIGHT = 260.dp

/**
 * And its width, which must be given: `Icon` fills an unspecified dimension from the drawable's
 * INTRINSIC size, not from the aspect of the one you did specify — so height-only produced a
 * 36 dp-wide box that the piece was then fitted into at 54 dp tall. 36 / 54.5 * 260.
 */
private val WATERMARK_WIDTH = 172.dp

/**
 * On the ink ground the cream has 236/255 of headroom, so a tenth of it is already a clear
 * shape: measured 24/255 from the ground on the emulator at 1440x3200.
 */
private const val WATERMARK_ALPHA_INK = 0.10f

/**
 * On paper it is the opposite problem. `PieceWhite` is only **18/255** from
 * `PaperPalette.background` in total, so the piece can never be loud there whatever this says —
 * even 1.0 would be a whisper. 0.85 spends most of that ceiling and lands near the ink side.
 */
private const val WATERMARK_ALPHA_PAPER = 0.85f

/** Below this the ground is ink, above it paper. Half is the only non-arbitrary place to cut. */
private const val DARK_GROUND = 0.5f

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
        // No `contentDescription`: the word "chesslab" is right beside it, and a screen reader
        // announcing "chesslab logo, chesslab" is noise. Tinted `OnSurface` — an identity is not
        // an accent (specs/48 rule 2).
        titleIcon = {
            Icon(
                painter = painterResource(R.drawable.ic_logo),
                contentDescription = null,
                tint = OnSurface,
                modifier = Modifier.size(LOGO_SIZE),
            )
        },
        // Settings is a destination people go to on purpose and rarely, which is exactly what the
        // bar's action slot is for. As a row at the bottom of Home it took a full-width seat below
        // the games — the thing the screen is actually about — for the least frequent act on it.
        actions = {
            IconButton(onClick = onOpenSettings) {
                Icon(Icons.Filled.Settings, contentDescription = "Settings")
            }
        },
    ) { bars ->
        Box(Modifier.fillMaxSize().padding(bars)) {
            Watermark()
            LazyColumn(
                Modifier.fillMaxSize(),
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
            }
        }
    }
}

/**
 * The pawn alone, centred in the content area and almost invisible.
 *
 * **The piece, not the mark:** the viewfinder brackets are a frame, and a frame drawn behind
 * framed content (cards, rules) fights it. `ic_pawn` is the same geometry with the brackets
 * dropped and the viewport cropped to the piece, so the height requested here is the height that
 * appears.
 *
 * Decoration is allowed exactly here: Home is where the app is entered and the one screen whose
 * job is identity rather than a task. It never appears on the board — a brand mark over a
 * position is what specs/48 spent a pack removing.
 *
 * The alpha is the whole design: anything that can be *identified* at a glance competes with the
 * cards on top of it. It sits BEHIND the list and does not scroll — a watermark that moves is a
 * graphic.
 *
 * It takes [PieceWhite] — the app's beige, `#FCF8F0`, and the ONE colour that is identical in
 * both palettes, because a white piece is white under either scheme. It is also the honest
 * semantic: this is a white pawn. `Accent` was tried and dropped — specs/48 rule 2 reserves it
 * for state, and a brand green behind the cards spent that meaning on decoration. The mark in
 * the app bar stays `OnSurface`, because THAT one is meant to be read.
 *
 * **The alpha is per scheme, and it has to be.** The same cream is 236/255 bright on an ink
 * ground and 18/255 from the paper one, so one number cannot serve both: at 0.10 it measured
 * 24/255 on ink and 3/255 on paper. The scheme is read off the ground itself rather than from
 * `isSystemInDarkTheme()`, because what matters here is the colour actually behind the piece,
 * which is `Background` — the same source the palette is chosen from.
 */
@Composable
private fun BoxScope.Watermark() {
    val onInk = Background.luminance() < DARK_GROUND
    Icon(
        painter = painterResource(R.drawable.ic_pawn),
        contentDescription = null,
        tint = PieceWhite.copy(alpha = if (onInk) WATERMARK_ALPHA_INK else WATERMARK_ALPHA_PAPER),
        modifier = Modifier.align(Alignment.Center).size(WATERMARK_WIDTH, WATERMARK_HEIGHT),
    )
}

private fun LazyListScope.recentGames(
    ui: HomeUi,
    onOpenGame: (String) -> Unit,
    onOpenGames: () -> Unit,
) {
    item(key = "recent-heading") { SectionHeading("Recent games") }
    items(ui.recent, key = { it.id }) { row -> RecentGameCard(row) { onOpenGame(row.id) } }
    // Home KEEPS the chevron and takes no icon, deliberately (specs/51). Android's Settings could
    // drop the arrow because a leading pictogram and a summary stating the current VALUE carry the
    // affordance between them; this row has neither — it is a launcher door, not a setting — so the
    // chevron is the only thing on it that says it goes somewhere.
    item(key = "all-games") {
        DisclosureRow("All games", "${ui.games} stored · statistics, rename, delete and share", onOpen = onOpenGames)
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
                "${row.date} · ${stringResource(resultHeadline(GameResult.of(row.result)))}",
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
