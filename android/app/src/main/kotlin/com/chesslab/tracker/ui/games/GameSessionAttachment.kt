package com.chesslab.tracker.ui.games

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.games.GameSessionController
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.ProfileLoad
import com.chesslab.tracker.geometry.calibrationStore
import com.chesslab.tracker.record.LiveCaptureSource
import com.chesslab.tracker.record.RecordingGates
import com.chesslab.tracker.record.RecordingSettings
import com.chesslab.tracker.record.SessionCaptureController
import com.chesslab.tracker.record.SessionMeta
import com.chesslab.tracker.record.SessionRecorder
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.settings.DataStoreConfigStore
import com.chesslab.tracker.ui.calibration.LocalCalibrationHost
import com.chesslab.tracker.ui.tracking.TrackerSessionHost
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.opencv.core.Mat
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Where the games screen picks the running game up; `null` while the service is not bound. */
object GameSessionHost {
    private val current = MutableStateFlow<GameSessionController?>(null)

    val controller: StateFlow<GameSessionController?> = current

    fun publish(controller: GameSessionController?) {
        current.value = controller
    }
}

/**
 * One instance per process, because two would each cache their own copy of the preferences and the
 * capture path would read the one the toggle did not write.
 */
object RecordingSettingsHost {
    private var instance: RecordingSettings? = null

    @Synchronized
    fun get(context: Context): RecordingSettings =
        instance ?: RecordingSettings(DataStoreConfigStore(context.applicationContext)).also { instance = it }
}

fun gamesDir(context: Context): File = File(context.filesDir, "games")

fun sessionsDir(context: Context): File = File(context.filesDir, "sessions")

/** `2026-07-24_1822` — sorts chronologically as a string and is a legal file stem. */
fun gameId(epochMs: Long): String = SimpleDateFormat("yyyy-MM-dd_HHmm", Locale.US).format(Date(epochMs))

/**
 * Drives the game session for as long as the app's UI exists.
 *
 * It hangs off the nav host rather than off the games screen: a game is recorded while the user
 * watches the board, not while they browse the library. It cannot live in `TrackerService` either
 * — that file belongs to another agent this phase — so recording pauses when the whole UI is gone
 * even though the service keeps tracking. Recorded as a discrepancy in `STATUS.md`.
 */
@Composable
fun AttachGameSession() {
    val context = LocalContext.current
    val session by TrackerSessionHost.session.collectAsStateWithLifecycle()
    val calibration = LocalCalibrationHost.current
    val bound = session
    if (bound == null || calibration == null) return
    val store = remember(context) { calibrationStore(context) }
    val load by store.profile.collectAsStateWithLifecycle(ProfileLoad.Absent)
    // Read through a State: the controller is built once, the profile can change under it.
    val profile = rememberUpdatedState((load as? ProfileLoad.Ok)?.profile)
    val settings = remember(context) { RecordingSettingsHost.get(context) }
    val controller =
        remember(context, bound, calibration) {
            buildController(context, settings, { profile.value }, calibration.latestCalibrationFrame) {
                bound.status.value?.corners
            }
        }
    DisposableEffect(controller) {
        GameSessionHost.publish(controller)
        onDispose { GameSessionHost.publish(null) }
    }
    LaunchedEffect(settings) { settings.load() }
    LaunchedEffect(controller) { bound.events.collect { controller.onEvent(it, bound.status.value) } }
    LaunchedEffect(controller) {
        bound.status.collect { status ->
            status ?: return@collect
            controller.onIdle(status.fen, profile.value?.name ?: DEFAULT_PROFILE)
            controller.onStatus(status)
        }
    }
}

private const val DEFAULT_PROFILE = "default"

private fun buildController(
    context: Context,
    settings: RecordingSettings,
    profile: () -> CalibrationProfile?,
    frame: () -> Mat?,
    corners: () -> FloatArray?,
): GameSessionController {
    val sessions = SessionStore(sessionsDir(context))
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
    return GameSessionController(GameStore(gamesDir(context)), capture, System::currentTimeMillis, ::gameId)
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
