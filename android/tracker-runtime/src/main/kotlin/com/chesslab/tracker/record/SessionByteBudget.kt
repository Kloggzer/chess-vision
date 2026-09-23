package com.chesslab.tracker.record

import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/** The tree walk runs once, never on the capture path, so a finished session is added from its own directory —
 *  without it three 3 GB games in a row measured the disk as it was. */
class SessionByteBudget(
    private val sessions: SessionStore,
) {
    private val bytes = AtomicLong(sessions.totalBytes())
    private val seen = AtomicInteger(sessions.count())

    /** Neu gehen, wenn Aufnahmen VERSCHWUNDEN sind: Loeschen ist das einzige Mittel des Nutzers gegen die Grenze.
     *  Von der Platte gelesen, weil jeder Bildschirm seinen eigenen Store haelt. */
    fun spent(): Long {
        val now = sessions.count()
        if (seen.getAndSet(now) > now) bytes.set(sessions.totalBytes())
        return bytes.get()
    }

    fun finished(result: SessionResult) {
        bytes.addAndGet(sessions.bytesOf(result.sessionId))
    }
}
