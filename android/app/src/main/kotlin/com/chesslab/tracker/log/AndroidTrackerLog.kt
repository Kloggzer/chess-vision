package com.chesslab.tracker.log

import android.util.Log

/**
 * The Android half of [TrackerLog]. This file stays with the app when the runtime moves to its own
 * module — it is the one place allowed to name `android.util.Log` on behalf of the shared code.
 */
class AndroidTrackerLog(
    private val tag: String,
) : TrackerLog {
    override fun debug(message: String) {
        Log.d(tag, message)
    }

    override fun info(message: String) {
        Log.i(tag, message)
    }

    override fun warn(
        message: String,
        error: Throwable?,
    ) {
        Log.w(tag, message, error)
    }

    override fun error(
        message: String,
        error: Throwable?,
    ) {
        Log.e(tag, message, error)
    }
}

/** What the app hands the shared runtime: every channel it names becomes a logcat tag. */
val androidTrackerLogs: TrackerLogs = { tag -> AndroidTrackerLog(tag) }
