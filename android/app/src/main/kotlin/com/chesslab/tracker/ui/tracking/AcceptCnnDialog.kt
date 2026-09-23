package com.chesslab.tracker.ui.tracking

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import java.util.Locale

data class CnnRead(
    val label: String,
    val conf: Double,
)

data class SquareChange(
    val square: String,
    val from: String,
    val to: String?,
    val confidence: Double?,
)

/** [complete] is false when the CNN's read of a listed square is not available here: the engine has no
 *  preview variant and `TrackerStatus` carries no label map, so the dialog says so and calls it irreversible. */
data class AcceptCnnPreview(
    val rows: List<SquareChange>,
    val complete: Boolean,
) {
    val isEmpty: Boolean get() = rows.isEmpty()
}

private val LIST_MAX_HEIGHT = 320.dp

private const val PERCENT = 100.0

/** Pure: opening and cancelling this dialog must be a no-op (`specs/16/04-alarm-ux.md`). */
fun acceptCnnPreview(
    fen: String,
    conflicts: List<String>,
    reads: Map<String, CnnRead> = emptyMap(),
): AcceptCnnPreview {
    val placement = parseFenPlacement(fen)
    val rows =
        conflicts.map { square ->
            val read = reads[square]
            SquareChange(
                square = square,
                from = pieceName(placement[square]),
                to = read?.let { pieceLabelName(it.label) },
                confidence = read?.conf,
            )
        }
    return AcceptCnnPreview(rows = rows, complete = rows.isNotEmpty() && rows.all { it.to != null })
}

private fun pieceName(piece: Char?): String {
    if (piece == null) return "empty"
    val colour = if (piece.isUpperCase()) "white" else "black"
    return "$colour ${pieceKind(piece.uppercaseChar())}"
}

private fun pieceLabelName(label: String): String =
    when {
        label.length != 2 -> label
        label[0] == 'w' -> "white ${pieceKind(label[1].uppercaseChar())}"
        label[0] == 'b' -> "black ${pieceKind(label[1].uppercaseChar())}"
        else -> label
    }

private fun pieceKind(type: Char): String =
    when (type) {
        'K' -> "king"
        'Q' -> "queen"
        'R' -> "rook"
        'B' -> "bishop"
        'N' -> "knight"
        'P' -> "pawn"
        else -> "piece"
    }

internal fun formatChange(change: SquareChange): String {
    val target = change.to ?: "?"
    val conf = change.confidence
    val suffix = if (conf == null) "" else String.format(Locale.ROOT, " (%.0f%%)", conf * PERCENT)
    return "${change.square}:  ${change.from} → $target$suffix"
}

@Composable
fun AcceptCnnDialog(
    preview: AcceptCnnPreview,
    onConfirm: () -> Unit,
    onCancel: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onCancel,
        title = { Text("Adopt CNN position?", style = MaterialTheme.typography.titleLarge) },
        text = {
            Column(
                Modifier.heightIn(max = LIST_MAX_HEIGHT).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(Space.sm),
            ) {
                if (preview.isEmpty) {
                    Text("No conflicting squares are reported.", style = MaterialTheme.typography.bodyLarge)
                }
                preview.rows.forEach {
                    Text(formatChange(it), style = MaterialTheme.typography.labelMedium)
                }
                if (!preview.complete) {
                    Text(
                        "The CNN's own reading is not previewable here — the adopted position may differ " +
                            "from this list. Adopting drops the move history and cannot be undone.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Danger,
                    )
                } else {
                    Text(
                        "Adopting drops the move history and cannot be undone.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = OnSurfaceMuted,
                    )
                }
            }
        },
        confirmButton = { TextButton(onClick = onConfirm) { Text("Adopt position") } },
        dismissButton = { TextButton(onClick = onCancel) { Text("Cancel") } },
    )
}
