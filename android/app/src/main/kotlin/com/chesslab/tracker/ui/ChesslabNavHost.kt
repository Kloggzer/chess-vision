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
import com.chesslab.tracker.spectate.ui.SpectatorScreen
import com.chesslab.tracker.speech.ui.SpeechSettingsScreen
import com.chesslab.tracker.ui.calibration.CalibrationRoute
import com.chesslab.tracker.ui.debug.DebugRoute
import com.chesslab.tracker.ui.games.AttachGameSession
import com.chesslab.tracker.ui.games.GameDetailRoute
import com.chesslab.tracker.ui.games.GamesRoute
import com.chesslab.tracker.ui.settings.SettingsRoute
import com.chesslab.tracker.ui.tracking.TrackingRoute

/**
 * The one navigation topology of the app. Later phases attach their routes HERE — a second
 * `NavHost` would give the app two back stacks and two ideas of where "back" goes.
 *
 * Ownership (entry.md registry): created by 06b; extended by 07a (settings, debug), 08a (games),
 * 08b (spectator). One agent per phase touches this file — in phase 08 that is 08a, which is why
 * the spectator and speech routes are wired here and not by their own agents.
 */
const val ROUTE_TRACKING = "tracking"
const val ROUTE_CALIBRATION = "calibration"
const val ROUTE_SETTINGS = "settings"
const val ROUTE_DEBUG = "debug"
const val ROUTE_ANALYSIS = "analysis"
const val ROUTE_GAMES = "games"
const val ROUTE_GAME_DETAIL = "game"
const val ROUTE_SPECTATOR = "spectator"
const val ROUTE_SPEECH = "speech"

@Composable
fun ChesslabNavHost(navController: NavHostController = rememberNavController()) {
    // Outside the NavHost on purpose: the running game and its optional frame recording must
    // survive navigating to any screen — they follow the board, not the back stack.
    AttachGameSession()
    NavHost(navController = navController, startDestination = ROUTE_TRACKING) {
        composable(ROUTE_TRACKING) {
            // The settings entry sits here rather than inside `TrackingScreen`: that file belongs
            // to another agent this phase, and the tracking screen's own layout is a game surface.
            Column(Modifier.fillMaxSize()) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    // 08b's and 08c's screens have no entry point of their own: this file is the
                    // only one either of them is allowed to reach, and the registry gives it to 08a.
                    TextButton(onClick = { navController.navigate(ROUTE_GAMES) }) { Text("Games") }
                    TextButton(onClick = { navController.navigate(ROUTE_SPECTATOR) }) { Text("Spectator") }
                    TextButton(onClick = { navController.navigate(ROUTE_SPEECH) }) { Text("Speech") }
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
        composable(ROUTE_GAMES) {
            GamesRoute(
                onBack = { navController.popBackStack() },
                onOpenGame = { navController.navigate("$ROUTE_GAME_DETAIL/$it") },
            )
        }
        composable("$ROUTE_GAME_DETAIL/{id}") { entry ->
            GameDetailRoute(
                id = entry.arguments?.getString("id").orEmpty(),
                onBack = { navController.popBackStack() },
            )
        }
        composable(ROUTE_SPECTATOR) { SpectatorScreen(onBack = { navController.popBackStack() }) }
        composable(ROUTE_SPEECH) { SpeechSettingsScreen(onBack = { navController.popBackStack() }) }
        // TODO(phase 07c) composable(ROUTE_ANALYSIS)
    }
}
