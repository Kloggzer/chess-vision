package com.chesslab.tracker.ui.games

import android.content.Context
import com.chesslab.tracker.games.GameSessionController
import com.chesslab.tracker.record.RecordingSettings
import com.chesslab.tracker.settings.DataStoreConfigStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Where the games screen picks the running game up; `null` while the service is not running.
 *
 * Observation only. The controller is built and driven by `TrackerService`
 * (`service/GameSessionWiring.kt`) — a UI that owned it would stop recording the moment the last
 * screen was destroyed, while the foreground service kept tracking (D08a-4).
 */
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
