package com.chesslab.tracker.ui.camera

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.camera.CameraAbilities
import com.chesslab.tracker.camera.CameraLook
import com.chesslab.tracker.settings.SettingsHost
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.tracking.TrackerSessionHost

/**
 * The camera screen: a viewfinder with the camera's own controls under it.
 *
 * A camera app, not a settings page — every control here is judged by looking at the picture above
 * it, so the picture gets the space and the deck stays one scrollable column of thin controls. The
 * board's GEOMETRY is a different screen with a different lifetime (`CalibrationRoute`); nothing
 * here changes where the squares are, except zoom, which says so.
 *
 * **No camera is bound here.** The viewfinder is the analyzer's own frames, the same ones the
 * calibration screen renders (`TrackerSession.rawPreview`). `TrackerCamera` is the app's single
 * camera owner and a second `Preview` use case fighting for the stream is the bug class that once
 * froze the analyzer feed dead on every tab switch (MEMORY `android-single-camera-owner`).
 *
 * **Nothing here edits pixels.** Every control configures the SENSOR through CameraX or, where
 * CameraX has no API, a capture-request key. A brightness or white balance faked in software would
 * change the frames the tracker diffs against its own reference, which is a different bug wearing
 * this feature's clothes.
 */
@Composable
fun CameraRoute(onBack: () -> Unit) {
    val port by CameraLookHost.port.collectAsStateWithLifecycle()
    val repository by SettingsHost.repository.collectAsStateWithLifecycle()
    val session by TrackerSessionHost.session.collectAsStateWithLifecycle()
    val optics = port
    val settings = repository
    val bound = session
    if (optics == null || settings == null || bound == null) {
        ChesslabScaffold("Camera", onBack) { bars ->
            Column(Modifier.fillMaxSize().padding(bars).padding(12.dp)) {
                Text("The tracker service is not running yet.", color = OnSurfaceMuted)
            }
        }
        return
    }
    val viewModel = remember(optics, settings) { CameraViewModel(optics, settings) }
    val look by viewModel.live.collectAsStateWithLifecycle()
    val abilities by viewModel.abilities.collectAsStateWithLifecycle()
    val saved by viewModel.saved.collectAsStateWithLifecycle(initialValue = look)
    val preview by bound.rawPreview.collectAsStateWithLifecycle()
    val torchOn by bound.torchOn.collectAsStateWithLifecycle()
    CameraScreen(
        preview = preview,
        look = look,
        abilities = abilities,
        saved = saved,
        torchOn = torchOn,
        hasTorch = bound.hasTorch,
        onTorch = bound::setTorchOn,
        viewModel = viewModel,
        onBack = onBack,
    )
}

@Composable
private fun CameraScreen(
    preview: Bitmap?,
    look: CameraLook,
    abilities: CameraAbilities?,
    saved: CameraLook,
    torchOn: Boolean,
    hasTorch: Boolean,
    onTorch: (Boolean) -> Unit,
    viewModel: CameraViewModel,
    onBack: () -> Unit,
) {
    ChesslabScaffold("Camera", onBack) { bars ->
        Column(Modifier.fillMaxSize().padding(bars)) {
            Viewfinder(preview)
            Column(
                Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (hasTorch) {
                    // The lamp is not just a lamp: the service re-measures the frozen optics and
                    // re-baselines the tracker around it. See `TorchControl`.
                    FilterChip(
                        selected = torchOn,
                        onClick = { onTorch(!torchOn) },
                        label = { Text(if (torchOn) "Light on" else "Light off", style = MaterialTheme.typography.labelMedium) },
                    )
                }
                if (abilities == null) {
                    // Not "this camera has nothing": nothing has answered yet. The controls appear
                    // as the device reports them, and none of them is rendered dead in the meantime.
                    Text("Waiting for the camera…", style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted)
                } else {
                    FocusControl(look, abilities, viewModel::set)
                    ZoomControl(look, abilities, viewModel::set)
                    BrightnessControl(look, abilities, viewModel::set)
                    WhiteBalanceControl(look, abilities, viewModel::set)
                }
                SaveBar(look, saved, viewModel)
            }
        }
    }
}

/**
 * The analyzer's frames at their own aspect ratio, given as much height as the deck can spare.
 *
 * `heightIn` and not `weight`: the deck is the thing that must never be squeezed to nothing, and
 * the first version of this feature put its controls under a `weight(1f)` preview, which shrank the
 * picture every time a control was added.
 */
@Composable
private fun Viewfinder(preview: Bitmap?) {
    val ratio = preview?.let { it.width.toFloat() / it.height } ?: DEFAULT_RATIO
    Box(
        Modifier.fillMaxWidth().heightIn(max = VIEWFINDER_MAX.dp).aspectRatio(ratio),
        contentAlignment = Alignment.Center,
    ) {
        preview?.let {
            Image(
                bitmap = it.asImageBitmap(),
                contentDescription = "camera viewfinder",
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize(),
            )
        } ?: Text("no camera frame yet", color = OnSurfaceMuted)
    }
}

