package com.chesslab.tracker.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavBackStackEntry
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chesslab.tracker.capture.CapturePlanRoute
import com.chesslab.tracker.capture.CaptureSetupRoute
import com.chesslab.tracker.capture.CaptureTurnRoute
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

/** The one navigation topology: a second `NavHost` would mean two back stacks. No tab row and no bottom
 *  bar (specs/47 §3.1a) — the way back into a running game is [LocalResumeTracker]. */
const val ROUTE_HOME = "home"
const val ROUTE_TRACKING = "tracking"
const val ROUTE_CAMERA = "camera"
const val ROUTE_SETTINGS = "settings"
const val ROUTE_DEBUG = "debug"
const val ROUTE_GAMES = "games"
const val ROUTE_REVIEW = "review"
const val ROUTE_CAPTURE = "capture"
const val ROUTE_CAPTURE_SETUP = "capture/setup"
const val ROUTE_CAPTURE_TURN = "capture/turn"

/** A one-shot, not a flag: the `singleTop` activity gets every later tap through `onNewIntent`, and a flag
 *  that stayed true would send the user to the tracker on every recomposition. */
object OpenTracker {
    // `replay = 1`: a cold start requests in `onCreate`, the nav host subscribes after `setContent`, and an
    // emission into no subscriber is dropped.
    private val requests = MutableSharedFlow<Unit>(replay = 1)

    val flow: SharedFlow<Unit> = requests

    fun request() {
        requests.tryEmit(Unit)
    }

    fun consume() {
        requests.resetReplayCache()
    }
}

@Composable
fun ChesslabNavHost(navController: NavHostController = rememberNavController()) {
    // The running game belongs to the service, which outlives the whole UI; screens observe `GameSessionHost`.
    LaunchedEffect(navController) {
        OpenTracker.flow.collect {
            OpenTracker.consume()
            navController.navigate(ROUTE_TRACKING)
        }
    }
    NavHost(navController = navController, startDestination = ROUTE_HOME) {
        composable(ROUTE_HOME) { entry ->
            val nav = remember(entry) { Nav(navController, entry) }
            HomeRoute(
                onStartGame = { nav.to(ROUTE_TRACKING) },
                onOpenGames = { nav.to(ROUTE_GAMES) },
                onOpenSettings = { nav.to(ROUTE_SETTINGS) },
                onOpenGame = { nav.to("$ROUTE_REVIEW/$it") },
            )
        }
        composable(ROUTE_TRACKING) { entry ->
            val nav = remember(entry) { Nav(navController, entry) }
            TrackingRoute(
                onBack = nav::back,
                onCamera = { nav.to(ROUTE_CAMERA) },
                onGameSaved = { nav.replace("$ROUTE_REVIEW/$it") },
                onGameDiscarded = { nav.replace(ROUTE_HOME) },
            )
        }
        // Reached from the tracker only: unbound, the camera screen is one sentence on an empty screen.
        composable(ROUTE_CAMERA) { entry ->
            val nav = remember(entry) { Nav(navController, entry) }
            Resumable(nav) { CameraRoute(onBack = nav::back) }
        }
        composable(ROUTE_SETTINGS) { entry ->
            val nav = remember(entry) { Nav(navController, entry) }
            val restart by TrackerRestartHost.restart.collectAsStateWithLifecycle()
            Resumable(nav) {
                SettingsRoute(
                    onBack = nav::back,
                    onOpenDebug = { nav.to(ROUTE_DEBUG) },
                    onOpenCalibration = { nav.to(ROUTE_CAMERA) },
                    onOpenCapture = { nav.to(ROUTE_CAPTURE) },
                    onRestartTracker = restart?.let { { it.restartTracker() } },
                )
            }
        }
        // ONLY from settings: `TrackerStatus.debug` is assembled while this screen is composed.
        composable(ROUTE_DEBUG) { entry ->
            val nav = remember(entry) { Nav(navController, entry) }
            Resumable(nav) { DebugRoute(onBack = nav::back) }
        }
        composable(ROUTE_GAMES) { entry ->
            val nav = remember(entry) { Nav(navController, entry) }
            Resumable(nav) {
                GamesRoute(onBack = nav::back, onOpenGame = { nav.to("$ROUTE_REVIEW/$it") })
            }
        }
        composable("$ROUTE_REVIEW/{id}") { entry ->
            val nav = remember(entry) { Nav(navController, entry) }
            Resumable(nav) {
                ArchiveReviewRoute(id = entry.arguments?.getString("id").orEmpty(), onBack = nav::back)
            }
        }
        captureDestinations(navController)
    }
}

/** Three destinations of ONE flow; what crosses them is `CaptureHost`, not the back stack. */
private fun NavGraphBuilder.captureDestinations(navController: NavHostController) {
    composable(ROUTE_CAPTURE) { entry ->
        val nav = remember(entry) { Nav(navController, entry) }
        Resumable(nav) {
            CapturePlanRoute(onBack = nav::back, onOpenShot = { nav.to("$ROUTE_CAPTURE_SETUP/$it") })
        }
    }
    composable("$ROUTE_CAPTURE_SETUP/{index}") { entry ->
        val nav = remember(entry) { Nav(navController, entry) }
        Resumable(nav) {
            CaptureSetupRoute(
                index = entry.shotIndex(),
                onBack = nav::back,
                onStart = { nav.replace("$ROUTE_CAPTURE_TURN/$it") },
            )
        }
    }
    composable("$ROUTE_CAPTURE_TURN/{index}") { entry ->
        val nav = remember(entry) { Nav(navController, entry) }
        Resumable(nav) {
            CaptureTurnRoute(index = entry.shotIndex(), onBack = nav::back, onDone = { nav.replace(ROUTE_CAPTURE) })
        }
    }
}

private fun NavBackStackEntry.shotIndex(): Int = arguments?.getString("index")?.toIntOrNull() ?: 0

/** Dead once its destination is no longer current. A double tap on Back popped the start destination
 *  too: an empty NavHost draws NOTHING and swallows back — the app sat black until killed. The entry
 *  leaves `RESUMED` when the pop is issued, so the second click is a no-op; pushes likewise. */
private class Nav(
    private val controller: NavHostController,
    private val entry: NavBackStackEntry,
) {
    private val current get() = entry.lifecycle.currentState == Lifecycle.State.RESUMED

    fun to(route: String) {
        if (current) controller.navigate(route)
    }

    fun back() {
        if (current) controller.popBackStack()
    }

    fun replace(route: String) {
        if (!current) return
        controller.navigate(route) {
            popUpTo(entry.destination.id) { inclusive = true }
            launchSingleTop = true
        }
    }
}

@Composable
private fun Resumable(
    nav: Nav,
    content: @Composable () -> Unit,
) {
    val resume = remember(nav) { { nav.to(ROUTE_TRACKING) } }
    CompositionLocalProvider(LocalResumeTracker provides resume, content = content)
}
