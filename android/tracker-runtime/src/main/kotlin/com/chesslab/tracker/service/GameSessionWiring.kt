package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.games.GameBoundary
import com.chesslab.tracker.games.GameSessionController
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.HintLedger
import com.chesslab.tracker.games.gameId
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.geometry.ProfileLoad
import com.chesslab.tracker.record.LiveCaptureSource
import com.chesslab.tracker.record.RecordingGates
import com.chesslab.tracker.record.RecordingHooks
import com.chesslab.tracker.record.RecordingSettings
import com.chesslab.tracker.record.SessionByteBudget
import com.chesslab.tracker.record.SessionCaptureController
import com.chesslab.tracker.record.SessionMeta
import com.chesslab.tracker.record.SessionRecorder
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.runtime.AppPaths
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

/** Owned by the SERVICE: hung off a composable, recording paused whenever the UI was destroyed. A restart
 *  rebuilds pipeline and engine, never the game. */
fun wireGameSession(
    paths: AppPaths,
    settings: RecordingSettings,
    scope: CoroutineScope,
    frames: CalibrationFrames<*>,
    publisher: StatusPublisher,
    calibration: CalibrationStore,
    recordingHooks: RecordingHooks = RecordingHooks(),
    /** Null leaves every stored ply UNRECORDED. */
    hints: HintLedger? = null,
    alsoEnds: List<GameBoundary> = emptyList(),
): GameSessionController {
    scope.launch { settings.load() }
    // A recalibration replaces the profile under a running game; the capture path reads the latest.
    val latest = MutableStateFlow<CalibrationProfile?>(null)
    calibration.profile.onEach { latest.value = (it as? ProfileLoad.Ok)?.profile }.launchIn(scope)
    val profile = latest::value
    val controller =
        buildController(
            paths,
            settings,
            profile,
            frames::latestCalibrationFrame,
            { publisher.status.value?.corners },
            recordingHooks,
            hints,
            alsoEnds,
        )
    attachGameSession(scope, controller, publisher.events, publisher.status) { profile()?.name ?: DEFAULT_PROFILE }
    return controller
}

/** The behaviour under test, split from the half that needs a `Context`. On the service scope, never the analyzer
 *  thread: the capture path clones and JPEG-encodes a frame. */
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
    recordingHooks: RecordingHooks,
    hints: HintLedger?,
    alsoEnds: List<GameBoundary>,
): GameSessionController {
    val sessions = SessionStore(paths.sessions)
    val source = LiveCaptureSource(frame, corners) { profile()?.let { it.sourceWidth to it.sourceHeight } }
    // The tree is walked once, never on the capture path.
    val budget = SessionByteBudget(sessions)
    val capture =
        SessionCaptureController(
            source = source,
            open = { openRecorder(sessions, profile()?.name ?: DEFAULT_PROFILE, it.width, it.height) },
            gates = RecordingGates(),
            prefs = { settings.prefs.value },
            existingBytes = budget::spent,
            hooks =
                recordingHooks.copy(
                    finished = {
                        budget.finished(it)
                        recordingHooks.finished(it)
                    },
                ),
        )
    return GameSessionController(GameStore(paths.games), capture, System::currentTimeMillis, ::gameId, hints, alsoEnds)
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
