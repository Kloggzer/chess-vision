package com.chesslab.tracker.ui

import android.content.Context
import android.content.Intent
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.chesslab.tracker.R
import com.chesslab.tracker.geometry.ArucoCornerDetector
import com.chesslab.tracker.record.PgnBuilder
import org.opencv.core.Mat

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
    val rawPreview by viewModel.rawPreview.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // ArUco corner detection for the calibration screen.
    val arucoDetector = remember { ArucoCornerDetector() }
    val arucoFrameRef = remember { mutableStateOf<Mat?>(null) }

    Scaffold(
        bottomBar = { BottomNavBar(navController) },
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
                    rawPreview = rawPreview,
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
                    arucoDetector = arucoDetector,
                    arucoEnabled = true,
                    arucoFrameRef = arucoFrameRef,
                )
            }
            composable(Dest.HISTORY.route) {
                HistoryScreen(
                    moves = uiState.moves,
                    onExport = { sharePgn(context, uiState) },
                )
            }
            composable(Dest.SETTINGS.route) {
                SettingsScreen(
                    settings = settings,
                    onUpdate = viewModel::updateSettings,
                    modelStore = viewModel.modelStore,
                )
            }
        }
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun BottomNavBar(navController: NavHostController) {
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
}

private fun sharePgn(
    context: Context,
    uiState: UiState,
) {
    val pgn = PgnBuilder.build(uiState.moves.map { it.san }, uiState.fen)
    val intent =
        Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, pgn)
            putExtra(Intent.EXTRA_SUBJECT, "chesslab game")
        }
    context.startActivity(Intent.createChooser(intent, context.getString(R.string.history_export)))
}
