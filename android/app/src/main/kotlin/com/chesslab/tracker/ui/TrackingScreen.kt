package com.chesslab.tracker.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.R
import com.chesslab.tracker.service.OverlayView

@Suppress("ktlint:standard:function-naming", "FunctionNaming", "LongMethod")
@Composable
fun TrackingScreen(
    state: UiState,
    board: android.graphics.Bitmap?,
    showDebug: Boolean,
    overlayView: OverlayView,
    onUndo: () -> Unit,
    onReset: () -> Unit,
    onPromote: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier =
            modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Accessibility live region: announces each committed move once.
        Text(
            text = state.announcement?.text.orEmpty(),
            style = MaterialTheme.typography.bodySmall,
            modifier =
                Modifier
                    .fillMaxWidth()
                    .semantics {
                        liveRegion = LiveRegionMode.Assertive
                        contentDescription = state.announcement?.text.orEmpty()
                    },
        )

        StatusChip(state = state.trackerState)

        if (showDebug && overlayView != OverlayView.BOARD) {
            OverlayBoard(view = overlayView, bitmap = board, debug = state.debug, fen = state.fen)
        } else {
            ChessBoard(fen = state.fen)
        }

        Text(
            text = state.note,
            style = MaterialTheme.typography.bodyMedium,
        )

        MoveList(state.san)

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(
                onClick = onUndo,
                modifier = Modifier.heightIn(min = 48.dp),
            ) { Text(stringResource(R.string.action_undo)) }
            Button(
                onClick = onReset,
                modifier = Modifier.heightIn(min = 48.dp),
            ) { Text(stringResource(R.string.action_reset)) }
        }

        if (showDebug) DebugCard(state.debug)
    }

    val promotion = state.promotion
    if (promotion != null) {
        AlertDialog(
            onDismissRequest = {},
            title = { Text(stringResource(R.string.promotion_title)) },
            text = { Text(stringResource(R.string.promotion_message, promotion.from, promotion.to)) },
            confirmButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    for (piece in listOf("Q", "R", "B", "N")) {
                        TextButton(onClick = { onPromote(piece) }) { Text(piece) }
                    }
                }
            },
        )
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun MoveList(san: List<String>) {
    val text =
        san
            .chunked(2)
            .mapIndexed { i, pair ->
                "${i + 1}. ${pair.joinToString(" ")}"
            }.joinToString("  ")
    Text(
        text = text.ifEmpty { stringResource(R.string.moves_empty) },
        style = MaterialTheme.typography.bodyLarge,
        fontFamily = FontFamily.Monospace,
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
    )
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun DebugCard(debug: DebugSnapshot) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(stringResource(R.string.debug_title), style = MaterialTheme.typography.titleSmall)
            DebugRow(stringResource(R.string.debug_fps), "%.1f".format(debug.fps))
            DebugRow(stringResource(R.string.debug_motion), "%.4f / %.4f".format(debug.motion, debug.motionThr))
            DebugRow(stringResource(R.string.debug_changed), debug.changed.joinToString(" ").ifEmpty { "-" })
            DebugRow(
                stringResource(R.string.debug_scores),
                "%.2f / %.2f (Δ%.2f)".format(debug.bestScore, debug.secondScore, debug.margin),
            )
            DebugRow(stringResource(R.string.debug_candidate), debug.candidate ?: "-")
            DebugRow(stringResource(R.string.debug_decider), debug.decider ?: "-")
            DebugRow(stringResource(R.string.debug_stuck), debug.stuckReason ?: "-")
            DebugRow(stringResource(R.string.debug_confirm), debug.confirmCount.toString())
        }
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun DebugRow(
    label: String,
    value: String,
) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodySmall)
        Text(value, style = MaterialTheme.typography.bodySmall, fontFamily = FontFamily.Monospace)
    }
}
