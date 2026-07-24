package com.chesslab.tracker.ui

import android.graphics.Bitmap
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.chesslab.engine.STARTPOS
import com.chesslab.tracker.R
import com.chesslab.tracker.service.DebugBitmaps
import com.chesslab.tracker.service.OverlayView
import com.chesslab.tracker.ui.theme.BoardPalette

private const val FILES = "abcdefgh"
private const val BOARD_DIM = 8
private const val SQUARE_LEN = 2
private const val MARKER_ALPHA = 0.5f

private fun DrawScope.markSquares(
    squares: List<String>,
    color: Color,
) {
    val cell = size.width / BOARD_DIM
    val valid = squares.filter { it.length == SQUARE_LEN && it[0] in FILES && it[1] in '1'..'8' }
    for (sq in valid) {
        val col = FILES.indexOf(sq[0])
        val row = BOARD_DIM - sq[1].digitToInt()
        drawRect(
            color = color.copy(alpha = MARKER_ALPHA),
            topLeft = Offset(col * cell, row * cell),
            size = Size(cell, cell),
        )
    }
}

/**
 * Board view host. When [renderedMode] is true it always draws the synthetic
 * [ChessBoard] from [fen] (the "Rendered" board mode) regardless of any warped [bitmap].
 * Otherwise it shows the warped board with optional debug overlays, or the raw camera
 * preview when [view] is [OverlayView.CAMERA].
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun OverlayBoard(
    view: OverlayView,
    bitmap: Bitmap?,
    debugBitmaps: DebugBitmaps = DebugBitmaps(),
    rawPreview: Bitmap?,
    debug: DebugSnapshot,
    fen: String,
    modifier: Modifier = Modifier,
    renderedMode: Boolean = false,
    showGrid: Boolean = false,
    alarm: Boolean = false,
) {
    when {
        renderedMode -> ChessBoard(fen = fen, modifier = modifier, alarm = alarm)
        view == OverlayView.CAMERA -> CameraPreview(rawPreview = rawPreview, modifier = modifier)
        bitmap == null -> ChessBoard(fen = fen, modifier = modifier, alarm = alarm)
        else ->
            WarpedBoard(
                view = view,
                bitmap = debugBitmapFor(view, bitmap, debugBitmaps),
                debug = debug,
                showGrid = showGrid,
                modifier = modifier,
            )
    }
}

internal fun debugBitmapFor(
    view: OverlayView,
    board: Bitmap,
    debug: DebugBitmaps,
): Bitmap =
    when (view) {
        OverlayView.DIFF -> debug.detectionDiff ?: board
        OverlayView.OCCLUSION -> debug.occlusionDiff ?: board
        OverlayView.MOTION -> debug.motionDiff ?: board
        else -> board
    }

/** The warped camera board with the debug marks/grid for the Video sub-views. */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun WarpedBoard(
    view: OverlayView,
    bitmap: Bitmap,
    debug: DebugSnapshot,
    showGrid: Boolean,
    modifier: Modifier = Modifier,
) {
    val label = stringResource(R.string.overlay_board_desc)
    Box(modifier = modifier.fillMaxWidth().aspectRatio(1f).semantics { contentDescription = label }) {
        Image(
            bitmap = bitmap.asImageBitmap(),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
        )
        Canvas(modifier = Modifier.fillMaxSize()) {
            when (view) {
                OverlayView.BOARD -> Unit
                OverlayView.DIFF -> markSquares(debug.changed, BoardPalette.MarkChanged)
                OverlayView.MOTION -> Unit
                OverlayView.SHADOW -> markSquares(debug.shadowVetoed, BoardPalette.MarkShadow)
                OverlayView.OCCLUSION -> markSquares(debug.occludedVetoed, BoardPalette.MarkOcclusion)
                OverlayView.CAMERA -> Unit // handled by the caller
            }
            // Debug: 8x8 grid to verify the warp lines up with the physical squares.
            if (showGrid) drawBoardGrid()
        }
    }
}

/** Draw an 8x8 grid over the warped board so warp misalignment is visible. */
private fun DrawScope.drawBoardGrid() {
    val cell = size.width / BOARD_DIM
    for (i in 0..BOARD_DIM) {
        val p = i * cell
        drawLine(BoardPalette.Grid, Offset(p, 0f), Offset(p, size.height), strokeWidth = 2f)
        drawLine(BoardPalette.Grid, Offset(0f, p), Offset(size.width, p), strokeWidth = 2f)
    }
}

/**
 * Raw camera feed (downscaled, before warp/calibration), with accessibility label.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun CameraPreview(
    rawPreview: Bitmap?,
    modifier: Modifier = Modifier,
) {
    val label = stringResource(R.string.raw_preview_desc)
    val descMod = modifier.fillMaxWidth().aspectRatio(1f).semantics { contentDescription = label }
    if (rawPreview == null) {
        ChessBoard(fen = STARTPOS, modifier = descMod)
        return
    }
    Box(modifier = descMod) {
        Image(
            bitmap = rawPreview.asImageBitmap(),
            contentDescription = label,
            modifier = Modifier.fillMaxSize(),
        )
    }
}
