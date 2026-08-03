package com.chesslab.tracker

import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.chesslab.tracker.settings.SettingsHost
import com.chesslab.tracker.ui.BindTrackerService
import com.chesslab.tracker.ui.ChesslabNavHost
import com.chesslab.tracker.ui.theme.ChesslabTheme

/**
 * The single activity. It owns the theme and the nav host — nothing else. The camera belongs to the
 * service (05a/06c): exactly one owner, or the feed freezes on a tab switch (MEMORY
 * `android-single-camera-owner`).
 *
 * It asks for no permission and starts no service. Reviewing a stored game, reading the settings or
 * watching the spectator board needs neither, and the camera permission is now asked for by the one
 * control that opens a camera (`TrackingSwitch`).
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
        // The settings repository belongs to the PROCESS, and this is the process starting. Until
        // specs/43 the only caller of `get` was `TrackerService`, which used to start on launch;
        // once it stopped, nothing loaded the store and `SettingsHost.repository` stayed null
        // forever — Settings, Spoken moves and the camera controls sat on "Reading the stored
        // settings…" with no error and no crash. `get` is idempotent and returns the one instance.
        SettingsHost.get(this)
        setContent {
            ChesslabTheme {
                Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    // `safeDrawing` = system bars + display cutout + IME, measured per device and
                    // per rotation. Consumed once, here, so no screen can forget it and no screen
                    // can hardcode a bar height that is wrong on gesture navigation or in landscape.
                    Box(Modifier.fillMaxSize().safeDrawingPadding()) {
                        // Binds only while tracking runs; it wraps the nav host so calibration reads
                        // ITS frames, never its own camera.
                        BindTrackerService { ChesslabNavHost() }
                    }
                }
            }
        }
    }
}
