package com.chesslab.tracker.log

/**
 * A [TrackerLog] that remembers instead of printing.
 *
 * A test fixture rather than a copy in each module's test sources: both `:tracker-runtime` and
 * `:app` assert on what was logged, and two fakes that drift apart would make the same test mean
 * two different things.
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
