package com.chesslab.tracker.ui.games

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.stringResource
import com.chesslab.tracker.R
import com.chesslab.tracker.games.GameResult
import com.chesslab.tracker.games.UNKNOWN
import com.chesslab.tracker.ui.theme.Space

/**
 * The one editor for a stored game's names, event and RESULT, shared by Games and Review.
 *
 * The result belongs here and not only on the end-game dialog: that dialog defaults to
 * "unfinished" rather than guessing, and a default is only honest where it can be corrected.
 * This is where.
 */
@Composable
fun GameDetailsDialog(
    initialWhite: String,
    initialBlack: String,
    initialEvent: String,
    initialResult: GameResult,
    onDismiss: () -> Unit,
    onConfirm: (String, String, String, GameResult) -> Unit,
) {
    var white by remember { mutableStateOf(initialWhite.takeUnless { it == UNKNOWN }.orEmpty()) }
    var black by remember { mutableStateOf(initialBlack.takeUnless { it == UNKNOWN }.orEmpty()) }
    var event by remember { mutableStateOf(initialEvent) }
    var result by remember { mutableStateOf(initialResult) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.games_edit_title)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
                OutlinedTextField(white, { white = it }, label = { Text(stringResource(R.string.games_white)) }, singleLine = true)
                OutlinedTextField(black, { black = it }, label = { Text(stringResource(R.string.games_black)) }, singleLine = true)
                OutlinedTextField(event, { event = it }, label = { Text(stringResource(R.string.games_event)) }, singleLine = true)
                Text(stringResource(R.string.games_result_edit))
                ResultChips(result, { result = it })
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(white, black, event, result) }) { Text(stringResource(R.string.games_save)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.games_cancel)) } },
    )
}
