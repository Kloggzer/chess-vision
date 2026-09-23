package com.chesslab.tracker.ui.debug

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.DebugCnnRead
import com.chesslab.tracker.service.DebugCrops
import com.chesslab.tracker.service.DebugState
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke

private const val GRID_N = 8
private const val OPAQUE = 0xFF shl 24
private const val BYTE_MASK = 0xFF
private const val BGR_CHANNELS = 3
private const val RED_SHIFT = 16
private const val GREEN_SHIFT = 8

/** Tiled in `all_squares()` order, as Python's `crops.jpg`, so the two can be held side by side. The crops
 *  the inference path itself handed the model — the ground truth for crop parity. Do not "clean up". */
@Composable
fun CropGridPanel(
    state: DebugState,
    viewModel: DebugViewModel,
) {
    val tiles by viewModel.crops.collectAsStateWithLifecycle()
    var zoomed by remember { mutableStateOf<String?>(null) }
    zoomed?.let { square ->
        CropDetailDialog(
            tile = tiles.firstOrNull { it.square == square },
            read = state.payload.cnnReads.firstOrNull { it.square == square },
            onDismiss = { zoomed = null },
        )
    }
    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        Text(
            "Model-input crops, all_squares() order — the parity reference against Python's crops.jpg.",
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurfaceMuted,
        )
        if (tiles.isEmpty()) {
            Text("no observation yet — is the CNN attached?", color = OnSurfaceMuted)
            return@Column
        }
        for (row in 0 until GRID_N) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.hair)) {
                for (col in 0 until GRID_N) {
                    val tile = tiles[row * GRID_N + col]
                    CropTileView(tile, Modifier.weight(1f).clickable { zoomed = tile.square })
                }
            }
        }
    }
}

@Composable
private fun CropTileView(
    tile: CropTile,
    modifier: Modifier,
) {
    Column(modifier) {
        Text(
            tile.square,
            style = MaterialTheme.typography.labelSmall,
            color = OnSurface,
            modifier = Modifier.fillMaxWidth().padding(bottom = Stroke.hairline),
        )
        Box(Modifier.fillMaxWidth().aspectRatio(1f)) {
            Image(
                bitmap = tile.image,
                contentDescription = tile.square,
                contentScale = ContentScale.FillBounds,
                modifier = Modifier.fillMaxWidth().aspectRatio(1f),
            )
        }
    }
}

@Composable
private fun CropDetailDialog(
    tile: CropTile?,
    read: DebugCnnRead?,
    onDismiss: () -> Unit,
) {
    if (tile == null) return
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(tile.square, style = MaterialTheme.typography.titleLarge) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
                Image(
                    bitmap = tile.image,
                    contentDescription = tile.square,
                    contentScale = ContentScale.FillBounds,
                    modifier = Modifier.fillMaxWidth().aspectRatio(1f),
                )
                Text(
                    read?.let {
                        "${it.label ?: "-"}  ${pct(it.conf)}  ·  ${if (it.occupied) "occupied" else "empty"}" +
                            "  ·  p(occluded) ${pct(it.pOccluded)}"
                    } ?: "no read for this square",
                    style = MaterialTheme.typography.bodyMedium,
                    color = OnSurfaceMuted,
                )
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } },
    )
}

internal fun cropTiles(crops: DebugCrops): List<CropTile> =
    crops.crops.mapIndexed { index, image ->
        CropTile(ALL_SQUARES.getOrElse(index) { "?" }, image.toImageBitmap())
    }

private fun BgrImage.toImageBitmap(): ImageBitmap {
    val pixels = IntArray(width * height)
    for (i in pixels.indices) {
        val b = data[i * BGR_CHANNELS].toInt() and BYTE_MASK
        val g = data[i * BGR_CHANNELS + 1].toInt() and BYTE_MASK
        val r = data[i * BGR_CHANNELS + 2].toInt() and BYTE_MASK
        pixels[i] = OPAQUE or (r shl RED_SHIFT) or (g shl GREEN_SHIFT) or b
    }
    return Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888).asImageBitmap()
}
