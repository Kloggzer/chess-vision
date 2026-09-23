package com.chesslab.tracker.service

import android.content.Context
import android.content.Intent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Ends only when ended: tab switch, home press or a destroyed activity leave it alone. Process-wide on
 *  purpose — the service is `START_NOT_STICKY` and cannot outlive it; it must outlive the ACTIVITY. */
object TrackerRun {
    private val state = MutableStateFlow(false)

    val running: StateFlow<Boolean> = state

    /** The composition starts the service: `startForegroundService` must precede the bind, and Android 14
     *  kills a bind-created (background) service the moment it opens the camera. */
    fun start() {
        state.value = true
    }

    /** Through the notification's own action: one stop path, so button and shade cannot end a game differently. */
    fun stop(context: Context) {
        context.startService(Intent(context, TrackerService::class.java).setAction(ACTION_STOP_TRACKING))
    }

    /** The composition unbinds on this, which is what lets the service actually die. */
    internal fun onStopped() {
        state.value = false
    }
}
