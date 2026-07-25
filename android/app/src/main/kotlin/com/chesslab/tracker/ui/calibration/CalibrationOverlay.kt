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
import androidx.compose.ui.text.rememberTextMeasurer
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

/** How far outside the quad the file/rank gutters sit, in board widths. */
private const val GUTTER = 0.05f

// Index into the `[a8, h8, h1, a1]` corner array — which is also the ArUco marker id.
private const val A8 = 0
private const val H8 = 1
private const val H1 = 2
private const val A1 = 3

/** Board-space `u` / `v` of each corner, indexed by marker id. */
private val CORNER_U = floatArrayOf(0f, 1f, 1f, 0f)
private val CORNER_V = floatArrayOf(0f, 0f, 1f, 1f)

/**
 * Board space `(u, v)` in `[0, 1]` -> preview pixels, bilinear across the quad.
 * `corners` is `[a8, h8, h1, a1]`; `v` runs from the a8/h8 edge to the a1/h1 edge.
 */
internal fun quadPoint(
    corners: FloatArray,
    u: Float,
    v: Float,
    scaleX: Float,
    scaleY: Float,
): Offset {
    fun x(i: Int) = corners[i * 2]

    fun y(i: Int) = corners[i * 2 + 1]
    val topX = (1 - u) * x(A8) + u * x(H8)
    val topY = (1 - u) * y(A8) + u * y(H8)
    val botX = (1 - u) * x(A1) + u * x(H1)
    val botY = (1 - u) * y(A1) + u * y(H1)
    return Offset(((1 - v) * topX + v * botX) * scaleX, ((1 - v) * topY + v * botY) * scaleY)
}

/** Centre of [square] in board space, honouring [whitePov] exactly like the rectified warp will. */
internal fun squareUv(
    square: String,
    whitePov: Boolean,
): Pair<Float, Float> {
    val (col, row) = squareToColRow(square, whitePov)
    return (col + HALF) / SIDE to (row + HALF) / SIDE
}

@Composable
fun CalibrationOverlay(
    corners: FloatArray?,
    markerIds: List<Int>,
    whitePov: Boolean,
    sourceSize: IntSize,
    modifier: Modifier = Modifier,
) {
    val measurer = rememberTextMeasurer()
    Canvas(modifier) {
        if (corners == null || corners.size != CORNER_FLOATS || sourceSize.width <= 0) return@Canvas
        val sx = size.width / sourceSize.width
        val sy = size.height / sourceSize.height
        drawQuad(corners, sx, sy)
        drawSquare(corners, "a8", whitePov, sx, sy, Color.Yellow, measurer)
        drawSquare(corners, "h1", whitePov, sx, sy, Color.Cyan, measurer)
        drawGutters(corners, whitePov, sx, sy, measurer)
        // Marker id IS the corner index (`_ARUCO_LABELS`), so a missing id leaves its corner unlabelled.
        markerIds.filter { it in CORNER_U.indices }.forEach { id ->
            drawText(measurer, "id $id", topLeft = quadPoint(corners, CORNER_U[id], CORNER_V[id], sx, sy))
        }
    }
}

private fun DrawScope.drawQuad(
    corners: FloatArray,
    sx: Float,
    sy: Float,
) {
    val pts = (0 until QUAD).map { Offset(corners[it * 2] * sx, corners[it * 2 + 1] * sy) }
    for (i in pts.indices) {
        drawLine(Color.Green, pts[i], pts[(i + 1) % pts.size], strokeWidth = QUAD_STROKE)
    }
}

/** Outline + label of one named square, drawn where the RECTIFIED board will put it. */
private fun DrawScope.drawSquare(
    corners: FloatArray,
    square: String,
    whitePov: Boolean,
    sx: Float,
    sy: Float,
    color: Color,
    measurer: TextMeasurer,
) {
    val (col, row) = squareToColRow(square, whitePov)
    val u0 = col / SIDE
    val v0 = row / SIDE
    val quad =
        listOf(
            quadPoint(corners, u0, v0, sx, sy),
            quadPoint(corners, u0 + 1 / SIDE, v0, sx, sy),
            quadPoint(corners, u0 + 1 / SIDE, v0 + 1 / SIDE, sx, sy),
            quadPoint(corners, u0, v0 + 1 / SIDE, sx, sy),
        )
    for (i in quad.indices) {
        drawLine(color, quad[i], quad[(i + 1) % quad.size], strokeWidth = SQUARE_STROKE)
    }
    val (u, v) = squareUv(square, whitePov)
    drawText(measurer, square, topLeft = quadPoint(corners, u, v, sx, sy))
}

/** File letters below the board, rank digits to its left — both flip with [whitePov]. */
private fun DrawScope.drawGutters(
    corners: FloatArray,
    whitePov: Boolean,
    sx: Float,
    sy: Float,
    measurer: TextMeasurer,
) {
    for (f in FILES) {
        val (u, _) = squareUv("${f}1", whitePov)
        drawText(measurer, f.toString(), topLeft = quadPoint(corners, u, 1f + GUTTER, sx, sy))
    }
    for (r in 1..SIDE_I) {
        val (_, v) = squareUv("a$r", whitePov)
        drawText(measurer, r.toString(), topLeft = quadPoint(corners, -GUTTER, v, sx, sy))
    }
}

/** The quad outline alone, for the aiming step where no orientation has been decided yet. */
@Composable
fun QuadOutline(
    corners: FloatArray?,
    sourceSize: IntSize,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier) {
        if (corners == null || corners.size != CORNER_FLOATS || sourceSize.width <= 0) return@Canvas
        drawQuad(corners, size.width / sourceSize.width, size.height / sourceSize.height)
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
