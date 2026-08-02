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

/**
 * The aiming aid: a thirds grid, and where the SAVED calibration believes the board is.
 *
 * "Does the board fill the frame" is the judgement this screen exists to support, and a bare picture
 * does not support it — a board that has drifted half a square since the last calibration looks
 * exactly like one that has not. The saved quad answers that directly: if the green outline no
 * longer sits on the board's edge, the phone or the board has moved and the geometry is stale.
 *
 * The grid is the fallback for the case the quad cannot serve — a first setup, where nothing has
 * been calibrated yet and centring the board is all there is to aim by.
 *
 * Both are CHROME: they vanish with the rest of it, because "see nothing but the picture" has to
 * mean nothing.
 */
@Composable
fun FramingOverlay(
    profile: CalibrationProfile?,
    previewWidth: Int,
    previewHeight: Int,
    modifier: Modifier = Modifier,
) {
    Box(modifier) {
        ThirdsGrid(Modifier.fillMaxSize())
        // The same drawing the calibration screen uses, deliberately: the two screens must not
        // disagree about where the board is, and one of them owning the renderer is how that is
        // guaranteed rather than hoped for.
        // AMBER, against the live outline's green. Two quads on one picture that look alike are
        // worse than one: this is where the SAVED calibration believes the board is, and the green
        // is where the camera sees it right now. Their disagreement is the whole signal — if amber
        // has drifted off the board, the phone or the board moved since the geometry was written.
        profile?.takeIf { canDrawQuad(it, previewWidth, previewHeight) }?.let {
            QuadOutline(it.corners, IntSize(it.sourceWidth, it.sourceHeight), Modifier.fillMaxSize(), SAVED_QUAD)
        }
    }
}

/**
 * Whether the saved quad can be drawn over THIS picture honestly.
 *
 * The quad is stored in the pixels of the frame it was measured on, and [QuadOutline] maps those
 * onto the box by a plain per-axis scale — which reproduces the picture's own mapping only when the
 * two frames have the same shape. A profile measured at 4:3 drawn over a 16:9 preview puts a green
 * outline somewhere near the board and invites the user to aim by it.
 *
 * There is no rescale to reach for: `CalibrationProfile` records that `forResolution()` was deleted
 * in a7dab73 because scaling a stored profile by a resolution ratio produced a silently wrong grid.
 * So a mismatch draws NOTHING, and the grid is what is left.
 */
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

/**
 * How far the two aspect ratios may disagree before the quad is dropped.
 *
 * Not zero: the preview is a converted, throttled copy of the analyzer frame and an odd pixel of
 * rounding between 1280x720 and 1281x720 is not a different shape. 2 % is far under the ~33 %
 * between the two ratios a phone actually delivers.
 */
private const val ASPECT_TOLERANCE = 0.02

/** Camera-app thirds, faint enough to read the wood grain through. */
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

/** The saved profile's quad. Amber for "this is the record", against green for "this is now". */
private val SAVED_QUAD = Color(0xFFFFB300)

private const val THIRDS = 3
private const val GRID_ALPHA = 0.16f
private const val GRID_STROKE = 1.5f
