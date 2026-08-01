package com.chesslab.tracker.ui.calibration

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
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.camera.CameraLookPort
import com.chesslab.tracker.geometry.ArucoCalibrator
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.calibrationStore
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.camera.CameraLookSection
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import kotlinx.coroutines.launch

@Composable
fun CalibrationRoute(
    onCalibrated: () -> Unit,
    onBack: () -> Unit,
) {
    val host = LocalCalibrationHost.current
    if (host == null) {
        Column(Modifier.fillMaxSize()) {
            Text("waiting for the tracker service")
            TextButton(onClick = onBack) { Text("Back") }
        }
        return
    }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val vm =
        remember(host) {
            val store = calibrationStore(context)
            CalibrationViewModel(
                detector = ArucoCalibrator(host.latestCalibrationFrame, store::geometry),
                store = store,
                scope = scope,
                remeasureOptics = host.remeasureOptics,
            )
        }
    LaunchedEffect(vm) { vm.autoDetect() }
    val state by vm.state.collectAsState()
    val preview by host.rawPreview.collectAsState()
    // `onBack` used to be emitted as a SIBLING of the steps: the nav host stacks its children in a
    // Box, so the button was drawn on top of the camera preview instead of below the content.
    CalibrationSteps(
        state = state,
        preview = preview,
        vm = vm,
        onBack = onBack,
        // Stays on this screen, deliberately: the sequence just changed the optics and its outcome
        // is the thing the user pressed the button to find out.
        onRemeasure = {
            scope.launch {
                vm.remeasure { profile -> host.onRemeasured(profile.geometry(), profile.corners, profile.name) }
            }
        },
        cameraLook = host.cameraLook,
    ) { profile ->
        // Geometry only — the game keeps running (`Reset game` is a different action, 06b).
        host.onCalibrated(profile.geometry(), profile.corners, profile.name)
        onCalibrated()
    }
}

@Composable
private fun CalibrationSteps(
    state: CalibrationState,
    preview: Bitmap?,
    vm: CalibrationViewModel,
    onBack: () -> Unit,
    onRemeasure: () -> Unit,
    cameraLook: CameraLookPort?,
    onSaved: (CalibrationProfile) -> Unit,
) {
    val source = IntSize(state.frameWidth, state.frameHeight)
    ChesslabScaffold("Calibrate board", onBack) { bars ->
        Column(
            Modifier.fillMaxSize().padding(bars).padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            state.note?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted) }
            when (state.step) {
                CalibrationStep.CONFIRM ->
                    OrientationConfirm(
                        state = state,
                        onWhitePovChange = vm::setWhitePov,
                        onSave = { vm.save(onSaved) },
                        onBack = vm::back,
                        onMarginChange = vm::setMargin,
                    )
                CalibrationStep.MANUAL -> {
                    PreviewWithOverlay(preview, state, source, labelled = false, modifier = Modifier.weight(1f))
                    ManualCornerPicker(state, vm::tap, vm::undoTap, vm::restartTaps)
                    WideButton("Check orientation", vm::toConfirm, enabled = state.corners != null)
                }
                else -> {
                    // The preview takes the leftover height: aiming the camera IS this screen, and
                    // it used to sit in a fixed square box drawn at the bitmap's intrinsic size.
                    PreviewWithOverlay(preview, state, source, state.step == CalibrationStep.DETECTED, Modifier.weight(1f))
                    AimActions(state, vm, onRemeasure)
                    // Under the aim preview, because both are set by LOOKING at that picture.
                    cameraLook?.let { port ->
                        val look by port.look.collectAsState()
                        val exposure by port.exposure.collectAsState()
                        CameraLookSection(look, exposure, port::setLook)
                    }
                }
            }
            // Recalibrate is GEOMETRY. Starting a new game is "Reset game" on the tracking screen —
            // the two are never the same action (MEMORY: android-single-camera-owner).
            Text(
                "Recalibrate changes the board geometry only. Your game keeps running.",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceMuted,
            )
        }
    }
}

@Composable
private fun WideButton(
    label: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
) {
    Button(onClick = onClick, enabled = enabled, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge, maxLines = 1)
    }
}

@Composable
private fun AimActions(
    state: CalibrationState,
    vm: CalibrationViewModel,
    onRemeasure: () -> Unit,
) {
    Text(
        text =
            if (state.step == CalibrationStep.DETECTED) {
                "Board found. Check the a8 corner before continuing."
            } else {
                "Point the camera at the whole board."
            },
        style = MaterialTheme.typography.bodyLarge,
    )
    // Three buttons in one row squeezed the last one to a single character per line — a tall grey
    // pill that read as a stray scrollbar. The primary action gets its own full-width row.
    WideButton("Check orientation", vm::toConfirm, enabled = state.corners != null)
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedButton(onClick = vm::beginManual, modifier = Modifier.weight(1f).heightIn(min = 48.dp)) {
            Text("Corners look wrong", style = MaterialTheme.typography.labelSmall, maxLines = 1)
        }
        OutlinedButton(
            onClick = vm::detectOnce,
            enabled = !state.detecting,
            modifier = Modifier.weight(1f).heightIn(min = 48.dp),
        ) {
            Text("Detect again", style = MaterialTheme.typography.labelSmall, maxLines = 1)
        }
    }
    // Its own row: it is neither of the two above. Those re-read the geometry from the picture as
    // it is; this one changes the picture first and then re-reads it.
    if (vm.canRemeasure) {
        OutlinedButton(
            onClick = onRemeasure,
            enabled = !state.remeasuring,
            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
        ) {
            Text("Re-measure camera", style = MaterialTheme.typography.labelSmall, maxLines = 1)
        }
        // Same shape of promise as the Recalibrate help below it, because it is the same contract.
        Text(
            "Re-measure camera re-runs focus, exposure and white balance, then the board geometry. " +
                "Use it when the picture looks wrong. Your game keeps running.",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
    }
    // The button takes a visible moment and changes what the camera sees; every one of the three
    // outcomes says so in words, because silence here is indistinguishable from a dead button.
    state.remeasure?.let {
        Text(remeasureMessage(it), style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun PreviewWithOverlay(
    preview: Bitmap?,
    state: CalibrationState,
    source: IntSize,
    labelled: Boolean,
    modifier: Modifier = Modifier,
) {
    // The overlay maps SOURCE pixels onto the whole box, so the box must carry the source's aspect
    // ratio and the image must fill it exactly — otherwise every drawn corner sits off the board.
    val ratio = if (source.width > 0 && source.height > 0) source.width.toFloat() / source.height else DEFAULT_RATIO
    Box(modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Box(Modifier.fillMaxWidth().aspectRatio(ratio)) {
            preview?.let {
                Image(
                    bitmap = it.asImageBitmap(),
                    contentDescription = "camera preview",
                    contentScale = ContentScale.FillBounds,
                    modifier = Modifier.fillMaxSize(),
                )
            } ?: Text("no camera frame yet", color = OnSurfaceMuted)
            if (labelled) {
                CalibrationOverlay(state.corners, state.markerIds, state.whitePov, source, Modifier.fillMaxSize())
            } else {
                QuadOutline(state.corners, source, Modifier.fillMaxSize())
            }
        }
    }
}

private const val DEFAULT_RATIO = 4f / 3f
