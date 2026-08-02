package com.chesslab.tracker.ui

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.DpSize

/** A frame shape to lay out by before any frame has arrived. */
private const val DEFAULT_RATIO = 4f / 3f

/**
 * The analyzer's frames with their overlay, turned upright as ONE unit.
 *
 * Every screen that draws the raw camera frame goes through here, and that is the point. The
 * picture and whatever is drawn over it — a board quad, detected corners, a thirds grid — have to
 * agree about where the board is to the pixel, and the only way to guarantee that rather than hope
 * for it is to give them one box and turn the box.
 *
 * **Why there is a turn at all.** `ImageAnalysis` sets no target rotation, so CameraX hands over
 * the sensor's own buffer: on a phone held in portrait the board arrives lying on its side. Nothing
 * downstream minds — the warp, the ArUco detection and every stored `CalibrationProfile` live in
 * that same sensor space, and they are self-consistent there. Only a human looking at the screen
 * minds. So the fix is here, at the glass, and NOT at the camera: rotating the buffer would move
 * every saved quad out from under its board at once, the same class of silent breakage that got
 * `CalibrationProfile.forResolution()` deleted in a7dab73.
 *
 * The overlay slot therefore still draws in SOURCE pixels, unturned, exactly as it did before —
 * [rotationDegrees] is applied to the composed result, so a caller mapping source pixels onto the
 * box needs no knowledge of it. Taps land correctly too: Compose carries pointer input through the
 * layer's inverse transform.
 *
 * @param fill trades the letterbox bands for magnification — the same box sized by HEIGHT rather
 *   than width, so it runs off both sides and the parent clips it. Off by default, because the
 *   judgement these screens exist for is whether the board fits the FRAME, and a picture whose
 *   edges are off-screen cannot answer that.
 */
@Composable
fun SourceFramedPreview(
    preview: Bitmap?,
    rotationDegrees: Int,
    sourceWidth: Int,
    sourceHeight: Int,
    modifier: Modifier = Modifier,
    fill: Boolean = false,
    empty: @Composable () -> Unit = {},
    overlay: @Composable BoxScope.() -> Unit = {},
) {
    val source =
        if (sourceWidth > 0 && sourceHeight > 0) sourceWidth.toFloat() / sourceHeight else DEFAULT_RATIO
    // A quarter turn swaps what the viewer sees, so the box has to be laid out at the SHOWN ratio
    // and built at the source's — the two differ by exactly the transpose.
    val quarterTurn = rotationDegrees.mod(HALF_TURN) != 0
    val shownRatio = if (quarterTurn) 1f / source else source
    BoxWithConstraints(modifier.clipToBounds(), contentAlignment = Alignment.Center) {
        // `requiredSize` off measured constraints, NOT `aspectRatio`: that modifier resolves the
        // width constraint first, so a `fillMaxHeight` box under it silently came back at the
        // fitted size and the fill toggle did nothing at all on the phone.
        //
        // Both axes are measured, and that is not belt-and-braces. Anchoring on WIDTH alone is what
        // the two screens used to do and it was invisible while the picture was landscape on a tall
        // phone — the height it asked for was always available. A quarter turn makes the shown shape
        // TALLER than wide, the height-fit becomes the binding one, and a width-anchored box grows
        // straight through the buttons under it. `requiredSize` ignores the incoming constraints, so
        // nothing downstream would have stopped it.
        val byWidth = DpSize(maxWidth, maxWidth / shownRatio)
        val byHeight = DpSize(maxHeight * shownRatio, maxHeight)
        val contain = if (byWidth.height <= maxHeight) byWidth else byHeight
        val cover = if (byWidth.height >= maxHeight) byWidth else byHeight
        val shown = if (fill) cover else contain
        val built = if (quarterTurn) DpSize(shown.height, shown.width) else shown
        Box(
            Modifier
                .requiredSize(built)
                .graphicsLayer { rotationZ = rotationDegrees.toFloat() },
        ) {
            preview?.let {
                Image(
                    bitmap = it.asImageBitmap(),
                    contentDescription = "camera preview",
                    contentScale = ContentScale.FillBounds,
                    modifier = Modifier.fillMaxSize(),
                )
            }
            overlay()
        }
        if (preview == null) empty()
    }
}

private const val HALF_TURN = 180
