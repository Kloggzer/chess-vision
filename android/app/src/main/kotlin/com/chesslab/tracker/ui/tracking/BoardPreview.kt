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

private const val FILES = "abcdefgh"
private const val N = 8

/** Enough to read the square through, not so little that it reads as another outline. */
private const val CONFLICT_FILL = 0.35f

/** Full tint at twice the engine's `zThr` default, so a square approaching the gate is visible. */
private const val ZTHR_DISPLAY = 6.0

/** Below this the tint is sensor noise and would haze the whole board. */
private const val HEAT_FLOOR = 0.08f

/** The heat must never hide the pieces — it is an annotation on the picture, not a replacement. */
private const val HEAT_MAX_ALPHA = 0.55f

/**
 * Where a `ContentScale.Fit` image really lands inside [box].
 *
 * The overlay bug this exists for: the `Image` is letterboxed inside its `Box`, but the `Canvas`
 * on top fills the whole `Box`. Drawing at `fraction * size` therefore stretched the overlay
 * across the bars and offset every square. Nothing on screen said so — it just looked like the
 * tracker was reading the wrong squares.
 */
internal fun fittedRect(
    box: Size,
    imageWidth: Int,
    imageHeight: Int,
): Rect {
    val scale = minOf(box.width / imageWidth, box.height / imageHeight)
    // Covers every degenerate case at once: a zero image dimension divides to infinity, a zero box
    // dimension to zero. Either way there is nothing to fit, so the box itself is the answer.
    if (!scale.isFinite() || scale <= 0f) return Rect(Offset.Zero, box)
    val w = imageWidth * scale
    val h = imageHeight * scale
    return Rect(Offset((box.width - w) / 2f, (box.height - h) / 2f), Size(w, h))
}

/**
 * The RECTIFIED board with the evidence the tracker is acting on drawn on it.
 *
 * This is the live view. Not the raw camera frame: the board fills this image with a8 at the
 * top-left, because that is exactly what `warpFromCorners` produces from the `[a8, h8, h1, a1]`
 * corners. So a square is the image divided by eight — no quad, no perspective interpolation, no
 * way for the overlay and the detection to disagree.
 *
 * The bitmap comes from the service (`CameraFrameBus.boardPreview`), downscaled off the analyzer
 * thread. This file must never touch CameraX: the service is the single camera owner (05a /
 * MEMORY `android-single-camera-owner`).
 */
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
        // Read outside the draw lambda — it is not a composable scope.
        val palette = LocalChesslabPalette.current
        if (showEvidence) {
            Canvas(Modifier.fillMaxSize()) {
                val rect = fittedRect(size, bitmap.width, bitmap.height)
                // Bottom layer, and always on — Python draws its grid unconditionally. It is what
                // lets you see whether a square boundary sits where the board's boundary is; an
                // overlay with no grid cannot be checked against the picture underneath it.
                drawGrid(rect, palette.overlayGrid)
                drawHeat(rect, overlay.z, palette.overlayChanged)
                drawSquares(rect, overlay.changed, palette.overlayChanged)
                drawSquares(rect, overlay.shadowVetoed, palette.overlayShadow)
                drawSquares(rect, overlay.occlusionVetoed, palette.overlayOcclusion)
                // Last, so it wins the overdraw, and filled rather than outlined: a conflict is not
                // one more kind of evidence, it is the tracker telling you its position is wrong.
                overlay.cnnConflicts.forEach { square ->
                    cellRect(rect, square)?.let {
                        drawRect(palette.overlayConflict.copy(alpha = CONFLICT_FILL), it.topLeft, it.size)
                        drawRect(palette.overlayConflict, it.topLeft, it.size, style = Stroke(width = 3.dp.toPx()))
                    }
                }
            }
        }
    }
}

/**
 * `a1`..`h8` -> the cell rectangle inside [board].
 *
 * a8 is the top-left cell, so file a..h runs left to right and rank 8..1 runs top to bottom —
 * the warp's own convention, not a UI choice. Returns null for anything that is not a square.
 */
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

/** The 8x8, always. Python's `_encode_overlay` draws its green grid before anything else. */
private fun DrawScope.drawGrid(
    board: Rect,
    color: Color,
) {
    for (i in 0..N) {
        val x = board.left + board.width * i / N
        val y = board.top + board.height * i / N
        drawLine(color, Offset(x, board.top), Offset(x, board.bottom), strokeWidth = 1.dp.toPx())
        drawLine(color, Offset(board.left, y), Offset(board.right, y), strokeWidth = 1.dp.toPx())
    }
}

/**
 * How strongly each square differs from the reference, as a tint.
 *
 * Android showed only the discrete `changed` SET, which is the answer after the thresholds have
 * been applied — so a square at z = 2.9 and a square at z = 0.1 looked identical (both: nothing).
 * Python has a whole diff view for this reason. This is its per-square equivalent, off the `z`
 * scores the status already carries; [ZTHR_DISPLAY] is the scale, not a threshold — the engine's
 * own `zThr` decides what counts, this only decides what you can see approaching it.
 */
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
            drawRect(color = color, topLeft = it.topLeft, size = it.size, style = Stroke(width = 3.dp.toPx()))
        }
    }
}
