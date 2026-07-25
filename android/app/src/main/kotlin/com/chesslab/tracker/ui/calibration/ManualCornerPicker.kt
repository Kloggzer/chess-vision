package com.chesslab.tracker.ui.calibration

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.IntSize

// The 4-tap fallback for boards without ArUco markers.
//
// Taps are kept in TAP ORDER and never sorted. Sorting four points into a canonical quad is what
// makes a swapped a8 invisible; OrientationConfirm is the safety net instead.

/** Corner order for every geometry operation: `[a8, h8, h1, a1]` (entry.md invariant 11). */
val CORNER_PROMPTS: List<String> =
    listOf(
        "tap a8 (top-left from White's side)",
        "tap h8 (top-right from White's side)",
        "tap h1 (bottom-right from White's side)",
        "tap a1 (bottom-left from White's side)",
    )

/**
 * Preview coordinates -> source pixels, scaled by the RENDERED bitmap's size. A requested camera
 * resolution is never involved: the delivered frame is the only truth (a7dab73).
 */
fun mapTapToSource(
    tapX: Float,
    tapY: Float,
    renderedWidth: Int,
    renderedHeight: Int,
    sourceWidth: Int,
    sourceHeight: Int,
): TapPoint? {
    if (minOf(renderedWidth, renderedHeight, sourceWidth, sourceHeight) <= 0) return null
    return TapPoint(tapX * sourceWidth / renderedWidth, tapY * sourceHeight / renderedHeight)
}

/** The 4 taps as the flat `[a8, h8, h1, a1]` corner array, or null while incomplete. */
fun tapsToCorners(taps: List<TapPoint>): FloatArray? {
    if (taps.size != CORNER_PROMPTS.size) return null
    val out = FloatArray(CORNER_PROMPTS.size * 2)
    taps.forEachIndexed { i, p ->
        out[i * 2] = p.x
        out[i * 2 + 1] = p.y
    }
    return out
}

@Composable
fun ManualCornerPicker(
    state: CalibrationState,
    onTap: (TapPoint) -> Unit,
    onUndo: () -> Unit,
    onRestart: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var rendered by remember { mutableStateOf(IntSize.Zero) }
    Column(modifier) {
        Text(CORNER_PROMPTS.getOrElse(state.taps.size) { "4 corners set — continue to the orientation check" })
        if (state.frameWidth <= 0) {
            Text("no camera frame yet — the taps cannot be mapped to source pixels")
        }
        Box(
            Modifier
                .fillMaxWidth()
                .onSizeChanged { rendered = it }
                .pointerInput(state.frameWidth, state.frameHeight) {
                    detectTapGestures { o ->
                        mapTapToSource(o.x, o.y, rendered.width, rendered.height, state.frameWidth, state.frameHeight)
                            ?.let(onTap)
                    }
                },
        ) {
            TapMarkers(state, rendered)
        }
        Column(Modifier.fillMaxWidth()) {
            TextButton(onClick = onUndo, enabled = state.taps.isNotEmpty()) { Text("Undo last tap") }
            TextButton(onClick = onRestart, enabled = state.taps.isNotEmpty()) { Text("Restart tapping") }
        }
    }
}

/** Draws the taps back in preview space, labelled with the corner they claim to be. */
@Composable
private fun TapMarkers(
    state: CalibrationState,
    rendered: IntSize,
) {
    Canvas(Modifier.fillMaxWidth()) {
        if (state.frameWidth <= 0 || rendered.width <= 0) return@Canvas
        val sx = rendered.width.toFloat() / state.frameWidth
        val sy = rendered.height.toFloat() / state.frameHeight
        state.taps.forEachIndexed { i, p ->
            drawCircle(
                color = if (i == 0) Color.Yellow else Color.Cyan,
                radius = 12f,
                center = Offset(p.x * sx, p.y * sy),
                style = Stroke(width = 3f),
            )
        }
    }
}
