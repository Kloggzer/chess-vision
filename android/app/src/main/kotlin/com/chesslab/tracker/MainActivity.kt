package com.chesslab.tracker

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.ui.BindTrackerService
import com.chesslab.tracker.ui.ChesslabNavHost
import com.chesslab.tracker.ui.theme.ChesslabTheme

/**
 * The single activity. It owns the theme, the camera-permission gate and the nav host — nothing
 * else. The camera itself belongs to the service (05a/06c): exactly one owner, or the feed freezes
 * on a tab switch (MEMORY `android-single-camera-owner`).
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // targetSdk 35 means Android 15+ forces edge-to-edge, and Android 16 dropped the opt-out:
        // the window ALWAYS extends under the status and navigation bars. Declaring it here (rather
        // than pretending otherwise) is what lets `safeDrawingPadding` below be the single, correct
        // fix. `auto` follows the system light/dark setting, which is also what the palette does —
        // hardcoding `dark` painted white system icons onto the light paper theme.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        setContent {
            ChesslabTheme {
                Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    // `safeDrawing` = system bars + display cutout + IME, measured per device and
                    // per rotation. Consumed once, here, so no screen can forget it and no screen
                    // can hardcode a bar height that is wrong on gesture navigation or in landscape.
                    Box(Modifier.fillMaxSize().safeDrawingPadding()) {
                        var granted by remember { mutableStateOf(hasCamera()) }
                        if (granted) {
                            // The service is started only AFTER the camera permission exists — a
                            // camera-type foreground service without it dies on start. It wraps the
                            // nav host so calibration reads ITS frames, never its own camera.
                            BindTrackerService { ChesslabNavHost() }
                        } else {
                            PermissionGate(onGranted = { granted = true })
                        }
                    }
                }
            }
        }
    }

    private fun hasCamera(): Boolean = checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
}

/** Notifications are only needed for the foreground-service notification, and only from API 33. */
private val REQUESTED_PERMISSIONS: Array<String>
    get() =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(Manifest.permission.CAMERA, Manifest.permission.POST_NOTIFICATIONS)
        } else {
            arrayOf(Manifest.permission.CAMERA)
        }

@Composable
private fun PermissionGate(onGranted: () -> Unit) {
    val launcher =
        rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            if (result[Manifest.permission.CAMERA] == true) onGranted()
        }
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            "Camera access is required to detect the board and track moves.",
            style = MaterialTheme.typography.bodyLarge,
        )
        Button(onClick = { launcher.launch(REQUESTED_PERMISSIONS) }) {
            Text("Grant camera access", style = MaterialTheme.typography.labelLarge)
        }
    }
}
