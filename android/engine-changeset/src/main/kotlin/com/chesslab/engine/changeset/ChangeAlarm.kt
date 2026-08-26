package com.chesslab.engine.changeset

import com.chesslab.engine.api.TrackerEvent

/**
 * When "the board changed and no move explains it" becomes "tell the player".
 *
 * One reading that explains nothing is never enough — a hand, a blurred frame, a piece still in
 * flight all look like that. It takes a run of DISTINCT readings whose changed set stays stable
 * and no hand in sight.
 *
 * Unlike its predecessor this does NOT require a committed move first. That condition looked
 * harmless and was measured to be the opposite on 2026-08-26: a game that lost the board before
 * its very first commit sat there in silence for minutes, because the alarm could not fire at ply
 * zero. A game that never starts is exactly the one worth reporting.
 */
class ChangeAlarm {
    private var unexplained = 0
    private var lastSeq = -2L
    private var lastChanged: List<String> = emptyList()

    var current: TrackerEvent.Alarm? = null
        private set

    fun onUnexplained(
        seq: Long,
        changed: List<String>,
        covered: Int,
        needed: Int,
    ): List<TrackerEvent> {
        if (seq == lastSeq) return emptyList()
        lastSeq = seq
        val stable = lastChanged.isEmpty() || changed.containsAll(lastChanged) || lastChanged.containsAll(changed)
        unexplained = if (stable) unexplained + 1 else 1
        lastChanged = changed
        val due = current == null && changed.isNotEmpty() && covered <= HAND_LIMIT && unexplained >= needed
        if (!due) return emptyList()
        val raised = TrackerEvent.Alarm(KIND, changed, guess = null, guessSan = null)
        current = raised
        return listOf(raised)
    }

    /** The board made sense again — or a human said so. */
    fun clear(): List<TrackerEvent> {
        unexplained = 0
        lastChanged = emptyList()
        if (current == null) return emptyList()
        current = null
        return listOf(TrackerEvent.AlarmCleared(REASON_RESTORED))
    }

    fun describe(): String = "board changed on ${lastChanged.take(SHOWN).joinToString(", ")} — check pieces or resync"

    private companion object {
        /** Reused rather than invented: `MoveAnnouncer` already speaks this one. */
        const val KIND = "illegal_move"
        const val REASON_RESTORED = "board_restored"

        /** Above this many covered squares a hand explains the disagreement, so no alarm. */
        const val HAND_LIMIT = 6
        const val SHOWN = 4
    }
}
