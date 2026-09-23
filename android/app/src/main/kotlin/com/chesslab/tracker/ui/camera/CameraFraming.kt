package com.chesslab.tracker.ui.camera

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.IntSize
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.ui.calibration.QuadOutline
import kotlin.math.abs

/** The SAVED quad shows whether phone or board moved since calibration; the thirds grid serves a first
 *  setup. Both are CHROME and vanish with it. */
@Composable
fun FramingOverlay(
    profile: CalibrationProfile?,
    previewWidth: Int,
    previewHeight: Int,
    modifier: Modifier = Modifier,
) {
    Box(modifier) {
        ThirdsGrid(Modifier.fillMaxSize())
        // AMBER against the live outline's green: amber is the SAVED calibration, green what the camera sees now.
        // Their disagreement is the whole signal.
        profile?.takeIf { canDrawQuad(it, previewWidth, previewHeight) }?.let {
            QuadOutline(it.corners, IntSize(it.sourceWidth, it.sourceHeight), Modifier.fillMaxSize(), SAVED_QUAD)
        }
    }
}

/** The quad maps by a plain per-axis scale, honest only for the same frame shape. There is no rescale
 *  (`forResolution()` went in a7dab73 for a silently wrong grid), so a mismatch draws NOTHING. */
fun canDrawQuad(
    profile: CalibrationProfile?,
    previewWidth: Int,
    previewHeight: Int,
): Boolean {
    if (profile == null || previewWidth <= 0 || previewHeight <= 0) return false
    if (profile.sourceWidth <= 0 || profile.sourceHeight <= 0) return false
    val saved = profile.sourceWidth.toDouble() / profile.sourceHeight
    val shown = previewWidth.toDouble() / previewHeight
    return abs(saved - shown) <= ASPECT_TOLERANCE * shown
}

/** Not zero: the preview is a converted copy, and 1280x720 against 1281x720 is not a different shape. */
private const val ASPECT_TOLERANCE = 0.02

@Composable
private fun ThirdsGrid(modifier: Modifier) {
    Canvas(modifier) {
        val ink = Color.White.copy(alpha = GRID_ALPHA)
        for (i in 1 until THIRDS) {
            val x = size.width * i / THIRDS
            val y = size.height * i / THIRDS
            drawLine(ink, Offset(x, 0f), Offset(x, size.height), GRID_STROKE)
            drawLine(ink, Offset(0f, y), Offset(size.width, y), GRID_STROKE)
        }
    }
}

private val SAVED_QUAD = Color(0xFFFFB300)

private const val THIRDS = 3
private const val GRID_ALPHA = 0.16f
private const val GRID_STROKE = 1.5f
