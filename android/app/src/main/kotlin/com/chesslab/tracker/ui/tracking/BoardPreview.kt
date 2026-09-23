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
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.ui.theme.LocalChesslabPalette
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

/** Local, because `Stroke` here is the DrawScope one. */
private val OVERLAY_STROKE = 3.dp
private val GRID_STROKE = 1.dp

private const val FILES = "abcdefgh"
private const val N = 8

private const val CONFLICT_FILL = 0.35f

/** A scale, not a threshold: full tint at twice the engine's `zThr` default. */
private const val ZTHR_DISPLAY = 6.0

private const val HEAT_FLOOR = 0.08f

private const val HEAT_MAX_ALPHA = 0.55f

/** The `Image` is letterboxed in its `Box` but the `Canvas` fills it: `fraction * size` offset every
 *  square, and it just looked like the tracker read the wrong squares. */
internal fun fittedRect(
    box: Size,
    imageWidth: Int,
    imageHeight: Int,
): Rect {
    val scale = minOf(box.width / imageWidth, box.height / imageHeight)
    // A zero dimension divides to infinity or zero: nothing to fit, so the box is the answer.
    if (!scale.isFinite() || scale <= 0f) return Rect(Offset.Zero, box)
    val w = imageWidth * scale
    val h = imageHeight * scale
    return Rect(Offset((box.width - w) / 2f, (box.height - h) / 2f), Size(w, h))
}

/** The RECTIFIED board: a8 top-left by construction, so a square is the image over eight and overlay and
 *  detection cannot disagree. The bitmap comes from the service — never touch CameraX here. */
@Composable
fun BoardPreview(
    bitmap: Bitmap?,
    overlay: OverlayLayers,
    modifier: Modifier = Modifier,
    showEvidence: Boolean = true,
) {
    Box(modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        if (bitmap == null) {
            Text(
                "Waiting for the board — no markers yet",
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceMuted,
            )
            return@Box
        }
        Image(
            bitmap = bitmap.asImageBitmap(),
            contentDescription = "Rectified board with the tracker's evidence",
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize(),
        )
        // The draw lambda is not a composable scope.
        val palette = LocalChesslabPalette.current
        if (showEvidence) {
            Canvas(Modifier.fillMaxSize()) {
                val rect = fittedRect(size, bitmap.width, bitmap.height)
                // Always on, like Python's: without the grid the overlay cannot be checked against the picture.
                drawGrid(rect, palette.overlayGrid)
                drawHeat(rect, overlay.z, palette.overlayChanged)
                drawSquares(rect, overlay.changed, palette.overlayChanged)
                drawSquares(rect, overlay.shadowVetoed, palette.overlayShadow)
                drawSquares(rect, overlay.occlusionVetoed, palette.overlayOcclusion)
                // Last, and filled: a conflict is the tracker saying its position is wrong.
                overlay.cnnConflicts.forEach { square ->
                    cellRect(rect, square)?.let {
                        drawRect(palette.overlayConflict.copy(alpha = CONFLICT_FILL), it.topLeft, it.size)
                        drawRect(palette.overlayConflict, it.topLeft, it.size, style = Stroke(width = OVERLAY_STROKE.toPx()))
                    }
                }
            }
        }
    }
}

/** a8 is the top-left cell — the warp's convention, not a UI choice. */
internal fun cellRect(
    board: Rect,
    square: String,
): Rect? {
    val file = FILES.indexOf(square.firstOrNull() ?: ' ')
    val rank = square.getOrNull(1)?.digitToIntOrNull() ?: 0
    if (file < 0 || rank !in 1..N) return null
    val w = board.width / N
    val h = board.height / N
    return Rect(
        Offset(board.left + file * w, board.top + (N - rank) * h),
        Size(w, h),
    )
}

private fun DrawScope.drawGrid(
    board: Rect,
    color: Color,
) {
    for (i in 0..N) {
        val x = board.left + board.width * i / N
        val y = board.top + board.height * i / N
        drawLine(color, Offset(x, board.top), Offset(x, board.bottom), strokeWidth = GRID_STROKE.toPx())
        drawLine(color, Offset(board.left, y), Offset(board.right, y), strokeWidth = GRID_STROKE.toPx())
    }
}

/** The `changed` SET hid z = 2.9 as well as z = 0.1; the tint shows a square approaching the engine's gate. */
private fun DrawScope.drawHeat(
    board: Rect,
    z: Map<String, Double>,
    color: Color,
) {
    z.forEach { (square, value) ->
        val strength = (value / ZTHR_DISPLAY).coerceIn(0.0, 1.0).toFloat()
        if (strength <= HEAT_FLOOR) return@forEach
        cellRect(board, square)?.let {
            drawRect(color.copy(alpha = strength * HEAT_MAX_ALPHA), it.topLeft, it.size)
        }
    }
}

private fun DrawScope.drawSquares(
    board: Rect,
    squares: Set<String>,
    color: Color,
) {
    squares.forEach { square ->
        cellRect(board, square)?.let {
            drawRect(color = color, topLeft = it.topLeft, size = it.size, style = Stroke(width = OVERLAY_STROKE.toPx()))
        }
    }
}
