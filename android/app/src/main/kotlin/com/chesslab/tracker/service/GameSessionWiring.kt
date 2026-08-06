package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.games.GameSessionController
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.geometry.ProfileLoad
import com.chesslab.tracker.record.LiveCaptureSource
import com.chesslab.tracker.record.RecordingGates
import com.chesslab.tracker.record.RecordingSettings
import com.chesslab.tracker.record.SessionCaptureController
import com.chesslab.tracker.record.SessionMeta
import com.chesslab.tracker.record.SessionRecorder
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.runtime.AppPaths
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.games.gameId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import org.opencv.core.Mat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private const val DEFAULT_PROFILE = "default"

/**
 * The game session and its optional frame recording, owned by the SERVICE.
 *
 * D08a-4: this used to hang off a composable, so recording paused whenever the UI was destroyed
 * while the foreground service kept tracking — a recorded session had holes exactly when the user
 * put the phone down, which is the situation the foreground service exists for. The UI now only
 * *observes* the controller through [GameSessionHost].
 *
 * The session scope is the service's, not a stack's: a tracker restart rebuilds the pipeline and
 * the engine, but the game the user is playing is not a config knob (see [TrackerStack]).
 */
fun wireGameSession(
    paths: AppPaths,
    settings: RecordingSettings,
    scope: CoroutineScope,
    frames: CalibrationFrames,
    publisher: StatusPublisher,
    calibration: CalibrationStore,
): GameSessionController {
    scope.launch { settings.load() }
    // A recalibration replaces the profile under a running game; the capture path reads the latest.
    val latest = MutableStateFlow<CalibrationProfile?>(null)
    calibration.profile.onEach { latest.value = (it as? ProfileLoad.Ok)?.profile }.launchIn(scope)
    val profile = latest::value
    val controller =
        buildController(paths, settings, profile, frames::latestCalibrationFrame) {
            publisher.status.value?.corners
        }
    attachGameSession(scope, controller, publisher.events, publisher.status) { profile()?.name ?: DEFAULT_PROFILE }
    GameSessionHost.publish(controller)
    return controller
}

/**
 * Drives the controller from the three signals it needs. Split out from [wireGameSession] because
 * this half is the behaviour under test and the other half needs a `Context`.
 *
 * Both collectors run on [scope]'s dispatcher — the service's main scope, never the analyzer
 * thread. The capture path grabs a cloned frame and JPEG-encodes it, and the 15 fps tracking budget
 * outranks recording; `StatusPublisher` already hands both signals over off the analyzer thread.
 */
fun attachGameSession(
    scope: CoroutineScope,
    controller: GameSessionController,
    events: Flow<TrackerEvent>,
    status: StateFlow<TrackerStatus?>,
    profileName: () -> String,
) {
    events.onEach { controller.onEvent(it, status.value) }.launchIn(scope)
    status
        .filterNotNull()
        .onEach {
            controller.onIdle(it.fen, profileName())
            controller.onStatus(it)
        }.launchIn(scope)
}

private fun buildController(
    paths: AppPaths,
    settings: RecordingSettings,
    profile: () -> CalibrationProfile?,
    frame: () -> Mat?,
    corners: () -> FloatArray?,
): GameSessionController {
    val sessions = SessionStore(paths.sessions)
    val source = LiveCaptureSource(frame, corners) { profile()?.let { it.sourceWidth to it.sourceHeight } }
    // Snapshotted here and never on the capture path: it is a directory walk.
    val baseline = sessions.totalBytes()
    val capture =
        SessionCaptureController(
            source = source,
            open = { openRecorder(sessions, profile()?.name ?: DEFAULT_PROFILE, it.width, it.height) },
            gates = RecordingGates(),
            prefs = { settings.prefs.value },
            existingBytes = { baseline },
        )
    return GameSessionController(GameStore(paths.games), capture, System::currentTimeMillis, ::gameId)
}

private fun openRecorder(
    sessions: SessionStore,
    profile: String,
    width: Int,
    height: Int,
): SessionRecorder {
    val id = SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(Date())
    return SessionRecorder(sessions.create(id), SessionMeta(id, profile, width, height))
}
