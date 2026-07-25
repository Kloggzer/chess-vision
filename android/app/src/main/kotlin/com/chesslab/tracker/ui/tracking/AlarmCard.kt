package com.chesslab.tracker.ui.tracking

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
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

private const val CONFLICTS_SHOWN = 8

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
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Danger.copy(alpha = 0.16f))
            .border(2.dp, Danger, RoundedCornerShape(14.dp))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = alarm.kind.replace('_', ' ').uppercase(),
            style = MaterialTheme.typography.titleLarge,
            color = Danger,
        )
        if (alarm.conflicts.isNotEmpty()) {
            val listed = alarm.conflicts.take(CONFLICTS_SHOWN).joinToString(", ")
            val more = alarm.conflicts.size - CONFLICTS_SHOWN
            Text(
                text = "Board disagrees on: $listed" + if (more > 0) " (+$more)" else "",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
        alarm.guessSan?.let {
            Text(
                text = "looks like: $it",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
        // Primary action first and on its own line: it is the one that resolves the alarm.
        Button(
            onClick = onAcceptCnn,
            colors = ButtonDefaults.buttonColors(containerColor = Danger, contentColor = OnDanger),
            modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
        ) { Text("Accept CNN position", style = MaterialTheme.typography.labelLarge) }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onUndo, modifier = Modifier.weight(1f).heightIn(min = 48.dp)) {
                Text("Undo", style = MaterialTheme.typography.labelLarge)
            }
            OutlinedButton(onClick = onNewBaseline, modifier = Modifier.weight(1f).heightIn(min = 48.dp)) {
                Text("New baseline", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}
