package com.chesslab.tracker.ui.tracking

import android.graphics.Bitmap
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.ui.theme.LocalChesslabPalette
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

private const val FILES = "abcdefgh"
private const val N = 8
private const val CORNER_FLOATS = 8

/**
 * The camera frame with the board quad and, optionally, the three evidence sets drawn on it.
 *
 * This is a **diagnostic**, off by default: the main view is the rendered board. The bitmap comes
 * from the service (06c publishes downscaled analyzer frames off the analyzer thread) — this file
 * must never reference CameraX or create a `PreviewView`, because the service is the single camera
 * owner (05a / MEMORY `android-single-camera-owner`).
 *
 * [corners] are `[a8, h8, h1, a1]` in SOURCE pixels (invariant 11) and [sourceWidth]/[sourceHeight]
 * are that source's size; the squares are interpolated bilinearly inside the quad, which is exact
 * for the affine case and close enough for a diagnostic under perspective.
 */
@Composable
fun PreviewOverlay(
    bitmap: Bitmap?,
    overlay: OverlayLayers,
    modifier: Modifier = Modifier,
    corners: FloatArray? = null,
    sourceWidth: Int = 0,
    sourceHeight: Int = 0,
    showEvidence: Boolean = true,
) {
    // The caller sizes this: on the tracking screen it gets the leftover space, and forcing a 4:3
    // aspect there made it taller than the space it was given, so it overdrew the board above it.
    Box(modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        if (bitmap == null) {
            Text("No camera frame yet", style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted)
            return@Box
        }
        Image(
            bitmap = bitmap.asImageBitmap(),
            contentDescription = "Camera preview with board overlay",
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize(),
        )
        val quad = cornerOffsets(corners)
        // Read outside the draw lambda — it is not a composable scope.
        val palette = LocalChesslabPalette.current
        val quadColor = OnSurface
        if (quad != null) {
            Canvas(Modifier.fillMaxSize()) {
                val sw = if (sourceWidth > 0) sourceWidth.toFloat() else bitmap.width.toFloat()
                val sh = if (sourceHeight > 0) sourceHeight.toFloat() else bitmap.height.toFloat()
                // Onto the LETTERBOXED image, not onto the Canvas. `ContentScale.Fit` centres the
                // bitmap and leaves bars; mapping to `size` stretched the quad across them and
                // offset every square, which reads on screen as the tracker looking at the wrong
                // places. See `fittedRect`.
                val rect = fittedRect(size, bitmap.width, bitmap.height)
                val scaled =
                    quad.map {
                        Offset(rect.left + it.x / sw * rect.width, rect.top + it.y / sh * rect.height)
                    }
                drawQuad(scaled, quadColor)
                if (showEvidence) {
                    drawSquares(scaled, overlay.changed, palette.overlayChanged)
                    drawSquares(scaled, overlay.shadowVetoed, palette.overlayShadow)
                    drawSquares(scaled, overlay.occlusionVetoed, palette.overlayOcclusion)
                }
            }
        }
    }
}

internal fun cornerOffsets(corners: FloatArray?): List<Offset>? {
    if (corners == null || corners.size != CORNER_FLOATS) return null
    return (0 until CORNER_FLOATS step 2).map { Offset(corners[it], corners[it + 1]) }
}

/** Bilinear point inside the quad; [u] runs a->h, [v] runs rank 8 -> rank 1. */
internal fun quadPoint(
    quad: List<Offset>,
    u: Float,
    v: Float,
): Offset {
    // Corner order is [a8, h8, h1, a1] (invariant 11) — do not reorder these four reads.
    val a8 = quad[0]
    val h8 = quad[1]
    val h1 = quad[2]
    val a1 = quad[3]
    val top = Offset(a8.x + (h8.x - a8.x) * u, a8.y + (h8.y - a8.y) * u)
    val bottom = Offset(a1.x + (h1.x - a1.x) * u, a1.y + (h1.y - a1.y) * u)
    return Offset(top.x + (bottom.x - top.x) * v, top.y + (bottom.y - top.y) * v)
}

private fun DrawScope.drawQuad(
    quad: List<Offset>,
    color: Color,
) {
    val path =
        Path().apply {
            moveTo(quad[0].x, quad[0].y)
            quad.drop(1).forEach { lineTo(it.x, it.y) }
            close()
        }
    drawPath(path, color = color, style = Stroke(width = 3.dp.toPx()))
}

private fun DrawScope.drawSquares(
    quad: List<Offset>,
    squares: Set<String>,
    color: Color,
) {
    squares.forEach { square ->
        val file = FILES.indexOf(square.firstOrNull() ?: ' ')
        val rank = square.getOrNull(1)?.digitToIntOrNull() ?: 0
        if (file < 0 || rank !in 1..N) return@forEach
        val u0 = file / N.toFloat()
        val v0 = (N - rank) / N.toFloat()
        val step = 1f / N
        val path =
            Path().apply {
                val p0 = quadPoint(quad, u0, v0)
                moveTo(p0.x, p0.y)
                listOf(
                    quadPoint(quad, u0 + step, v0),
                    quadPoint(quad, u0 + step, v0 + step),
                    quadPoint(quad, u0, v0 + step),
                ).forEach { lineTo(it.x, it.y) }
                close()
            }
        drawPath(path, color = color, style = Stroke(width = 3.dp.toPx()))
    }
}
