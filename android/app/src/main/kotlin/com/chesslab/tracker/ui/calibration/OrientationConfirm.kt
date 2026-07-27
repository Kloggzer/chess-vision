package com.chesslab.tracker.ui.calibration

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
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
) {
    val measurer = rememberTextMeasurer()
    Column(modifier.fillMaxWidth()) {
        Text("Does this read like the board in front of you? a8 must be the square marked a8.")
        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(1f),
        ) {
            state.warped?.let { bmp ->
                Image(bmp.asImageBitmap(), contentDescription = "rectified board", contentScale = ContentScale.FillBounds)
            } ?: Text("no rectified preview — check the camera feed")
            Canvas(Modifier.fillMaxWidth().aspectRatio(1f)) {
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
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            TextButton(onClick = onBack) { Text("Corners look wrong") }
            Button(onClick = onSave, enabled = state.canSave) { Text("Save calibration") }
        }
    }
}

/** One step per tap — 0.005 of the board edge, which is a visible fraction of a square. */
private const val MARGIN_STEP: Double = 0.005

/**
 * The four marker outsets, one row per corner, with the rectified board above reacting live.
 *
 * The ArUco codes are printed in the label border rather than on the playing-field corners, so the
 * quad they span is larger than the board; the outset is what takes that back out. It is per
 * corner because the codes are glued on by hand — re-sticking one moves only that corner, and a
 * single shared number would have to average an error it cannot express.
 *
 * Nudging beats typing here: the correct value is whatever makes the green grid sit on the squares,
 * and that is judged by eye against the preview, not read off a number.
 */
@Composable
private fun MarkerOutsets(
    margin: List<Double>,
    onChange: (Int, Double) -> Unit,
) {
    Text("Marker outset — how far each code sits outside the board", Modifier.padding(top = 8.dp))
    CORNER_ORDER.forEachIndexed { i, corner ->
        Row(
            Modifier.fillMaxWidth().padding(vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(corner)
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedButton(onClick = { onChange(i, margin[i] - MARGIN_STEP) }) { Text("−") }
                Text("%.3f".format(margin[i]), Modifier.padding(horizontal = 12.dp))
                OutlinedButton(onClick = { onChange(i, margin[i] + MARGIN_STEP) }) { Text("+") }
            }
        }
    }
}
