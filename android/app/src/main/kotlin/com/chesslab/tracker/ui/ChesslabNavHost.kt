package com.chesslab.tracker.ui

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chesslab.tracker.ui.calibration.CalibrationRoute
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
            TrackingRoute(onRecalibrate = { navController.navigate(ROUTE_CALIBRATION) })
        }
        composable(ROUTE_CALIBRATION) {
            CalibrationRoute(
                // Calibration is a detour, not a destination: both exits return to tracking.
                onCalibrated = { navController.popBackStack() },
                onBack = { navController.popBackStack() },
            )
        }
        // TODO(phase 07a) composable(ROUTE_SETTINGS) / composable(ROUTE_DEBUG)
        // TODO(phase 07c) composable(ROUTE_ANALYSIS)
        // TODO(phase 08a) composable(ROUTE_GAMES)
    }
}
