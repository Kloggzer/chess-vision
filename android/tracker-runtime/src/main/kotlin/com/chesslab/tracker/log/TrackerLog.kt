package com.chesslab.tracker.log

/** `android.util.Log` is a static platform call: a file naming it cannot run anywhere but a device. The levels
 *  mirror it, so `adb logcat` filtering keeps working. */
interface TrackerLog {
    fun debug(message: String)

    fun info(message: String)

    fun warn(
        message: String,
        error: Throwable? = null,
    )

    fun error(
        message: String,
        error: Throwable? = null,
    )
}

/** The CHANNEL belongs to the caller (`adb logcat -s` targets), the IMPLEMENTATION to the host. */
typealias TrackerLogs = (tag: String) -> TrackerLog

/** Silence, never a crash. */
object NoopTrackerLog : TrackerLog {
    override fun debug(message: String) = Unit

    override fun info(message: String) = Unit

    override fun warn(
        message: String,
        error: Throwable?,
    ) = Unit

    override fun error(
        message: String,
        error: Throwable?,
    ) = Unit
}

val NoTrackerLogs: TrackerLogs = { NoopTrackerLog }
