package com.chesslab.tracker.record

import java.util.concurrent.atomic.AtomicLong

/**
 * What the size cap already sees spent: the disk at service start plus every session THIS process
 * finished. The tree walk runs once and must never reach the capture path, so a finished session is
 * added from its own directory — without it three 3 GB games in a row measured the disk as it was.
 */
class SessionByteBudget(
    private val sessions: SessionStore,
) {
    private val bytes = AtomicLong(sessions.totalBytes())
    private val seenDeletions = AtomicLong(sessions.deletions())

    /** Nach einer LOESCHUNG einmal neu gehen, sonst nie: der Zaehler wuchs nur, also zaehlte
     *  geloeschtes Material weiter gegen die Grenze — das einzige Mittel des Nutzers dagegen. */
    fun spent(): Long {
        val now = sessions.deletions()
        if (seenDeletions.getAndSet(now) != now) bytes.set(sessions.totalBytes())
        return bytes.get()
    }

    /** Hung on `RecordingHooks.finished`: the session is written, so its directory counts now. */
    fun finished(result: SessionResult) {
        bytes.addAndGet(sessions.bytesOf(result.sessionId))
    }
}
