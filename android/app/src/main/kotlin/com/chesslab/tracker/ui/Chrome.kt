package com.chesslab.tracker.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.games.GameSessionState
import com.chesslab.tracker.service.TrackerRun
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.review.ReviewHost
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Background
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.Figures
import com.chesslab.tracker.ui.theme.FiguresDisplay
import com.chesslab.tracker.ui.theme.OnAccent
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Outline
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke
import com.chesslab.tracker.ui.theme.Surface
import com.chesslab.tracker.ui.theme.Touch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlin.math.roundToInt

/*
 * The app's vocabulary — eleven primitives (specs/48), and each KDoc says what its primitive is NOT
 * for, because a component drifts when nobody writes down when not to use it. `docs/ui-vocabulary.md`.
 */

/**
 * How a screen returns to a running tracker, or null where there is nothing to return to — the app
 * has no bottom bar, and this is what one would have carried (`docs/ui-vocabulary.md`).
 */
val LocalResumeTracker: ProvidableCompositionLocal<(() -> Unit)?> = compositionLocalOf { null }

/**
 * The frame every screen wears, the tracker included. It owns Back, the side margin and the rule
 * under the bar, because every screen that owned its own disagreed with the others (`docs/ui-vocabulary.md`).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChesslabScaffold(
    title: String,
    /** Null on the start destination, which has nowhere to go back to and therefore no arrow. */
    onBack: (() -> Unit)?,
    actions: @Composable RowScope.() -> Unit = {},
    /**
     * Drawn before the title. Home passes the mark here and nothing else does — a brand is shown
     * where the app is entered, not on every screen, and never on the board (specs/48).
     */
    titleIcon: (@Composable () -> Unit)? = null,
    titleStyle: TextStyle? = null,
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
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            titleIcon?.let {
                                it()
                                Spacer(Modifier.width(Space.sm))
                            }
                            Text(
                                text = title,
                                style = titleStyle ?: MaterialTheme.typography.titleLarge,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
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
                            containerColor = Background,
                            titleContentColor = OnSurface,
                        ),
                )
                LiveGameBanner()
                AnalysisBanner()
                Rule()
            }
        },
    ) { bars ->
        // The BOTTOM gap is bigger than the top one, and that is the system navigation rather than
        // symmetry — without it "Show all 83 moves" could not be aimed at (`docs/ui-vocabulary.md`).
        Box(Modifier.padding(start = Space.md, end = Space.md, top = Space.sm, bottom = Space.xl)) { content(bars) }
    }
}

/** The hairline that separates two containers. Not a spacer — it is the edge doing the work. */
@Composable
fun Rule(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(Stroke.hairline).background(Outline))
}

/** No tracker bound yet is simply no game — the banner must render before the service does. */
private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())

/**
 * **Panel — in-progress banner.** One row under the app bar, ABSENT when no game runs. Since
 * specs/43 a game survives leaving the app, and nothing else on screen says so (`docs/ui-vocabulary.md`).
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
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Text("Resume", style = MaterialTheme.typography.labelMedium, color = Accent)
    }
}

/**
 * **Panel — in-progress banner, second form.** The engine review, which outlives the screen that
 * started it. This carries the app's ONLY Stop for it (`docs/ui-vocabulary.md`).
 */
