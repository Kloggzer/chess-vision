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
const val ROUTE_CAPTURE = "capture"
const val ROUTE_CAPTURE_SETUP = "capture/setup"
const val ROUTE_CAPTURE_TURN = "capture/turn"

/**
 * "Open the running game", from the foreground notification.
 *
 * A one-shot request rather than a flag on the nav host: the activity is `singleTop`, so the same
 * instance receives every later tap through `onNewIntent`, and a state that stayed true would send
 * the user back to the tracker every time this graph recomposed.
 */
object OpenTracker {
    // `replay = 1`, because a cold start requests in `onCreate` and the nav host subscribes only
    // after `setContent`: an emission into no subscriber is dropped, and the tap landed on Home.
    private val requests = MutableSharedFlow<Unit>(replay = 1)

    val flow: SharedFlow<Unit> = requests

    fun request() {
        requests.tryEmit(Unit)
    }

    /** Navigated: the replayed request must not send a recreated activity back to the tracker. */
    fun consume() {
        requests.resetReplayCache()
    }
}

@Composable
fun ChesslabNavHost(navController: NavHostController = rememberNavController()) {
    // The running game and its recording are NOT attached here: they belong to the service, which
    // outlives the whole UI (D08a-4). Screens observe them through `GameSessionHost`.
    LaunchedEffect(navController) {
        OpenTracker.flow.collect {
            OpenTracker.consume()
            navController.navigate(ROUTE_TRACKING)
        }
    }
    NavHost(navController = navController, startDestination = ROUTE_HOME) {
        // Home and the tracker are the two screens where a "return to the game" banner would be
        // either redundant or a link to itself, so neither provides one.
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
        // The camera screen is the tracker's viewfinder, in board mode when it is recalibrating. It
        // cannot function without the tracker — unbound it is one sentence on an empty screen — so
        // it is reached from there and nowhere else.
        composable(ROUTE_CAMERA) { entry ->
            val nav = remember(entry) { Nav(navController, entry) }
            Resumable(nav) { CameraRoute(onBack = nav::back) }
        }
        composable(ROUTE_SETTINGS) { entry ->
            val nav = remember(entry) { Nav(navController, entry) }
            // Null until the service has published its restart action, and the settings screen
            // renders the honest "close and reopen the app" text for exactly that window.
            val restart by TrackerRestartHost.restart.collectAsStateWithLifecycle()
            Resumable(nav) {
                SettingsRoute(
                    onBack = nav::back,
                    onOpenDebug = { nav.to(ROUTE_DEBUG) },
                    // The second door to the camera screen, from where somebody looks for setup.
                    onOpenCalibration = { nav.to(ROUTE_CAMERA) },
                    onOpenCapture = { nav.to(ROUTE_CAPTURE) },
                    onRestartTracker = restart?.let { { it.restartTracker() } },
                )
            }
        }
        // Reachable ONLY from the settings screen: `TrackerStatus.debug` is assembled while this
        // screen is composed, and a top-level entry would make that cost permanent.
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
        // No analysis route, and there will not be one: 07c shipped the eval bar as a SLOT beside
        // the board (`EvalBarSlot`), which is where an evaluation belongs.
    }
}

/**
 * Targeted capture: three destinations of ONE flow, in THIS graph and not one of its own. What
 * crosses them is `CaptureHost`, not the back stack — grouped here only so the graph stays readable.
 */
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

/**
 * One destination's navigation, dead the moment that destination stops being the current one.
 *
 * **Two taps on the same back arrow are two clicks on the SAME composition.** The first pops the
 * screen; the second runs before its entry has left the composition and pops whatever was
 * underneath — from Settings that is Home, the start destination, and a NavHost with an empty back
 * stack draws NOTHING. That is a black window that also swallows nothing: the nav controller's back
 * callback is disabled with the stack empty, so system back closes the app outright and every tap
 * lands on an empty composition. Measured on the phone 2026-08-12: two taps 0.1 s apart on the
 * Settings arrow, and the app sat black until the task was killed — a cold start into the same
 * screen was black again within the minute.
 *
 * The guard is the entry's own lifecycle, which leaves `RESUMED` the moment the pop is issued, so
 * the second click of a double tap is a no-op. It covers the pushes for the same reason: a
 * double-tapped game row used to stack two copies of the review screen.
 */
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

    /** Leave a completed flow without keeping its now-invalid screen in the back stack. */
    fun replace(route: String) {
        if (!current) return
        controller.navigate(route) {
            popUpTo(entry.destination.id) { inclusive = true }
            launchSingleTop = true
        }
    }
}

/** A screen a running game can be returned FROM — see [LocalResumeTracker]. */
@Composable
private fun Resumable(
    nav: Nav,
    content: @Composable () -> Unit,
) {
    val resume = remember(nav) { { nav.to(ROUTE_TRACKING) } }
    CompositionLocalProvider(LocalResumeTracker provides resume, content = content)
}
