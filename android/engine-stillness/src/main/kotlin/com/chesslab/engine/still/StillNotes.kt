package com.chesslab.engine.still

import com.chesslab.engine.api.TrackerEvent

/**
 * The one line the status shows, and the rule that it is only ANNOUNCED when it changes.
 *
 * Without that rule a note becomes one event per frame — thirty a second into a `SharedFlow` with
 * a buffer of 64, which drops everything else that mattered.
 */
internal class StillNotes(
    /** The same de-duplication the UI gets, reused as the log line: one entry per state change. */
    private val onChange: (String) -> Unit = {},
) {
    var current: String = "waiting for the board"
        private set

    /** Set it and announce it, but only if it is new. */
    fun say(text: String): List<TrackerEvent> {
        if (text == current) return emptyList()
        set(text)
        return listOf(TrackerEvent.Note(text))
    }

    /** Set it without announcing — for notes that ride along with an event of their own. */
    fun set(text: String) {
        if (text != current) onChange(text)
        current = text
    }
}