@Composable
private fun AnalysisBanner() {
    val model by ReviewHost.model.collectAsStateWithLifecycle()
    val review = model ?: return
    val ui by review.ui.collectAsStateWithLifecycle()
    if (!ui.running) return
    Column(Modifier.fillMaxWidth().background(Surface)) {
        Row(
            Modifier.fillMaxWidth().padding(start = Space.md, end = Space.sm, top = Space.sm),
            horizontalArrangement = Arrangement.spacedBy(Space.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Spacer(Modifier.size(Space.sm).clip(CircleShape).background(Accent))
            Text(
                text =
                    if (ui.warmingLibrary) {
                        "Extending analysis library · ${ui.libraryCached} / ${ui.libraryTotal}"
                    } else {
                        analysisLine(ui.game?.id, ui.grade?.scored, ui.grade?.positions)
                    },
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            TextAction("Stop", review::stop)
        }
        // Determinate, because a review is minutes and the one thing worth knowing is how much more.
        val done = if (ui.warmingLibrary) ui.libraryCached else ui.grade?.scored ?: 0
        val total = if (ui.warmingLibrary) ui.libraryTotal else ui.grade?.positions ?: 0
        if (total > 0) {
            LinearProgressIndicator(
                { done.toFloat() / total },
                Modifier.fillMaxWidth().height(Stroke.thick),
                color = Accent,
            )
        }
    }
}

/** Named so the wording is testable without a device: it is the only thing the banner says. */
internal fun analysisLine(
    id: String?,
    scored: Int?,
    positions: Int?,
): String =
    when {
        id == null -> "Reviewing a game…"
        scored == null || positions == null || positions == 0 -> "Reviewing $id · starting the engine"
        else -> "Reviewing $id · $scored / $positions"
    }

/** The state worth reading off a one-row banner: that it is tracking, and how far it has got. */
internal fun liveGameLine(live: GameSessionState): String =
    when (live.moveCount) {
        0 -> "Tracking · waiting for the first move"
        1 -> "Tracking · 1 move"
        else -> "Tracking · ${live.moveCount} moves"
    }

/**
 * **Primitive — card.** Things that belong together, as a fill on the ground with a 1 px edge. NOT
 * for a single value (that is a [StatTile]), and NOT a way to look important (`docs/ui-vocabulary.md`).
 */
@Composable
fun Card(
    modifier: Modifier = Modifier,
    accented: Boolean = false,
    content: @Composable ColumnScope.() -> Unit,
) {
    val shape = RoundedCornerShape(Radius.md)
    Column(
        modifier
            .fillMaxWidth()
            .background(Surface, shape)
            .border(Stroke.hairline, if (accented) Accent else Outline, shape)
            .padding(horizontal = Space.md, vertical = Space.sm),
        verticalArrangement = Arrangement.spacedBy(Space.sm),
        content = content,
    )
}

/**
 * **Primitive — stat tile.** One measured number, large, with its unit and denominator. NOT for a
 * number nobody measured, and not for a zero on a fresh install (`docs/ui-vocabulary.md`).
 */
@Composable
fun StatTile(
    label: String,
    value: String,
    note: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            // A pair of tiles is a ROW of tiles, and one whose note wraps to two lines made the row
            // ragged — measured on the emulator, "both sides, over 1 reviewed" against "83 moves
            // recorded". The caller gives the row an intrinsic height; each tile fills it.
            .fillMaxHeight()
            .border(Stroke.hairline, Outline, RoundedCornerShape(Radius.md))
            .padding(horizontal = Space.md, vertical = Space.sm),
        verticalArrangement = Arrangement.spacedBy(Space.hair),
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = OnSurfaceMuted)
        // The grid is read DOWN: `1 of 1` over `0 of 1`, `69 %` beside a `1`.
        Text(value, style = FiguresDisplay, color = OnSurface, maxLines = 1)
        Text(note, style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
    }
}

/** A pair of [StatTile]s, equal height whether or not one of the notes wraps. */
@Composable
fun StatRow(content: @Composable RowScope.() -> Unit) {
    Row(
        Modifier.fillMaxWidth().height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(Space.sm),
        content = content,
    )
}

/**
 * **Primitive — disclosure row.** Title, one line of what is behind it, the rule to the next. Two
 * variants (specs/51); the [icon] is DECORATIVE on purpose (`docs/ui-vocabulary.md`).
 */
@Composable
fun DisclosureRow(
    title: String,
    subtitle: String,
    // The two variants sit BEFORE [onOpen] so the action stays the trailing lambda every existing
    // call site already writes — adding a parameter must not rewrite the callers.
    icon: ImageVector? = null,
    chevron: Boolean = true,
    onOpen: () -> Unit,
) {
    Column {
        Row(
            Modifier.fillMaxWidth().clickable(onClick = onOpen).padding(vertical = Space.md),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            icon?.let {
                Icon(it, contentDescription = null, tint = OnSurfaceMuted, modifier = Modifier.padding(end = Space.md))
            }
            // `weight`, or a subtitle long enough to wrap claims the whole row and pushes the chevron
            // off the screen — which is what the review screen's own disclosure row did.
            Column(Modifier.weight(1f).padding(end = Space.sm)) {
                Text(title, style = MaterialTheme.typography.titleMedium, color = OnSurface)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            }
            if (chevron) Text("›", style = MaterialTheme.typography.titleMedium, color = OnSurfaceMuted)
        }
        Rule()
    }
}

/**
 * **Primitive — section label.** Body face, semibold, tracked, uppercase. NOT monospace — that is
 * what made the app look like a log viewer (`docs/ui-vocabulary.md`).
 */
@Composable
fun SectionHeading(text: String) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        color = OnSurfaceMuted,
        modifier = Modifier.padding(top = Space.md, bottom = Space.xs),
    )
}

