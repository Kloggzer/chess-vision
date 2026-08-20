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

/**
 * What the user is told the alarm IS.
 *
 * The card used to print the raw latch name — `alarm.kind.replace('_',' ').uppercase()`, i.e.
 * "ILLEGAL MOVE" — which reads as an accusation about the player's move rather than what it means:
 * the app's board and the physical board have drifted apart and the app knows it. Both kinds say
 * the same thing to the user — tracking stopped, the board below is stale — so both open with
 * "Position lost"; the `when` keeps the raw string as a fallback for a kind nobody phrased yet.
 */
private fun headlineFor(kind: String): String =
    when (kind) {
        "illegal_move" -> "Position lost — the board and the app disagree"
        "illegal_move_refused" -> "Position lost — the app was handed a move it cannot play"
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
    /** The SANs of the last commit — see [undoCount]; this card is where Undo is usually pressed. */
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
        // The PROSE gives way and scrolls; the buttons below never move.
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
        //
        // `weight` and not just `heightIn`: a Column measures its NON-weighted children first, so
        // a mere cap let the prose take its 200dp before the buttons were measured and left them
        // 1-2 mm tall whenever the board above had eaten the card's room (2026-08-21). Weighted,
        // the prose is measured LAST and gives way — which is what "the buttons never move" means.
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
        // The action that resolves the alarm, first and on its own line. While the alarm is up this
        // card IS what the screen is for, so this is the screen's one filled button — and it is the
        // ACCENT, not the danger colour: danger is the state this card is reporting, and a state is
        // not an accent (rule 2). The stripe and the headline carry the alarm.
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

/**
 * How much height the card's prose may take before it scrolls instead of growing.
 *
 * Enough for the headline, the two-line explanation and a handful of facts; short enough that the
 * three buttons and the action bar under the card keep their own height on a phone in portrait.
 */
private const val PROSE_MAX = 200
