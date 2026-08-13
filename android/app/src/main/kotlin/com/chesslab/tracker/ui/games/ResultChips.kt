package com.chesslab.tracker.ui.games

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.chesslab.tracker.games.GameResult
import com.chesslab.tracker.ui.review.resultHeadline
import com.chesslab.tracker.ui.theme.Space

/**
 * How a game ended, as four full-width radio rows.
 *
 * The same control in both places a result can be stated — the end-game dialog and the stored
 * game's editor — because they are the same question, and a second wording for it is a second
 * result. The names come from `resultHeadline`, so the library, the review title and this row can
 * never disagree about what `1/2-1/2` is called.
 *
 * A result is a single choice, and the vertical list remains readable for long translations while
 * matching the end-game sheet's scan order.
 */
@Composable
fun ResultChips(
    selected: GameResult,
    onSelect: (GameResult) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier.fillMaxWidth()) {
        GameResult.entries.forEach { result ->
            Row(
                Modifier.fillMaxWidth().clickable { onSelect(result) }.padding(vertical = Space.xs),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RadioButton(selected = result == selected, onClick = { onSelect(result) })
                Text(stringResource(resultHeadline(result)), modifier = Modifier.padding(start = Space.xs))
            }
        }
    }
}
