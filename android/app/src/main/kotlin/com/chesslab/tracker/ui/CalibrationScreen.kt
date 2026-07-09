package com.chesslab.tracker.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.R
import com.chesslab.tracker.geometry.BoardCorners
import com.chesslab.tracker.geometry.Point

private val CORNER_LABELS = listOf("a8", "h8", "h1", "a1")
private const val CORNER_COUNT = 4
private const val LOUPE_RADIUS = 60f
private const val LOUPE_ALPHA = 0.3f
private const val CROSSHAIR_STROKE = 2f

/**
 * Manual 4-corner calibration. The user taps the corners in the enforced order
 * **a8 → h8 → h1 → a1** (project invariant, wrong a8 silently transposes every
 * label). A magnifier loupe assists precise placement. When experimental board
 * detection is on, "Suggest corners" pre-fills the four points and a **mandatory
 * orientation confirm** asks the user to tap which corner is a8.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming", "LongMethod", "CyclomaticComplexMethod")
@Composable
fun CalibrationScreen(
    experimentalDetection: Boolean,
    onSuggest: () -> BoardCorners?,
    onSave: (BoardCorners, Boolean, Int, Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    var taps by remember { mutableStateOf(listOf<Offset>()) }
    var loupe by remember { mutableStateOf<Offset?>(null) }
    var confirming by remember { mutableStateOf(false) }
    var canvasSize by remember { mutableStateOf(Offset.Zero) }

    Column(modifier = modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        val instruction =
            when {
                confirming -> stringResource(R.string.calib_confirm_orientation)
                taps.size < 4 -> stringResource(R.string.calib_tap_corner, CORNER_LABELS[taps.size])
                else -> stringResource(R.string.calib_ready)
            }
        Text(instruction, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)

        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .pointerInput(confirming) {
                        detectTapGestures(
                            onPress = { pos ->
                                loupe = pos
                                tryAwaitRelease()
                                loupe = null
                            },
                            onTap = { pos ->
                                canvasSize = Offset(size.width.toFloat(), size.height.toFloat())
                                if (confirming) {
                                    // Reorder so the nearest tapped corner becomes a8.
                                    taps = reorderForA8(taps, pos)
                                    confirming = false
                                } else if (taps.size < 4) {
                                    taps = taps + pos
                                }
                            },
                        )
                    }.semantics { contentDescription = instruction },
        ) {
            CameraPreview(modifier = Modifier.fillMaxWidth().aspectRatio(1f))
            Canvas(modifier = Modifier.fillMaxWidth().aspectRatio(1f)) {
                taps.forEachIndexed { i, p ->
                    drawCircle(color = Color(0xFFFF00FF), radius = 14f, center = p)
                    if (i > 0) drawLine(Color(0xFFFF00FF), taps[i - 1], p, strokeWidth = 4f)
                }
                if (taps.size == 4) drawLine(Color(0xFFFF00FF), taps[3], taps[0], strokeWidth = 4f)
                loupe?.let { drawLoupe(it) }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(
                onClick = {
                    taps = emptyList()
                    confirming = false
                },
                modifier = Modifier.heightIn(min = 48.dp),
            ) { Text(stringResource(R.string.calib_clear)) }

            if (experimentalDetection) {
                OutlinedButton(
                    onClick = {
                        onSuggest()?.let { c ->
                            taps = c.toList().map { Offset(it.x, it.y) }
                            confirming = true
                        }
                    },
                    modifier = Modifier.heightIn(min = 48.dp),
                ) { Text(stringResource(R.string.calib_suggest)) }
            }

            Button(
                onClick = {
                    val w = canvasSize.x.toInt().coerceAtLeast(1)
                    val h = canvasSize.y.toInt().coerceAtLeast(1)
                    onSave(cornersOf(taps), true, w, h)
                },
                enabled = taps.size == 4 && !confirming,
                modifier = Modifier.heightIn(min = 48.dp),
            ) { Text(stringResource(R.string.calib_save)) }
        }
    }
}

private fun cornersOf(taps: List<Offset>): BoardCorners = BoardCorners.of(taps.map { Point(it.x, it.y) })

private fun reorderForA8(
    taps: List<Offset>,
    a8: Offset,
): List<Offset> {
    if (taps.size != CORNER_COUNT) return taps
    val start = taps.indices.minByOrNull { (taps[it] - a8).getDistanceSquared() } ?: 0
    return List(CORNER_COUNT) { taps[(start + it) % CORNER_COUNT] }
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawLoupe(center: Offset) {
    val r = LOUPE_RADIUS
    drawCircle(color = Color.White.copy(alpha = LOUPE_ALPHA), radius = r, center = center)
    drawLine(Color.White, Offset(center.x - r, center.y), Offset(center.x + r, center.y), strokeWidth = CROSSHAIR_STROKE)
    drawLine(Color.White, Offset(center.x, center.y - r), Offset(center.x, center.y + r), strokeWidth = CROSSHAIR_STROKE)
}
