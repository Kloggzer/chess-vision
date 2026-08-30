package com.chesslab.engine.changeset

import com.chesslab.engine.api.TrackerEvent

/**
 * The one line the status shows, plus the gate line that goes only to the log.
 *
 * Both obey the same rule and it is not cosmetic: announced ONLY when it changes. A note per frame
 * is thirty events a second into a `SharedFlow` with a buffer of 64, which drops everything else
 * that mattered, and a gate line per frame buries the one reading that decided something.
 */
class ChangeNotes(
    private val onTrace: (String) -> Unit,
) {
    var current: String = "waiting for the board"
        private set

    private var gate = ""

    /** Set it and announce it, but only if it is new. */
    fun say(text: String): List<TrackerEvent> {
        if (text == current) return emptyList()
        set(text)
        return listOf(TrackerEvent.Note(text))
    }

    /** Set it without announcing — for notes that ride along with an event of their own. */
    fun set(text: String) {
        if (text != current) onTrace("note: $text")
        current = text
    }

    /** Why a frame ended where it did. Log only: the player has no use for it, a diagnosis has. */
    fun gate(line: String) {
        if (line == gate) return
        gate = line
        onTrace("gate: $line")
    }
}
