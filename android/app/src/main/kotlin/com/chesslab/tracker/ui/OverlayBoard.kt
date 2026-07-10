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
import com.chesslab.tracker.service.OverlayView

private const val FILES = "abcdefgh"
private const val BOARD_DIM = 8
private const val SQUARE_LEN = 2
private const val MARKER_ALPHA = 0.5f

// Overlay colours (port of tracker.py:2379): changed=magenta, shadow=cyan, occlusion=orange.
private val MAGENTA = Color(0xFFFF00FF)
private val CYAN = Color(0xFF00E5FF)
private val ORANGE = Color(0xFFFF9800)

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
 * Shows the warped board with optional debug overlays, or the raw camera preview
 * when [view] is [OverlayView.CAMERA].
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun OverlayBoard(
    view: OverlayView,
    bitmap: Bitmap?,
    rawPreview: Bitmap?,
    debug: DebugSnapshot,
    fen: String,
    modifier: Modifier = Modifier,
) {
    if (view == OverlayView.CAMERA) {
        CameraPreview(rawPreview = rawPreview, modifier = modifier)
        return
    }
    if (bitmap == null) {
        ChessBoard(fen = fen, modifier = modifier)
        return
    }
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
                OverlayView.DIFF, OverlayView.MOTION -> markSquares(debug.changed, MAGENTA)
                OverlayView.SHADOW -> markSquares(debug.shadowVetoed, CYAN)
                OverlayView.OCCLUSION -> markSquares(debug.occludedVetoed, ORANGE)
                OverlayView.CAMERA -> Unit // handled above
            }
        }
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
