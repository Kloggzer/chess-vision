package com.chesslab.tracker.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chesslab.tracker.service.TrackerRestartHost
import com.chesslab.tracker.ui.camera.CameraRoute
import com.chesslab.tracker.ui.debug.DebugRoute
import com.chesslab.tracker.ui.games.GamesRoute
import com.chesslab.tracker.ui.home.HomeRoute
import com.chesslab.tracker.ui.review.ArchiveReviewRoute
import com.chesslab.tracker.ui.settings.SettingsRoute
import com.chesslab.tracker.ui.tracking.TrackingRoute
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

/**
 * The one navigation topology of the app. A second `NavHost` would give it two back stacks and two
 * ideas of where "back" goes.
 *
 * **Seven destinations, seven distinct screens.** It was nine registered destinations over seven
 * implementations: `calibration` was a byte-identical alias of `camera`, and `review` (the live
 * "Spectator" tab) was the same composable as `review/{id}` fed by the running game — a board and a
 * move list the tracker already drew, plus one Wi-Fi switch, which is now in the tracker's overflow.
 * `speech` was four settings holding a sixth of the app's top-level surface and is a Settings
 * subpage.
 *
 * There is NO tab row and no bottom bar (specs/47 §3.1a). What the bar would have carried — the way
 * back into a game that is still being tracked — is [LocalResumeTracker], provided here for every
 * screen that is not the tracker itself.
 */
const val ROUTE_HOME = "home"
const val ROUTE_TRACKING = "tracking"
const val ROUTE_CAMERA = "camera"
const val ROUTE_SETTINGS = "settings"
const val ROUTE_DEBUG = "debug"
const val ROUTE_GAMES = "games"
const val ROUTE_REVIEW = "review"

/**
 * "Open the running game", from the foreground notification.
 *
 * A one-shot request rather than a flag on the nav host: the activity is `singleTop`, so the same
 * instance receives every later tap through `onNewIntent`, and a state that stayed true would send
 * the user back to the tracker every time this graph recomposed.
 */
object OpenTracker {
    private val requests = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    val flow: SharedFlow<Unit> = requests

    fun request() {
        requests.tryEmit(Unit)
    }
}

@Composable
fun ChesslabNavHost(navController: NavHostController = rememberNavController()) {
    // The running game and its recording are NOT attached here: they belong to the service, which
    // outlives the whole UI (D08a-4). Screens observe them through `GameSessionHost`.
    val resumeTracker: () -> Unit = { navController.navigate(ROUTE_TRACKING) }
    LaunchedEffect(navController) { OpenTracker.flow.collect { resumeTracker() } }
    NavHost(navController = navController, startDestination = ROUTE_HOME) {
        // Home and the tracker are the two screens where a "return to the game" banner would be
        // either redundant or a link to itself, so neither provides one.
        composable(ROUTE_HOME) {
            HomeRoute(
                onStartGame = resumeTracker,
                onOpenGames = { navController.navigate(ROUTE_GAMES) },
                onOpenSettings = { navController.navigate(ROUTE_SETTINGS) },
                onOpenGame = { navController.navigate("$ROUTE_REVIEW/$it") },
            )
        }
        composable(ROUTE_TRACKING) {
            TrackingRoute(
                onBack = { navController.popBackStack() },
                onCamera = { navController.navigate(ROUTE_CAMERA) },
            )
        }
        // The camera screen is the tracker's viewfinder, in board mode when it is recalibrating. It
        // cannot function without the tracker — unbound it is one sentence on an empty screen — so
        // it is reached from there and nowhere else.
        composable(ROUTE_CAMERA) {
            Resumable(resumeTracker) { CameraRoute(onBack = { navController.popBackStack() }) }
        }
        composable(ROUTE_SETTINGS) {
            // Null until the service has published its restart action, and the settings screen
            // renders the honest "close and reopen the app" text for exactly that window.
            val restart by TrackerRestartHost.restart.collectAsStateWithLifecycle()
            Resumable(resumeTracker) {
                SettingsRoute(
                    onBack = { navController.popBackStack() },
                    onOpenDebug = { navController.navigate(ROUTE_DEBUG) },
                    // The second door to the camera screen, from where somebody looks for setup.
                    onOpenCalibration = { navController.navigate(ROUTE_CAMERA) },
                    onRestartTracker = restart?.let { { it.restartTracker() } },
                )
            }
        }
        // Reachable ONLY from the settings screen: `TrackerStatus.debug` is assembled while this
        // screen is composed, and a top-level entry would make that cost permanent.
        composable(ROUTE_DEBUG) {
            Resumable(resumeTracker) { DebugRoute(onBack = { navController.popBackStack() }) }
        }
        composable(ROUTE_GAMES) {
            Resumable(resumeTracker) {
                GamesRoute(
                    onBack = { navController.popBackStack() },
                    onOpenGame = { navController.navigate("$ROUTE_REVIEW/$it") },
                )
            }
        }
        composable("$ROUTE_REVIEW/{id}") { entry ->
            Resumable(resumeTracker) {
                ArchiveReviewRoute(
                    id = entry.arguments?.getString("id").orEmpty(),
                    onBack = { navController.popBackStack() },
                )
            }
        }
        // No analysis route, and there will not be one: 07c shipped the eval bar as a SLOT beside
        // the board (`EvalBarSlot`), which is where an evaluation belongs.
    }
}

/** A screen a running game can be returned FROM — see [LocalResumeTracker]. */
@Composable
private fun Resumable(
    resume: () -> Unit,
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(LocalResumeTracker provides resume, content = content)
}