/**
 * Auto or a fixed distance, and the distance itself.
 *
 * "Auto" does not mean the lens keeps hunting: `OpticsLock` pins whatever the automatic converged
 * to, because a refocus between the reference frame and the current one changes every edge on the
 * board at once. Manual is for the board the automatic keeps focusing past — the far end reads
 * "Far" rather than a diopter figure, because a number in diopters is not something anyone aims by.
 */
@Composable
private fun FocusControl(
    look: CameraLook,
    abilities: CameraAbilities,
    onLook: (CameraLook) -> Unit,
) {
    if (!abilities.canFocus) return
    CameraDeckTitle("Focus")
    CameraChoice(
        label = "Mode",
        options = listOf("Auto" to false, "Manual" to true),
        selected = look.focus != null,
        onSelect = { manual -> onLook(look.copy(focus = if (manual) DEFAULT_FOCUS else null)) },
    )
    look.focus?.let { focus ->
        CameraDial(
            label = "Near ← → Far",
            reading = "%.0f %%".format((1f - focus) * PERCENT),
            value = 1f - focus,
            range = 0f..1f,
            active = true,
            onValue = { onLook(look.copy(focus = 1f - it)) },
        )
    }
}

/** Zoom, from the device's own advertised range. It moves the board, so it says so. */
@Composable
private fun ZoomControl(
    look: CameraLook,
    abilities: CameraAbilities,
    onLook: (CameraLook) -> Unit,
) {
    val range = abilities.zoom ?: return
    CameraDeckTitle("Zoom")
    CameraDial(
        label = "Field of view",
        reading = "%.1f×".format(look.zoomRatio),
        value = look.zoomRatio,
        range = range,
        active = look.zoomRatio != 1f,
        onValue = { onLook(look.copy(zoomRatio = it)) },
    )
    if (look.zoomRatio != 1f) {
        Text(
            "Zoom moves the board in the frame — recalibrate the board after changing it.",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
    }
}

/** Exposure compensation, in the device's own EV steps. */
@Composable
private fun BrightnessControl(
    look: CameraLook,
    abilities: CameraAbilities,
    onLook: (CameraLook) -> Unit,
) {
    val exposure = abilities.exposure ?: return
    CameraDeckTitle("Brightness")
    CameraDial(
        label = "Exposure",
        reading = if (look.evIndex == 0) "auto (0.0 EV)" else "%+.1f EV".format(exposure.ev(look.evIndex)),
        value = look.evIndex.toFloat(),
        range = exposure.indices.first.toFloat()..exposure.indices.last.toFloat(),
        active = look.evIndex != 0,
        onValue = { onLook(look.copy(evIndex = it.toInt())) },
    )
}

/** The illuminant, as the presets this device advertises — see `CameraLook` for why not kelvin. */
@Composable
private fun WhiteBalanceControl(
    look: CameraLook,
    abilities: CameraAbilities,
    onLook: (CameraLook) -> Unit,
) {
    if (!abilities.canWhiteBalance) return
    CameraDeckTitle("White balance")
    CameraChoice(
        label = "Light on the board",
        options = abilities.whiteBalance.map { (it.kelvin?.let { k -> "${it.label} · $k K" } ?: it.label) to it },
        selected = look.whiteBalance,
        onSelect = { onLook(look.copy(whiteBalance = it)) },
    )
}

/**
 * What is applied, what is stored, and the two ways between them.
 *
 * Applying and saving are separate acts because a camera setting has to be applied to be judged.
 * The line says which state the screen is in, in words, so "did that take" is never a guess.
 */
@Composable
private fun SaveBar(
    look: CameraLook,
    saved: CameraLook,
    viewModel: CameraViewModel,
) {
    val unsaved = look != saved
    Text(
        text =
            when {
                unsaved -> "Not saved yet — the camera is set to this, but a restart would undo it."
                saved.isAuto -> "Saved: everything on automatic."
                else -> "Saved — this is what the camera starts with."
            },
        style = MaterialTheme.typography.bodySmall,
        color = OnSurfaceMuted,
    )
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(onClick = viewModel::save, enabled = unsaved, modifier = Modifier.weight(1f).heightIn(min = 48.dp)) {
            Text("Save", style = MaterialTheme.typography.labelLarge, maxLines = 1)
        }
        OutlinedButton(onClick = viewModel::revert, enabled = unsaved, modifier = Modifier.weight(1f).heightIn(min = 48.dp)) {
            Text("Undo changes", style = MaterialTheme.typography.labelSmall, maxLines = 1)
        }
    }
    OutlinedButton(
        onClick = viewModel::backToAuto,
        enabled = !look.isAuto || !saved.isAuto,
        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
    ) {
        Text("Everything back to automatic", style = MaterialTheme.typography.labelSmall, maxLines = 1)
    }
}

private const val DEFAULT_RATIO = 4f / 3f
private const val VIEWFINDER_MAX = 320
private const val PERCENT = 100f

/** Manual focus opens at the far end: a board is metres away, not centimetres. */
private const val DEFAULT_FOCUS = 0f
