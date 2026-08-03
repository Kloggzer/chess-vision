package com.chesslab.tracker.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.games.GameSessionState
import com.chesslab.tracker.service.TrackerRun
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Background
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Surface
import com.chesslab.tracker.ui.theme.SurfaceRaised
import kotlinx.coroutines.flow.MutableStateFlow

/**
 * How a screen returns to a running tracker, or null where there is nothing to return to.
 *
 * The app has no bottom bar (`specs/47` §3.1a): three destinations do not need permanent chrome, and
 * the reference phone already spends that band on MIUI's own navigation. What the bar WOULD have
 * carried is the way back into a game that is still being tracked, and this is it — provided once by
 * the nav host, read by [ChesslabScaffold], and provided as null by the tracker itself.
 */
val LocalResumeTracker: ProvidableCompositionLocal<(() -> Unit)?> = compositionLocalOf { null }

/**
 * The frame every screen wears, the tracker included.
 *
 * It exists because Back used to be a differently placed, differently styled control on every
 * screen — an outlined pill on the right here, green text on the left there — and because a
 * hand-rolled header row does not push scrolling content out from under itself, so the settings
 * list scrolled straight under its own title.
 *
 * It also owns the side margin. Screens used to set their own and disagreed: 12 dp on
 * Games/Settings/Speech/Debug, 14 dp on the board, 0 on the camera.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChesslabScaffold(
    title: String,
    /** Null on the start destination, which has nowhere to go back to and therefore no arrow. */
    onBack: (() -> Unit)?,
    actions: @Composable RowScope.() -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        // The root already consumed `safeDrawing` (MainActivity), so a Scaffold that inset again
        // would leave a second, doubled system-bar gap on every screen.
        contentWindowInsets = WindowInsets(0),
        containerColor = Background,
        topBar = {
            // The banner rides in the top bar slot rather than above the content: Scaffold measures
            // this whole column, so the content below it is offset by the banner's height for free.
            Column {
                TopAppBar(
                    title = {
                        Text(
                            text = title,
                            style = MaterialTheme.typography.titleLarge,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    },
                    navigationIcon = {
                        // The platform affordance, and the ONLY one: it calls the same `onBack` the
                        // system back button reaches, so the two can never diverge. `AutoMirrored`
                        // flips it for RTL locales.
                        onBack?.let {
                            IconButton(onClick = it) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                            }
                        }
                    },
                    actions = actions,
                    colors =
                        TopAppBarDefaults.topAppBarColors(
                            containerColor = SurfaceRaised,
                            titleContentColor = OnSurface,
                        ),
                )
                LiveGameBanner()
            }
        },
    ) { bars ->
        Box(Modifier.padding(horizontal = Space.md)) { content(bars) }
    }
}

/** No tracker bound yet is simply no game — the banner must render before the service does. */
private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())

/**
 * One row saying a game is still being tracked, and returning to it.
 *
 * Since specs/43 a game survives leaving this screen, leaving the app and the notification shade —
 * it ends only on an explicit stop. Nothing on screen has ever SAID so, and a user who navigates
 * away has no reason to believe it. This row is that statement, and it is absent rather than empty
 * when no game is running.
 */
@Composable
private fun LiveGameBanner() {
    val resume = LocalResumeTracker.current ?: return
    val running by TrackerRun.running.collectAsStateWithLifecycle()
    if (!running) return
    val controller by GameSessionHost.controller.collectAsStateWithLifecycle()
    val live by (controller?.state ?: NO_LIVE_GAME).collectAsStateWithLifecycle()
    Row(
        Modifier
            .fillMaxWidth()
            .background(Surface)
            .clickable(onClick = resume)
            .padding(horizontal = Space.md, vertical = Space.sm),
        horizontalArrangement = Arrangement.spacedBy(Space.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Spacer(Modifier.size(Space.sm).clip(CircleShape).background(Accent))
        Text(
            text = liveGameLine(live),
            style = MaterialTheme.typography.labelMedium,
            color = OnSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Text("Resume", style = MaterialTheme.typography.labelMedium, color = Accent)
    }
}

/** The state worth reading off a one-row banner: that it is tracking, and how far it has got. */
internal fun liveGameLine(live: GameSessionState): String =
    when (live.moveCount) {
        0 -> "Tracking · waiting for the first move"
        1 -> "Tracking · 1 move"
        else -> "Tracking · ${live.moveCount} moves"
    }

/**
 * The app's ONE disclosure row: a title, what is behind it, and a chevron.
 *
 * Settings has eleven of these and the review screen's "Analysis details" is the twelfth. That row
 * used to be a bare muted `TextButton` with no chevron and no surface, visually identical to the
 * headings above it — content nobody would find.
 */
@Composable
fun DisclosureRow(
    title: String,
    subtitle: String,
    onOpen: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onOpen).padding(vertical = Space.md),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column {
            Text(title, style = MaterialTheme.typography.titleMedium, color = OnSurface)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
        }
        Text("›", style = MaterialTheme.typography.titleMedium, color = OnSurfaceMuted)
    }
}

/** A heading over a run of [DisclosureRow]s, so eleven of them are not one flat wall. */
@Composable
fun SectionHeading(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelMedium,
        color = OnSurfaceMuted,
        modifier = Modifier.padding(top = Space.md, bottom = Space.xs),
    )
}
