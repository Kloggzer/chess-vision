package com.chesslab.tracker.ui.tracking

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.R
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke

private const val CONFLICTS_SHOWN = 8

/** Not the raw latch name: "ILLEGAL MOVE" read as an accusation. Both kinds mean the boards drifted apart. */
private fun headlineFor(kind: String): String =
    when (kind) {
        "illegal_move" -> "Position lost — the board and the app disagree"
        "illegal_move_refused" -> "Position lost — the app was handed a move it cannot play"
        else -> kind.replace('_', ' ').uppercase()
    }

/** While up, the engine blocks every commit (invariant 9): these three actions are the only ways forward. */
@Composable
fun AlarmCard(
    alarm: AlarmUi,
    onAcceptCnn: () -> Unit,
    onUndo: () -> Unit,
    onNewBaseline: () -> Unit,
    lastCommit: List<String> = emptyList(),
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Radius.md))
            .background(Danger.copy(alpha = 0.16f))
            .border(Stroke.thick, Danger, RoundedCornerShape(Radius.md))
            .padding(Space.md),
        verticalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        // The PROSE gives way, the buttons never move: a growing conflict list squeezed the action bar to 1-2 mm.
        // `weight`, not `heightIn`: non-weighted children are measured first. No scrolling container — nesting the
        // move list's `LazyColumn` in `verticalScroll` crashed on launch.
        Column(
            Modifier
                .weight(1f, fill = false)
                .heightIn(max = PROSE_MAX.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(Space.sm),
        ) {
            Text(
                text = headlineFor(alarm.kind),
                style = MaterialTheme.typography.titleLarge,
                color = Danger,
            )
            Text(
                text =
                    "Tracking is paused and the board below is the last position the app was sure " +
                        "of — not what is in front of you. Pick one:",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            AlarmFacts(alarm, lastCommit)
        }
        // ACCENT, not danger: danger is the state this card reports, and a state is not an accent.
        FilledAction("Accept CNN position", onAcceptCnn, Modifier.fillMaxWidth())
        Row(horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
            OutlineAction(
                pluralStringResource(R.plurals.tracking_take_back, undoCount(lastCommit), undoCount(lastCommit)),
                onUndo,
                Modifier.weight(1f),
            )
            OutlineAction("New baseline", onNewBaseline, Modifier.weight(1f))
        }
    }
}

/** Undo's plies are listed here: a CNN recovery commits a whole bridge, and the button only fits a count. */
@Composable
private fun AlarmFacts(
    alarm: AlarmUi,
    lastCommit: List<String>,
) {
    val lines =
        listOfNotNull(
            alarm.conflicts.takeIf { it.isNotEmpty() }?.let { conflicts ->
                val more = conflicts.size - CONFLICTS_SHOWN
                "Board disagrees on: " + conflicts.take(CONFLICTS_SHOWN).joinToString(", ") +
                    if (more > 0) " (+$more)" else ""
            },
            alarm.guessSan?.let { "looks like: $it" },
            undoDetail(lastCommit)?.let { stringResource(R.string.tracking_take_back_detail, it.joinToString(" + ")) },
        )
    lines.forEach {
        Text(
            text = it,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

private const val PROSE_MAX = 200
