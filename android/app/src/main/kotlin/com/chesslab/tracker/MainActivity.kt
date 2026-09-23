package com.chesslab.tracker

import android.content.Intent
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
import com.chesslab.tracker.service.EXTRA_OPEN_TRACKER
import com.chesslab.tracker.settings.SettingsHost
import com.chesslab.tracker.ui.BindTrackerService
import com.chesslab.tracker.ui.ChesslabNavHost
import com.chesslab.tracker.ui.OpenTracker
import com.chesslab.tracker.ui.theme.ChesslabTheme

/** The camera belongs to the service: exactly one owner, or the feed freezes on a tab switch. */
class MainActivity : ComponentActivity() {
    override fun onNewIntent(intent: Intent) {
        // `FLAG_ACTIVITY_SINGLE_TOP` means a second tap on the notification arrives here instead of
        // through `onCreate`, and `getIntent()` is NOT updated on its own — without `setIntent` the
        // second tap would land on whatever screen the user left behind.
        super.onNewIntent(intent)
        setIntent(intent)
        if (intent.getBooleanExtra(EXTRA_OPEN_TRACKER, false)) OpenTracker.request()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Android 15+ forces edge-to-edge (16 dropped the opt-out), so declaring it makes `safeDrawingPadding`
        // the one fix. `auto`: a hardcoded `dark` painted white system icons onto the light theme.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        // Loaded by the PROCESS, not by the service: once the service stopped starting on launch, nothing
        // loaded the store and every settings screen hung on "Reading the stored settings…".
        SettingsHost.get(this)
        if (intent.getBooleanExtra(EXTRA_OPEN_TRACKER, false)) OpenTracker.request()
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
