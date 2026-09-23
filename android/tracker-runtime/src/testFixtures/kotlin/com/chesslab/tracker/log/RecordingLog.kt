package com.chesslab.tracker.log

/**
 * A [TrackerLog] that remembers instead of printing. One fixture for `:tracker-runtime` and `:app`:
 * two drifting fakes would make the same test mean two different things.
 */
class RecordingLog : TrackerLog {
    val debugs = mutableListOf<String>()
    val infos = mutableListOf<String>()
    val warnings = mutableListOf<String>()
    val errors = mutableListOf<Pair<String, Throwable?>>()

    override fun debug(message: String) {
        debugs += message
    }

    override fun info(message: String) {
        infos += message
    }

    override fun warn(
        message: String,
        error: Throwable?,
    ) {
        warnings += message
    }

    override fun error(
        message: String,
        error: Throwable?,
    ) {
        errors += message to error
    }
}
