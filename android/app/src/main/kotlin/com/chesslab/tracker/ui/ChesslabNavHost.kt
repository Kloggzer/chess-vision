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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.chesslab.tracker.R
import com.chesslab.tracker.analysis.AnalysisEngine
import com.chesslab.tracker.analysis.StockfishEngine
import com.chesslab.tracker.geometry.ArucoCornerDetector

private const val ANALYSIS_ROUTE = "analysis"
private const val GAME_ID_ARG = "gameId"

private enum class Dest(
    val route: String,
    val icon: ImageVector,
    val labelRes: Int,
) {
    TRACKING("tracking", Icons.Filled.Videocam, R.string.nav_tracking),
    CALIBRATION("calibration", Icons.Filled.GridOn, R.string.nav_calibration),
    GAMES("games", Icons.Filled.History, R.string.nav_games),
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
    val debugBitmaps by viewModel.debugBitmaps.collectAsStateWithLifecycle()
    val rawPreview by viewModel.rawPreview.collectAsStateWithLifecycle()
    val spectatorUrl by viewModel.spectatorUrl.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // ArUco corner detection for the calibration screen.
    val arucoDetector = remember { ArucoCornerDetector() }

    // On-device analysis engine (native Stockfish). Constructed here (compile-safe; it only
    // execs the native binary when analysis actually runs on a device). Tests inject a
    // FakeAnalysisEngine instead — nothing at unit-test time touches the native lib.
    val analysisEngine: AnalysisEngine =
        remember { StockfishEngine("${context.applicationInfo.nativeLibraryDir}/libstockfish.so") }
    DisposableEffect(analysisEngine) {
        onDispose { analysisEngine.close() }
    }

    Scaffold(
        bottomBar = { BottomNavBar(navController) },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Dest.TRACKING.route,
            modifier = Modifier.padding(padding),
        ) {
            composable(Dest.TRACKING.route) {
                TrackingRoute(viewModel, navController, uiState, board, debugBitmaps, rawPreview, settings)
            }
            composable(Dest.CALIBRATION.route) {
                CalibrationRoute(viewModel, navController, rawPreview, arucoDetector, settings)
            }
            composable(Dest.GAMES.route) {
                GamesScreen(
                    games = viewModel.gameStore.list(),
                    liveMoveCount = uiState.moves.size,
                    onOpenGame = { id -> navController.navigate("$ANALYSIS_ROUTE/$id") { launchSingleTop = true } },
                    onExport = { id -> sharePgn(context, viewModel.gameStore.loadPgn(id)) },
                )
            }
            composable(
                route = "$ANALYSIS_ROUTE/{$GAME_ID_ARG}",
                arguments = listOf(navArgument(GAME_ID_ARG) { type = NavType.StringType }),
            ) { entry ->
                val gameId = entry.arguments?.getString(GAME_ID_ARG).orEmpty()
                val pgn = remember(gameId) { viewModel.gameStore.loadPgn(gameId) }
                val provenance = remember(gameId) { viewModel.gameStore.loadProvenance(gameId) }
                AnalysisScreen(
                    gameId = gameId,
                    pgn = pgn,
                    engine = analysisEngine,
                    provenance = provenance,
                    depth = settings.analysisDepth,
                )
            }
            composable(Dest.SETTINGS.route) {
                SettingsScreen(
                    settings = settings,
                    onUpdate = viewModel::updateSettings,
                    modelStore = viewModel.modelStore,
                    spectatorUrl = spectatorUrl,
                )
            }
        }
    }
}

private fun NavHostController.navigateTab(route: String) = navigate(route) { launchSingleTop = true }

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun TrackingRoute(
    viewModel: TrackerViewModel,
    navController: NavHostController,
    uiState: UiState,
    board: android.graphics.Bitmap?,
    debugBitmaps: com.chesslab.tracker.service.DebugBitmaps,
    rawPreview: android.graphics.Bitmap?,
    settings: com.chesslab.tracker.service.TrackerSettings,
) {
    val calibrated by viewModel.profile.collectAsStateWithLifecycle()
    TrackingScreen(
        state = uiState,
        board = board,
        debugBitmaps = debugBitmaps,
        rawPreview = rawPreview,
        calibrated = calibrated != null,
        showDebug = settings.debugCard,
        onUndo = viewModel::undo,
        onNewBaseline = viewModel::renewBaseline,
        onReset = viewModel::reset,
        onPromote = viewModel::forcePromote,
        onOverlayViewChange = viewModel::setOverlayView,
        onCalibrate = { navController.navigateTab(Dest.CALIBRATION.route) },
        onRecalibrate = {
            viewModel.recalibrate()
            navController.navigateTab(Dest.CALIBRATION.route)
        },
    )
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun CalibrationRoute(
    viewModel: TrackerViewModel,
    navController: NavHostController,
    rawPreview: android.graphics.Bitmap?,
    arucoDetector: ArucoCornerDetector,
    settings: com.chesslab.tracker.service.TrackerSettings,
) {
    DisposableEffect(Unit) {
        viewModel.setCalibrationActive(true)
        onDispose { viewModel.setCalibrationActive(false) }
    }
    CalibrationScreen(
        experimentalDetection = settings.experimentalDetection,
        onSuggest = { null },
        onSave = { corners, whitePov, w, h ->
            viewModel.saveCalibration(corners, whitePov, w, h)
            navController.navigateTab(Dest.TRACKING.route)
        },
        onCancel = { navController.navigateTab(Dest.TRACKING.route) },
        rawPreview = rawPreview,
        arucoDetector = arucoDetector,
        arucoEnabled = true,
        frameProvider = viewModel::latestCalibrationFrame,
        settings = settings,
        onUpdateSettings = viewModel::updateSettings,
    )
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
    pgn: String,
) {
    val intent =
        Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, pgn)
            putExtra(Intent.EXTRA_SUBJECT, "chesslab game")
        }
    context.startActivity(Intent.createChooser(intent, context.getString(R.string.games_export)))
}
