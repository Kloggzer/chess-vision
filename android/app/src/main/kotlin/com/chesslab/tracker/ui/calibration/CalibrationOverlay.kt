package com.chesslab.tracker.ui.calibration

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.unit.IntSize

private const val QUAD = 4

private const val CORNER_FLOATS = 8

private const val QUAD_STROKE = 3f

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
