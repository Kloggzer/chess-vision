package com.chesslab.tracker.ui.tracking

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.SurfaceRaised

/** One committed ply, with the provenance the debug workflow relies on. */
data class MoveEntry(
    val san: String,
    val uci: String,
    val decider: String,
)

/** A numbered row of the score sheet. [black] is null on the half-open last row. */
data class MoveRow(
    val number: Int,
    val white: MoveEntry?,
    val black: MoveEntry?,
)

/**
 * The plies a commit event carries. A `SequenceCommitted` is a recovery of several plies at once
 * and expands to one entry per ply; its decider describes how ALL of them were decided, so it is
 * carried onto each.
 */
fun movesOf(event: TrackerEvent): List<MoveEntry> =
    when (event) {
        is TrackerEvent.MoveCommitted -> listOf(MoveEntry(event.san, event.uci, event.decider))
        is TrackerEvent.SequenceCommitted ->
            event.sans.indices.map { i ->
                MoveEntry(event.sans[i], event.ucis.getOrElse(i) { "" }, event.decider)
            }
        else -> emptyList()
    }

/**
 * Pair the ply list into numbered rows. [startsWithBlack] covers a game adopted mid-position
 * (`setFen`), where the first tracked ply belongs to Black.
 */
fun moveRows(
    moves: List<MoveEntry>,
    startsWithBlack: Boolean = false,
): List<MoveRow> {
    val slots = if (startsWithBlack) listOf<MoveEntry?>(null) + moves else moves
    return slots.chunked(2).mapIndexed { index, pair ->
        MoveRow(
            number = index + 1,
            white = pair.getOrNull(0),
            black = pair.getOrNull(1),
        )
    }
}

@Composable
fun MoveList(
    rows: List<MoveRow>,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()
    LaunchedEffect(rows.size) {
        if (rows.isNotEmpty()) listState.animateScrollToItem(rows.lastIndex)
    }
    Box(modifier.clip(RoundedCornerShape(12.dp)).background(SurfaceRaised)) {
        if (rows.isEmpty()) {
            Text(
                text = "No moves yet",
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceMuted,
                modifier = Modifier.padding(12.dp),
            )
        } else {
            LazyColumn(state = listState, modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp)) {
                items(rows, key = { it.number }) { MoveRowLine(it) }
            }
        }
    }
}

@Composable
private fun MoveRowLine(row: MoveRow) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = "${row.number}.",
            style = MaterialTheme.typography.labelMedium,
            color = OnSurfaceMuted,
            modifier = Modifier.width(34.dp),
        )
        MoveCell(row.white, Modifier.weight(1f))
        MoveCell(row.black, Modifier.weight(1f))
    }
}

@Composable
private fun MoveCell(
    entry: MoveEntry?,
    modifier: Modifier = Modifier,
) {
    Row(modifier, verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            text = entry?.san ?: "",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
        )
        if (entry != null) {
            Text(
                text = entry.decider,
                style = MaterialTheme.typography.labelMedium,
                color = OnSurfaceMuted,
            )
        }
    }
}
