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
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnDanger
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke
import com.chesslab.tracker.ui.theme.Touch

private const val CONFLICTS_SHOWN = 8

/**
 * What the user is told the alarm IS.
 *
 * The card used to print the raw latch name — `alarm.kind.replace('_',' ').uppercase()`, i.e.
 * "ILLEGAL MOVE" — which reads as an accusation about the player's move rather than what it means:
 * the app's board and the physical board have drifted apart and the app knows it. `illegal_move` is
 * currently the only kind raised (`engine.Alarm.ALARM_ILLEGAL_MOVE`); the `when` keeps the raw
 * string as a fallback so a new kind degrades to the old behaviour instead of vanishing.
 */
private fun headlineFor(kind: String): String =
    when (kind) {
        "illegal_move" -> "Position lost — the board and the app disagree"
        else -> kind.replace('_', ' ').uppercase()
    }

/**
 * The illegal-move latch, made actionable.
 *
 * Shown iff `status.alarm != null` — the same condition that tints the board. While it is up the
 * engine blocks every commit, re-anchor and pending candidate (invariant 9), so the three actions
 * here are the only ways forward: adopt what the CNN sees, take the last move back, or declare the
 * physical board correct and re-reference it.
 */
@Composable
fun AlarmCard(
    alarm: AlarmUi,
    onAcceptCnn: () -> Unit,
    onUndo: () -> Unit,
    onNewBaseline: () -> Unit,
    /** The SANs of the last commit — see [undoLabel]; this card is where Undo is usually pressed. */
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
        // The PROSE is bounded and scrolls; the buttons below never move.
        //
        // This card is a non-weighted child of a full-height Column, and a Column hands each
        // non-weighted child what is left in order. The conflict list grows with the number of
        // disagreeing squares, so on a bad board the card grew until the action bar underneath it —
        // measured last — rendered 1-2 mm tall and could not be pressed. `heightIn(min = 48.dp)`
        // does not save a child there: a minimum is not a reservation.
        //
        // Capping the card's TEXT is the fix rather than scrolling the screen: the move list below
        // is a `LazyColumn`, and nesting one inside a `Modifier.verticalScroll` throws outright
        // (tried on 2026-08-02, crashed on launch). Bounding the growth at its source needs no
        // scrolling container above the list at all.
        Column(
            Modifier.heightIn(max = PROSE_MAX.dp).verticalScroll(rememberScrollState()),
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
        // Primary action first and on its own line: it is the one that resolves the alarm.
        Button(
            onClick = onAcceptCnn,
            colors = ButtonDefaults.buttonColors(containerColor = Danger, contentColor = OnDanger),
            modifier = Modifier.fillMaxWidth().heightIn(min = Touch.min),
        ) { Text("Accept CNN position", style = MaterialTheme.typography.labelLarge) }
        Row(horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
            OutlinedButton(onClick = onUndo, modifier = Modifier.weight(1f).heightIn(min = Touch.min)) {
                Text(undoLabel(lastCommit), style = MaterialTheme.typography.labelLarge)
            }
            OutlinedButton(onClick = onNewBaseline, modifier = Modifier.weight(1f).heightIn(min = Touch.min)) {
                Text("New baseline", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

/**
 * The three things worth knowing before choosing: where the two boards disagree, what the app
 * thinks it saw, and what Undo would take back.
 *
 * The last one is here rather than on the button because a CNN recovery commits a whole bridge —
 * four plies on 2026-08-02 — and the button has room for a count, not for the moves.
 */
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
            undoDetail(lastCommit),
        )
    lines.forEach {
        Text(
            text = it,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

/**
 * How much height the card's prose may take before it scrolls instead of growing.
 *
 * Enough for the headline, the two-line explanation and a handful of facts; short enough that the
 * three buttons and the action bar under the card keep their own height on a phone in portrait.
 */
private const val PROSE_MAX = 200
