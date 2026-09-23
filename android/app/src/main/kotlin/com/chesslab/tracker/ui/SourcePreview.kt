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

private const val DEFAULT_RATIO = 4f / 3f

/** Picture and overlay turned upright as ONE box, so they agree about the board to the pixel. The turn is
 *  here, at the glass: `ImageAnalysis` delivers sensor orientation, and rotating the buffer would move
 *  every saved quad off its board. The overlay draws in SOURCE pixels; taps follow the inverse transform. */
@Composable
fun SourceFramedPreview(
    preview: Bitmap?,
    rotationDegrees: Int,
    sourceWidth: Int,
    sourceHeight: Int,
    modifier: Modifier = Modifier,
    fill: Boolean = false,
    magnification: Float = 1f,
    empty: @Composable () -> Unit = {},
    overlay: @Composable BoxScope.() -> Unit = {},
) {
    val source =
        if (sourceWidth > 0 && sourceHeight > 0) sourceWidth.toFloat() / sourceHeight else DEFAULT_RATIO
    // A quarter turn: laid out at the SHOWN ratio, built at the source's.
    val quarterTurn = rotationDegrees.mod(HALF_TURN) != 0
    val shownRatio = if (quarterTurn) 1f / source else source
    BoxWithConstraints(modifier.clipToBounds(), contentAlignment = Alignment.Center) {
        // `requiredSize` off measured constraints, NOT `aspectRatio` (it resolves width first, and fill did nothing).
        // Both axes: after a quarter turn the height-fit binds, and a width-anchored box grew through the buttons.
        val byWidth = DpSize(maxWidth, maxWidth / shownRatio)
        val byHeight = DpSize(maxHeight * shownRatio, maxHeight)
        val contain = if (byWidth.height <= maxHeight) byWidth else byHeight
        val cover = if (byWidth.height >= maxHeight) byWidth else byHeight
        val shown = if (fill) cover else contain
        val enlarged = DpSize(shown.width * magnification, shown.height * magnification)
        val built = if (quarterTurn) DpSize(enlarged.height, enlarged.width) else enlarged
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
