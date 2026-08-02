package com.chesslab.tracker.ui.calibration

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import com.chesslab.geometry.CORNER_ORDER

// MANDATORY step: `Save` is unreachable without passing through here.
//
// A wrong a8 assignment has NO runtime symptom — the board simply reads mirrored and the tracker
// then fabricates illegal moves. Seeing a8/h1 and the file/rank letters on the RECTIFIED board is
// the only place the error is catchable.

@Composable
fun OrientationConfirm(
    state: CalibrationState,
    onWhitePovChange: (Boolean) -> Unit,
    onSave: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    onMarginChange: (Int, Double) -> Unit = { _, _ -> },
    onNudge: (List<DoubleArray>) -> Unit = {},
    onAutoTune: () -> Unit = {},
) {
    val measurer = rememberTextMeasurer()
    // The rectified board is the instrument here, so it keeps its full width and the
    // controls scroll beneath it — four corner rows are otherwise enough to squeeze it.
    Column(modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
        Text("Does this read like the board in front of you? a8 must be the square marked a8.")
        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(1f),
        ) {
            // Both children take the Box's rect BY CONSTRUCTION. The image had no modifier at all,
            // so it laid out at the bitmap's intrinsic size — `ContentScale.FillBounds` then scales
            // within that size and changes nothing. The board therefore rendered into the top-left
            // corner at ~1/3 of the width while the overlay filled the whole square, so a8, h1 and
            // the file/rank gutters sat far outside the board they are supposed to label. That
            // overlay is the ONLY place a wrong a8 assignment is catchable, and it was pointing at
            // empty space. Repeating `fillMaxWidth().aspectRatio(1f)` on one child and not the
            // other is how they drifted apart; `matchParentSize()` on both makes that impossible.
            state.warped?.let { bmp ->
                Image(
                    bmp.asImageBitmap(),
                    contentDescription = "rectified board",
                    modifier = Modifier.matchParentSize(),
                    contentScale = ContentScale.FillBounds,
                )
            } ?: Text("no rectified preview — check the camera feed")
            Canvas(Modifier.matchParentSize()) {
                drawRectifiedSquare("a8", state.whitePov, Color.Yellow, measurer)
                drawRectifiedSquare("h1", state.whitePov, Color.Cyan, measurer)
                drawRectifiedGutters(state.whitePov, measurer)
            }
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Switch(checked = state.whitePov, onCheckedChange = onWhitePovChange)
            Text("White plays from the bottom")
        }
        MarkerOutsets(state.margin, onMarginChange)
        CornerNudges(state, onNudge, onAutoTune)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            TextButton(onClick = onBack) { Text("Corners look wrong") }
            Button(onClick = onSave, enabled = state.canSave) { Text("Save calibration") }
        }
    }
}

/** One step per tap — 0.005 of the board edge, which is a visible fraction of a square. */
private const val MARGIN_STEP: Double = 0.005

/**
 * The four marker outsets, two corners per row, with the rectified board above reacting live.
 *
 * The ArUco codes are printed in the label border rather than on the playing-field corners, so the
 * quad they span is larger than the board; the outset is what takes that back out. It is per
 * corner because the codes are glued on by hand — re-sticking one moves only that corner, and a
 * single shared number would have to average an error it cannot express.
 *
 * Nudging beats typing: the right value is whatever makes the grid sit on the squares, and that is
 * judged by eye against the preview, not read off a number.
 */
@Composable
private fun MarkerOutsets(
    margin: List<Double>,
    onChange: (Int, Double) -> Unit,
) {
    Text("Marker outset — how far each code sits outside the board", Modifier.padding(top = 4.dp))
    for (row in 0 until CORNER_ORDER.size / 2) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            for (col in 0..1) {
                val i = row * 2 + col
                Row(
                    Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(CORNER_ORDER[i])
                    OutlinedButton(onClick = { onChange(i, margin[i] - MARGIN_STEP) }) { Text("−") }
                    Text("%.3f".format(margin[i]))
                    OutlinedButton(onClick = { onChange(i, margin[i] + MARGIN_STEP) }) { Text("+") }
                }
            }
        }
    }
}

/**
 * The eight sliders — four corners, two axes — plus the automatic that fits the same quad.
 *
 * The port of the web UI's `FineTune`, and its convention comes with it: the values are offsets in
 * RECTIFIED pixels, and **positive shows more of the board on that side**. That is not a detail.
 * The stored quad is in frame pixels, but the board being judged is the warp above these sliders,
 * and in frame coordinates two of the four corners move MIRRORED to what the eye expects. Nudging
 * in the space you are looking at is what makes the control usable at all.
 *
 * The automatic sits with them rather than only on the way in, because after eight manual nudges
 * the quad is a different quad — a groove fit that found nothing from the automatic's corners may
 * well find the grooves from yours. It adopts its answer as the new zero.
 *
 * Why any of this is worth eight controls: the whole Python corpus was cut 3-6 px off-grid until
 * 2026-07-31 with nothing failing, and re-cutting it moved the model's empty-crop margin 5.5x —
 * more than nine training experiments managed. One square is `boardSize / 8` of these units.
 */
@Composable
private fun CornerNudges(
    state: CalibrationState,
    onNudge: (List<DoubleArray>) -> Unit,
    onAutoTune: () -> Unit,
) {
    val span = (state.boardSize / NUDGE_SPAN_DIVISOR).toFloat().takeIf { it > 0f } ?: return
    val dirty = state.nudge.any { it[0] != 0.0 || it[1] != 0.0 }
    Column(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("Fine adjustment — + shows more of that side", style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.weight(1f))
            TextButton(onClick = { onNudge(zeroNudge()) }, enabled = dirty) { Text("Reset") }
            TextButton(onClick = onAutoTune, enabled = !state.refining) {
                Text(if (state.refining) "Fitting…" else "Auto")
            }
        }
        CORNER_NAMES.forEachIndexed { slot, name ->
            val off = state.nudge.getOrElse(slot) { doubleArrayOf(0.0, 0.0) }
            NudgeAxis("$name horiz", off[0], span) { onNudge(state.nudge.replacing(slot, it, off[1])) }
            NudgeAxis("$name vert", off[1], span) { onNudge(state.nudge.replacing(slot, off[0], it)) }
        }
    }
}

@Composable
private fun NudgeAxis(
    label: String,
    value: Double,
    span: Float,
    onValue: (Double) -> Unit,
) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.labelSmall, modifier = Modifier.width(NUDGE_LABEL.dp))
        Slider(
            value = value.toFloat().coerceIn(-span, span),
            onValueChange = { onValue(it.toDouble()) },
            valueRange = -span..span,
            modifier = Modifier.weight(1f),
        )
        Text("%+.0f".format(value), style = MaterialTheme.typography.labelSmall, modifier = Modifier.width(NUDGE_VALUE.dp))
    }
}

/** Half a square either way: generous enough for a mis-tapped corner, fine enough to aim with. */
private const val NUDGE_SPAN_DIVISOR = 16

private const val NUDGE_LABEL = 74
private const val NUDGE_VALUE = 34

private val CORNER_NAMES = listOf("a8", "h8", "h1", "a1")

/** One slot changed, the other three carried over — the shape [CalibrationViewModel.applyNudge] takes. */
private fun List<DoubleArray>.replacing(
    slot: Int,
    dx: Double,
    dy: Double,
): List<DoubleArray> = mapIndexed { i, v -> if (i == slot) doubleArrayOf(dx, dy) else v }