/**
 * **Primitive — filled button.** The one thing this screen is for, **at most one per screen**.
 * Everything else is [OutlineAction], [TextAction] or [DangerAction]; destructive is never filled.
 */
@Composable
fun FilledAction(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Button(
        onClick = onClick,
        modifier = modifier.heightIn(min = Touch.min),
        colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = OnAccent),
        contentPadding = ACTION_PADDING,
    ) {
        Text(label, style = MaterialTheme.typography.labelLarge, maxLines = 1)
    }
}

/** **Primitive — outline button.** Everything the screen can do that is not the one thing it is for. */
@Composable
fun OutlineAction(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = Touch.min),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = OnSurface),
        border = BorderStroke(Stroke.hairline, Outline),
        contentPadding = ACTION_PADDING,
    ) {
        Text(label, style = MaterialTheme.typography.labelLarge, maxLines = 1)
    }
}

/** **Primitive — text button.** Navigation, and the accent is what says it goes somewhere. */
@Composable
fun TextAction(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    TextButton(onClick = onClick, enabled = enabled, modifier = modifier) {
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = if (enabled) Accent else OnSurfaceMuted,
            maxLines = 1,
        )
    }
}

/**
 * **Primitive — outlined danger.** Destructive, and destructive is never filled. It keeps
 * Material's roomier side padding, at which 8 dp read as a badge (`docs/ui-vocabulary.md`).
 */
@Composable
fun DangerAction(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.heightIn(min = Touch.min),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Danger),
        border = BorderStroke(Stroke.hairline, Danger),
    ) {
        Text(label, style = MaterialTheme.typography.labelLarge, maxLines = 1)
    }
}

/** Three buttons fit across a phone only if they do not each carry Material's 24 dp side padding. */
private val ACTION_PADDING = PaddingValues(horizontal = Space.sm, vertical = Space.xs)

/**
 * **Primitive — chip.** One option of a group, all visible at once. Selected is the FURNITURE
 * colour and a border, never the accent — it must not compete with the filled button.
 */
@OptIn(ExperimentalMaterial3Api::class)
/**
 * **Primitive — severity stripe.** State in FORM as well as colour — three levels and no more.
 * NOT a way to colour a row that merely differs from its neighbours (`docs/ui-vocabulary.md`).
 */
@Composable
fun SeverityStripe(
    color: Color,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
        Box(
            Modifier
                .width(Stroke.thick)
                .heightIn(min = Touch.min)
                .clip(RoundedCornerShape(Stroke.thick))
                .background(color),
        )
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Space.hair), content = content)
    }
}

/**
 * **Panel — empty state.** One sentence naming what will appear, one button that makes it appear.
 * No zeroes, no skeleton grid, no illustration of nothing (`docs/ui-vocabulary.md`).
 */
@Composable
fun EmptyState(
    title: String,
    body: String,
    action: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Column(
        Modifier.fillMaxWidth().padding(vertical = Space.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, color = OnSurface)
        Text(body, style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted)
        if (action != null && onAction != null) FilledAction(action, onAction)
    }
}

/**
 * **Panel — destructive confirmation.** The only primitive allowed to interrupt, for an act that
 * cannot be undone and NOTHING else. The five rules it enforces: `docs/ui-vocabulary.md`.
 */
@Composable
fun ConfirmDialog(
    title: String,
    body: String,
    verb: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    extra: (@Composable ColumnScope.() -> Unit)? = null,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, style = MaterialTheme.typography.titleMedium, color = OnSurface) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
                Text(body, style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted)
                extra?.invoke(this)
            }
        },
        confirmButton = { DangerAction(verb, onConfirm) },
        dismissButton = { TextAction("Cancel", onDismiss) },
    )
}

/**
 * **One quantity, one unit.** Every percentage is written the same way, wherever it appears — three
 * files drawing the same quantity spelled it three ways (`docs/ui-vocabulary.md`).
 */
fun percent(value: Double): String = "${value.roundToInt()} %"

/** A figure, in the one monospace style — see [Figures]. */
@Composable
fun Figure(
    text: String,
    color: Color,
    modifier: Modifier = Modifier,
) {
    Text(text, style = Figures, color = color, maxLines = 1, modifier = modifier)
}
