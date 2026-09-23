package com.chesslab.tracker.ui.tracking

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.MoveRow
import com.chesslab.tracker.games.moveRows
import com.chesslab.tracker.games.startNumber
import com.chesslab.tracker.games.startsWithBlack
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space

/** The live glance, not the score sheet. Paired by `games.moveRows` like the score sheet, over the whole
 *  game and then tailed: per-segment numbering would restart at 1 after a seam. */
@Composable
fun LastMoves(
    game: GameView,
    modifier: Modifier = Modifier,
) {
    val rows = moveRows(game.plies, startsWithBlack(game.startFen), startNumber(game.startFen)).takeLast(PAIRS)
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Space.xs)) {
        rows.forEach { MoveRowLine(it) }
    }
}

@Composable
private fun MoveRowLine(row: MoveRow) {
    Row(horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
        Text(
            "${row.number}.",
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurfaceMuted,
            modifier = Modifier.width(NUMBER_WIDTH),
        )
        Text(row.white?.san.orEmpty(), style = MaterialTheme.typography.bodyMedium, color = OnSurface, modifier = Modifier.width(SAN_WIDTH))
        Text(row.black?.san.orEmpty(), style = MaterialTheme.typography.bodyMedium, color = OnSurface)
    }
}

private const val PAIRS = 3

private val NUMBER_WIDTH = 44.dp

private val SAN_WIDTH = 88.dp
