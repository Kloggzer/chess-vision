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
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.IntSize
import com.chesslab.tracker.geometry.ArucoCalibrator
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.calibrationStore

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
            )
        }
    LaunchedEffect(vm) { vm.autoDetect() }
    val state by vm.state.collectAsState()
    val preview by host.rawPreview.collectAsState()
    CalibrationSteps(state, preview, vm) { profile ->
        // Geometry only — the game keeps running (`Reset game` is a different action, 06b).
        host.onCalibrated(profile.geometry(), profile.corners, profile.name)
        onCalibrated()
    }
    TextButton(onClick = onBack) { Text("Back") }
}

@Composable
private fun CalibrationSteps(
    state: CalibrationState,
    preview: Bitmap?,
    vm: CalibrationViewModel,
    onSaved: (CalibrationProfile) -> Unit,
) {
    val source = IntSize(state.frameWidth, state.frameHeight)
    Column(Modifier.fillMaxWidth()) {
        state.note?.let { Text(it) }
        when (state.step) {
            CalibrationStep.CONFIRM ->
                OrientationConfirm(
                    state = state,
                    onWhitePovChange = vm::setWhitePov,
                    onSave = { vm.save(onSaved) },
                    onBack = vm::back,
                )
            CalibrationStep.MANUAL -> {
                PreviewWithOverlay(preview, state, source, labelled = false)
                ManualCornerPicker(state, vm::tap, vm::undoTap, vm::restartTaps)
                Button(onClick = vm::toConfirm, enabled = state.corners != null) { Text("Check orientation") }
            }
            else -> {
                PreviewWithOverlay(preview, state, source, labelled = state.step == CalibrationStep.DETECTED)
                AimActions(state, vm)
            }
        }
        // Recalibrate is GEOMETRY. Starting a new game is "Reset game" on the tracking screen —
        // the two are never the same action (MEMORY: android-single-camera-owner).
        Text("Recalibrate changes the board geometry only. Your game keeps running.")
    }
}

@Composable
private fun AimActions(
    state: CalibrationState,
    vm: CalibrationViewModel,
) {
    Text(
        if (state.step == CalibrationStep.DETECTED) {
            "Board found. Check the a8 corner before continuing."
        } else {
            "Point the camera at the whole board."
        },
    )
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        TextButton(onClick = vm::beginManual) { Text("Corners look wrong") }
        TextButton(onClick = vm::detectOnce, enabled = !state.detecting) { Text("Recalibrate now") }
        Button(onClick = vm::toConfirm, enabled = state.corners != null) { Text("Check orientation") }
    }
}

@Composable
private fun PreviewWithOverlay(
    preview: Bitmap?,
    state: CalibrationState,
    source: IntSize,
    labelled: Boolean,
) {
    Box(
        Modifier
            .fillMaxWidth()
            .aspectRatio(1f),
    ) {
        preview?.let {
            Image(it.asImageBitmap(), contentDescription = "camera preview", contentScale = ContentScale.Fit)
        } ?: Text("no camera frame yet")
        if (labelled) {
            CalibrationOverlay(state.corners, state.markerIds, state.whitePov, source, Modifier.fillMaxSize())
        } else {
            QuadOutline(state.corners, source, Modifier.fillMaxSize())
        }
    }
}
