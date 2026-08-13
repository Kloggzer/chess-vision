package com.chesslab.tracker.ui.games

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.chesslab.tracker.games.GameResult
import com.chesslab.tracker.ui.review.resultHeadline
import com.chesslab.tracker.ui.theme.Space

/**
 * How a game ended, as four chips.
 *
 * The same control in both places a result can be stated — the end-game dialog and the stored
 * game's editor — because they are the same question, and a second wording for it is a second
 * result. The names come from `resultHeadline`, so the library, the review title and this row can
 * never disagree about what `1/2-1/2` is called.
 *
 * It wraps: German turns "Black wins" into "Schwarz gewinnt" and four of those do not fit a phone's
 * dialog on one line.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ResultChips(
    selected: GameResult,
    onSelect: (GameResult) -> Unit,
    modifier: Modifier = Modifier,
) {
    FlowRow(
        modifier,
        horizontalArrangement = Arrangement.spacedBy(Space.sm),
        verticalArrangement = Arrangement.spacedBy(Space.xs),
    ) {
        GameResult.entries.forEach { result ->
            FilterChip(
                selected = result == selected,
                onClick = { onSelect(result) },
                label = { Text(stringResource(resultHeadline(result))) },
            )
        }
    }
}
