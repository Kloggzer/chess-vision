package com.chesslab.tracker.service

import android.content.Context
import android.content.Intent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Whether the app is tracking — the one switch the composition binds on.
 *
 * The app used to open the camera, the foreground notification and the CNN on launch whatever the
 * user came for, and three of its six tabs never touch a frame. Tracking is now asked for, and it
 * ends only when it is ended: a tab switch, a home press or a destroyed activity leave this alone,
 * and only the Board tab's control, the notification's Stop action or the death of the service
 * clear it.
 *
 * A process-wide flag is the right shape here, not a shortcut. The service lives in this process
 * and is `START_NOT_STICKY`, so it cannot outlive the flag; what the flag has to outlive is the
 * ACTIVITY — leaving the app while a game runs — and it does.
 */
object TrackerRun {
    private val state = MutableStateFlow(false)

    val running: StateFlow<Boolean> = state

    /**
     * Ask for tracking. The service is started by the composition rather than here, because
     * `startForegroundService` must precede the bind: a bind-created service is a background one,
     * and Android 14 kills it the moment it opens the camera.
     */
    fun start() {
        state.value = true
    }

    /**
     * Stop through the service's own action — the same one the notification carries. One stop path,
     * so the button and the shade cannot end a game two different ways.
     */
    fun stop(context: Context) {
        context.startService(Intent(context, TrackerService::class.java).setAction(ACTION_STOP_TRACKING))
    }

    /** The service is going: the composition unbinds, which is what lets it actually die. */
    internal fun onStopped() {
        state.value = false
    }
}
