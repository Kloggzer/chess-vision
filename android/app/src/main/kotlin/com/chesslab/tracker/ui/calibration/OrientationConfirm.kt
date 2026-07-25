package com.chesslab.tracker.ui.calibration

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
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
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            TextButton(onClick = onBack) { Text("Corners look wrong") }
            Button(onClick = onSave, enabled = state.canSave) { Text("Save calibration") }
        }
    }
}
