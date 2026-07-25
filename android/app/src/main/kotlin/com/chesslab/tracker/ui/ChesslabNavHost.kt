package com.chesslab.tracker.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chesslab.tracker.service.TrackerRestartHost
import com.chesslab.tracker.ui.calibration.CalibrationRoute
import com.chesslab.tracker.ui.debug.DebugRoute
import com.chesslab.tracker.ui.settings.SettingsRoute
import com.chesslab.tracker.ui.tracking.TrackingRoute

/**
 * The one navigation topology of the app. Later phases attach their routes HERE — a second
 * `NavHost` would give the app two back stacks and two ideas of where "back" goes.
 *
 * Ownership (entry.md registry): created by 06b; extended by 07a (settings, debug), 08a (games),
 * 08b (spectator). One agent per phase touches this file.
 */
const val ROUTE_TRACKING = "tracking"
const val ROUTE_CALIBRATION = "calibration"
const val ROUTE_SETTINGS = "settings"
const val ROUTE_DEBUG = "debug"
const val ROUTE_ANALYSIS = "analysis"
const val ROUTE_GAMES = "games"

@Composable
fun ChesslabNavHost(navController: NavHostController = rememberNavController()) {
    NavHost(navController = navController, startDestination = ROUTE_TRACKING) {
        composable(ROUTE_TRACKING) {
            // The settings entry sits here rather than inside `TrackingScreen`: that file belongs
            // to another agent this phase, and the tracking screen's own layout is a game surface.
            Column(Modifier.fillMaxSize()) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = { navController.navigate(ROUTE_SETTINGS) }) { Text("Settings") }
                }
                Box(Modifier.weight(1f)) {
                    TrackingRoute(onRecalibrate = { navController.navigate(ROUTE_CALIBRATION) })
                }
            }
        }
        composable(ROUTE_CALIBRATION) {
            CalibrationRoute(
                // Calibration is a detour, not a destination: both exits return to tracking.
                onCalibrated = { navController.popBackStack() },
                onBack = { navController.popBackStack() },
            )
        }
        composable(ROUTE_SETTINGS) {
            // Null until the service has published its restart action, and the settings screen
            // renders the honest "close and reopen the app" text for exactly that window.
            val restart by TrackerRestartHost.restart.collectAsStateWithLifecycle()
            SettingsRoute(
                onBack = { navController.popBackStack() },
                onOpenDebug = { navController.navigate(ROUTE_DEBUG) },
                onRestartTracker = restart?.let { { it.restartTracker() } },
            )
        }
        // Reachable ONLY from the settings screen: `TrackerStatus.debug` is assembled while this
        // screen is composed, and a tab on the main flow would make that cost permanent.
        composable(ROUTE_DEBUG) {
            DebugRoute(onBack = { navController.popBackStack() })
        }
        // TODO(phase 07c) composable(ROUTE_ANALYSIS)
        // TODO(phase 08a) composable(ROUTE_GAMES)
    }
}
