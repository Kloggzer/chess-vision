package com.chesslab.tracker.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GridOn
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.chesslab.tracker.R

private enum class Dest(
    val route: String,
    val icon: ImageVector,
    val labelRes: Int,
) {
    TRACKING("tracking", Icons.Filled.Videocam, R.string.nav_tracking),
    CALIBRATION("calibration", Icons.Filled.GridOn, R.string.nav_calibration),
    HISTORY("history", Icons.Filled.History, R.string.nav_history),
    SETTINGS("settings", Icons.Filled.Settings, R.string.nav_settings),
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun ChesslabNavHost(
    viewModel: TrackerViewModel,
    navController: NavHostController = rememberNavController(),
) {
    val settings by viewModel.settings.collectAsStateWithLifecycle()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val board by viewModel.board.collectAsStateWithLifecycle()

    Scaffold(
        bottomBar = {
            val current by navController.currentBackStackEntryAsState()
            NavigationBar {
                for (dest in Dest.entries) {
                    val label = stringResource(dest.labelRes)
                    NavigationBarItem(
                        selected = current?.destination?.route == dest.route,
                        onClick = {
                            navController.navigate(dest.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(dest.icon, contentDescription = label) },
                        label = { Text(label) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Dest.TRACKING.route,
            modifier = Modifier.padding(padding),
        ) {
            composable(Dest.TRACKING.route) {
                TrackingScreen(
                    state = uiState,
                    board = board,
                    showDebug = settings.debugCard,
                    overlayView = settings.overlayView,
                    onUndo = viewModel::undo,
                    onReset = viewModel::reset,
                    onPromote = viewModel::forcePromote,
                )
            }
            composable(Dest.CALIBRATION.route) {
                CalibrationScreen(
                    experimentalDetection = settings.experimentalDetection,
                    onSuggest = { null },
                    onSave = viewModel::saveCalibration,
                )
            }
            composable(Dest.HISTORY.route) {
                HistoryScreen(moves = uiState.moves, onExport = {})
            }
            composable(Dest.SETTINGS.route) {
                SettingsScreen(settings = settings, onUpdate = viewModel::updateSettings)
            }
        }
    }
}
