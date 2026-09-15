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
    // TODO: Der Zaehler waechst nur. `SessionStore.delete` (Einstellungen -> Aufnahmen) hat hier
    // kein Gegenstueck, also zaehlt geloeschtes Material weiter gegen die Groessengrenze — und
    // `SessionCapture.stoppedReason` rastet dauerhaft ein. Das vom Nutzer erwartete Mittel gegen
    // "limit reached" wirkt bis zum Prozessneustart nicht (`SessionByteBudgetDeleteTest`, rot).
    private val bytes = AtomicLong(sessions.totalBytes())

    fun spent(): Long = bytes.get()

    /** Hung on `RecordingHooks.finished`: the session is written, so its directory counts now. */
    fun finished(result: SessionResult) {
        bytes.addAndGet(sessions.bytesOf(result.sessionId))
    }
}
