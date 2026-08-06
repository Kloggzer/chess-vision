package com.chesslab.tracker.log

/**
 * The one logging seam for everything that is not an Android screen.
 *
 * `android.util.Log` is a static call into the platform, so every file that names it is a file that
 * cannot run — or be asserted — anywhere but on a device. That was already understood once: `CnnLog`
 * existed for exactly this reason and says so in its own KDoc. This is that interface, generalised,
 * so the tracker loop, the engine host, the preview bus and the live-align worker can move to a
 * plain JVM module without dragging the platform behind them.
 *
 * The levels mirror `android.util.Log` deliberately: a call site that was `Log.d` stays debug, so
 * `adb logcat` filtering keeps working exactly as it did.
 */
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

/**
 * How shared code obtains a logger for a named channel.
 *
 * The CHANNEL belongs to the caller — `chesslabDecision`, `chesslabCnn` and `chesslabTracker` are
 * what `adb logcat -s` is pointed at, and collapsing them into one would silently empty those
 * filters. The IMPLEMENTATION belongs to the host. So the shared code names its channel and the
 * platform decides what a channel is.
 */
typealias TrackerLogs = (tag: String) -> TrackerLog

/** The default for tests and for any host that has not wired one — silence, never a crash. */
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
