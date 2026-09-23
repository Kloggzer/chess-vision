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

/** One control wherever a result is stated — a second wording is a second result. Names from `resultHeadline`. */
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
