package com.chesslab.tracker.ui.calibration

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.drawText
import androidx.compose.ui.unit.IntSize
import com.chesslab.geometry.squareToColRow

// The overlay whose whole job is to make a wrong a8 assignment VISIBLE. CLAUDE.md: a wrong
// a8 corner silently transposes every label — there is no runtime symptom, so the user
// eyeballing these letters is the only defence.

private const val FILES = "abcdefgh"

private const val SIDE = 8f

private const val SIDE_I = 8

private const val QUAD = 4

private const val CORNER_FLOATS = 8

private const val HALF = 0.5f

private const val QUAD_STROKE = 3f

private const val SQUARE_STROKE = 4f

private fun DrawScope.drawQuad(
    corners: FloatArray,
    sx: Float,
    sy: Float,
    color: Color = Color.Green,
) {
    val pts = (0 until QUAD).map { Offset(corners[it * 2] * sx, corners[it * 2 + 1] * sy) }
    for (i in pts.indices) {
        drawLine(color, pts[i], pts[(i + 1) % pts.size], strokeWidth = QUAD_STROKE)
    }
}

/** The quad outline alone, for the aiming step where no orientation has been decided yet. */
@Composable
fun QuadOutline(
    corners: FloatArray?,
    sourceSize: IntSize,
    modifier: Modifier = Modifier,
    color: Color = Color.Green,
) {
    Canvas(modifier) {
        if (corners == null || corners.size != CORNER_FLOATS || sourceSize.width <= 0) return@Canvas
        drawQuad(corners, size.width / sourceSize.width, size.height / sourceSize.height, color)
    }
}

/** A square outline for the rectified confirmation image (`0..1` board space, no perspective). */
internal fun DrawScope.drawRectifiedSquare(
    square: String,
    whitePov: Boolean,
    color: Color,
    measurer: TextMeasurer,
) {
    val (col, row) = squareToColRow(square, whitePov)
    val w = size.width / SIDE
    val h = size.height / SIDE
    drawRect(
        color = color,
        topLeft = Offset(col * w, row * h),
        size = Size(w, h),
        style = Stroke(width = SQUARE_STROKE),
    )
    drawText(measurer, square, topLeft = Offset(col * w, row * h))
}

/** File letters along the bottom, rank digits along the left, of the rectified image. */
internal fun DrawScope.drawRectifiedGutters(
    whitePov: Boolean,
    measurer: TextMeasurer,
) {
    val w = size.width / SIDE
    val h = size.height / SIDE
    for (f in FILES) {
        val (col, _) = squareToColRow("${f}1", whitePov)
        drawText(measurer, f.toString(), topLeft = Offset(col * w + w * HALF, size.height - h * HALF))
    }
    for (r in 1..SIDE_I) {
        val (_, row) = squareToColRow("a$r", whitePov)
        drawText(measurer, r.toString(), topLeft = Offset(0f, row * h + h * HALF))
    }
}
