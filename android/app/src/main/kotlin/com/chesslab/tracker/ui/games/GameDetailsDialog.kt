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
import com.chesslab.tracker.games.UNKNOWN
import com.chesslab.tracker.ui.theme.Space

/** The one editor for player names and PGN event metadata, shared by Games and Review. */
@Composable
fun GameDetailsDialog(
    initialWhite: String,
    initialBlack: String,
    initialEvent: String,
    onDismiss: () -> Unit,
    onConfirm: (String, String, String) -> Unit,
) {
    var white by remember { mutableStateOf(initialWhite.takeUnless { it == UNKNOWN }.orEmpty()) }
    var black by remember { mutableStateOf(initialBlack.takeUnless { it == UNKNOWN }.orEmpty()) }
    var event by remember { mutableStateOf(initialEvent) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit game details") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
                OutlinedTextField(white, { white = it }, label = { Text("White") }, singleLine = true)
                OutlinedTextField(black, { black = it }, label = { Text("Black") }, singleLine = true)
                OutlinedTextField(event, { event = it }, label = { Text("Event") }, singleLine = true)
            }
        },
        confirmButton = { TextButton(onClick = { onConfirm(white, black, event) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
