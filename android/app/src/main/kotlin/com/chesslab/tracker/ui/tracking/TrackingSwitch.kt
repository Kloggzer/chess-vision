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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.chesslab.tracker.service.TrackerRun
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.Space

private val REQUESTED_PERMISSIONS: Array<String>
    get() =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(Manifest.permission.CAMERA, Manifest.permission.POST_NOTIFICATIONS)
        } else {
            arrayOf(Manifest.permission.CAMERA)
        }

/** Owns the camera permission, asked beside the thing it is for; everything without frames works without it.
 *  Stopping ENDS the game (saved); pausing the camera is the separate chip. */
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
    val start = {
        denied = false
        if (hasCamera(context)) TrackerRun.start() else request.launch(REQUESTED_PERMISSIONS)
    }

    // "Start a game" on Home already chose this; a second press here made that a mere navigation button.
    LaunchedEffect(Unit) {
        if (!running) start()
    }

    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Space.xs)) {
        // Starting is the screen's ONE filled button; stopping is not, and needs no confirmation (the game is saved).
        if (!running && denied) {
            FilledAction("Allow camera & start", start, Modifier.fillMaxWidth())
        }
        if (denied) {
            Text(
                "Camera access is required to detect the board. Grant it in the system settings.",
                style = MaterialTheme.typography.bodySmall,
                color = Danger,
            )
        }
    }
}

private fun hasCamera(context: Context): Boolean =
    context.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
