package com.chesslab.tracker.ui.tracking

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
import com.chesslab.tracker.ui.theme.BoardDark
import com.chesslab.tracker.ui.theme.PieceBlack
import com.chesslab.tracker.ui.theme.PieceWhite
import com.chesslab.tracker.ui.theme.Space

/** Q / R / B / N, in that order. Lowercase is what `choosePromotion` expects. */
/** Four glyphs a thumb has to hit mid-game, so this is a size and not a touch minimum. */
private val PIECE_BUTTON = 76.dp

private val PROMOTION_CHOICES = listOf('q', 'r', 'b', 'n')

/** `w` in the FEN's side-to-move field — the promoting side, so the buttons show its colour. */
internal fun whiteToMove(fen: String): Boolean = fen.split(' ').getOrNull(1) != "b"

/** Filled glyphs throughout — the button's content colour carries the side, not the glyph outline. */
private fun glyphOf(piece: Char): String =
    when (piece) {
        'q' -> "♛"
        'r' -> "♜"
        'b' -> "♝"
        else -> "♞"
    }

@Composable
fun PromotionDialog(
    prompt: PromotionPrompt,
    fen: String,
    onChoose: (Char) -> Unit,
) {
    val white = whiteToMove(fen)
    AlertDialog(
        // The engine holds the move until a piece is chosen, so back and outside-tap must not
        // dismiss: a dismissed dialog would strand the tracker on a pending promotion for good.
        onDismissRequest = {},
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false),
        title = { Text("Promotion", style = MaterialTheme.typography.titleLarge) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Space.md)) {
                Text(
                    "${prompt.from} → ${prompt.to}. Choose the piece.",
                    style = MaterialTheme.typography.bodyLarge,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(Space.md)) {
                    PROMOTION_CHOICES.forEach { piece ->
                        Button(
                            onClick = { onChoose(piece) },
                            modifier = Modifier.size(PIECE_BUTTON),
                            colors =
                                ButtonDefaults.buttonColors(
                                    containerColor = if (white) PieceWhite else BoardDark,
                                    contentColor = if (white) PieceBlack else PieceWhite,
                                ),
                        ) {
                            Text(glyphOf(piece), fontSize = 34.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        },
        confirmButton = {},
    )
}
