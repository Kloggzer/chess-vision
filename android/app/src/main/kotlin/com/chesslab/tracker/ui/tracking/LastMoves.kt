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
import com.chesslab.tracker.games.startsWithBlack
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space

/**
 * **The last few move pairs — the live glance, not the score sheet.**
 *
 * `ui/review/MoveList` is a review component: it scrolls, it selects, it is built to read a whole
 * game, and on the tracking screen it took height the board wanted for rows nobody looks at while
 * playing. What a player checks mid-game is "did it get my last move", and that is [PAIRS] rows.
 *
 * The pairing is `games.moveRows`, the same function the score sheet uses — a second opinion about
 * which ply is move 14 is exactly the class of bug specs/50 spent a commit closing.
 *
 * The whole game is paired and the tail is taken, deliberately: numbering per segment would restart
 * at 1 after a seam, and a live game is one game to the person in front of it.
 */
@Composable
fun LastMoves(
    game: GameView,
    modifier: Modifier = Modifier,
) {
    val rows = moveRows(game.plies, startsWithBlack(game.startFen)).takeLast(PAIRS)
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
        // SAN, so never a resource: `Nf3` is `Nf3` in every language the app will ever speak.
        Text(row.white?.san.orEmpty(), style = MaterialTheme.typography.bodyMedium, color = OnSurface, modifier = Modifier.width(SAN_WIDTH))
        Text(row.black?.san.orEmpty(), style = MaterialTheme.typography.bodyMedium, color = OnSurface)
    }
}

/** Three pairs: enough to see the last exchange, short enough that the board keeps the screen. */
private const val PAIRS = 3

private val NUMBER_WIDTH = 44.dp

private val SAN_WIDTH = 88.dp
