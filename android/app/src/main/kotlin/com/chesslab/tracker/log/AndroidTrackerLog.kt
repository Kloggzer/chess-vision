package com.chesslab.tracker.log

import android.util.Log

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

val androidTrackerLogs: TrackerLogs = { tag -> AndroidTrackerLog(tag) }
