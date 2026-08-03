package com.chesslab.tracker.ui.tracking

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.chesslab.tracker.service.TrackerRun
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space

/** Notifications are only needed for the foreground-service notification, and only from API 33. */
private val REQUESTED_PERMISSIONS: Array<String>
    get() =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(Manifest.permission.CAMERA, Manifest.permission.POST_NOTIFICATIONS)
        } else {
            arrayOf(Manifest.permission.CAMERA)
        }

/**
 * The one control in the app that opens a camera, and the one that closes it.
 *
 * It also owns the camera permission, which used to be a gate in front of the whole activity: the
 * app asked for a camera before it would show a stored game. Asking here means the request arrives
 * beside the thing it is for, and everything that needs no frames works without it.
 *
 * Stopping ENDS the game (it is saved on the way out) and releases the device. Pausing the camera
 * while keeping the game is the separate chip above — the two are different acts and read as
 * different acts.
 */
@Composable
fun TrackingSwitch(
    running: Boolean,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var denied by remember { mutableStateOf(false) }
    val request =
        rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            val granted = result[Manifest.permission.CAMERA] == true
            denied = !granted
            if (granted) TrackerRun.start()
        }
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Space.xs)) {
        val onClick = {
            when {
                running -> TrackerRun.stop(context)
                hasCamera(context) -> TrackerRun.start()
                else -> request.launch(REQUESTED_PERMISSIONS)
            }
        }
        // Starting is what this screen is for, so it is the screen's ONE filled button. Stopping is
        // not: while a game runs the screen is for the board, and the alarm card — when it exists —
        // is then the one thing the screen is for. It gets no confirmation either; the game is saved.
        if (running) {
            OutlineAction("Stop tracking", onClick, Modifier.fillMaxWidth())
        } else {
            FilledAction("Start tracking", onClick, Modifier.fillMaxWidth())
        }
        if (denied) {
            Text(
                "Camera access is required to detect the board. Grant it in the system settings.",
                style = MaterialTheme.typography.bodySmall,
                color = Danger,
            )
        } else if (!running) {
            Text(
                "Starts the camera and the foreground service. Stop it here or from the notification.",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceMuted,
            )
        }
    }
}

private fun hasCamera(context: Context): Boolean =
    context.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
