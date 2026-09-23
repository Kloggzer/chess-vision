package com.chesslab.tracker.ui.games

import android.content.Context
import com.chesslab.tracker.games.GameSessionController
import com.chesslab.tracker.record.RecordingSettings
import com.chesslab.tracker.runtime.AppPaths
import com.chesslab.tracker.settings.DataStoreConfigStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.File

/** Observation only: `TrackerService` drives the controller — a UI that owned it would stop recording when
 *  the last screen died, while the service kept tracking. */
object GameSessionHost {
    private val current = MutableStateFlow<GameSessionController?>(null)

    val controller: StateFlow<GameSessionController?> = current

    fun publish(controller: GameSessionController?) {
        current.value = controller
    }
}

/** One per process: two would cache their own preferences, and capture would read the one the toggle missed. */
object RecordingSettingsHost {
    private var instance: RecordingSettings? = null

    @Synchronized
    fun get(context: Context): RecordingSettings =
        instance ?: RecordingSettings(DataStoreConfigStore(context.applicationContext)).also { instance = it }
}

fun gamesDir(context: Context): File = AppPaths(context.filesDir).games

fun sessionsDir(context: Context): File = AppPaths(context.filesDir).sessions
