package com.chesslab.tracker.ui.analysis

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.chesslab.tracker.analysis.AnalysisLine
import com.chesslab.tracker.analysis.AnalysisResult
import com.chesslab.tracker.analysis.GateBlock
import com.chesslab.tracker.analysis.winChanceWhite
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.percent
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import kotlin.math.abs

/** Why the bar is greyed, in the user's words. */
internal fun blockText(block: GateBlock?): String? =
    when (block) {
        null -> null
        GateBlock.OFF -> "analysis is off"
        GateBlock.WARMUP -> "waiting for the tracker to settle"
        GateBlock.THERMAL -> "paused — device is hot"
        GateBlock.BATTERY -> "paused — battery saver"
        GateBlock.FRAME_BUDGET -> "paused — tracking below 15 fps"
    }

/**
 * One line's score, always WHITE-POV and in the same unit as the bar above it.
 *
 * It read pawns (`+0.35`) until specs/47, which made this the third place in one app to state one
 * quantity in a unit of its own.
 */
internal fun lineScore(line: AnalysisLine): String {
    val mate = line.mate
    val cp = line.cp
    return when {
        mate != null -> (if (mate < 0) "-M" else "M") + abs(mate)
        cp != null -> percent(winChanceWhite(cp))
        else -> "?"
    }
}

/** The engine's top lines. Read-only: tapping one changes nothing about the game. */
@Composable
fun AnalysisPanel(
    result: AnalysisResult?,
    block: GateBlock?,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } },
        title = { Text("Engine", color = OnSurface) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
                blockText(block)?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted) }
                if (result == null || result.lines.isEmpty()) {
                    Text("No analysis yet.", style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted)
                } else {
                    Text("depth ${result.depth}", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
                    result.lines.forEach { PvRow(it) }
                }
            }
        },
    )
}

@Composable
private fun PvRow(line: AnalysisLine) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(line.san ?: line.uci ?: "—", style = MaterialTheme.typography.bodyMedium, color = OnSurface)
        Figure(lineScore(line), OnSurfaceMuted)
    }
}
