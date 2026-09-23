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

// Eleven primitives (specs/48); each KDoc says what its primitive is NOT for (`docs/ui-vocabulary.md`).

/** How a screen returns to a running tracker, or null — what a bottom bar would have carried. */
val LocalResumeTracker: ProvidableCompositionLocal<(() -> Unit)?> = compositionLocalOf { null }

/** Owns Back, the side margin and the rule under the bar: every screen that owned its own disagreed. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChesslabScaffold(
    title: String,
    onBack: (() -> Unit)?,
    actions: @Composable RowScope.() -> Unit = {},
    /** Home only: a brand is shown where the app is entered, never on the board (specs/48). */
    titleIcon: (@Composable () -> Unit)? = null,
    titleStyle: TextStyle? = null,
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        // The root already consumed `safeDrawing`; insetting again doubles the system-bar gap.
        contentWindowInsets = WindowInsets(0),
        containerColor = Background,
        topBar = {
            // In the top bar slot: Scaffold then offsets the content by the banner's height for free.
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
                        // The ONLY back affordance: it calls the same `onBack` as system back, so the two cannot diverge.
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
        // The BOTTOM gap is the system navigation, not asymmetry: without it the last button could not be aimed at.
        Box(Modifier.padding(start = Space.md, end = Space.md, top = Space.sm, bottom = Space.xl)) { content(bars) }
    }
}

@Composable
fun Rule(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(Stroke.hairline).background(Outline))
}

private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())

/** **Panel — in-progress banner.** ABSENT when no game runs; a game survives leaving the app and nothing else says so. */
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

/** **Panel — in-progress banner, second form.** The engine review; carries the app's ONLY Stop for it. */
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

internal fun liveGameLine(live: GameSessionState): String =
    when (live.moveCount) {
        0 -> "Tracking · waiting for the first move"
        1 -> "Tracking · 1 move"
        else -> "Tracking · ${live.moveCount} moves"
    }

/** **Primitive — card.** NOT for a single value (a [StatTile]), NOT a way to look important. */
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

/** **Primitive — stat tile.** One measured number. NOT for a number nobody measured, nor a fresh-install zero. */
@Composable
fun StatTile(
    label: String,
    value: String,
    note: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            // A tile whose note wraps made the row ragged: the caller gives the row an intrinsic height, each tile fills it.
            .fillMaxHeight()
            .border(Stroke.hairline, Outline, RoundedCornerShape(Radius.md))
            .padding(horizontal = Space.md, vertical = Space.sm),
        verticalArrangement = Arrangement.spacedBy(Space.hair),
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = OnSurfaceMuted)
        Text(value, style = FiguresDisplay, color = OnSurface, maxLines = 1)
        Text(note, style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
    }
}

@Composable
fun StatRow(content: @Composable RowScope.() -> Unit) {
    Row(
        Modifier.fillMaxWidth().height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(Space.sm),
        content = content,
    )
}

/** **Primitive — disclosure row.** Two variants (specs/51); the [icon] is DECORATIVE on purpose. */
@Composable
fun DisclosureRow(
    title: String,
    subtitle: String,
    // Before [onOpen], so the action stays the trailing lambda every call site already writes.
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
            // `weight`, or a wrapping subtitle claims the row and pushes the chevron off the screen.
            Column(Modifier.weight(1f).padding(end = Space.sm)) {
                Text(title, style = MaterialTheme.typography.titleMedium, color = OnSurface)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            }
            if (chevron) Text("›", style = MaterialTheme.typography.titleMedium, color = OnSurfaceMuted)
        }
        Rule()
    }
}

/** **Primitive — section label.** NOT monospace — that made the app look like a log viewer. */
@Composable
fun SectionHeading(text: String) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        color = OnSurfaceMuted,
        modifier = Modifier.padding(top = Space.md, bottom = Space.xs),
    )
}

/** **Primitive — filled button.** At most one per screen; destructive is never filled. */
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

@Composable
fun TextAction(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    TextButton(onClick = onClick, enabled = enabled, modifier = modifier.heightIn(min = Touch.min)) {
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = if (enabled) Accent else OnSurfaceMuted,
            maxLines = 1,
        )
    }
}

/** **Primitive — outlined danger.** Never filled; keeps Material's side padding, at 8 dp it read as a badge. */
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

private val ACTION_PADDING = PaddingValues(horizontal = Space.sm, vertical = Space.xs)

/** **Primitive — chip.** Selected is the FURNITURE colour and a border, never the accent. */
@OptIn(ExperimentalMaterial3Api::class)
/** **Primitive — severity stripe.** Three levels, no more; NOT for a row that merely differs. */
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

/** **Panel — empty state.** One sentence, one button. No zeroes, no skeleton grid. */
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

/** **Panel — destructive confirmation.** The only primitive allowed to interrupt, and only for the irreversible. */
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

/** **One quantity, one unit**: three files once spelled the same percentage three ways. */
fun percent(value: Double): String = "${value.roundToInt()} %"

@Composable
fun Figure(
    text: String,
    color: Color,
    modifier: Modifier = Modifier,
) {
    Text(text, style = Figures, color = color, maxLines = 1, modifier = modifier)
}
