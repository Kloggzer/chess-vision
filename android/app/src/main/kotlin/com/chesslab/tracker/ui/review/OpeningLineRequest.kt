package com.chesslab.tracker.ui.review

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import com.chesslab.tracker.analysis.OpeningSummary
import com.chesslab.tracker.analysis.lineFrames
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.ui.TextAction
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke
import com.chesslab.tracker.ui.theme.SurfaceRaised
import com.chesslab.tracker.ui.tracking.BoardCanvas

internal data class OpeningLineRequest(
    val opening: OpeningSummary,
    val startFen: String,
)

internal fun openingLineRequest(
    game: GameView,
    opening: OpeningSummary,
) = OpeningLineRequest(opening, game.fenAt(opening.theoryPlies))

/** The opening book uses the same board-first interaction as a mate sequence, without an engine job. */
@Composable
internal fun OpeningLineExplorer(
    request: OpeningLineRequest,
    onDismiss: () -> Unit,
) {
    val frames = remember(request) { lineFrames(request.startFen, request.opening.continuationUci) }
    if (frames.isEmpty()) return
    var step by remember(request) { mutableIntStateOf(0) }
    val frame = frames[step.coerceIn(frames.indices)]
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close", color = Accent) } },
        title = { Text("Theory continuation", color = OnSurface) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
                BoardCanvas(fen = frame.fen, lastMoveUci = frame.lastMoveUci)
                Text(
                    "${request.opening.eco} · ${request.opening.name}",
                    style = MaterialTheme.typography.labelSmall,
                    color = OnSurfaceMuted,
                )
                Text(openingStepCaption(request.opening, step, frames.lastIndex), color = OnSurface)
                Text(openingExplorerLine(request.opening, step), color = OnSurfaceMuted)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    TextAction("Previous", { step = (step - 1).coerceAtLeast(0) }, enabled = step > 0)
                    TextAction("Next", { step = (step + 1).coerceAtMost(frames.lastIndex) }, enabled = step < frames.lastIndex)
                }
            }
        },
        containerColor = SurfaceRaised,
    )
}

@Composable
internal fun TheoryContinuationAction(
    opening: OpeningSummary,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(Radius.sm)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Accent.copy(alpha = 0.12f))
            .border(Stroke.hairline, Accent, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = Space.sm, vertical = Space.xs),
        horizontalArrangement = Arrangement.spacedBy(Space.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text("Explore theory", style = MaterialTheme.typography.labelMedium, color = Accent)
            Text(openingContinuationLabel(opening).orEmpty(), color = OnSurface, maxLines = 2)
        }
        Text("›", style = MaterialTheme.typography.headlineSmall, color = Accent)
    }
}

/** Adds move numbers at the colour boundary so the short line is readable without opening a board. */
internal fun openingContinuationLabel(opening: OpeningSummary): String? {
    if (opening.continuation.isEmpty()) return null
    return opening.continuation
        .mapIndexed { index, san ->
            val ply = opening.theoryPlies + index + 1
            if (ply % 2 == 1 || index == 0) "${moveNumberLabel(ply)} $san" else san
        }.joinToString(" ")
}

/** A single explorer step always names its colour, unlike the compact line printed on the card. */
internal fun openingMoveLabel(
    opening: OpeningSummary,
    continuationIndex: Int,
): String {
    val ply = opening.theoryPlies + continuationIndex + 1
    return "${moveNumberLabel(ply)} ${opening.continuation[continuationIndex]}"
}

private fun openingStepCaption(
    opening: OpeningSummary,
    step: Int,
    lastIndex: Int,
): String =
    if (step == 0) {
        "Last theory position"
    } else {
        "$step/$lastIndex · ${openingMoveLabel(opening, step - 1)}"
    }

private fun openingExplorerLine(
    opening: OpeningSummary,
    step: Int,
): String =
    opening.continuation
        .mapIndexed { index, _ ->
            val move = openingMoveLabel(opening, index)
            if (index == step - 1) "[$move]" else move
        }.joinToString("  ")
